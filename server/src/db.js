import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

// Nombres lógicos que consume el frontend -> identificadores reales en
// Supabase. La lista sigue SUPABASE_SCHEMA_MAP.md; los campos de `perfiles`
// full_name/email/phone/role/is_active permanecen en inglés deliberadamente.
export const TABLE_NAMES = {
  areas: 'areas', profiles: 'perfiles', profile_areas: 'perfiles_areas', project_members: 'proyectos_integrantes',
  clients: 'clientes', contacts: 'contactos', leads: 'prospectos', follow_ups: 'seguimientos', quotes: 'cotizaciones',
  quote_items: 'detalle_cotizaciones', service_catalog: 'catalogo_servicios', projects: 'proyectos',
  project_services: 'servicios_proyecto', tasks: 'tareas', deliveries: 'entregas', time_entries: 'registros_horas',
  project_history: 'historial_proyectos', contracts: 'contratos', invoices: 'facturas', payments: 'pagos',
  expenses: 'gastos', project_costs: 'costos_proyecto', extra_expenses: 'gastos_adicionales', bonuses: 'bonificaciones',
  profit_distributions: 'distribuciones_utilidades', profit_distribution_items: 'detalle_distribucion_utilidades',
  withdrawals: 'retiros', campaigns: 'campanas', campaign_metrics: 'metricas_campanas', websites: 'sitios_web',
  domains: 'dominios', hosting_accounts: 'cuentas_alojamiento', renewals: 'renovaciones',
  maintenance_plans: 'planes_mantenimiento', documents: 'documentos', tickets: 'tickets_soporte',
  incidents: 'incidencias', surveys: 'encuestas', activity_logs: 'registros_actividad', schema_migrations: 'schema_migrations',
};

const INVERSE_TABLES = Object.fromEntries(Object.entries(TABLE_NAMES).map(([logical, physical]) => [physical, logical]));

export const COLUMN_NAMES = {
  areas: { code: 'codigo', name: 'nombre', description: 'descripcion', is_active: 'activa', created_at: 'fecha_creacion' },
  profiles: { created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  profile_areas: { profile_id: 'perfil_id', assigned_by: 'asignado_por', assigned_at: 'fecha_asignacion' },
  project_members: { project_id: 'proyecto_id', profile_id: 'perfil_id', assigned_by: 'asignado_por', assigned_at: 'fecha_asignacion', notes: 'observaciones' },
  clients: { code: 'codigo_cliente', company_name: 'nombre_empresa', client_type: 'tipo_cliente', document_type: 'tipo_documento', document_number: 'numero_documento', email: 'correo_electronico', phone: 'telefono', website: 'sitio_web', address: 'direccion', city: 'ciudad', country: 'pais', industry: 'sector_economico', status: 'estado', notes: 'observaciones', created_by: 'creado_por', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  contacts: { client_id: 'cliente_id', full_name: 'nombre_completo', position: 'cargo', email: 'correo_electronico', phone: 'telefono', is_primary: 'es_contacto_principal', notes: 'observaciones', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  leads: { company_name: 'nombre_empresa', contact_name: 'nombre_contacto', email: 'correo_electronico', phone: 'telefono', source: 'origen', interest: 'servicio_interes', estimated_value: 'valor_estimado', status: 'estado', assigned_to: 'asignado_a', converted_client_id: 'cliente_convertido_id', notes: 'observaciones', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  follow_ups: { lead_id: 'prospecto_id', client_id: 'cliente_id', quote_id: 'cotizacion_id', assigned_to: 'asignado_a', follow_up_date: 'fecha_seguimiento', description: 'descripcion', status: 'estado', result: 'resultado', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  quotes: { lead_id: 'prospecto_id', client_id: 'cliente_id', quote_number: 'numero_cotizacion', issue_date: 'fecha_emision', expiration_date: 'fecha_vencimiento', tax_amount: 'valor_impuestos', total_amount: 'valor_total', status: 'estado', quote_url: 'url_cotizacion', assigned_to: 'asignado_a', notes: 'observaciones', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  quote_items: { quote_id: 'cotizacion_id', service_id: 'servicio_id', description: 'descripcion', quantity: 'cantidad', unit_price: 'precio_unitario', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  service_catalog: { name: 'nombre', description: 'descripcion', default_price: 'precio_base', is_active: 'esta_activo', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  projects: { code: 'codigo_proyecto', client_id: 'cliente_id', project_name: 'nombre_proyecto', project_type: 'tipo_proyecto', description: 'descripcion', status: 'estado', priority: 'prioridad', contract_date: 'fecha_contrato', start_date: 'fecha_inicio', estimated_delivery_date: 'fecha_entrega_estimada', actual_delivery_date: 'fecha_entrega_real', total_amount: 'valor_total', currency: 'moneda', responsible_id: 'responsable_id', created_by: 'creado_por', notes: 'observaciones', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  project_services: { project_id: 'proyecto_id', service_id: 'servicio_id', service_name: 'nombre_servicio', description: 'descripcion', quantity: 'cantidad', unit_price: 'precio_unitario', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  tasks: { project_id: 'proyecto_id', title: 'titulo', description: 'descripcion', assigned_to: 'asignado_a', created_by: 'creado_por', priority: 'prioridad', status: 'estado', start_date: 'fecha_inicio', due_date: 'fecha_limite', completed_at: 'fecha_completado', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  deliveries: { project_id: 'proyecto_id', delivery_name: 'nombre_entrega', description: 'descripcion', delivery_url: 'url_entrega', delivery_date: 'fecha_entrega', status: 'estado', reviewed_by: 'revisado_por', notes: 'observaciones', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  time_entries: { project_id: 'proyecto_id', task_id: 'tarea_id', user_id: 'usuario_id', work_date: 'fecha_trabajo', description: 'descripcion', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  project_history: { project_id: 'proyecto_id', user_id: 'usuario_id', event_type: 'tipo_evento', description: 'descripcion', created_at: 'fecha_creacion' },
  contracts: { project_id: 'proyecto_id', contract_number: 'numero_contrato', contract_url: 'url_contrato', signed_date: 'fecha_firma', start_date: 'fecha_inicio', end_date: 'fecha_finalizacion', amount: 'valor_contrato', status: 'estado', notes: 'observaciones', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  invoices: { client_id: 'cliente_id', project_id: 'proyecto_id', invoice_number: 'numero_factura', issue_date: 'fecha_emision', due_date: 'fecha_vencimiento', tax_amount: 'valor_impuestos', total_amount: 'valor_total', status: 'estado', invoice_url: 'url_factura', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  payments: { project_id: 'proyecto_id', client_id: 'cliente_id', payment_reference: 'referencia_pago', amount: 'valor', payment_date: 'fecha_pago', payment_method: 'metodo_pago', payment_type: 'tipo_pago', status: 'estado', receipt_url: 'url_comprobante', notes: 'observaciones', registered_by: 'registrado_por', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  expenses: { project_id: 'proyecto_id', category: 'categoria', description: 'descripcion', amount: 'valor', expense_date: 'fecha_gasto', supplier: 'proveedor', payment_method: 'metodo_pago', receipt_url: 'url_comprobante', registered_by: 'registrado_por', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  project_costs: { project_id: 'proyecto_id', cost_type: 'tipo_costo', description: 'descripcion', amount: 'valor', cost_date: 'fecha_costo', expense_id: 'gasto_id', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  extra_expenses: { project_id: 'proyecto_id', description: 'descripcion', category: 'categoria', amount: 'monto', spent_at: 'fecha_gasto', receipt_url: 'url_comprobante', notes: 'observaciones', created_by: 'creado_por', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  bonuses: { client_id: 'cliente_id', project_id: 'proyecto_id', amount: 'valor', reason: 'motivo', status: 'estado', granted_at: 'fecha_asignacion', notes: 'observaciones', created_by: 'creado_por', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  profit_distributions: { period_start: 'periodo_inicio', period_end: 'periodo_fin', total_profit: 'utilidad_total', status: 'estado', notes: 'observaciones', created_by: 'creado_por', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  profit_distribution_items: { distribution_id: 'distribucion_id', profile_id: 'perfil_id', percentage: 'porcentaje', status: 'estado', created_at: 'fecha_creacion' },
  withdrawals: { distribution_item_id: 'detalle_distribucion_id', profile_id: 'perfil_id', amount: 'monto', withdrawn_at: 'fecha_retiro', notes: 'observaciones', created_by: 'creado_por', created_at: 'fecha_creacion' },
  campaigns: { name: 'nombre', budget: 'presupuesto', start_date: 'fecha_inicio', end_date: 'fecha_finalizacion', status: 'estado', notes: 'observaciones', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  campaign_metrics: { campaign_id: 'campana_id', spent: 'inversion', clicks: 'clics', leads: 'prospectos', recorded_at: 'fecha_registro', notes: 'observaciones', created_by: 'creado_por', created_at: 'fecha_creacion' },
  websites: { client_id: 'cliente_id', project_id: 'proyecto_id', hosting_account_id: 'cuenta_alojamiento_id', domain_id: 'dominio_id', site_name: 'nombre_sitio', site_url: 'url_sitio', environment: 'entorno', status: 'estado', admin_url: 'url_administracion', notes: 'observaciones', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  domains: { client_id: 'cliente_id', project_id: 'proyecto_id', domain_name: 'nombre_dominio', registration_date: 'fecha_registro', expiration_date: 'fecha_vencimiento', renewal_cost: 'costo_renovacion', auto_renew: 'renovacion_automatica', status: 'estado', notes: 'observaciones', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  hosting_accounts: { client_id: 'cliente_id', account_name: 'nombre_cuenta', plan_name: 'nombre_plan', server_type: 'tipo_servidor', renewal_date: 'fecha_renovacion', amount: 'valor', status: 'estado', notes: 'observaciones', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  renewals: { domain_id: 'dominio_id', hosting_account_id: 'cuenta_alojamiento_id', renewal_type: 'tipo_renovacion', due_date: 'fecha_vencimiento', renewal_date: 'fecha_renovacion', amount: 'valor', status: 'estado', notes: 'observaciones', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  maintenance_plans: { client_id: 'cliente_id', website_id: 'sitio_web_id', plan_name: 'nombre_plan', description: 'descripcion', start_date: 'fecha_inicio', end_date: 'fecha_finalizacion', amount: 'valor', status: 'estado', next_service_date: 'fecha_proximo_servicio', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  documents: { client_id: 'cliente_id', project_id: 'proyecto_id', document_type: 'tipo_documento', document_name: 'nombre_documento', file_url: 'url_archivo', uploaded_by: 'cargado_por', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  tickets: { client_id: 'cliente_id', project_id: 'proyecto_id', website_id: 'sitio_web_id', assigned_to: 'asignado_a', subject: 'asunto', description: 'descripcion', priority: 'prioridad', status: 'estado', opened_at: 'fecha_apertura', closed_at: 'fecha_cierre', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  incidents: { project_id: 'proyecto_id', website_id: 'sitio_web_id', reported_by: 'reportado_por', assigned_to: 'asignado_a', title: 'titulo', description: 'descripcion', severity: 'gravedad', status: 'estado', resolved_at: 'fecha_resolucion', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  surveys: { client_id: 'cliente_id', project_id: 'proyecto_id', ticket_id: 'ticket_soporte_id', rating: 'calificacion', comments: 'comentarios', submitted_at: 'fecha_envio', created_at: 'fecha_creacion', updated_at: 'fecha_actualizacion' },
  activity_logs: { user_id: 'usuario_id', table_name: 'nombre_tabla', record_id: 'registro_id', action: 'accion', old_data: 'datos_anteriores', new_data: 'datos_nuevos', created_at: 'fecha_creacion' },
};

export const pool = config.databaseUrl
  ? new Pool({ connectionString: config.databaseUrl, max: 10, ssl: config.pgSsl })
  : null;

function noDb() {
  const err = new Error(
    'DATABASE_URL no configurado. Configura la cadena del Session pooler de Supabase en server/.env.'
  );
  err.status = 503;
  return err;
}

/** Ejecuta una consulta y devuelve las filas. */
export async function query(text, params) {
  if (!pool) throw noDb();
  const res = await pool.query(text, params);
  return res.rows;
}

/** Ejecuta una consulta y devuelve una sola fila (o null). */
export async function queryOne(text, params) {
  const rows = await query(text, params);
  return rows[0] ?? null;
}

/** Ejecuta fn dentro de una transacción. */
export async function withTransaction(fn) {
  if (!pool) throw noDb();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** Traduce errores de restricciones de Postgres a mensajes de negocio. */
export function mapDbError(e) {
  if (e.code === '23505') {
    const err = new Error('Ya existe un registro con ese valor único (código, número o referencia duplicado).');
    err.status = 409;
    return err;
  }
  if (e.code === '23503') {
    const err = new Error('Violación de relación: el registro referenciado no existe o está en uso (no se puede eliminar).');
    err.status = 409;
    return err;
  }
  if (e.code === '23514') {
    const err = new Error('Valor fuera de los límites permitidos por la base de datos. Revisa estados, importes y fechas.');
    err.status = 400;
    return err;
  }
  if (e.code === '23502') {
    const err = new Error(`Falta un campo obligatorio (${e.column || 'sin especificar'}).`);
    err.status = 400;
    return err;
  }
  return e;
}
