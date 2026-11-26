import ModulePage from '../components/ModulePage';
import { MarketingOverview } from '../components/Overviews';
import { resourceUrl } from '../lib/resourceNavigation';

export default function Marketing() {
  return (
    <ModulePage
      title="Marketing"
      description="Campañas y resultados; prospectos y seguimientos. El catálogo se administra en Configuración."
      overview={<MarketingOverview />}
      tabs={[
        { id: 'campaigns', label: 'Campañas', group: 'Campañas y métricas', entity: 'campaigns' },
        { id: 'metrics', label: 'Métricas de campaña', group: 'Campañas y métricas', entity: 'campaign_metrics' },
        { id: 'leads', label: 'Prospectos', group: 'Prospectos y seguimiento', entity: 'leads' },
        { id: 'followups', label: 'Seguimientos', group: 'Prospectos y seguimiento', entity: 'follow_ups' },
        { id: 'services', label: 'Catálogo de servicios', group: 'Servicios', to: resourceUrl('service_catalog') },
      ]}
    />
  );
}
