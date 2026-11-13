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
export async function getDashboard() {
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
      (select coalesce(sum(valor),0) from public.bonificaciones where estado='aplicada') as bonuses`);

  const projects = await query(`select id, valor_total as total_amount, nombre_proyecto as project_name, cliente_id as client_id, estado as status from public.proyectos`);
  const contracts = await query(`select proyecto_id as project_id, valor_contrato as amount from public.contratos where estado <> 'cancelado'`);
  const contracted = contractedValue(contracts, projects);
  const totals = computeTotals({
    contracted,
    payments: await query(`select valor as amount, estado as status, tipo_pago as payment_type from public.pagos`),
    invoices: await query(`select valor_total as total_amount, estado as status from public.facturas`),
    expenses: await query(`select valor as amount from public.gastos`),
    extraExpenses: await query(`select monto as amount from public.gastos_adicionales`),
    projectCosts: await query(`select valor as amount from public.costos_proyecto`),
    bonuses: await query(`select valor as amount, estado as status from public.bonificaciones`),
  });
  const indicators = dashboardIndicators({ clients: counts.clients, activeProjects: counts.active_projects,
    finishedProjects: counts.finished_projects, quotes: counts.quotes, invoices: counts.invoices,
    leads: counts.leads, pendingInvoices: counts.pending_invoices, totals });
  indicators.contracted = contracted;
  indicators.openTickets = counts.open_tickets;

  const incomeSeries = await query(`select to_char(date_trunc('month', fecha_pago), 'YYYY-MM') as month,
      coalesce(sum(valor),0) as value from public.pagos where estado='confirmado'
      and fecha_pago >= date_trunc('month', current_date) - interval '5 months' group by 1 order by 1`);
  const expenseSeries = await query(`select to_char(date_trunc('month', fecha_gasto), 'YYYY-MM') as month,
      coalesce(sum(valor),0) as value from public.gastos
      where fecha_gasto >= date_trunc('month', current_date) - interval '5 months' group by 1 order by 1`);
  const months = [...new Set([...incomeSeries, ...expenseSeries].map((r) => r.month))].sort();
  const monthly = months.map((month) => ({ month,
    income: round2(incomeSeries.find((r) => r.month === month)?.value || 0),
    expenses: round2(expenseSeries.find((r) => r.month === month)?.value || 0),
  }));
  const recentActivity = await query(`select id, nombre_tabla as table_name, accion as action,
      fecha_creacion as created_at, registro_id as record_id from public.registros_actividad
      order by fecha_creacion desc limit 8`);
  const recentMovements = await query(`select pa.id, pa.valor as amount, pa.fecha_pago as date, pa.estado as status,
      c.nombre_empresa as client_name, pr.nombre_proyecto as project_name from public.pagos pa
      left join public.clientes c on c.id=pa.cliente_id left join public.proyectos pr on pr.id=pa.proyecto_id
      order by pa.fecha_pago desc, pa.fecha_creacion desc limit 8`);
  const upcomingDeliveries = await query(`select e.id, e.nombre_entrega as name, e.fecha_entrega as date,
      e.estado as status, c.nombre_empresa as client_name, p.nombre_proyecto as project_name
      from public.entregas e join public.proyectos p on p.id=e.proyecto_id
      left join public.clientes c on c.id=p.cliente_id
      where e.fecha_entrega >= current_date and e.estado <> 'aprobada' order by e.fecha_entrega asc limit 8`);
  const upcomingProjectDates = await query(`select p.id, p.nombre_proyecto as name,
      p.fecha_entrega_estimada as date, p.estado as status, c.nombre_empresa as client_name
      from public.proyectos p left join public.clientes c on c.id=p.cliente_id
      where p.fecha_entrega_estimada >= current_date and p.estado not in ('finalizado','cancelado')
      order by p.fecha_entrega_estimada asc limit 8`);
  const alerts = [];
  if (totals.balance > 0) alerts.push(`Cuentas por cobrar pendientes: ${totals.balance} COP.`);
  if (counts.pending_invoices > 0) alerts.push(`${counts.pending_invoices} factura(s) pendiente(s) o vencida(s).`);
  if (counts.open_tickets > 0) alerts.push(`${counts.open_tickets} ticket(s) de soporte abierto(s).`);
  return { indicators, monthly, recentActivity, recentMovements, upcomingDeliveries, upcomingProjectDates, alerts };
}

/** Resumen contable + cuentas por cobrar por cliente y por proyecto. */
export async function getAccountingOverview(from, to) {
  const rows = await financialRows(from, to);
  const projects = await query(`select id, nombre_proyecto as project_name, cliente_id as client_id,
    valor_total as total_amount, estado as status from public.proyectos`);
  const contracted = contractedValue(rows.contracts, projects);
  const totals = computeTotals({ contracted, ...rows });
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
      invoices: rows.invoices.length, payments: rows.payments.length, expenses: rows.expenses.length,
      extraExpenses: rows.extraExpenses.length, bonuses: rows.bonuses.length, contracts: rows.contracts.length },
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
  const campaigns = await query(`select c.id, c.nombre as name, c.canal as channel, c.objetivo as objective,
    c.presupuesto as budget, c.fecha_inicio as start_date, c.fecha_finalizacion as end_date,
    c.estado as status, c.observaciones as notes, c.fecha_creacion as created_at,
    coalesce((select sum(m.inversion) from public.metricas_campanas m where m.campana_id=c.id),0) as spent,
    coalesce((select sum(m.prospectos) from public.metricas_campanas m where m.campana_id=c.id),0) as leads,
    coalesce((select sum(m.conversiones) from public.metricas_campanas m where m.campana_id=c.id),0) as conversions,
    coalesce((select sum(m.clics) from public.metricas_campanas m where m.campana_id=c.id),0) as clicks,
    coalesce((select sum(m.impresiones) from public.metricas_campanas m where m.campana_id=c.id),0) as impressions
    from public.campanas c order by c.fecha_creacion desc`);
  const metrics = campaignMetrics({ spent: campaigns.reduce((a,c)=>a+num(c.spent),0),
    leads: campaigns.reduce((a,c)=>a+num(c.leads),0), conversions: campaigns.reduce((a,c)=>a+num(c.conversions),0),
    clicks: campaigns.reduce((a,c)=>a+num(c.clicks),0), impressions: campaigns.reduce((a,c)=>a+num(c.impressions),0) });
  const byChannel = Object.values(campaigns.reduce((acc,c)=>{ const key=c.channel||'Sin canal';
    (acc[key] ||= {channel:key,budget:0,spent:0,leads:0,conversions:0}); acc[key].budget+=num(c.budget);
    acc[key].spent+=num(c.spent); acc[key].leads+=num(c.leads); acc[key].conversions+=num(c.conversions); return acc;
  },{})).map((row)=>({...row,budget:round2(row.budget),spent:round2(row.spent)}));
  const leads = await query(`select id, nombre_empresa as company_name, nombre_contacto as contact_name,
    correo_electronico as email, telefono as phone, origen as source, servicio_interes as interest,
    valor_estimado as estimated_value, estado as status, asignado_a as assigned_to,
    cliente_convertido_id as converted_client_id, observaciones as notes, fecha_creacion as created_at
    from public.prospectos order by fecha_creacion desc`);
  const leadFunnel = Object.values(leads.reduce((acc,lead)=>{ (acc[lead.status] ||= {status:lead.status,count:0,value:0});
    acc[lead.status].count+=1; acc[lead.status].value+=num(lead.estimated_value); return acc;
  },{})).map((row)=>({...row,value:round2(row.value)}));
  return { indicators: {...metrics,campaigns:campaigns.length,totalLeads:leads.length,budget:sum(campaigns,'budget')}, campaigns, byChannel, leadFunnel };
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
