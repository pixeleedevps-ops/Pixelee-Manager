import { useCallback, useEffect, useState } from 'react';
import {
  Activity, ArrowRight, Database, KeyRound, Layers3, RefreshCw,
  ShieldCheck, Users, Wrench,
} from 'lucide-react';
import { get } from '../lib/api';
import { ROLE_LABELS } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { Badge, Button, Spinner, StatCard } from './ui';
import { Section } from './OverviewUi';

const SECTIONS = [
  { id: 'profiles', title: 'Usuarios y roles', description: 'Consulta usuarios, roles y estado de las cuentas.', icon: Users },
  { id: 'services', title: 'Catálogo de servicios', description: 'Administra los servicios disponibles para cotizar.', icon: Layers3 },
  { id: 'activity', title: 'Auditoría', description: 'Revisa los cambios registrados por la base de datos.', icon: Activity },
  { id: 'migrations', title: 'Migraciones', description: 'Consulta el historial de cambios de esquema.', icon: Database },
];

function StatusValue({ value }) {
  if (!value) return <span className="text-slate-400">Consultando…</span>;
  return value === 'configurada'
    ? <Badge color="green">Configurada</Badge>
    : <Badge color="red">Sin configurar</Badge>;
}

export default function SettingsOverview({ onOpenTab }) {
  const { user, permissions, schema } = useAuth();
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const checkHealth = useCallback(async (signal) => {
    setChecking(true);
    setError('');
    try {
      const result = await get('/health', undefined, { signal });
      setHealth(result);
    } catch (e) {
      if (e.name !== 'AbortError') setError(e.message);
    } finally {
      if (!signal?.aborted) setChecking(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    checkHealth(controller.signal);
    return () => controller.abort();
  }, [checkHealth]);

  const entityCount = schema?.entities?.length ?? '—';
  const roleName = ROLE_LABELS[user?.role] || user?.role || 'Sin rol';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Estado general, acceso y herramientas administrativas.</p>
        </div>
        <Button variant="secondary" onClick={() => checkHealth()} loading={checking}>
          <RefreshCw size={15} /> Revisar estado
        </Button>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">No se pudo consultar el estado del API: {error}</div>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard icon={Database} label="API" value={health ? (health.ok ? 'Disponible' : 'Con error') : checking ? 'Consultando…' : 'Sin respuesta'} tone={health?.ok ? 'green' : error ? 'red' : 'default'} />
        <StatCard icon={Database} label="Configuración de base de datos" value={health?.database === 'configurada' ? 'Configurada' : health ? 'Pendiente' : '—'} tone={health?.database === 'configurada' ? 'green' : 'default'} />
        <StatCard icon={KeyRound} label="Supabase Auth" value={health?.supabaseAuth === 'configurada' ? 'Configurada' : health ? 'Pendiente' : '—'} tone={health?.supabaseAuth === 'configurada' ? 'green' : 'default'} />
        <StatCard icon={Layers3} label="Entidades disponibles" value={entityCount} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="Accesos de configuración" icon={Wrench}>
          <div className="grid sm:grid-cols-2 gap-3">
            {SECTIONS.map(({ id, title, description, icon: Icon }) => (
              <button key={id} type="button" onClick={() => onOpenTab(id)}
                className="group rounded-xl border border-slate-200 p-4 text-left transition hover:border-[#5170ff]/50 hover:bg-[#5170ff]/5 focus:outline-none focus:ring-2 focus:ring-[#5170ff]">
                <span className="flex items-center justify-between text-slate-700">
                  <Icon size={18} className="text-[#5170ff]" />
                  <ArrowRight size={15} className="text-slate-400 transition group-hover:translate-x-1" />
                </span>
                <span className="mt-3 block text-sm font-semibold text-slate-800">{title}</span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-500">{description}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Tu cuenta y permisos" icon={ShieldCheck}>
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{user?.full_name || 'Usuario'}</p>
              <p className="truncate text-xs text-slate-500">{user?.email || 'Correo no disponible'}</p>
            </div>
            <Badge color={user?.is_active === false ? 'red' : 'green'}>{user?.is_active === false ? 'Inactiva' : 'Activa'}</Badge>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-4">
            <div><dt className="text-xs text-slate-500">Rol</dt><dd className="mt-1 text-sm font-medium text-slate-800">{roleName}</dd></div>
            <div><dt className="text-xs text-slate-500">Permisos confirmados</dt><dd className="mt-1 text-sm font-medium text-slate-800">{permissions.includes('*') ? 'Todos' : permissions.length}</dd></div>
          </dl>
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
            Los permisos se validan en el API según tu rol. La contraseña y las credenciales de Supabase no se muestran aquí.
          </p>
        </Section>
      </div>

      <Section title="Conexiones del sistema" icon={Database} extra={checking ? <span className="inline-flex items-center gap-2 text-xs text-slate-500"><RefreshCw size={13} className="animate-spin" /> Consultando</span> : null}>
        {!health && checking ? <div className="py-4"><Spinner /></div> : (
          <div className="grid md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-200 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Servicio</p><p className="mt-2 text-sm font-medium text-slate-800">{health?.service || 'PIXELÉE MANAGER API'}</p><p className="mt-1 text-xs text-slate-500">Entorno: {health?.env || 'No disponible'}</p></div>
            <div className="rounded-lg border border-slate-200 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Base de datos</p><div className="mt-2"><StatusValue value={health?.database} /></div><p className="mt-1 text-xs text-slate-500">El estado indica si la variable de conexión está configurada.</p></div>
            <div className="rounded-lg border border-slate-200 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Autenticación</p><div className="mt-2"><StatusValue value={health?.supabaseAuth} /></div><p className="mt-1 text-xs text-slate-500">El estado indica si las variables de Supabase Auth están configuradas.</p></div>
          </div>
        )}
      </Section>
    </div>
  );
}
