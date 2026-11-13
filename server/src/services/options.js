/** Fuentes reales para los selectores de claves foráneas del frontend. */
export const OPTION_SOURCES = {
  client_id: { table: 'clients', label: 'company_name', module: 'Clientes' },
  converted_client_id: { table: 'clients', label: 'company_name', module: 'Clientes' },
  project_id: { table: 'projects', label: 'project_name', module: 'Desarrollo' },
  profile_id: { table: 'profiles', label: 'full_name', module: 'Configuración' },
  assigned_to: { table: 'profiles', label: 'full_name', module: 'Configuración' },
  responsible_id: { table: 'profiles', label: 'full_name', module: 'Configuración' },
  created_by: { table: 'profiles', label: 'full_name', module: 'Configuración' },
  registered_by: { table: 'profiles', label: 'full_name', module: 'Configuración' },
  uploaded_by: { table: 'profiles', label: 'full_name', module: 'Configuración' },
  reviewed_by: { table: 'profiles', label: 'full_name', module: 'Configuración' },
  reported_by: { table: 'profiles', label: 'full_name', module: 'Configuración' },
  user_id: { table: 'profiles', label: 'full_name', module: 'Configuración' },
  service_id: { table: 'service_catalog', label: 'name', module: 'Configuración' },
  lead_id: { table: 'leads', label: 'contact_name', module: 'Marketing' },
  quote_id: { table: 'quotes', label: 'quote_number', module: 'Contabilidad' },
  campaign_id: { table: 'campaigns', label: 'name', module: 'Marketing' },
  domain_id: { table: 'domains', label: 'domain_name', module: 'Operaciones' },
  hosting_account_id: { table: 'hosting_accounts', label: 'account_name', module: 'Operaciones' },
  website_id: { table: 'websites', label: 'site_name', module: 'Operaciones' },
  task_id: { table: 'tasks', label: 'title', module: 'Desarrollo' },
  ticket_id: { table: 'tickets', label: 'subject', module: 'Operaciones' },
  expense_id: { table: 'expenses', label: 'description', module: 'Contabilidad' },
  distribution_id: { table: 'profit_distributions', label: 'period_start', module: 'Gerencia' },
  distribution_item_id: { table: 'profit_distribution_items', label: 'amount', module: 'Gerencia' },
};

import { query, TABLE_NAMES, COLUMN_NAMES } from '../db.js';

/** Devuelve {id, label} de todas las fuentes, limitado a 500 por tabla. */
export async function getAllOptions() {
  const out = {};
  const jobs = Object.entries(OPTION_SOURCES).map(async ([key, src]) => {
    try {
      const rows = await query(
        `select id, ${(COLUMN_NAMES[src.table]?.[src.label] || src.label)}::text as label from public.${TABLE_NAMES[src.table] || src.table} order by ${(COLUMN_NAMES[src.table]?.[src.label] || src.label)} asc limit 500`
      );
      out[key] = rows.map((r) => ({ id: r.id, label: r.label || String(r.id).slice(0, 8) }));
    } catch {
      out[key] = [];
    }
  });
  await Promise.all(jobs);
  return out;
}
