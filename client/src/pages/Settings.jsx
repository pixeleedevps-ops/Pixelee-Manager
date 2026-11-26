import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ResourcePage from '../components/ResourcePage';
import SettingsOverview from '../components/SettingsOverview';
import { Tabs } from '../components/ui';

const TABS = [
  { id: 'overview', label: 'Resumen' },
  { id: 'profiles', label: 'Usuarios y roles' },
  { id: 'services', label: 'Catálogo de servicios' },
  { id: 'activity', label: 'Auditoría' },
  { id: 'migrations', label: 'Migraciones' },
];

const ENTITIES = {
  profiles: 'profiles',
  services: 'service_catalog',
  activity: 'activity_logs',
  migrations: 'schema_migrations',
};

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const section = searchParams.get('section');
  const tab = TABS.some((item) => item.id === section) ? section : 'overview';
  const selectTab = (next) => setSearchParams((previous) => {
    previous.set('section', next);
    previous.delete('create');
    return previous;
  });
  useEffect(() => {
    if (section === tab) return;
    setSearchParams((previous) => {
      previous.set('section', tab);
      return previous;
    }, { replace: true });
  }, [section, tab, setSearchParams]);
  const current = TABS.find((item) => item.id === tab);
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="mt-0.5 text-sm text-slate-500">Usuarios, permisos, catálogo y estado de la plataforma.</p>
      </header>
      <Tabs tabs={TABS} active={tab} onChange={selectTab} />
      {tab === 'overview'
        ? <SettingsOverview onOpenTab={selectTab} />
        : <ResourcePage key={tab} entity={ENTITIES[tab]} compact autoCreate={searchParams.get('create') === ENTITIES[tab]} onAutoCreateHandled={() => setSearchParams((previous) => { previous.delete('create'); return previous; }, { replace: true })} />}
      <p className="text-xs text-slate-400">La gestión de usuarios, datos y permisos usa el esquema real de Supabase. Los perfiles se crean desde Supabase Auth.</p>
      <span className="sr-only">Sección actual: {current?.label}</span>
    </div>
  );
}
