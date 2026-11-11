import ModulePage from '../components/ModulePage';
import { OperationsOverview } from '../components/Overviews';

export default function Operations() {
  return (
    <ModulePage
      title="Operaciones"
      description="Dominios, hosting, sitios web, renovaciones, mantenimiento, tickets, incidencias y satisfacción"
      overview={<OperationsOverview />}
      tabs={[
        { id: 'domains', label: 'Dominios', entity: 'domains' },
        { id: 'hosting', label: 'Hosting', entity: 'hosting_accounts' },
        { id: 'websites', label: 'Sitios web', entity: 'websites' },
        { id: 'renewals', label: 'Renovaciones', entity: 'renewals' },
        { id: 'plans', label: 'Mantenimiento', entity: 'maintenance_plans' },
        { id: 'tickets', label: 'Tickets', entity: 'tickets' },
        { id: 'incidents', label: 'Incidencias', entity: 'incidents' },
        { id: 'surveys', label: 'Encuestas', entity: 'surveys' },
        { id: 'documents', label: 'Documentos', entity: 'documents' },
      ]}
    />
  );
}
