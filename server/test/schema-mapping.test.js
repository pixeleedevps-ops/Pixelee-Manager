import test from 'node:test';
import assert from 'node:assert/strict';
import { COLUMN_NAMES } from '../src/db.js';
import { buildQuery } from '../src/services/crud.js';

test('los campos lógicos de campañas se traducen a sus columnas físicas', () => {
  const campaign = buildQuery('campaigns', { q: 'meta', filters: { channel: 'meta' } });
  assert.match(campaign.listSql, /canal as channel/);
  assert.match(campaign.listSql, /where .*canal =/);

  const metrics = buildQuery('campaign_metrics');
  assert.match(metrics.listSql, /impresiones as impressions/);
  assert.match(metrics.listSql, /conversiones as conversions/);
});

test('las columnas de operaciones y contabilidad usan los nombres reales de Supabase', () => {
  const expected = {
    expenses: { category: 'categoria', supplier: 'proveedor', amount: 'valor' },
    domains: { registrar: 'registrador' },
    hosting_accounts: { provider: 'proveedor', panel_url: 'url_panel', currency: 'moneda' },
    websites: { platform: 'plataforma' },
    maintenance_plans: { frequency: 'frecuencia' },
    tickets: { category: 'categoria' },
    profit_distribution_items: { amount: 'monto' },
  };
  for (const [entity, fields] of Object.entries(expected)) {
    for (const [logical, physical] of Object.entries(fields)) {
      assert.equal(COLUMN_NAMES[entity][logical], physical, `${entity}.${logical}`);
    }
  }
});

test('el historial de migraciones se consulta sin una columna id inexistente', () => {
  const migrations = buildQuery('schema_migrations');
  assert.match(migrations.listSql, /^select filename, applied_at from public\.schema_migrations/);
  assert.doesNotMatch(migrations.listSql, /select id/);
});
