/**
 * Prueba de integración contra la base de datos REAL de Supabase.
 * Se ejecuta solo si DATABASE_URL está configurada.
 *
 * Crea registros temporales, verifica CRUD, relaciones y cálculos, y los
 * elimina al final (incluida la auditoría generada por los triggers).
 * NO deja datos de prueba en la base de datos.
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';

// Token efímero generado en cada ejecución: nunca hay una credencial fija en el repo.
process.env.NODE_ENV = 'test';
process.env.TEST_API_TOKEN = `test-${randomUUID()}`;

import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const TOKEN = process.env.TEST_API_TOKEN;
const hasDb = !!process.env.DATABASE_URL;
const { createApp } = await import('../src/app.js');
const { CATALOG } = await import('../src/services/catalog.js');
const { config } = await import('../src/config.js');

let server, base, pool;
const created = []; // { entity, id } en orden de creación
const startedAt = new Date().toISOString();

const req = async (path, opts = {}) => {
  const r = await fetch(`${base}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      ...(opts.headers || {}),
    },
  });
  let body = null;
  try { body = await r.json(); } catch { body = null; }
  return { status: r.status, body };
};

const post = (entity, data) => req(`/api/resources/${entity}`, { method: 'POST', body: JSON.stringify(data) });
const put = (entity, id, data) => req(`/api/resources/${entity}/${id}`, { method: 'PUT', body: JSON.stringify(data) });
const del = (entity, id) => req(`/api/resources/${entity}/${id}`, { method: 'DELETE' });

async function must(entity, data) {
  const { status, body } = await post(entity, data);
  assert.equal(status, 201, `POST ${entity} → ${status}: ${JSON.stringify(body)}`);
  created.push({ entity, id: body.item.id });
  return body.item;
}

test.before(async () => {
  if (!hasDb) return;
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
  pool = new pg.Pool({ connectionString: config.databaseUrl, ssl: config.pgSsl });
});

test.after(async () => {
  if (!hasDb) return;
  // Limpieza en orden inverso para respetar las FK.
  for (const { entity, id } of [...created].reverse()) {
    try { await del(entity, id); } catch { /* ya eliminado por cascade */ }
  }
  // Los triggers de auditoría no se pueden borrar por la API (son de solo lectura).
  try { await pool.query('delete from public.activity_logs where created_at >= $1', [startedAt]); } catch {}
  await new Promise((r) => server.close(r));
  await pool.end();
});

test('catálogo: TODOS los campos declarados existen realmente en la BD', { skip: !hasDb }, async () => {
  const cols = await pool.query(`
    select table_name, column_name from information_schema.columns
    where table_schema = 'public'`);
  const real = new Set(cols.rows.map((r) => `${r.table_name}.${r.column_name}`));
  const tableCols = {};
  for (const r of cols.rows) (tableCols[r.table_name] ||= new Set()).add(r.column_name);

  for (const [entity, def] of Object.entries(CATALOG)) {
    assert.ok(tableCols[def.table], `La tabla ${def.table} (${entity}) no existe en Supabase`);
    for (const field of Object.keys(def.fields)) {
      assert.ok(real.has(`${def.table}.${field}`), `Campo inventado: ${def.table}.${field} (${entity})`);
    }
    for (const col of Object.keys(def.auto || {})) {
      assert.ok(real.has(`${def.table}.${col}`), `Columna de auditoría inventada: ${def.table}.${col}`);
    }
  }
});

test('catálogo: las columnas de búsqueda y filtros existen', { skip: !hasDb }, async () => {
  const cols = await pool.query(`
    select table_name, column_name from information_schema.columns where table_schema='public'`);
  const real = new Set(cols.rows.map((r) => `${r.table_name}.${r.column_name}`));
  for (const [, def] of Object.entries(CATALOG)) {
    for (const c of def.search || []) assert.ok(real.has(`${def.table}.${c}`), `search: ${def.table}.${c}`);
    for (const c of Object.values(def.filters || {})) assert.ok(real.has(`${def.table}.${c}`), `filter: ${def.table}.${c}`);
  }
});

test('CRUD completo + relaciones + cálculos contra Supabase real', { skip: !hasDb }, async () => {
  // 1) Núcleo: cliente → proyecto → contrato → recaudo → gasto
  const client = await must('clients', {
    code: 'TST-CLI-001', company_name: 'Cliente integración', client_type: 'empresa', status: 'activo',
  });
  const project = await must('projects', {
    code: 'TST-PRJ-001', client_id: client.id, project_name: 'Proyecto integración',
    project_type: 'corporativa', status: 'en_proceso', total_amount: 1000,
  });
  await must('contacts', { client_id: client.id, full_name: 'Contacto integración', is_primary: true });
  await must('contracts', { project_id: project.id, contract_number: 'TST-CON-001', amount: 1000, status: 'firmado' });
  await must('quotes', {
    quote_number: 'TST-COT-001', client_id: client.id, issue_date: '2026-01-01',
    subtotal: 1000, tax_amount: 0, total_amount: 1000, status: 'enviada',
  });
  await must('invoices', {
    client_id: client.id, project_id: project.id, invoice_number: 'TST-FAC-001',
    issue_date: '2026-01-01', subtotal: 1000, tax_amount: 0, total_amount: 1000, status: 'pendiente',
  });
  await must('payments', {
    project_id: project.id, client_id: client.id, payment_reference: 'TST-PAG-001',
    amount: 400, payment_date: '2026-01-02', status: 'confirmado', payment_type: 'abono',
  });
  await must('expenses', {
    project_id: project.id, category: 'Integración', description: 'Gasto de prueba',
    amount: 100, expense_date: '2026-01-03',
  });
  await must('extra_expenses', {
    project_id: project.id, description: 'Extra de prueba', category: 'Ajuste',
    amount: 50, spent_at: '2026-01-04',
  });
  await must('bonuses', {
    client_id: client.id, amount: 20, reason: 'Prueba', status: 'aplicada', granted_at: '2026-01-05',
  });
  await must('documents', {
    client_id: client.id, document_type: 'Prueba', document_name: 'Documento',
    file_url: 'https://drive.google.com/example',
  });
  await must('deliveries', { project_id: project.id, delivery_name: 'Entregable de prueba', status: 'pendiente' });
  await must('tasks', { project_id: project.id, title: 'Tarea de prueba', status: 'pendiente' });
  await must('project_services', { project_id: project.id, service_name: 'Servicio', quantity: 1, unit_price: 100 });
  await must('project_costs', { project_id: project.id, cost_type: 'Prueba', description: 'Costo', amount: 10, cost_date: '2026-01-06' });

  // 2) Marketing
  const lead = await must('leads', { contact_name: 'Prospecto prueba', status: 'nuevo', source: 'Web' });
  const campaign = await must('campaigns', { name: 'Campaña integración', channel: 'Google Ads', budget: 500, status: 'activa' });
  await must('campaign_metrics', {
    campaign_id: campaign.id, spent: 200, impressions: 1000, clicks: 50,
    leads: 10, conversions: 2, recorded_at: '2026-01-07',
  });
  await must('follow_ups', { lead_id: lead.id, follow_up_date: '2026-01-08T10:00', description: 'Llamada', status: 'pendiente' });

  // 3) Operaciones / soporte
  const domain = await must('domains', { client_id: client.id, project_id: project.id, domain_name: 'integracion-test.com', status: 'activo' });
  const hosting = await must('hosting_accounts', { client_id: client.id, provider: 'Proveedor prueba', account_name: 'Cuenta prueba', status: 'activo' });
  await must('renewals', { domain_id: domain.id, renewal_type: 'dominio', due_date: '2026-12-01', amount: 50, status: 'pendiente' });
  await must('websites', {
    client_id: client.id, project_id: project.id, domain_id: domain.id,
    hosting_account_id: hosting.id, site_name: 'Sitio prueba', site_url: 'https://integracion-test.com', status: 'activo',
  });
  await must('tickets', { client_id: client.id, project_id: project.id, subject: 'Ticket prueba', description: 'Descripción', status: 'abierto' });
  await must('incidents', { project_id: project.id, title: 'Incidencia prueba', severity: 'baja', status: 'abierta' });
  await must('surveys', { client_id: client.id, rating: 5, comments: 'Prueba' });
  await must('maintenance_plans', { client_id: client.id, plan_name: 'Plan prueba', frequency: 'mensual', start_date: '2026-01-01', amount: 100, status: 'activo' });

  // 4) Gerencia: distribución y retiro
  const dist = await must('profit_distributions', {
    period_start: '2026-01-01', period_end: '2026-03-31', total_profit: 230, status: 'aprobada',
  });
  const item = await must('profit_distribution_items', {
    distribution_id: dist.id, percentage: 100, amount: 230, status: 'pendiente',
  });
  await must('withdrawals', { distribution_item_id: item.id, amount: 30, withdrawn_at: '2026-02-01' });

  // 5) Listado, búsqueda, filtros y paginación
  const list = await req('/api/resources/clients?q=integracion&page=1&pageSize=10&status=activo');
  assert.equal(list.status, 200);
  assert.ok(list.body.total >= 1);
  assert.ok(list.body.items.some((c) => c.id === client.id));
  assert.ok(list.body.pageSize === 10);

  // 6) Vista de detalle con TODAS las relaciones del cliente
  const det = await req(`/api/resources/clients/${client.id}/detail`);
  assert.equal(det.status, 200);
  assert.ok(det.body.related.projects.some((p) => p.id === project.id), 'proyectos relacionados');
  assert.ok(det.body.related.payments.some((p) => p.amount === '400.00' || Number(p.amount) === 400), 'recaudos relacionados');
  assert.ok(det.body.related.documents.length >= 1, 'documentos relacionados');
  assert.ok(det.body.related.domains.length >= 1, 'dominios relacionados');
  assert.ok(det.body.related.tickets.length >= 1, 'tickets relacionados');

  const pdet = await req(`/api/resources/projects/${project.id}/detail`);
  assert.ok(pdet.body.related.contracts.length >= 1, 'contratos del proyecto');
  assert.ok(pdet.body.related.expenses.length >= 1, 'gastos del proyecto');

  // 7) Cálculos financieros en backend
  const acc = await req('/api/accounting/overview');
  assert.equal(acc.status, 200);
  assert.ok(acc.body.totals.contracted >= 1000, 'valor contratado');
  assert.ok(acc.body.totals.collected >= 400, 'recaudo confirmado');
  assert.ok(acc.body.totals.invoiced >= 1000, 'facturado por separado');
  assert.ok(acc.body.totals.collected !== acc.body.totals.invoiced, 'facturación ≠ recaudo');
  assert.ok(acc.body.receivables.some((r) => r.id === client.id), 'cuenta por cobrar del cliente');

  const cf = await req(`/api/financials/client/${client.id}`);
  assert.equal(cf.status, 200);
  assert.equal(cf.body.collected, 400);
  assert.equal(cf.body.balance, 600);

  const pf = await req(`/api/financials/project/${project.id}`);
  assert.equal(pf.status, 200);
  assert.equal(pf.body.contracted, 1000);

  const dash = await req('/api/dashboard');
  assert.equal(dash.status, 200);
  assert.ok(dash.body.indicators.clients >= 1);
  assert.ok(dash.body.indicators.income >= 400);
  assert.ok(Array.isArray(dash.body.monthly));
  assert.ok(Array.isArray(dash.body.upcomingDeliveries));

  const mkt = await req('/api/marketing/overview');
  assert.equal(mkt.status, 200);
  assert.ok(mkt.body.indicators.spent >= 200);
  assert.ok(mkt.body.campaigns.some((c) => c.id === campaign.id && Number(c.spent) === 200));

  const mgmt = await req('/api/management/overview');
  assert.equal(mgmt.status, 200);
  assert.ok(mgmt.body.distributions.some((d) => d.id === dist.id));
  assert.ok(mgmt.body.withdrawals.length >= 1);

  // 8) Edición y eliminación
  const up = await put('clients', client.id, { company_name: 'Cliente integración (editado)' });
  assert.equal(up.status, 200);
  assert.equal(up.body.item.company_name, 'Cliente integración (editado)');

  const docId = created.find((c) => c.entity === 'documents').id;
  const rm = await del('documents', docId);
  assert.equal(rm.status, 200);
  assert.equal(rm.body.deleted, true);
  const gone = await req(`/api/resources/documents/${docId}`);
  assert.equal(gone.status, 404);
});

test('validaciones: campos obligatorios y entidades de solo lectura', { skip: !hasDb }, async () => {
  const bad = await post('clients', { company_name: 'Sin código' });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.details?.length);

  const ro = await post('activity_logs', { table_name: 'clients', action: 'INSERT' });
  assert.equal(ro.status, 403);

  const noProfile = await post('profiles', { full_name: 'X', role: 'administrador' });
  assert.equal(noProfile.status, 403);

  const nf = await req('/api/no-existe');
  assert.equal(nf.status, 404);
});
