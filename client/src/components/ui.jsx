import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, AlertTriangle } from 'lucide-react';

/* ---------------- Modal ---------------- */
export function Modal({ open, onClose, title, children, footer, wide }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current?.();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  if (!open) return null;
  return createPortal((
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto overscroll-contain p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-xl" onClick={onClose} />
      <div
        className={`relative my-auto flex w-full min-h-0 max-h-[calc(100dvh-2rem)] sm:max-h-[90dvh] flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/70 bg-white/45 px-5 py-4 sm:px-6">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">{children}</div>
        {footer && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-white/70 bg-white/55 px-5 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  ), document.body);
}

/* ---------------- Botón ---------------- */
export function Button({ children, variant = 'primary', loading, className = '', ...props }) {
  const variants = {
    primary: 'bg-[#5170ff] text-white hover:bg-[#405ee8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5170ff]/40 focus-visible:ring-offset-2',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-slate-600 hover:bg-slate-100',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

/* ---------------- Campos ---------------- */
export function Field({ label, children, hint, required }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-semibold text-slate-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5170ff]/20 focus:border-[#5170ff] placeholder:text-slate-400';

export function Input(props) {
  return <input {...props} className={`${inputCls} ${props.className || ''}`} />;
}

export function Select({ children, ...props }) {
  return (
    <select {...props} className={`${inputCls} ${props.className || ''}`}>
      {children}
    </select>
  );
}

export function Textarea(props) {
  return <textarea {...props} className={`${inputCls} ${props.className || ''}`} />;
}

/* ---------------- Badges ---------------- */
const badgeColors = {
  gray: 'bg-slate-100 text-slate-600',
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
};

export function Badge({ color = 'gray', children }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badgeColors[color] || badgeColors.gray}`}>
      {children}
    </span>
  );
}

/** Colores para los valores REALES de los CHECK de Supabase. */
export const statusColor = (status) =>
  ({
    // positivos
    activo: 'green', activa: 'green', confirmado: 'green', firmado: 'green',
    aplicada: 'green', aprobada: 'green', pagada: 'green', pagado: 'green',
    aceptada: 'green', entregada: 'green', completada: 'green', finalizada: 'green',
    finalizado: 'green', ganado: 'green', resuelto: 'green', resuelta: 'green',
    cerrado: 'blue', cerrada: 'blue', renovado: 'green',
    // en curso / neutros
    pendiente: 'yellow', en_proceso: 'blue', en_revision: 'blue', enviada: 'blue',
    prospecto: 'blue', borrador: 'gray', pausado: 'yellow', pausada: 'yellow',
    planificada: 'blue', contactado: 'blue', calificado: 'blue', propuesta: 'blue',
    esperando_cliente: 'yellow', notificado: 'yellow', en_desarrollo: 'blue',
    // negativos
    cancelado: 'red', rechazada: 'red', vencida: 'red', vencido: 'red',
    anulada: 'red', bloqueado: 'red', bloqueada: 'red', perdido: 'red',
    reembolsado: 'red', suspendido: 'red', retirado: 'red', inactivo: 'gray',
    abierto: 'yellow', abierta: 'yellow', critica: 'red', alta: 'red', urgente: 'red',
  }[status] || 'gray');

/* ---------------- Stat card ---------------- */
export function StatCard({ icon: Icon, label, value, hint, tone = 'default' }) {
  const tones = {
    default: 'text-slate-900',
    green: 'text-emerald-600',
    red: 'text-red-600',
    blue: 'text-blue-600',
    amber: 'text-amber-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 shadow-sm">
      {Icon && (
        <div className="p-2.5 rounded-lg bg-slate-100 text-slate-600">
          <Icon size={18} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className={`text-xl font-bold mt-1 truncate ${tones[tone]}`}>{value}</p>
        {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      </div>
    </div>
  );
}

/* ---------------- Tabla ---------------- */
export function Table({ columns, children }) {
  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/70">
            {columns.map((c, i) => (
              <th key={i} className={`table-head px-4 py-3 text-left ${c.align === 'right' ? 'text-right' : ''}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
      {Icon && (
        <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <Icon size={22} />
        </div>
      )}
      <p className="font-semibold text-slate-700">{title}</p>
      {description && <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Spinner({ className = '' }) {
  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <Loader2 className="animate-spin text-slate-400" size={26} />
    </div>
  );
}

/* ---------------- Confirm ---------------- */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Eliminar', danger = true }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title || 'Confirmar acción'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={handle}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3 items-start">
        <div className="p-2 rounded-full bg-red-50 text-red-600 shrink-0">
          <AlertTriangle size={18} />
        </div>
        <p className="text-sm text-slate-600">{message}</p>
      </div>
    </Modal>
  );
}

/* ---------------- Toast simple ---------------- */
export function Toast({ message, onClose }) {
  const timer = useRef();
  useEffect(() => {
    if (!message) return;
    timer.current = setTimeout(onClose, 3200);
    return () => clearTimeout(timer.current);
  }, [message, onClose]);
  if (!message) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[60] bg-slate-900 text-white text-sm px-4 py-3 rounded-lg shadow-xl">
      {message}
    </div>
  );
}

/* ---------------- Tabs ---------------- */
export function Tabs({ tabs, active, onChange, variant = 'primary', ariaLabel = 'Secciones' }) {
  const primary = variant === 'primary';
  return (
    <div role="tablist" aria-label={ariaLabel} className={primary
      ? 'flex flex-wrap items-center gap-2'
      : 'flex gap-1 overflow-x-auto border-b border-slate-200'}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          className={primary
            ? `inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5170ff]/40 ${active === t.id
              ? 'border-[#5170ff] bg-[#5170ff] text-white shadow-sm'
              : 'border-slate-200 bg-white text-slate-600 hover:border-[#5170ff]/40 hover:text-[#5170ff]'}`
            : `inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5170ff]/30 ${active === t.id
              ? 'border-[#5170ff] text-[#5170ff]'
              : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          {primary && active === t.id && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#cef009]" />}
          {t.label}
          {t.count !== undefined && (
            <span className="ml-1.5 text-xs text-slate-400">({t.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}
