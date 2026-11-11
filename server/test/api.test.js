import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { CATALOG, ENTITIES, publicSchema } from '../src/services/catalog.js';
import { normalize } from '../src/services/crud.js';

let server;
let base;

test.before(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((r) => server.close(r));
});

const req = async (path, opts = {}) => {
  const r = await fetch(`${base}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  let body = null;
  try { body = await r.json(); } catch { body = null; }
  return { status: r.status, body };
};

test('GET /api/health responde OK con estado de configuración', async () => {
  const { status, body } = await req('/api/health');
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.ok('database' in body && 'supabaseAuth' in body);
});

test('todas las rutas de datos exigen sesión de Supabase Auth', async () => {
  for (const p of ['/api/schema', '/api/options', '/api/dashboard', '/api/resources/clients', '/api/accounting/overview', '/api/management/overview', '/api/marketing/overview']) {
    const { status, body } = await req(p);
    assert.equal(status, 401, `${p} debería exigir autenticación`);
    assert.ok(body.error);
  }
});

test('POST /api/auth/login valida el body', async () => {
  const { status, body } = await req('/api/auth/login', { method: 'POST', body: '{}' });
  assert.equal(status, 400);
  assert.match(body.error, /obligatorios/i);
});

test('POST /api/auth/refresh valida el body', async () => {
  const { status } = await req('/api/auth/refresh', { method: 'POST', body: '{}' });
  assert.equal(status, 400);
});

test('ruta inexistente sin sesión no revela rutas (401)', async () => {
  const { status, body } = await req('/api/no-existe');
  assert.equal(status, 401);
  assert.ok(body.error);
});

test('el catálogo cubre las 31 tablas del esquema real + 6 incrementales', () => {
  assert.equal(ENTITIES.length, 37);
  for (const e of ENTITIES) {
    const s = publicSchema(e);
    assert.equal(s.entity, e);
    assert.ok(s.table, `${e} debe tener tabla`);
    assert.ok(s.label, `${e} debe tener etiqueta`);
  }
});

test('los campos del catálogo no incluyen columnas autogeneradas', () => {
  // `subtotal` es columna generada SOLO en quote_items y project_services.
  // En quotes e invoices es un campo real y editable (ver esquema).
  const generated = new Set(['id', 'created_at', 'updated_at']);
  for (const [e, def] of Object.entries(CATALOG)) {
    for (const col of Object.keys(def.fields)) {
      assert.ok(!generated.has(col), `${e}.${col} es autogenerada y no debe estar en el formulario`);
      if (['quote_items', 'project_services'].includes(e)) {
        assert.notEqual(col, 'subtotal', `${e}.subtotal es generada por la BD`);
      }
    }
  }
});

test('normalize aplica whitelist: descarta campos que no existen en la BD', () => {
  const out = normalize('clients', { code: 'C-1', company_name: 'Empresa', campo_inventado: 'x' });
  assert.equal(out.code, 'C-1');
  assert.equal(out.company_name, 'Empresa');
  assert.ok(!('campo_inventado' in out));
});

test('normalize valida obligatorios y enumeraciones reales', () => {
  const required = () => normalize('clients', { company_name: 'X' });
  assert.throws(required, (e) => e.status === 400 && e.details.some((d) => /obligatorio/.test(d)));

  const enumBad = () => normalize('clients', { code: 'C-1', company_name: 'X', status: 'inventado' });
  assert.throws(enumBad, (e) => e.details.some((d) => /no permitido/.test(d)));

  const uuidBad = () => normalize('payments', {
    project_id: 'no-uuid', client_id: '00000000-0000-0000-0000-000000000001',
    amount: 100, payment_date: '2026-01-01',
  });
  assert.throws(uuidBad, (e) => e.details.some((d) => /identificador no válido/.test(d)));
});

test('normalize convierte fechas, booleanos y números', () => {
  const out = normalize('domains', {
    client_id: '00000000-0000-0000-0000-000000000001',
    domain_name: 'ejemplo.com', auto_renew: 'true', renewal_cost: '150.5',
    registration_date: '2026-01-15',
  });
  assert.equal(out.auto_renew, true);
  assert.equal(out.renewal_cost, 150.5);
  assert.equal(out.registration_date, '2026-01-15');
});

test('entidades de solo lectura no son editables', () => {
  assert.equal(publicSchema('activity_logs').readonly, true);
  assert.equal(publicSchema('schema_migrations').readonly, true);
  assert.equal(publicSchema('profiles').deletable, false);
});
