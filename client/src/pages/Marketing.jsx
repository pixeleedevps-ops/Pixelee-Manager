import ModulePage from '../components/ModulePage';
import { MarketingOverview } from '../components/Overviews';

export default function Marketing() {
  return (
    <ModulePage
      title="Marketing"
      description="Prospectos, campañas, canales (Google Ads / Meta Ads), presupuesto, inversión, leads y conversiones"
      overview={<MarketingOverview />}
      tabs={[
        { id: 'campaigns', label: 'Campañas', entity: 'campaigns' },
        { id: 'metrics', label: 'Métricas de campaña', entity: 'campaign_metrics' },
        { id: 'leads', label: 'Prospectos', entity: 'leads' },
        { id: 'followups', label: 'Seguimientos', entity: 'follow_ups' },
        { id: 'services', label: 'Catálogo de servicios', entity: 'service_catalog' },
      ]}
    />
  );
}
