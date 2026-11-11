import ModulePage from '../components/ModulePage';
import { SettingsOverview } from '../components/Overviews';

export default function Settings() {
  return (
    <ModulePage
      title="Configuración"
      description="Usuarios y roles de Supabase Auth, catálogo de servicios, auditoría y estado de la conexión"
      overview={<SettingsOverview />}
      tabs={[
        { id: 'profiles', label: 'Usuarios y roles', entity: 'profiles' },
        { id: 'services', label: 'Catálogo de servicios', entity: 'service_catalog' },
        { id: 'activity', label: 'Auditoría', entity: 'activity_logs' },
        { id: 'migrations', label: 'Migraciones', entity: 'schema_migrations' },
      ]}
    />
  );
}
