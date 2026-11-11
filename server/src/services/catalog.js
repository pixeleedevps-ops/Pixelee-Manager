/**
 * CATÁLOGO DE ENTIDADES — adaptado al esquema REAL de Supabase.
 *
 * Cada campo es [tipo, etiqueta]. Tipos:
 *   s  texto opcional        s!  texto obligatorio
 *   n  número (numeric)      n!  número obligatorio
 *   i  entero                i!  entero obligatorio
 *   d  fecha (date)          d!  fecha obligatoria
 *   dt fecha+hora            dt! fecha+hora obligatoria
 *   b  booleano              u  uuid (FK)        u! uuid obligatorio
 *   e:a,b,c  enumeración con los valores REALES del CHECK de la BD
 *
 * Fuente: SUPABASE_SCHEMA_MAP.md (inspección directa de pg_catalog).
 * NO incluye columnas generadas (`subtotal`), ni `id`, `created_at`,
 * `updated_at`, ni columnas autogestionadas por triggers.
 */
import { ALL_PERMISSIONS } from '../middleware/auth.js';

const S = (label) => ['s', label];
const SR = (label) => ['s!', label];
const N = (label) => ['n', label];
const NR = (label) => ['n!', label];
const I = (label) => ['i', label];
const D = (label) => ['d', label];
const DR = (label) => ['d!', label];
const DT = (label) => ['dt', label];
const B = (label) => ['b', label];
const U = (label) => ['u', label];
const UR = (label) => ['u!', label];
const E = (label, values) => [`e:${values.join(',')}`, label];

const CLIENT_STATUS = ['prospecto', 'activo', 'inactivo', 'bloqueado'];
const PROJECT_STATUS = ['pendiente', 'en_proceso', 'en_revision', 'pausado', 'finalizado', 'cancelado'];
const PRIORITY = ['baja', 'media', 'alta', 'urgente'];
const PROJECT_TYPE = ['landing_page', 'corporativa', 'ecommerce', 'marketplace', 'web_app', 'mantenimiento', 'otro'];
const QUOTE_STATUS = ['borrador', 'enviada', 'aceptada', 'rechazada', 'vencida'];
const INVOICE_STATUS = ['borrador', 'pendiente', 'pagada', 'vencida', 'anulada'];
const PAYMENT_STATUS = ['pendiente', 'confirmado', 'rechazado', 'reembolsado'];
const PAYMENT_METHOD = ['transferencia', 'efectivo', 'tarjeta', 'pse', 'consignacion', 'otro'];
const PAYMENT_TYPE = ['anticipo', 'abono', 'pago_final', 'reembolso', 'otro'];
const CONTRACT_STATUS = ['borrador', 'pendiente', 'firmado', 'vencido', 'cancelado'];
const CAMPAIGN_STATUS = ['planificada', 'activa', 'pausada', 'finalizada'];
const LEAD_STATUS = ['nuevo', 'contactado', 'calificado', 'propuesta', 'ganado', 'perdido'];
const TASK_STATUS = ['pendiente', 'en_proceso', 'en_revision', 'completada', 'bloqueada', 'cancelada'];
const DELIVERY_STATUS = ['pendiente', 'entregada', 'aprobada', 'rechazada'];
const TICKET_STATUS = ['abierto', 'en_proceso', 'esperando_cliente', 'resuelto', 'cerrado'];
const INCIDENT_STATUS = ['abierta', 'en_proceso', 'resuelta', 'cerrada'];
const SEVERITY = ['baja', 'media', 'alta', 'critica'];
const DOMAIN_STATUS = ['activo', 'pendiente', 'vencido', 'transferencia', 'cancelado'];
const HOSTING_STATUS = ['activo', 'suspendido', 'cancelado', 'vencido'];
const WEBSITE_STATUS = ['activo', 'en_desarrollo', 'suspendido', 'retirado'];
const ENVIRONMENT = ['produccion', 'staging', 'desarrollo', 'otro'];
const RENEWAL_TYPE = ['dominio', 'hosting', 'ssl', 'licencia', 'otro'];
const RENEWAL_STATUS = ['pendiente', 'notificado', 'pagado', 'renovado', 'vencido', 'cancelado'];
const FREQUENCY = ['semanal', 'quincenal', 'mensual', 'trimestral', 'anual'];
const PLAN_STATUS = ['activo', 'pausado', 'finalizado', 'cancelado'];
const FOLLOWUP_STATUS = ['pendiente', 'completado', 'cancelado'];
const BONUS_STATUS = ['pendiente', 'aplicada', 'anulada'];
const DISTRIBUTION_STATUS = ['borrador', 'aprobada', 'pagada', 'anulada'];
const ITEM_STATUS = ['pendiente', 'pagado', 'anulado'];
const ROLE_VALUES = ['administrador', 'direccion', 'comercial', 'desarrollo', 'finanzas', 'soporte'];

/** Permisos por defecto de un módulo. */
const P = (mod, read = true, write = true) => ({
  view: read ? `${mod}.view` : null,
  manage: write ? `${mod}.manage` : null,
});

export const CATALOG = {
  // ── CLIENTES ──────────────────────────────────────────────────────────────
  clients: {
    table: 'clients', label: 'Clientes', icon: 'Building2', module: 'Clientes',
    view: 'clients.view', manage: 'clients.manage',
    search: ['company_name', 'code', 'email', 'document_number', 'city'],
    filters: { status: 'status', client_type: 'client_type', city: 'city' },
    order: 'created_at desc',
    auto: { created_by: 'user.id' },
    fields: {
      code: SR('Código'), company_name: SR('Razón social / nombre'),
      client_type: E('Tipo', ['persona', 'empresa']),
      document_type: S('Tipo de documento'), document_number: S('Número de documento'),
      email: S('Correo'), phone: S('Teléfono'), website: S('Sitio web'),
      address: S('Dirección'), city: S('Ciudad'), country: S('País'), industry: S('Sector'),
      status: E('Estado', CLIENT_STATUS), notes: S('Notas'),
    },
  },
  contacts: {
    table: 'contacts', label: 'Contactos', icon: 'UserRound', module: 'Clientes',
    view: 'clients.view', manage: 'clients.manage',
    search: ['full_name', 'email', 'phone', 'position'],
    filters: { client_id: 'client_id', is_primary: 'is_primary' },
    order: 'is_primary desc, full_name asc',
    fields: {
      client_id: UR('Cliente'), full_name: SR('Nombre completo'),
      position: S('Cargo'), email: S('Correo'), phone: S('Teléfono'),
      is_primary: B('Contacto principal'), notes: S('Notas'),
    },
  },

  // ── PROYECTOS / DESARROLLO ────────────────────────────────────────────────
  projects: {
    table: 'projects', label: 'Proyectos', icon: 'FolderKanban', module: 'Desarrollo',
    view: 'projects.view', manage: 'projects.manage',
    search: ['project_name', 'code', 'description'],
    filters: { status: 'status', priority: 'priority', project_type: 'project_type', client_id: 'client_id', responsible_id: 'responsible_id' },
    order: 'created_at desc',
    auto: { created_by: 'user.id' },
    fields: {
      code: SR('Código'), client_id: UR('Cliente'), project_name: SR('Nombre del proyecto'),
      project_type: E('Tipo de proyecto', PROJECT_TYPE), description: S('Descripción'),
      status: E('Estado', PROJECT_STATUS), priority: E('Prioridad', PRIORITY),
      contract_date: D('Fecha de contrato'), start_date: D('Fecha de ingreso / inicio'),
      estimated_delivery_date: D('Entrega estimada'), actual_delivery_date: D('Entrega real'),
      total_amount: N('Valor total'), currency: S('Moneda'),
      responsible_id: U('Responsable'), notes: S('Notas'),
    },
  },
  project_services: {
    table: 'project_services', label: 'Servicios del proyecto', icon: 'ListChecks', module: 'Desarrollo',
    view: 'projects.view', manage: 'projects.manage',
    search: ['service_name', 'description'], filters: { project_id: 'project_id' },
    order: 'created_at asc',
    fields: {
      project_id: UR('Proyecto'), service_id: U('Servicio del catálogo'),
      service_name: SR('Servicio'), description: S('Descripción'),
      quantity: N('Cantidad'), unit_price: N('Precio unitario'),
    },
  },
  project_costs: {
    table: 'project_costs', label: 'Costos de proyecto', icon: 'Coins', module: 'Contabilidad',
    view: 'accounting.view', manage: 'accounting.manage',
    search: ['description', 'cost_type'], filters: { project_id: 'project_id', cost_type: 'cost_type' },
    order: 'cost_date desc',
    fields: {
      project_id: UR('Proyecto'), cost_type: SR('Tipo de costo'), description: SR('Descripción'),
      amount: NR('Monto'), cost_date: D('Fecha'), expense_id: U('Gasto relacionado'),
    },
  },
  project_history: {
    table: 'project_history', label: 'Historial del proyecto', icon: 'History', module: 'Desarrollo',
    view: 'projects.view', manage: 'projects.manage', deletable: false,
    search: ['event_type', 'description'], filters: { project_id: 'project_id' },
    order: 'created_at desc',
    auto: { user_id: 'user.id' },
    fields: { project_id: UR('Proyecto'), event_type: SR('Evento'), description: SR('Descripción') },
  },
  tasks: {
    table: 'tasks', label: 'Tareas', icon: 'CheckSquare', module: 'Desarrollo',
    view: 'projects.view', manage: 'projects.manage',
    search: ['title', 'description'],
    filters: { project_id: 'project_id', status: 'status', priority: 'priority', assigned_to: 'assigned_to' },
    order: 'created_at desc',
    auto: { created_by: 'user.id' },
    fields: {
      project_id: UR('Proyecto'), title: SR('Título'), description: S('Descripción'),
      assigned_to: U('Asignado a'), priority: E('Prioridad', PRIORITY),
      status: E('Estado', TASK_STATUS), start_date: D('Inicio'), due_date: D('Vencimiento'),
      completed_at: DT('Completada el'),
    },
  },
  time_entries: {
    table: 'time_entries', label: 'Horas trabajadas', icon: 'Clock', module: 'Desarrollo',
    view: 'projects.view', manage: 'projects.manage',
    search: ['description'], filters: { project_id: 'project_id', task_id: 'task_id', user_id: 'user_id' },
    order: 'work_date desc',
    fields: {
      project_id: UR('Proyecto'), task_id: U('Tarea'), user_id: U('Usuario'),
      work_date: DR('Fecha'), hours: NR('Horas'), description: S('Descripción'),
    },
  },
  deliveries: {
    table: 'deliveries', label: 'Entregables', icon: 'Package', module: 'Desarrollo',
    view: 'projects.view', manage: 'projects.manage',
    search: ['delivery_name', 'description'],
    filters: { project_id: 'project_id', status: 'status' }, order: 'delivery_date desc nulls last, created_at desc',
    fields: {
      project_id: UR('Proyecto'), delivery_name: SR('Entregable'), description: S('Descripción'),
      delivery_url: S('Enlace (Drive)'), delivery_date: D('Fecha de entrega'),
      status: E('Estado', DELIVERY_STATUS), reviewed_by: U('Revisado por'), notes: S('Notas'),
    },
  },
  contracts: {
    table: 'contracts', label: 'Contratos', icon: 'FileSignature', module: 'Contabilidad',
    view: 'accounting.view', manage: 'accounting.manage',
    search: ['contract_number', 'notes'],
    filters: { project_id: 'project_id', status: 'status' }, order: 'created_at desc',
    fields: {
      project_id: UR('Proyecto'), contract_number: S('Número de contrato'),
      contract_url: S('Enlace al contrato (Drive)'), signed_date: D('Fecha de firma'),
      start_date: D('Inicio'), end_date: D('Fin'), amount: NR('Valor contratado'),
      status: E('Estado', CONTRACT_STATUS), notes: S('Notas'),
    },
  },
  documents: {
    table: 'documents', label: 'Documentos', icon: 'FileText', module: 'Clientes',
    view: 'clients.view', manage: 'clients.manage',
    search: ['document_name', 'document_type', 'file_url'],
    filters: { client_id: 'client_id', project_id: 'project_id', document_type: 'document_type' },
    order: 'created_at desc', auto: { uploaded_by: 'user.id' },
    fields: {
      client_id: U('Cliente'), project_id: U('Proyecto'),
      document_type: SR('Tipo de documento'), document_name: SR('Nombre'),
      file_url: SR('Enlace (Drive)'),
    },
    hint: 'Debe indicarse al menos un Cliente o un Proyecto.',
  },

  // ── CONTABILIDAD ──────────────────────────────────────────────────────────
  quotes: {
    table: 'quotes', label: 'Cotizaciones', icon: 'FileSpreadsheet', module: 'Contabilidad',
    view: 'accounting.view', manage: 'accounting.manage',
    search: ['quote_number', 'notes'], filters: { client_id: 'client_id', lead_id: 'lead_id', status: 'status' },
    order: 'issue_date desc, created_at desc',
    fields: {
      quote_number: SR('Número'), client_id: U('Cliente'), lead_id: U('Prospecto'),
      issue_date: D('Fecha de emisión'), expiration_date: D('Vencimiento'),
      subtotal: NR('Subtotal'), tax_amount: N('Impuesto'), total_amount: NR('Total'),
      status: E('Estado', QUOTE_STATUS), quote_url: S('Enlace (Drive)'),
      assigned_to: U('Responsable'), notes: S('Notas'),
    },
    hint: 'Debe indicarse al menos un Cliente o un Prospecto.',
  },
  quote_items: {
    table: 'quote_items', label: 'Ítems de cotización', icon: 'List', module: 'Contabilidad',
    view: 'accounting.view', manage: 'accounting.manage',
    search: ['description'], filters: { quote_id: 'quote_id' }, order: 'created_at asc',
    fields: {
      quote_id: UR('Cotización'), service_id: U('Servicio del catálogo'),
      description: SR('Descripción'), quantity: N('Cantidad'), unit_price: NR('Precio unitario'),
    },
    hint: 'El subtotal se calcula automáticamente (cantidad × precio unitario).',
  },
  invoices: {
    table: 'invoices', label: 'Facturas', icon: 'Receipt', module: 'Contabilidad',
    view: 'accounting.view', manage: 'accounting.manage',
    search: ['invoice_number'], filters: { client_id: 'client_id', project_id: 'project_id', status: 'status' },
    order: 'issue_date desc, created_at desc',
    fields: {
      client_id: UR('Cliente'), project_id: U('Proyecto'), invoice_number: SR('Número de factura'),
      issue_date: DR('Fecha de emisión'), due_date: D('Vencimiento'),
      subtotal: NR('Subtotal'), tax_amount: N('Impuesto'), total_amount: NR('Total'),
      status: E('Estado', INVOICE_STATUS), invoice_url: S('Enlace (Drive)'),
    },
    hint: 'Facturación ≠ dinero recaudado. Los cobros reales se registran en Recaudos.',
  },
  payments: {
    table: 'payments', label: 'Recaudos', icon: 'Wallet', module: 'Contabilidad',
    view: 'accounting.view', manage: 'accounting.manage',
    search: ['payment_reference', 'notes'],
    filters: { client_id: 'client_id', project_id: 'project_id', status: 'status', payment_method: 'payment_method', payment_type: 'payment_type' },
    order: 'payment_date desc, created_at desc', auto: { registered_by: 'user.id' },
    fields: {
      project_id: UR('Proyecto'), client_id: UR('Cliente'),
      payment_reference: S('Referencia'), amount: NR('Monto'), payment_date: DR('Fecha del cobro'),
      payment_method: E('Método', PAYMENT_METHOD), payment_type: E('Tipo', PAYMENT_TYPE),
      status: E('Estado', PAYMENT_STATUS), receipt_url: S('Enlace al comprobante'), notes: S('Notas'),
    },
    hint: 'Solo los recaudos con estado "confirmado" se cuentan como ingresos.',
  },
  expenses: {
    table: 'expenses', label: 'Gastos', icon: 'TrendingDown', module: 'Contabilidad',
    view: 'accounting.view', manage: 'accounting.manage',
    search: ['description', 'category', 'supplier'],
    filters: { project_id: 'project_id', category: 'category' }, order: 'expense_date desc, created_at desc',
    auto: { registered_by: 'user.id' },
    fields: {
      project_id: U('Proyecto'), category: SR('Categoría'), description: SR('Descripción'),
      amount: NR('Monto'), expense_date: DR('Fecha'), supplier: S('Proveedor'),
      payment_method: S('Método de pago'), receipt_url: S('Enlace al comprobante'),
    },
  },
  extra_expenses: {
    table: 'extra_expenses', label: 'Gastos extras', icon: 'TrendingDown', module: 'Contabilidad',
    view: 'accounting.view', manage: 'accounting.manage',
    search: ['description', 'category'], filters: { project_id: 'project_id', category: 'category' },
    order: 'spent_at desc', auto: { created_by: 'user.id' },
    fields: {
      project_id: U('Proyecto'), description: SR('Descripción'), category: SR('Categoría'),
      amount: NR('Monto'), spent_at: D('Fecha'), receipt_url: S('Enlace al comprobante'), notes: S('Notas'),
    },
  },
  bonuses: {
    table: 'bonuses', label: 'Bonificaciones', icon: 'Gift', module: 'Contabilidad',
    view: 'accounting.view', manage: 'accounting.manage',
    search: ['reason', 'notes'], filters: { client_id: 'client_id', project_id: 'project_id', status: 'status' },
    order: 'granted_at desc', auto: { created_by: 'user.id' },
    fields: {
      client_id: U('Cliente'), project_id: U('Proyecto'), amount: NR('Monto'),
      reason: SR('Motivo'), status: E('Estado', BONUS_STATUS), granted_at: D('Fecha'), notes: S('Notas'),
    },
  },
  profit_distributions: {
    table: 'profit_distributions', label: 'Distribuciones de utilidades', icon: 'PieChart', module: 'Gerencia',
    view: 'management.view', manage: 'management.manage',
    search: ['notes'], filters: { status: 'status' }, order: 'period_start desc',
    auto: { created_by: 'user.id' },
    fields: {
      period_start: DR('Inicio del periodo'), period_end: DR('Fin del periodo'),
      total_profit: NR('Utilidad a distribuir'), status: E('Estado', DISTRIBUTION_STATUS), notes: S('Notas'),
    },
  },
  profit_distribution_items: {
    table: 'profit_distribution_items', label: 'Participaciones', icon: 'Users', module: 'Gerencia',
    view: 'management.view', manage: 'management.manage',
    search: [], filters: { distribution_id: 'distribution_id', profile_id: 'profile_id', status: 'status' },
    order: 'created_at asc',
    fields: {
      distribution_id: UR('Distribución'), profile_id: U('Beneficiario'),
      percentage: NR('Porcentaje (%)'), amount: NR('Monto'), status: E('Estado', ITEM_STATUS),
    },
  },
  withdrawals: {
    table: 'withdrawals', label: 'Retiros', icon: 'Banknote', module: 'Gerencia',
    view: 'management.view', manage: 'management.manage',
    search: ['notes'], filters: { profile_id: 'profile_id', distribution_item_id: 'distribution_item_id' },
    order: 'withdrawn_at desc', auto: { created_by: 'user.id' },
    fields: {
      distribution_item_id: U('Participación'), profile_id: U('Beneficiario'),
      amount: NR('Monto'), withdrawn_at: D('Fecha'), notes: S('Notas'),
    },
  },

  // ── MARKETING ─────────────────────────────────────────────────────────────
  campaigns: {
    table: 'campaigns', label: 'Campañas', icon: 'Megaphone', module: 'Marketing',
    view: 'marketing.view', manage: 'marketing.manage',
    search: ['name', 'channel', 'objective'],
    filters: { status: 'status', channel: 'channel' }, order: 'start_date desc nulls last, created_at desc',
    fields: {
      name: SR('Campaña'), channel: S('Canal (Google Ads, Meta Ads, …)'), objective: S('Objetivo'),
      budget: N('Presupuesto'), start_date: D('Inicio'), end_date: D('Fin'),
      status: E('Estado', CAMPAIGN_STATUS), notes: S('Notas'),
    },
    hint: 'La inversión real, leads y conversiones se registran en Métricas de campaña.',
  },
  campaign_metrics: {
    table: 'campaign_metrics', label: 'Métricas de campaña', icon: 'BarChart3', module: 'Marketing',
    view: 'marketing.view', manage: 'marketing.manage',
    search: ['notes'], filters: { campaign_id: 'campaign_id' }, order: 'recorded_at desc',
    auto: { created_by: 'user.id' },
    fields: {
      campaign_id: UR('Campaña'), spent: N('Inversión'), impressions: I('Impresiones'),
      clicks: I('Clics'), leads: I('Leads'), conversions: I('Conversiones'),
      recorded_at: D('Fecha'), notes: S('Notas'),
    },
    hint: 'Registro manual. No hay integración con Google Ads API ni Meta Ads API en FASE 1.',
  },
  leads: {
    table: 'leads', label: 'Prospectos', icon: 'Target', module: 'Marketing',
    view: 'marketing.view', manage: 'marketing.manage',
    search: ['company_name', 'contact_name', 'email', 'phone', 'source'],
    filters: { status: 'status', source: 'source', assigned_to: 'assigned_to' }, order: 'created_at desc',
    fields: {
      company_name: S('Empresa'), contact_name: SR('Contacto'), email: S('Correo'), phone: S('Teléfono'),
      source: S('Origen'), interest: S('Interés'), estimated_value: N('Valor estimado'),
      status: E('Estado', LEAD_STATUS), assigned_to: U('Responsable'),
      converted_client_id: U('Cliente convertido'), notes: S('Notas'),
    },
  },
  follow_ups: {
    table: 'follow_ups', label: 'Seguimientos', icon: 'PhoneCall', module: 'Marketing',
    view: 'marketing.view', manage: 'marketing.manage',
    search: ['description', 'channel', 'result'],
    filters: { lead_id: 'lead_id', client_id: 'client_id', quote_id: 'quote_id', status: 'status' },
    order: 'follow_up_date desc',
    fields: {
      lead_id: U('Prospecto'), client_id: U('Cliente'), quote_id: U('Cotización'),
      assigned_to: U('Responsable'), follow_up_date: DT('Fecha y hora'), channel: S('Canal'),
      description: SR('Descripción'), status: E('Estado', FOLLOWUP_STATUS), result: S('Resultado'),
    },
    hint: 'Debe indicarse al menos un Prospecto o un Cliente.',
  },
  service_catalog: {
    table: 'service_catalog', label: 'Catálogo de servicios', icon: 'Layers', module: 'Configuración',
    view: 'settings.view', manage: 'settings.manage',
    search: ['name', 'category', 'description'], filters: { category: 'category', is_active: 'is_active' },
    order: 'name asc',
    fields: {
      name: SR('Servicio'), category: SR('Categoría'), description: S('Descripción'),
      default_price: N('Precio por defecto'), is_active: B('Activo'),
    },
  },

  // ── OPERACIONES / SOPORTE ─────────────────────────────────────────────────
  domains: {
    table: 'domains', label: 'Dominios', icon: 'Globe', module: 'Operaciones',
    view: 'ops.view', manage: 'ops.manage',
    search: ['domain_name', 'registrar'], filters: { client_id: 'client_id', project_id: 'project_id', status: 'status' },
    order: 'expiration_date asc nulls last',
    fields: {
      client_id: UR('Cliente'), project_id: U('Proyecto'), domain_name: SR('Dominio'),
      registrar: S('Registrador'), registration_date: D('Registro'), expiration_date: D('Vencimiento'),
      renewal_cost: N('Costo de renovación'), auto_renew: B('Renovación automática'),
      status: E('Estado', DOMAIN_STATUS), notes: S('Notas'),
    },
  },
  hosting_accounts: {
    table: 'hosting_accounts', label: 'Hosting', icon: 'Server', module: 'Operaciones',
    view: 'ops.view', manage: 'ops.manage',
    search: ['provider', 'account_name', 'plan_name'], filters: { client_id: 'client_id', status: 'status' },
    order: 'renewal_date asc nulls last',
    fields: {
      client_id: U('Cliente'), provider: SR('Proveedor'), account_name: SR('Cuenta'),
      plan_name: S('Plan'), server_type: S('Tipo de servidor'), panel_url: S('Enlace al panel'),
      renewal_date: D('Renovación'), amount: N('Importe'), currency: S('Moneda'),
      status: E('Estado', HOSTING_STATUS), notes: S('Notas'),
    },
  },
  websites: {
    table: 'websites', label: 'Sitios web', icon: 'Monitor', module: 'Operaciones',
    view: 'ops.view', manage: 'ops.manage',
    search: ['site_name', 'site_url', 'platform'], filters: { client_id: 'client_id', project_id: 'project_id', status: 'status' },
    order: 'created_at desc',
    fields: {
      client_id: UR('Cliente'), project_id: U('Proyecto'), hosting_account_id: U('Hosting'),
      domain_id: U('Dominio'), site_name: SR('Nombre del sitio'), site_url: SR('URL'),
      environment: E('Entorno', ENVIRONMENT), platform: S('Plataforma'),
      status: E('Estado', WEBSITE_STATUS), admin_url: S('URL de administración'), notes: S('Notas'),
    },
  },
  renewals: {
    table: 'renewals', label: 'Renovaciones', icon: 'RefreshCw', module: 'Operaciones',
    view: 'ops.view', manage: 'ops.manage',
    search: ['notes'], filters: { status: 'status', renewal_type: 'renewal_type', domain_id: 'domain_id', hosting_account_id: 'hosting_account_id' },
    order: 'due_date asc',
    fields: {
      domain_id: U('Dominio'), hosting_account_id: U('Hosting'),
      renewal_type: E('Tipo', RENEWAL_TYPE), due_date: DR('Vencimiento'),
      renewal_date: D('Fecha de renovación'), amount: NR('Monto'),
      status: E('Estado', RENEWAL_STATUS), notes: S('Notas'),
    },
    hint: 'Debe indicarse al menos un Dominio o una cuenta de Hosting.',
  },
  maintenance_plans: {
    table: 'maintenance_plans', label: 'Planes de mantenimiento', icon: 'Wrench', module: 'Operaciones',
    view: 'ops.view', manage: 'ops.manage',
    search: ['plan_name', 'description'], filters: { client_id: 'client_id', status: 'status', frequency: 'frequency' },
    order: 'next_service_date asc nulls last',
    fields: {
      client_id: UR('Cliente'), website_id: U('Sitio web'), plan_name: SR('Plan'),
      description: S('Descripción'), frequency: E('Frecuencia', FREQUENCY),
      start_date: DR('Inicio'), end_date: D('Fin'), amount: NR('Importe'),
      status: E('Estado', PLAN_STATUS), next_service_date: D('Próximo servicio'),
    },
  },
  tickets: {
    table: 'tickets', label: 'Tickets', icon: 'Ticket', module: 'Operaciones',
    view: 'ops.view', manage: 'ops.manage',
    search: ['subject', 'description', 'category'],
    filters: { client_id: 'client_id', project_id: 'project_id', status: 'status', priority: 'priority', assigned_to: 'assigned_to' },
    order: 'opened_at desc',
    fields: {
      client_id: UR('Cliente'), project_id: U('Proyecto'), website_id: U('Sitio web'),
      assigned_to: U('Asignado a'), subject: SR('Asunto'), description: SR('Descripción'),
      category: S('Categoría'), priority: E('Prioridad', PRIORITY),
      status: E('Estado', TICKET_STATUS), closed_at: DT('Cerrado el'),
    },
  },
  incidents: {
    table: 'incidents', label: 'Incidencias', icon: 'AlertTriangle', module: 'Operaciones',
    view: 'ops.view', manage: 'ops.manage',
    search: ['title', 'description'], filters: { project_id: 'project_id', status: 'status', severity: 'severity' },
    order: 'created_at desc',
    fields: {
      project_id: U('Proyecto'), website_id: U('Sitio web'), reported_by: U('Reportado por'),
      assigned_to: U('Asignado a'), title: SR('Título'), description: S('Descripción'),
      severity: E('Severidad', SEVERITY), status: E('Estado', INCIDENT_STATUS), resolved_at: DT('Resuelta el'),
    },
  },
  surveys: {
    table: 'surveys', label: 'Encuestas', icon: 'Star', module: 'Operaciones',
    view: 'ops.view', manage: 'ops.manage',
    search: ['comments'], filters: { client_id: 'client_id', project_id: 'project_id' },
    order: 'submitted_at desc',
    fields: {
      client_id: UR('Cliente'), project_id: U('Proyecto'), ticket_id: U('Ticket'),
      rating: NR('Calificación (1–5)'), comments: S('Comentarios'),
    },
  },

  // ── CONFIGURACIÓN / AUDITORÍA ─────────────────────────────────────────────
  profiles: {
    table: 'profiles', label: 'Usuarios y roles', icon: 'Shield', module: 'Configuración',
    view: 'settings.view', manage: 'users.manage', deletable: false, creatable: false,
    search: ['full_name', 'email', 'phone'], filters: { role: 'role', is_active: 'is_active' },
    order: 'created_at desc',
    fields: {
      full_name: SR('Nombre completo'), email: S('Correo'), phone: S('Teléfono'),
      role: E('Rol', ROLE_VALUES), is_active: B('Activo'),
    },
    hint: 'El id del perfil proviene de Supabase Auth. No se pueden crear perfiles sin un usuario de Auth.',
  },
  activity_logs: {
    table: 'activity_logs', label: 'Actividad (auditoría)', icon: 'Activity', module: 'Gerencia',
    view: 'dashboard.view', manage: null, deletable: false, readonly: true,
    search: ['table_name', 'action'], filters: { table_name: 'table_name', action: 'action', user_id: 'user_id' },
    order: 'created_at desc',
    fields: {},
    hint: 'Generada automáticamente por los triggers de la base de datos. Solo lectura.',
  },
  schema_migrations: {
    table: 'schema_migrations', label: 'Migraciones', icon: 'Database', module: 'Configuración',
    view: 'settings.view', manage: null, deletable: false, readonly: true,
    search: ['filename'], filters: {}, order: 'applied_at asc',
    fields: {},
    hint: 'Control de versiones del esquema. Solo lectura.',
  },
};

/** Devuelve la definición pública de una entidad (segura para el frontend). */
export function publicSchema(entity) {
  const def = CATALOG[entity];
  if (!def) return null;
  return {
    entity,
    table: def.table,
    label: def.label,
    icon: def.icon,
    module: def.module,
    order: def.order,
    deletable: def.deletable !== false && !!def.manage,
    creatable: def.creatable !== false && !!def.manage && !def.readonly,
    readonly: !!def.readonly || !def.manage,
    view: def.view,
    manage: def.manage,
    search: def.search || [],
    filters: Object.keys(def.filters || {}),
    hint: def.hint || null,
    fields: Object.fromEntries(
      Object.entries(def.fields).map(([k, [type, label]]) => {
        const out = { type, label };
        if (type.startsWith('e:')) out.values = type.slice(2).split(',');
        out.required = type.includes('!');
        return [k, out];
      })
    ),
  };
}

export const ENTITIES = Object.keys(CATALOG);
export { ALL_PERMISSIONS };
