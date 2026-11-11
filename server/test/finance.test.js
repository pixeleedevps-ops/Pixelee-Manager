import test from 'node:test';
import assert from 'node:assert/strict';
import {
  num, round2, sum, computeTotals, computeProfit, computeBalance,
  computeDocumentTotals, distributeProfits, campaignMetrics,
  dashboardIndicators, margin,
} from '../src/services/finance.js';

test('num y round2 normalizan valores NUMERIC que llegan como string', () => {
  assert.equal(num('1234.56'), 1234.56);
  assert.equal(num(null), 0);
  assert.equal(num(undefined), 0);
  assert.equal(num('no-numero'), 0);
  assert.equal(round2(1.005), 1.01);
  assert.equal(round2('10.567'), 10.57);
});

test('sum respeta el campo indicado y redondea', () => {
  assert.equal(sum([{ amount: '100.5' }, { amount: '200.25' }]), 300.75);
  assert.equal(sum([{ total_amount: 10 }, { total_amount: 20 }], 'total_amount'), 30);
});

test('computeTotals: facturado NO se confunde con recaudado', () => {
  const t = computeTotals({
    contracted: 1000,
    payments: [
      { amount: 400, status: 'confirmado', payment_type: 'abono' },
      { amount: 100, status: 'pendiente', payment_type: 'abono' }, // no cuenta
      { amount: 50, status: 'confirmado', payment_type: 'reembolso' }, // no cuenta
    ],
    invoices: [{ total_amount: 900, status: 'pendiente' }, { total_amount: 200, status: 'anulada' }],
    expenses: [{ amount: 120 }],
    extraExpenses: [{ amount: 30 }],
    projectCosts: [{ amount: 20 }],
    bonuses: [{ amount: 10, status: 'aplicada' }, { amount: 99, status: 'pendiente' }],
  });
  assert.equal(t.contracted, 1000);
  assert.equal(t.invoiced, 900, 'solo facturas no anuladas');
  assert.equal(t.collected, 400, 'solo recaudos confirmados');
  assert.equal(t.totalExpenses, 170);
  assert.equal(t.bonuses, 10);
  assert.equal(t.balance, 600);
  assert.equal(t.profit, 220);
});

test('computeTotals descuenta reembolsos del recaudo', () => {
  const t = computeTotals({
    contracted: 1000,
    payments: [
      { amount: 500, status: 'confirmado', payment_type: 'abono' },
      { amount: 50, status: 'reembolsado', payment_type: 'abono' },
    ],
  });
  assert.equal(t.collected, 450);
  assert.equal(t.refunds, 50);
});

test('computeProfit: ingresos - gastos - extras - bonificaciones', () => {
  assert.equal(computeProfit({ income: 1000, expenses: 200, extraExpenses: 50, bonuses: 30 }), 720);
});

test('computeBalance: contrato menos recaudos confirmados', () => {
  assert.equal(computeBalance({
    amount: 1000,
    payments: [{ amount: 300, status: 'confirmado' }, { amount: 200, status: 'pendiente' }],
  }), 700);
});

test('computeDocumentTotals: subtotal + impuesto', () => {
  assert.deepEqual(computeDocumentTotals({ items: [{ quantity: 2, unit_price: 100 }, { quantity: 1, unit_price: 50 }], taxRate: 19 }), {
    subtotal: 250, tax: 47.5, total: 297.5,
  });
  assert.deepEqual(computeDocumentTotals(), { subtotal: 0, tax: 0, total: 0 });
});

test('distributeProfits: reparte proporcional y cuadra el total', () => {
  const r = distributeProfits(1000000, [
    { profile_id: 'a', percentage: 60 },
    { profile_id: 'b', percentage: 40 },
  ]);
  assert.equal(r.total, 1000000);
  assert.equal(r.distributed, 1000000);
  assert.equal(r.items[0].amount + r.items[1].amount, 1000000);
});

test('distributeProfits: rechaza porcentajes > 100 y negativos', () => {
  assert.throws(() => distributeProfits(100, [{ percentage: 101 }]), /supera 100/);
  assert.throws(() => distributeProfits(100, [{ percentage: -1 }]), /negativos/);
});

test('distributeProfits: ajusta el redondeo en el primer participante', () => {
  const r = distributeProfits(100, [
    { percentage: 33.33 }, { percentage: 33.33 }, { percentage: 33.34 },
  ]);
  assert.equal(r.distributed, 100);
});

test('campaignMetrics: CPA, CPL, CTR y tasa de conversión', () => {
  const m = campaignMetrics({ spent: 1000, impressions: 10000, clicks: 500, leads: 100, conversions: 20 });
  assert.equal(m.cpa, 50);
  assert.equal(m.cpl, 10);
  assert.equal(m.ctr, 5);
  assert.equal(m.conversionRate, 20);
});

test('campaignMetrics: división por cero devuelve 0', () => {
  const m = campaignMetrics({ spent: 1000 });
  assert.equal(m.cpa, 0);
  assert.equal(m.cpl, 0);
  assert.equal(m.ctr, 0);
  assert.equal(m.conversionRate, 0);
});

test('margin y dashboardIndicators consolidan sin mezclar facturación', () => {
  assert.equal(margin(1000, 250), 25);
  assert.equal(margin(0, 100), 0);
  const d = dashboardIndicators({
    clients: 3, activeProjects: 2, finishedProjects: 1, quotes: 4, invoices: 5, leads: 6,
    totals: { contracted: 1000, payments: [{ amount: 800, status: 'confirmado' }], invoices: [{ total_amount: 1000, status: 'pendiente' }], expenses: [{ amount: 200 }] },
  });
  assert.equal(d.income, 800);
  assert.equal(d.invoiced, 1000);
  assert.equal(d.expenses, 200);
  assert.equal(d.profit, 600);
  assert.equal(d.receivables, 200);
});
