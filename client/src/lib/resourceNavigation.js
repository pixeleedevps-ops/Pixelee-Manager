/** Primary administration location for each resource. Related records link here. */
export const RESOURCE_LOCATIONS = {
  clients: { path: '/clientes', section: 'clients' },
  contacts: { path: '/clientes', section: 'contacts' },
  documents: { path: '/clientes', section: 'documents' },
  projects: { path: '/desarrollo', section: 'projects' },
  project_services: { path: '/desarrollo', section: 'services' },
  tasks: { path: '/desarrollo', section: 'tasks' },
  deliveries: { path: '/desarrollo', section: 'deliveries' },
  time_entries: { path: '/desarrollo', section: 'time' },
  project_history: { path: '/desarrollo', section: 'history' },
  quotes: { path: '/contabilidad', section: 'quotes' },
  quote_items: { path: '/contabilidad', section: 'quote_items' },
  invoices: { path: '/contabilidad', section: 'invoices' },
  contracts: { path: '/contabilidad', section: 'contracts' },
  payments: { path: '/contabilidad', section: 'payments' },
  expenses: { path: '/contabilidad', section: 'expenses' },
  extra_expenses: { path: '/contabilidad', section: 'extra_expenses' },
  project_costs: { path: '/contabilidad', section: 'project_costs' },
  bonuses: { path: '/contabilidad', section: 'bonuses' },
  profit_distributions: { path: '/contabilidad', section: 'distributions' },
  profit_distribution_items: { path: '/contabilidad', section: 'items' },
  withdrawals: { path: '/contabilidad', section: 'withdrawals' },
  campaigns: { path: '/marketing', section: 'campaigns' },
  campaign_metrics: { path: '/marketing', section: 'metrics' },
  leads: { path: '/marketing', section: 'leads' },
  follow_ups: { path: '/marketing', section: 'followups' },
  domains: { path: '/operaciones', section: 'domains' },
  hosting_accounts: { path: '/operaciones', section: 'hosting' },
  websites: { path: '/operaciones', section: 'websites' },
  renewals: { path: '/operaciones', section: 'renewals' },
  maintenance_plans: { path: '/operaciones', section: 'plans' },
  tickets: { path: '/operaciones', section: 'tickets' },
  incidents: { path: '/operaciones', section: 'incidents' },
  surveys: { path: '/operaciones', section: 'surveys' },
  service_catalog: { path: '/configuracion', section: 'services' },
  profiles: { path: '/configuracion', section: 'profiles' },
  activity_logs: { path: '/configuracion', section: 'activity' },
  schema_migrations: { path: '/configuracion', section: 'migrations' },
};

export function resourceUrl(entity, { create = false, filters = {} } = {}) {
  const location = RESOURCE_LOCATIONS[entity];
  if (!location) return null;
  const params = new URLSearchParams({ section: location.section });
  if (create) params.set('create', entity);
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(`filter_${key}`, String(value));
  });
  return `${location.path}?${params.toString()}`;
}

const MODULE_BY_PATH = {
  '/clientes': 'Clientes',
  '/contabilidad': 'Contabilidad',
  '/desarrollo': 'Desarrollo',
  '/marketing': 'Marketing',
  '/operaciones': 'Operaciones',
  '/configuracion': 'Configuración',
};

export function resourceModule(entity) {
  const location = RESOURCE_LOCATIONS[entity];
  return MODULE_BY_PATH[location?.path] || 'Otros';
}
