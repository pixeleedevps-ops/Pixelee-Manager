/**
 * Cálculos financieros — SIEMPRE en el backend.
 * Funciones puras y testeables. Todos los importes se tratan como NUMERIC.
 *
 * Reglas de negocio sobre el esquema REAL:
 *  - Valor contratado  = sum(contracts.amount) [firmado/pendiente no cancelado]
 *                        o projects.total_amount cuando no hay contrato.
 *  - Recaudado         = sum(payments.amount) donde status = 'confirmado'.
 *  - Facturado         = sum(invoices.total_amount) donde status <> 'anulada'.
 *                        NUNCA se suma al recaudado.
 *  - Gastos            = expenses + extra_expenses + project_costs.
 *  - Bonificaciones    = bonuses con status = 'aplicada' (reducen la utilidad).
 *  - Utilidad          = recaudado - gastos - bonificaciones.
 */

export const num = (v) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export const round2 = (v) => Math.round((num(v) + Number.EPSILON) * 100) / 100;

export const sum = (rows, field = 'amount') =>
  round2((rows || []).reduce((acc, r) => acc + num(typeof r === 'object' ? r[field] : r), 0));

export const money = (v) => round2(v);

/** Totales contables a partir de movimientos individuales (trazabilidad). */
export function computeTotals({
  contracted = 0, payments = [], invoices = [], expenses = [],
  extraExpenses = [], projectCosts = [], bonuses = [],
} = {}) {
  // Recaudo bruto = pagos confirmados. Los reembolsos (por estado o por tipo)
  // se descuentan una sola vez para obtener el recaudo neto.
  const confirmed = sum((payments || []).filter((p) => p.status === 'confirmado'));
  const refunds = sum(
    (payments || []).filter((p) => p.status === 'reembolsado' || p.payment_type === 'reembolso')
  );
  const collected = round2(confirmed - refunds);
  const invoiced = sum((invoices || []).filter((i) => i.status !== 'anulada'), 'total_amount');
  const normalExpenses = sum(expenses);
  const extras = sum(extraExpenses);
  const costs = sum(projectCosts);
  const totalExpenses = round2(normalExpenses + extras + costs);
  const appliedBonuses = sum((bonuses || []).filter((b) => b.status === 'aplicada'));
  const gross = round2(num(contracted));
  const balance = round2(gross - collected);
  const profit = round2(collected - totalExpenses - appliedBonuses);

  return {
    contracted: gross,
    invoiced,
    collected,
    refunds,
    balance,
    normalExpenses,
    extraExpenses: extras,
    projectCosts: costs,
    totalExpenses,
    bonuses: appliedBonuses,
    profit,
    margin: margin(collected, profit),
  };
}

export function margin(income, profit) {
  const i = num(income);
  if (i <= 0) return 0;
  return round2((num(profit) / i) * 100);
}

/** Utilidad neta (firma compatible con las pruebas de la fase anterior). */
export function computeProfit({ income = 0, expenses = 0, extraExpenses = 0, bonuses = 0 } = {}) {
  return round2(num(income) - num(expenses) - num(extraExpenses) - num(bonuses));
}

/** Saldo de un contrato/proyecto: valor contratado menos recaudos confirmados. */
export function computeBalance({ amount = 0, payments = [] } = {}) {
  const paid = sum((payments || []).filter((p) => p.status === 'confirmado'));
  return round2(num(amount) - paid);
}

/** Totales de cotización/factura (subtotal + impuesto). */
export function computeDocumentTotals({ items = [], taxRate = 0 } = {}) {
  const subtotal = round2(
    (items || []).reduce((acc, it) => acc + num(it.quantity) * num(it.unit_price), 0)
  );
  const tax = round2(subtotal * (num(taxRate) / 100));
  return { subtotal, tax, total: round2(subtotal + tax) };
}

/**
 * Reparte una utilidad entre participantes por porcentaje.
 * El ajuste de redondeo se aplica al primer participante para que el total cuadre.
 */
export function distributeProfits(total, participants = []) {
  const base = round2(total);
  const pctSum = participants.reduce((a, p) => a + num(p.percentage), 0);
  if (pctSum > 100) throw new Error('La suma de porcentajes supera 100%.');
  if (participants.some((p) => num(p.percentage) < 0)) throw new Error('Los porcentajes no pueden ser negativos.');
  const rows = participants.map((p) => ({
    profile_id: p.profile_id || p.id || null,
    percentage: round2(p.percentage),
    amount: round2(base * (num(p.percentage) / 100)),
  }));
  const assigned = round2(rows.reduce((a, r) => a + r.amount, 0));
  if (rows.length) rows[0].amount = round2(rows[0].amount + (base - assigned));
  return { total: base, items: rows, distributed: round2(rows.reduce((a, r) => a + r.amount, 0)) };
}

/** Métricas de campaña (registro manual, sin APIs externas). */
export function campaignMetrics(m = {}) {
  const spent = num(m.spent);
  const impressions = num(m.impressions);
  const clicks = num(m.clicks);
  const leads = num(m.leads);
  const conversions = num(m.conversions);
  return {
    spent: round2(spent),
    impressions, clicks, leads, conversions,
    cpa: conversions > 0 ? round2(spent / conversions) : 0,
    cpl: leads > 0 ? round2(spent / leads) : 0,
    ctr: impressions > 0 ? round2((clicks / impressions) * 100) : 0,
    conversionRate: leads > 0 ? round2((conversions / leads) * 100) : 0,
  };
}

/** Indicadores del dashboard a partir de contadores + movimientos reales. */
export function dashboardIndicators(d = {}) {
  const raw = d.totals || {};
  // Acepta tanto movimientos en bruto (tests) como totales ya calculados
  // por el servicio de analítica (que no debe recalcular).
  const alreadyComputed = typeof raw.profit === 'number' && !Array.isArray(raw.payments);
  const totals = alreadyComputed ? raw : computeTotals(raw);
  return {
    clients: num(d.clients),
    activeProjects: num(d.activeProjects),
    finishedProjects: num(d.finishedProjects),
    quotes: num(d.quotes),
    invoices: num(d.invoices),
    leads: num(d.leads),
    income: totals.collected,
    invoiced: totals.invoiced,
    expenses: totals.totalExpenses,
    profit: totals.profit,
    margin: totals.margin,
    receivables: totals.balance,
    pendingInvoices: num(d.pendingInvoices),
  };
}
