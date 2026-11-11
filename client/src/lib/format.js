const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Formato COP: $ 1.234.567 */
export const fmtMoney = (v) => copFormatter.format(Number(v) || 0);

/** Número en es-CO */
export const fmtNum = (v, digits = 0) =>
  new Intl.NumberFormat('es-CO', { maximumFractionDigits: digits }).format(Number(v) || 0);

/** Fecha -> DD/MM/YYYY ( exigido por el diseño ) */
export const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};

/** Fecha y hora -> DD/MM/YYYY HH:mm */
export const fmtDateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return `${fmtDate(v)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Valor ISO (YYYY-MM-DD) para inputs type=date, sin corrimiento de zona */
export const toDateInput = (v) => {
  if (!v) return '';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

/** ISO datetime-local para inputs */
export const toDateTimeInput = (v) => {
  if (!v) return '';
  const s = String(v);
  return s.length >= 16 ? s.slice(0, 16) : `${s}T00:00`;
};

export const fmtPct = (v) => `${fmtNum(v, 2)}%`;

/** Etiquetas en español de los valores REALES de los CHECK de Supabase. */
export const LABELS = {
  // clients
  persona: 'Persona', empresa: 'Empresa',
  prospecto: 'Prospecto', activo: 'Activo', inactivo: 'Inactivo', bloqueado: 'Bloqueado',
  // projects
  pendiente: 'Pendiente', en_proceso: 'En proceso', en_revision: 'En revisión',
  pausado: 'Pausado', finalizado: 'Finalizado', cancelado: 'Cancelado',
  baja: 'Baja', media: 'Media', alta: 'Alta', urgente: 'Urgente',
  landing_page: 'Landing page', corporativa: 'Corporativa', ecommerce: 'E-commerce',
  marketplace: 'Marketplace', web_app: 'Aplicación web', mantenimiento: 'Mantenimiento', otro: 'Otro',
  // quotes / invoices / contracts
  borrador: 'Borrador', enviada: 'Enviada', aceptada: 'Aceptada', rechazada: 'Rechazada', vencida: 'Vencida',
  pagada: 'Pagada', anulada: 'Anulada', firmado: 'Firmado', vencido: 'Vencido',
  // payments
  confirmado: 'Confirmado', reembolsado: 'Reembolsado',
  transferencia: 'Transferencia', efectivo: 'Efectivo', tarjeta: 'Tarjeta', pse: 'PSE',
  consignacion: 'Consignación', anticipo: 'Anticipo', abono: 'Abono',
  pago_final: 'Pago final', reembolso: 'Reembolso',
  // campaigns / leads
  planificada: 'Planificada', activa: 'Activa', pausada: 'Pausada', finalizada: 'Finalizada',
  nuevo: 'Nuevo', contactado: 'Contactado', calificado: 'Calificado', propuesta: 'Propuesta',
  ganado: 'Ganado', perdido: 'Perdido',
  // tasks / deliveries / tickets
  completada: 'Completada', bloqueada: 'Bloqueada',
  entregada: 'Entregada', aprobada: 'Aprobada',
  abierto: 'Abierto', esperando_cliente: 'Esperando cliente', resuelto: 'Resuelto', cerrado: 'Cerrado',
  abierta: 'Abierta', en_proceso_: 'En proceso', resuelta: 'Resuelta', cerrada: 'Cerrada',
  critica: 'Crítica',
  // dominios / hosting / sitios / renovaciones
  transferencia_: 'Transferencia', suspendido: 'Suspendido', retirado: 'Retirado',
  en_desarrollo: 'En desarrollo', produccion: 'Producción', staging: 'Staging', desarrollo: 'Desarrollo',
  dominio: 'Dominio', hosting: 'Hosting', ssl: 'SSL', licencia: 'Licencia',
  notificado: 'Notificado', renovado: 'Renovado',
  semanal: 'Semanal', quincenal: 'Quincenal', mensual: 'Mensual', trimestral: 'Trimestral', anual: 'Anual',
  // bonificaciones / distribuciones
  aplicada: 'Aplicada', pendiente_: 'Pendiente', pagado: 'Pagado', anulado: 'Anulado',
  aprobada: 'Aprobada', pagada_: 'Pagada', anulada_: 'Anulada',
  // roles
  administrador: 'Administrador', direccion: 'Gerencia', comercial: 'Marketing',
  desarrollo: 'Desarrollo', finanzas: 'Contabilidad', soporte: 'Soporte',
};

/** Convierte un valor de enum de la BD a etiqueta legible. */
export const label = (v) => {
  if (v === null || v === undefined || v === '') return '—';
  const s = String(v);
  return LABELS[s] || s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
};

/** ¿Este campo debe mostrarse como dinero? */
export const isMoneyField = (name) =>
  /amount|price|cost|budget|spent|total|profit|value|renewal|subtotal|tax|hours/i.test(name)
  && !/percentage|margin|rate|rating|count|quantity/i.test(name);

export const ROLE_LABELS = {
  administrador: 'Administrador',
  direccion: 'Gerencia',
  finanzas: 'Contabilidad',
  desarrollo: 'Desarrollo',
  comercial: 'Marketing',
  soporte: 'Soporte',
};
