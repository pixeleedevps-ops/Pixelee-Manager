import { query, queryOne } from '../db.js';
import { num, round2, sum, margin, computeTotals, campaignMetrics, dashboardIndicators } from './finance.js';

const RANGE = (from, to, col) => {
  const parts = [];
  const params = [];
  if (from) { params.push(from); parts.push(`${col} >= $${params.length}::date`); }
  if (to) { params.push(to); parts.push(`${col} <= $${params.length}::date`); }
  return { sql: parts.length ? ` and ${parts.join(' and ')}` : '', params };
};

/** Consulta base de movimientos financieros con rango opcional de fechas. */
async function financialRows(from, to) {
  const p = RANGE(from, to, 'fecha_pago');
  const e = RANGE(from, to, 'fecha_gasto');
  const ee = RANGE(from, to, 'fecha_gasto');
  const pc = RANGE(from, to, 'fecha_costo');
  const b = RANGE(from, to, 'fecha_asignacion');
  const i = RANGE(from, to, 'fecha_emision');

  const [payments, expenses, extraExpenses, projectCosts, bonuses, invoices, contracts] = await Promise.all([
    query(`select *, proyecto_id as project_id, cliente_id as client_id, valor as amount, fecha_pago as payment_date, metodo_pago as payment_method, tipo_pago as payment_type, estado as status, url_comprobante as receipt_url, observaciones as notes, registrado_por as registered_by, fecha_creacion as created_at from public.pagos where true ${p.sql} order by fecha_pago desc`, p.params),
    query(`select *, proyecto_id as project_id, categoria as category, descripcion as description, valor as amount, fecha_gasto as expense_date, proveedor as supplier, metodo_pago as payment_method, url_comprobante as receipt_url, registrado_por as registered_by, fecha_creacion as created_at from public.gastos where true ${e.sql} order by fecha_gasto desc`, e.params),
    query(`select *, proyecto_id as project_id, descripcion as description, categoria as category, monto as amount, fecha_gasto as spent_at, url_comprobante as receipt_url, observaciones as notes, creado_por as created_by, fecha_creacion as created_at from public.gastos_adicionales where true ${ee.sql} order by fecha_gasto desc`, ee.params),
    query(`select *, proyecto_id as project_id, tipo_costo as cost_type, descripcion as description, valor as amount, fecha_costo as cost_date, gasto_id as expense_id, fecha_creacion as created_at from public.costos_proyecto where true ${pc.sql} order by fecha_costo desc`, pc.params),
    query(`select *, cliente_id as client_id, proyecto_id as project_id, valor as amount, motivo as reason, estado as status, fecha_asignacion as granted_at, observaciones as notes, creado_por as created_by, fecha_creacion as created_at from public.bonificaciones where true ${b.sql} order by fecha_asignacion desc`, b.params),
    query(`select *, cliente_id as client_id, proyecto_id as project_id, numero_factura as invoice_number, fecha_emision as issue_date, fecha_vencimiento as due_date, valor_impuestos as tax_amount, valor_total as total_amount, estado as status, url_factura as invoice_url, fecha_creacion as created_at from public.facturas where true ${i.sql} order by fecha_emision desc`, i.params),
    query(`select ct.*, ct.proyecto_id as project_id, ct.valor_contrato as amount, ct.estado as status, ct.fecha_creacion as created_at, p.cliente_id as client_id, p.nombre_proyecto as project_name from public.contratos ct join public.proyectos p on p.id = ct.proyecto_id where ct.estado <> 'cancelado'`),
  ]);
  return { payments, expenses, extraExpenses, projectCosts, bonuses, invoices, contracts };
}

function contractedValue(contracts, projects) {
  // Valor contratado: contratos vigentes; si un proyecto no tiene contrato,
  // se usa projects.total_amount (sin duplicar).
  const withContract = new Set(contracts.map((c) => c.project_id));
  const fromContracts = sum(contracts);
  const fallback = sum(
    (projects || []).filter((p) => !withContract.has(p.id)),
    'total_amount'
  );
  return round2(fromContracts + fallback);
}

/** Indicadores + series + actividad para el Dashboard. */
export async function getDashboardSummary() {
  const counts = await queryOne(`
    select
      (select count(*)::int from public.clientes) as clients,
      (select count(*)::int from public.proyectos where estado in ('pendiente','en_proceso','en_revision','pausado')) as active_projects,
      (select count(*)::int from public.proyectos where estado='finalizado') as finished_projects,
      (select count(*)::int from public.cotizaciones) as quotes,
      (select count(*)::int from public.facturas) as invoices,
      (select count(*)::int from public.prospectos) as leads,
      (select count(*)::int from public.facturas where estado in ('pendiente','vencida')) as pending_invoices,
      (select count(*)::int from public.tickets_soporte where estado in ('abierto','en_proceso','esperando_cliente')) as open_tickets,
      (select coalesce(sum(valor),0) from public.pagos where estado='confirmado') as income,
      (select coalesce(sum(valor_total),0) from public.facturas where estado <> 'anulada') as invoiced,
      (select coalesce(sum(valor),0) from public.gastos) as expenses,
      (select coalesce(sum(monto),0) from public.gastos_adicionales) as extra_expenses,
      (select coalesce(sum(valor),0) from public.costos_proyecto) as project_costs,
      (select coalesce(sum(valor),0) from public.bonificaciones where estado='aplicada') as bonuses,
      (select coalesce(sum(valor),0) from public.pagos where estado='confirmado') as confirmed_payments,
      (select coalesce(sum(valor),0) from public.pagos where estado='reembolsado' or tipo_pago='reembolso') as refunds,
      (select coalesce(sum(valor_contrato),0) from public.contratos where estado <> 'cancelado')
        + (select coalesce(sum(p.valor_total),0) from public.proyectos p where not exists
          (select 1 from public.contratos c where c.proyecto_id=p.id and c.estado <> 'cancelado')) as contracted`);
  const collected = round2(num(counts.confirmed_payments) - num(counts.refunds));
  const totalExpenses = round2(num(counts.expenses) + num(counts.extra_expenses) + num(counts.project_costs));
  const profit = round2(collected - totalExpenses - num(counts.bonuses));
  const totals = {
    contracted: num(counts.contracted), invoiced: num(counts.invoiced), collected,
    refunds: num(counts.refunds), balance: round2(num(counts.contracted) - collected),
    normalExpenses: num(counts.expenses), extraExpenses: num(counts.extra_expenses),
    projectCosts: num(counts.project_costs), totalExpenses, bonuses: num(counts.bonuses),
    profit, margin: margin(collected, profit),
  };
  const indicators = dashboardIndicators({ clients: counts.clients, activeProjects: counts.active_projects,
    finishedProjects: counts.finished_projects, quotes: counts.quotes, invoices: counts.invoices,
    leads: counts.leads, pendingInvoices: counts.pending_invoices, totals });
  indicators.contracted = num(counts.contracted);
  indicators.openTickets = counts.open_tickets;

  const alerts = [];
  if (totals.balance > 0) alerts.push(`Cuentas por cobrar pendientes: ${totals.balance} COP.`);
  if (counts.pending_invoices > 0) alerts.push(`${counts.pending_invoices} factura(s) pendiente(s) o vencida(s).`);
  if (counts.open_tickets > 0) alerts.push(`${counts.open_tickets} ticket(s) de soporte abierto(s).`);
  return { indicators, alerts };
}

export async function getDashboardDetails() {
  const [incomeSeries, expenseSeries, recentActivity, recentMovements, upcomingDeliveries, upcomingProjectDates] = await Promise.all([
    query(`select to_char(date_trunc('month', fecha_pago), 'YYYY-MM') as month,
      coalesce(sum(valor),0) as value from public.pagos where estado='confirmado'
      and fecha_pago >= date_trunc('month', current_date) - interval '5 months' group by 1 order by 1`),
    query(`select to_char(date_trunc('month', fecha_gasto), 'YYYY-MM') as month,
      coalesce(sum(valor),0) as value from public.gastos
      where fecha_gasto >= date_trunc('month', current_date) - interval '5 months' group by 1 order by 1`),
    query(`select id, nombre_tabla as table_name, accion as action, fecha_creacion as created_at, registro_id as record_id
      from public.registros_actividad order by fecha_creacion desc limit 8`),
    query(`select pa.id, pa.valor as amount, pa.fecha_pago as date, pa.estado as status,
      c.nombre_empresa as client_name, pr.nombre_proyecto as project_name from public.pagos pa
      left join public.clientes c on c.id=pa.cliente_id left join public.proyectos pr on pr.id=pa.proyecto_id
      order by pa.fecha_pago desc, pa.fecha_creacion desc limit 8`),
    query(`select e.id, e.nombre_entrega as name, e.fecha_entrega as date, e.estado as status,
      c.nombre_empresa as client_name, p.nombre_proyecto as project_name from public.entregas e
      join public.proyectos p on p.id=e.proyecto_id left join public.clientes c on c.id=p.cliente_id
      where e.fecha_entrega >= current_date and e.estado <> 'aprobada' order by e.fecha_entrega asc limit 8`),
    query(`select p.id, p.nombre_proyecto as name, p.fecha_entrega_estimada as date, p.estado as status,
      c.nombre_empresa as client_name from public.proyectos p left join public.clientes c on c.id=p.cliente_id
      where p.fecha_entrega_estimada >= current_date and p.estado not in ('finalizado','cancelado')
      order by p.fecha_entrega_estimada asc limit 8`),
  ]);
  const months = [...new Set([...incomeSeries, ...expenseSeries].map((r) => r.month))].sort();
  const monthly = months.map((month) => ({ month,
    income: round2(incomeSeries.find((r) => r.month === month)?.value || 0),
    expenses: round2(expenseSeries.find((r) => r.month === month)?.value || 0),
  }));
  return { monthly, recentActivity, recentMovements, upcomingDeliveries, upcomingProjectDates };
}

export async function getDashboard() {
  const [summary, details] = await Promise.all([getDashboardSummary(), getDashboardDetails()]);
  return { ...summary, ...details };
}

/** Resumen contable + cuentas por cobrar por cliente y por proyecto. */
export async function getAccountingOverview(from, to) {
  const p = RANGE(from, to, 'fecha_pago'); const e = RANGE(from, to, 'fecha_gasto');
  const ee = RANGE(from, to, 'fecha_gasto'); const pc = RANGE(from, to, 'fecha_costo');
  const b = RANGE(from, to, 'fecha_asignacion'); const i = RANGE(from, to, 'fecha_emision');
  const [payments, expenses, extraExpenses, projectCosts, bonuses, invoices, contracts, contractedRow] = await Promise.all([
    queryOne(`select count(*)::int as count, coalesce(sum(valor) filter (where estado='confirmado'),0) as confirmed,
      coalesce(sum(valor) filter (where estado='reembolsado' or tipo_pago='reembolso'),0) as refunds from public.pagos where true ${p.sql}`, p.params),
    queryOne(`select count(*)::int as count, coalesce(sum(valor),0) as amount from public.gastos where true ${e.sql}`, e.params),
    queryOne(`select count(*)::int as count, coalesce(sum(monto),0) as amount from public.gastos_adicionales where true ${ee.sql}`, ee.params),
    queryOne(`select count(*)::int as count, coalesce(sum(valor),0) as amount from public.costos_proyecto where true ${pc.sql}`, pc.params),
    queryOne(`select count(*)::int as count, coalesce(sum(valor) filter (where estado='aplicada'),0) as amount from public.bonificaciones where true ${b.sql}`, b.params),
    queryOne(`select count(*)::int as count, coalesce(sum(valor_total) filter (where estado<>'anulada'),0) as amount from public.facturas where true ${i.sql}`, i.params),
    queryOne(`select count(*)::int as count from public.contratos where estado<>'cancelado'`),
    queryOne(`select
      (select coalesce(sum(valor_contrato),0) from public.contratos where estado<>'cancelado') +
      (select coalesce(sum(p.valor_total),0) from public.proyectos p where not exists
        (select 1 from public.contratos c where c.proyecto_id=p.id and c.estado<>'cancelado')) as amount`),
  ]);
  const collected = round2(num(payments.confirmed) - num(payments.refunds));
  const totalExpenses = round2(num(expenses.amount) + num(extraExpenses.amount) + num(projectCosts.amount));
  const profit = round2(collected - totalExpenses - num(bonuses.amount));
  const totals = {
    contracted: num(contractedRow.amount), invoiced: num(invoices.amount), collected,
    refunds: num(payments.refunds), balance: round2(num(contractedRow.amount) - collected),
    normalExpenses: num(expenses.amount), extraExpenses: num(extraExpenses.amount),
    projectCosts: num(projectCosts.amount), totalExpenses, bonuses: num(bonuses.amount),
    profit, margin: margin(collected, profit),
  };
  const byClient = await query(`select c.id, c.nombre_empresa as name, c.codigo_cliente as code,
    coalesce((select sum(ct.valor_contrato) from public.contratos ct join public.proyectos p on p.id=ct.proyecto_id
      where p.cliente_id=c.id and ct.estado <> 'cancelado'),0) as contracted,
    coalesce((select sum(pa.valor) from public.pagos pa where pa.cliente_id=c.id and pa.estado='confirmado'),0) as collected,
    coalesce((select sum(g.valor) from public.gastos g join public.proyectos p on p.id=g.proyecto_id where p.cliente_id=c.id),0) as expenses,
    coalesce((select sum(f.valor_total) from public.facturas f where f.cliente_id=c.id and f.estado <> 'anulada'),0) as invoiced
    from public.clientes c order by c.nombre_empresa`);
  const byProject = await query(`select p.id, p.nombre_proyecto as name, p.codigo_proyecto as code,
    p.estado as status, c.nombre_empresa as client_name, p.valor_total as total_amount,
    coalesce((select sum(ct.valor_contrato) from public.contratos ct where ct.proyecto_id=p.id and ct.estado <> 'cancelado'),0) as contracted,
    coalesce((select sum(pa.valor) from public.pagos pa where pa.proyecto_id=p.id and pa.estado='confirmado'),0) as collected,
    coalesce((select sum(g.valor) from public.gastos g where g.proyecto_id=p.id),0) as expenses
    from public.proyectos p left join public.clientes c on c.id=p.cliente_id order by p.fecha_creacion desc`);
  const decorate = (row) => {
    const contractedAmount = num(row.contracted) || num(row.total_amount);
    const collected = num(row.collected); const expenses = num(row.expenses);
    return { ...row, contracted: round2(contractedAmount), collected: round2(collected), expenses: round2(expenses),
      invoiced: round2(row.invoiced), balance: round2(contractedAmount-collected),
      profit: round2(collected-expenses), margin: margin(collected,collected-expenses) };
  };
  const decoratedClients = byClient.map(decorate); const decoratedProjects = byProject.map(decorate);
  return { totals, byClient: decoratedClients, byProject: decoratedProjects,
    counts: { quotes: (await queryOne('select count(*)::int c from public.cotizaciones')).c,
      invoices: invoices.count, payments: payments.count, expenses: expenses.count,
      extraExpenses: extraExpenses.count, bonuses: bonuses.count, contracts: contracts.count },
    receivables: decoratedClients.filter((row) => row.balance > 0) };
}

/** Vista consolidada de Gerencia (información financiera privada). */
export async function getManagementOverview(from, to, userId) {
  const accounting = await getAccountingOverview(from, to);
  const distributions = await query(`select d.id, d.periodo_inicio as period_start, d.periodo_fin as period_end,
    d.utilidad_total as total_profit, d.estado as status, d.observaciones as notes,
    d.creado_por as created_by, d.fecha_creacion as created_at, d.fecha_actualizacion as updated_at,
    coalesce((select sum(i.monto) from public.detalle_distribucion_utilidades i where i.distribucion_id=d.id),0) as distributed,
    (select count(*)::int from public.detalle_distribucion_utilidades i where i.distribucion_id=d.id) as participants
    from public.distribuciones_utilidades d order by d.periodo_inicio desc`);
  const withdrawals = await query(`select r.*, r.detalle_distribucion_id as distribution_item_id,
    r.perfil_id as profile_id, r.monto as amount, r.fecha_retiro as withdrawn_at,
    r.observaciones as notes, r.creado_por as created_by, r.fecha_creacion as created_at,
    pe.full_name as profile_name from public.retiros r left join public.perfiles pe on pe.id=r.perfil_id
    order by r.fecha_retiro desc`);
  const teamActivity = await query(`select h.id, h.fecha_trabajo as work_date, h.horas,
    h.descripcion as description, pe.full_name as user_name, p.nombre_proyecto as project_name
    from public.registros_horas h left join public.perfiles pe on pe.id=h.usuario_id
    left join public.proyectos p on p.id=h.proyecto_id order by h.fecha_trabajo desc limit 20`);
  const myItems = userId ? await query(`select i.*, i.distribucion_id as distribution_id, i.perfil_id as profile_id,
    i.porcentaje as percentage, i.monto as amount, i.estado as status, i.fecha_creacion as created_at,
    d.periodo_inicio as period_start, d.periodo_fin as period_end, d.estado as distribution_status
    from public.detalle_distribucion_utilidades i join public.distribuciones_utilidades d on d.id=i.distribucion_id
    where i.perfil_id=$1::uuid order by d.periodo_inicio desc`, [userId]) : [];
  const myWithdrawals = userId ? await query(`select r.*, r.perfil_id as profile_id, r.monto as amount,
    r.fecha_retiro as withdrawn_at, r.observaciones as notes, r.detalle_distribucion_id as distribution_item_id
    from public.retiros r where r.perfil_id=$1::uuid order by r.fecha_retiro desc`, [userId]) : [];
  const myTotal = sum(myItems); const myWithdrawn = sum(myWithdrawals);
  return { ...accounting, distributions, withdrawals, teamActivity,
    myUtilities: { accumulated: myTotal, withdrawn: myWithdrawn, pending: round2(myTotal-myWithdrawn), items: myItems } };
}

/** Informe de Marketing sobre datos reales. */
export async function getMarketingOverview() {
  const [campaigns, campaignTotals, byChannel, leadFunnel, leads] = await Promise.all([
    query(`select c.id, c.nombre as name, c.canal as channel, c.objetivo as objective,
    c.presupuesto as budget, c.fecha_inicio as start_date, c.fecha_finalizacion as end_date,
    c.estado as status, c.observaciones as notes, c.fecha_creacion as created_at,
    coalesce(m.spent,0) as spent, coalesce(m.leads,0) as leads,
    coalesce(m.conversions,0) as conversions, coalesce(m.clicks,0) as clicks, coalesce(m.impressions,0) as impressions
    from public.campanas c left join (select campana_id, sum(inversion) as spent, sum(prospectos) as leads,
      sum(conversiones) as conversions, sum(clics) as clicks, sum(impresiones) as impressions
      from public.metricas_campanas group by campana_id) m on m.campana_id=c.id
    order by c.fecha_creacion desc limit 100`),
    queryOne(`select (select count(*)::int from public.campanas) as count,
      (select coalesce(sum(presupuesto),0) from public.campanas) as budget,
      coalesce(sum(inversion),0) as spent, coalesce(sum(prospectos),0) as leads,
      coalesce(sum(conversiones),0) as conversions, coalesce(sum(clics),0) as clicks,
      coalesce(sum(impresiones),0) as impressions from public.metricas_campanas`),
    query(`with budgets as (select coalesce(canal,'Sin canal') as channel, sum(presupuesto) as budget
      from public.campanas group by coalesce(canal,'Sin canal')),
      metrics as (select coalesce(c.canal,'Sin canal') as channel, sum(m.inversion) as spent,
      sum(m.prospectos) as leads, sum(m.conversiones) as conversions from public.metricas_campanas m
      join public.campanas c on c.id=m.campana_id group by coalesce(c.canal,'Sin canal'))
      select b.channel, b.budget, coalesce(m.spent,0) as spent, coalesce(m.leads,0) as leads,
      coalesce(m.conversions,0) as conversions from budgets b left join metrics m using(channel) order by b.channel`),
    query(`select estado as status, count(*)::int as count, coalesce(sum(valor_estimado),0) as value
      from public.prospectos group by estado order by estado`),
    queryOne('select count(*)::int as count from public.prospectos'),
  ]);
  const metrics = campaignMetrics(campaignTotals);
  return { indicators: {...metrics,campaigns:campaignTotals.count,totalLeads:leads.count,budget:num(campaignTotals.budget)},
    campaigns, byChannel, leadFunnel: leadFunnel.map((row)=>({...row, value:round2(row.value)})) };
}

/** Ficha financiera de un cliente (para la vista de detalle). */
export async function getClientFinancials(clientId) {
  const contracts = await query(`select ct.proyecto_id as project_id, ct.valor_contrato as amount,
    ct.estado as status, p.nombre_proyecto as project_name from public.contratos ct
    join public.proyectos p on p.id=ct.proyecto_id where p.cliente_id=$1 and ct.estado <> 'cancelado'`, [clientId]);
  const projects = await query(`select id, nombre_proyecto as project_name, cliente_id as client_id,
    valor_total as total_amount from public.proyectos where cliente_id=$1`, [clientId]);
  const rows = await financialRows('', '');
  const filter=(arr,key='client_id')=>(arr||[]).filter((row)=>row[key]===clientId);
  const totals=computeTotals({contracted:contractedValue(contracts,projects),payments:filter(rows.payments),
    invoices:filter(rows.invoices),expenses:[],extraExpenses:[],projectCosts:[],bonuses:filter(rows.bonuses)});
  const projectIds=projects.map((project)=>project.id);
  const expenses=rows.expenses.filter((row)=>projectIds.includes(row.project_id));
  const extras=rows.extraExpenses.filter((row)=>projectIds.includes(row.project_id));
  const costs=rows.projectCosts.filter((row)=>projectIds.includes(row.project_id));
  totals.totalExpenses=round2(sum(expenses)+sum(extras)+sum(costs));
  totals.profit=round2(totals.collected-totals.totalExpenses-totals.bonuses);
  totals.margin=margin(totals.collected,totals.profit); return totals;
}

/** Ficha financiera de un proyecto. */
export async function getProjectFinancials(projectId) {
  const project=await queryOne(`select id, valor_total as total_amount from public.proyectos where id=$1`,[projectId]);
  if(!project)return null;
  const [contracts,payments,invoices,expenses,extras,costs,bonuses]=await Promise.all([
    query(`select proyecto_id as project_id, valor_contrato as amount, estado as status from public.contratos where proyecto_id=$1 and estado<>$2`,[projectId,'cancelado']),
    query(`select proyecto_id as project_id, cliente_id as client_id, valor as amount, estado as status, tipo_pago as payment_type from public.pagos where proyecto_id=$1`,[projectId]),
    query(`select proyecto_id as project_id, cliente_id as client_id, valor_total as total_amount, estado as status from public.facturas where proyecto_id=$1`,[projectId]),
    query(`select proyecto_id as project_id, valor as amount from public.gastos where proyecto_id=$1`,[projectId]),
    query(`select proyecto_id as project_id, monto as amount from public.gastos_adicionales where proyecto_id=$1`,[projectId]),
    query(`select proyecto_id as project_id, valor as amount from public.costos_proyecto where proyecto_id=$1`,[projectId]),
    query(`select proyecto_id as project_id, valor as amount, estado as status from public.bonificaciones where proyecto_id=$1`,[projectId]),
  ]);
  return computeTotals({contracted:contracts.length?sum(contracts):num(project.total_amount),payments,invoices,expenses,extraExpenses:extras,projectCosts:costs,bonuses});
}
