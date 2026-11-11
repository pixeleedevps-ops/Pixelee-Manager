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
  const p = RANGE(from, to, 'payment_date');
  const e = RANGE(from, to, 'expense_date');
  const ee = RANGE(from, to, 'spent_at');
  const pc = RANGE(from, to, 'cost_date');
  const b = RANGE(from, to, 'granted_at');
  const i = RANGE(from, to, 'issue_date');

  const [payments, expenses, extraExpenses, projectCosts, bonuses, invoices, contracts] = await Promise.all([
    query(`select * from public.payments where true ${p.sql} order by payment_date desc`, p.params),
    query(`select * from public.expenses where true ${e.sql} order by expense_date desc`, e.params),
    query(`select * from public.extra_expenses where true ${ee.sql} order by spent_at desc`, ee.params),
    query(`select * from public.project_costs where true ${pc.sql} order by cost_date desc`, pc.params),
    query(`select * from public.bonuses where true ${b.sql} order by granted_at desc`, b.params),
    query(`select * from public.invoices where true ${i.sql} order by issue_date desc`, i.params),
    query(`select ct.*, p.client_id, p.project_name from public.contracts ct
           join public.projects p on p.id = ct.project_id
           where ct.status <> 'cancelado'`),
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
      (select count(*)::int from public.clients)                              as clients,
      (select count(*)::int from public.projects
         where status in ('pendiente','en_proceso','en_revision','pausado')) as active_projects,
      (select count(*)::int from public.projects where status='finalizado')  as finished_projects,
      (select count(*)::int from public.quotes)                              as quotes,
      (select count(*)::int from public.invoices)                            as invoices,
      (select count(*)::int from public.leads)                               as leads,
      (select count(*)::int from public.invoices
         where status in ('pendiente','vencida'))                            as pending_invoices,
      (select count(*)::int from public.tickets
         where status in ('abierto','en_proceso','esperando_cliente'))       as open_tickets,
      (select coalesce(sum(amount),0) from public.payments
         where status='confirmado')                                          as income,
      (select coalesce(sum(total_amount),0) from public.invoices
         where status <> 'anulada')                                          as invoiced,
      (select coalesce(sum(amount),0) from public.expenses)                  as expenses,
      (select coalesce(sum(amount),0) from public.extra_expenses)            as extra_expenses,
      (select coalesce(sum(amount),0) from public.project_costs)             as project_costs,
      (select coalesce(sum(amount),0) from public.bonuses
         where status='aplicada')                                            as bonuses
  `);

  const projects = await query('select id, total_amount, project_name, client_id, status from public.projects');
  const contracts = await query(`select project_id, amount from public.contracts where status <> 'cancelado'`);
  const contracted = contractedValue(contracts, projects);

  const totals = computeTotals({
    contracted,
    payments: await query(`select amount, status, payment_type from public.payments`),
    invoices: await query(`select total_amount, status from public.invoices`),
    expenses: await query(`select amount from public.expenses`),
    extraExpenses: await query(`select amount from public.extra_expenses`),
    projectCosts: await query(`select amount from public.project_costs`),
    bonuses: await query(`select amount, status from public.bonuses`),
  });

  const indicators = dashboardIndicators({
    clients: counts.clients,
    activeProjects: counts.active_projects,
    finishedProjects: counts.finished_projects,
    quotes: counts.quotes,
    invoices: counts.invoices,
    leads: counts.leads,
    pendingInvoices: counts.pending_invoices,
    totals,
  });
  indicators.contracted = contracted;
  indicators.openTickets = counts.open_tickets;

  // Serie mensual real: recaudos confirmados vs gastos.
  const incomeSeries = await query(`
    select to_char(date_trunc('month', payment_date), 'YYYY-MM') as month,
           coalesce(sum(amount),0) as value
    from public.payments
    where status='confirmado' and payment_date >= date_trunc('month', current_date) - interval '5 months'
    group by 1 order by 1`);
  const expenseSeries = await query(`
    select to_char(date_trunc('month', expense_date), 'YYYY-MM') as month,
           coalesce(sum(amount),0) as value
    from public.expenses
    where expense_date >= date_trunc('month', current_date) - interval '5 months'
    group by 1 order by 1`);
  const months = [...new Set([...incomeSeries, ...expenseSeries].map((r) => r.month))].sort();
  const monthly = months.map((m) => ({
    month: m,
    income: round2(incomeSeries.find((r) => r.month === m)?.value || 0),
    expenses: round2(expenseSeries.find((r) => r.month === m)?.value || 0),
  }));

  const recentActivity = await query(`
    select id, table_name, action, created_at, record_id from public.activity_logs
    order by created_at desc limit 8`);
  const recentMovements = await query(`
    select p.id, p.amount, p.payment_date as date, p.status, c.company_name as client_name,
           pr.project_name
    from public.payments p
    left join public.clients c on c.id = p.client_id
    left join public.projects pr on pr.id = p.project_id
    order by p.payment_date desc, p.created_at desc limit 8`);
  const upcomingDeliveries = await query(`
    select d.id, d.delivery_name as name, d.delivery_date as date, d.status,
           c.company_name as client_name, pr.project_name
    from public.deliveries d
    join public.projects pr on pr.id = d.project_id
    left join public.clients c on c.id = pr.client_id
    where d.delivery_date >= current_date and d.status <> 'aprobada'
    order by d.delivery_date asc limit 8`);
  const upcomingProjectDates = await query(`
    select p.id, p.project_name as name, p.estimated_delivery_date as date, p.status,
           c.company_name as client_name
    from public.projects p
    left join public.clients c on c.id = p.client_id
    where p.estimated_delivery_date >= current_date
      and p.status not in ('finalizado','cancelado')
    order by p.estimated_delivery_date asc limit 8`);

  const alerts = [];
  if (totals.balance > 0) alerts.push(`Cuentas por cobrar pendientes: ${totals.balance} COP.`);
  if (counts.pending_invoices > 0) alerts.push(`${counts.pending_invoices} factura(s) pendiente(s) o vencida(s).`);
  if (counts.open_tickets > 0) alerts.push(`${counts.open_tickets} ticket(s) de soporte abierto(s).`);

  return { indicators, monthly, recentActivity, recentMovements, upcomingDeliveries, upcomingProjectDates, alerts };
}

/** Resumen contable + cuentas por cobrar por cliente y por proyecto. */
export async function getAccountingOverview(from, to) {
  const rows = await financialRows(from, to);
  const projects = await query('select id, project_name, client_id, total_amount, status from public.projects');
  const clients = await query('select id, company_name, code from public.clients');
  const contracted = contractedValue(rows.contracts, projects);
  const totals = computeTotals({ contracted, ...rows });

  const byClient = await query(`
    select c.id, c.company_name as name, c.code,
      coalesce((select sum(ct.amount) from public.contracts ct
                  join public.projects p on p.id = ct.project_id
                  where p.client_id = c.id and ct.status <> 'cancelado'), 0) as contracted,
      coalesce((select sum(pa.amount) from public.payments pa
                  where pa.client_id = c.id and pa.status = 'confirmado'), 0) as collected,
      coalesce((select sum(e.amount) from public.expenses e
                  join public.projects p on p.id = e.project_id
                  where p.client_id = c.id), 0) as expenses,
      coalesce((select sum(i.total_amount) from public.invoices i
                  where i.client_id = c.id and i.status <> 'anulada'), 0) as invoiced
    from public.clients c order by c.company_name`);

  const byProject = await query(`
    select p.id, p.project_name as name, p.code, p.status, c.company_name as client_name,
      coalesce((select sum(ct.amount) from public.contracts ct
                  where ct.project_id = p.id and ct.status <> 'cancelado'), 0) as contracted,
      coalesce((select sum(pa.amount) from public.payments pa
                  where pa.project_id = p.id and pa.status = 'confirmado'), 0) as collected,
      coalesce((select sum(e.amount) from public.expenses e
                  where e.project_id = p.id), 0) as expenses
    from public.projects p
    left join public.clients c on c.id = p.client_id
    order by p.created_at desc`);

  const decorate = (r) => {
    const c = num(r.contracted) || num(r.total_amount);
    const collected = num(r.collected);
    const expenses = num(r.expenses);
    return {
      ...r,
      contracted: round2(c), collected: round2(collected), expenses: round2(expenses),
      invoiced: round2(r.invoiced),
      balance: round2(c - collected),
      profit: round2(collected - expenses),
      margin: margin(collected, collected - expenses),
    };
  };

  return {
    totals,
    byClient: byClient.map(decorate),
    byProject: byProject.map(decorate),
    counts: {
      quotes: (await queryOne('select count(*)::int c from public.quotes')).c,
      invoices: rows.invoices.length,
      payments: rows.payments.length,
      expenses: rows.expenses.length,
      extraExpenses: rows.extraExpenses.length,
      bonuses: rows.bonuses.length,
      contracts: rows.contracts.length,
    },
    receivables: byClient.map(decorate).filter((r) => r.balance > 0),
  };
}

/** Vista consolidada de Gerencia (información financiera privada). */
export async function getManagementOverview(from, to, userId) {
  const accounting = await getAccountingOverview(from, to);
  const distributions = await query(`
    select d.*,
      coalesce((select sum(amount) from public.profit_distribution_items
                where distribution_id = d.id), 0) as distributed,
      (select count(*)::int from public.profit_distribution_items
                where distribution_id = d.id) as participants
    from public.profit_distributions d order by d.period_start desc`);
  const withdrawals = await query(`
    select w.*, pr.full_name as profile_name
    from public.withdrawals w
    left join public.profiles pr on pr.id = w.profile_id
    order by w.withdrawn_at desc`);
  const teamActivity = await query(`
    select te.id, te.work_date, te.hours, te.description,
           pr.full_name as user_name, p.project_name
    from public.time_entries te
    left join public.profiles pr on pr.id = te.user_id
    left join public.projects p on p.id = te.project_id
    order by te.work_date desc limit 20`);

  // Sección privada: participaciones del usuario autenticado.
  const myItems = userId ? await query(`
    select it.*, d.period_start, d.period_end, d.status as distribution_status
    from public.profit_distribution_items it
    join public.profit_distributions d on d.id = it.distribution_id
    where it.profile_id = $1::uuid
    order by d.period_start desc`, [userId]) : [];
  const myWithdrawals = userId ? await query(`
    select * from public.withdrawals where profile_id = $1::uuid order by withdrawn_at desc`, [userId]) : [];
  const myTotal = sum(myItems);
  const myWithdrawn = sum(myWithdrawals);

  return {
    ...accounting,
    distributions,
    withdrawals,
    teamActivity,
    myUtilities: {
      accumulated: myTotal,
      withdrawn: myWithdrawn,
      pending: round2(myTotal - myWithdrawn),
      items: myItems,
    },
  };
}

/** Informe de Marketing sobre datos reales. */
export async function getMarketingOverview() {
  const campaigns = await query(`
    select c.*,
      coalesce((select sum(spent) from public.campaign_metrics where campaign_id = c.id), 0) as spent,
      coalesce((select sum(leads) from public.campaign_metrics where campaign_id = c.id), 0) as leads,
      coalesce((select sum(conversions) from public.campaign_metrics where campaign_id = c.id), 0) as conversions,
      coalesce((select sum(clicks) from public.campaign_metrics where campaign_id = c.id), 0) as clicks,
      coalesce((select sum(impressions) from public.campaign_metrics where campaign_id = c.id), 0) as impressions
    from public.campaigns c order by c.created_at desc`);
  const metrics = campaignMetrics({
    spent: campaigns.reduce((a, c) => a + num(c.spent), 0),
    leads: campaigns.reduce((a, c) => a + num(c.leads), 0),
    conversions: campaigns.reduce((a, c) => a + num(c.conversions), 0),
    clicks: campaigns.reduce((a, c) => a + num(c.clicks), 0),
    impressions: campaigns.reduce((a, c) => a + num(c.impressions), 0),
  });
  const byChannel = Object.values(campaigns.reduce((acc, c) => {
    const k = c.channel || 'Sin canal';
    (acc[k] ||= { channel: k, budget: 0, spent: 0, leads: 0, conversions: 0 });
    acc[k].budget += num(c.budget);
    acc[k].spent += num(c.spent);
    acc[k].leads += num(c.leads);
    acc[k].conversions += num(c.conversions);
    return acc;
  }, {})).map((r) => ({ ...r, budget: round2(r.budget), spent: round2(r.spent) }));
  const leads = await query('select * from public.leads order by created_at desc');
  const leadFunnel = Object.values(leads.reduce((acc, l) => {
    (acc[l.status] ||= { status: l.status, count: 0, value: 0 });
    acc[l.status].count += 1;
    acc[l.status].value += num(l.estimated_value);
    return acc;
  }, {})).map((r) => ({ ...r, value: round2(r.value) }));
  return {
    indicators: { ...metrics, campaigns: campaigns.length, totalLeads: leads.length, budget: sum(campaigns, 'budget') },
    campaigns, byChannel, leadFunnel,
  };
}

/** Ficha financiera de un cliente (para la vista de detalle). */
export async function getClientFinancials(clientId) {
  const contracts = await query(`
    select ct.*, p.project_name from public.contracts ct
    join public.projects p on p.id = ct.project_id
    where p.client_id = $1 and ct.status <> 'cancelado'`, [clientId]);
  const projects = await query('select id, project_name, total_amount from public.projects where client_id = $1', [clientId]);
  const rows = await financialRows('', '');
  const filter = (arr, key = 'client_id') => (arr || []).filter((r) => r[key] === clientId);
  const totals = computeTotals({
    contracted: contractedValue(
      contracts.map((c) => ({ ...c, project_id: c.project_id })),
      projects
    ),
    payments: filter(rows.payments),
    invoices: filter(rows.invoices),
    expenses: [], extraExpenses: [], projectCosts: [], bonuses: filter(rows.bonuses),
  });
  const projectIds = projects.map((p) => p.id);
  const expenses = rows.expenses.filter((e) => projectIds.includes(e.project_id));
  const extras = rows.extraExpenses.filter((e) => projectIds.includes(e.project_id));
  const costs = rows.projectCosts.filter((e) => projectIds.includes(e.project_id));
  totals.totalExpenses = round2(sum(expenses) + sum(extras) + sum(costs));
  totals.profit = round2(totals.collected - totals.totalExpenses - totals.bonuses);
  totals.margin = margin(totals.collected, totals.profit);
  return totals;
}

/** Ficha financiera de un proyecto. */
export async function getProjectFinancials(projectId) {
  const project = await queryOne('select * from public.projects where id = $1', [projectId]);
  if (!project) return null;
  const contracts = await query('select * from public.contracts where project_id = $1 and status <> $2', [projectId, 'cancelado']);
  const payments = await query('select * from public.payments where project_id = $1', [projectId]);
  const invoices = await query('select * from public.invoices where project_id = $1', [projectId]);
  const expenses = await query('select * from public.expenses where project_id = $1', [projectId]);
  const extras = await query('select * from public.extra_expenses where project_id = $1', [projectId]);
  const costs = await query('select * from public.project_costs where project_id = $1', [projectId]);
  const bonuses = await query('select * from public.bonuses where project_id = $1', [projectId]);
  return computeTotals({
    contracted: contracts.length ? sum(contracts) : num(project.total_amount),
    payments, invoices, expenses, extraExpenses: extras, projectCosts: costs, bonuses,
  });
}
