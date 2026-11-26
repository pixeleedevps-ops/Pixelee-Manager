import ModulePage from '../components/ModulePage';
import { OperationsOverview } from '../components/Overviews';

export default function Operations() {
  return (
    <ModulePage
      title="Operaciones"
      description="Infraestructura de clientes y soporte operativo, cada dato administrado desde una sola sección."
      overview={<OperationsOverview />}
      tabs={[
        { id: 'domains', label: 'Dominios', group: 'Infraestructura', entity: 'domains' },
        { id: 'hosting', label: 'Hosting', group: 'Infraestructura', entity: 'hosting_accounts' },
        { id: 'websites', label: 'Sitios web', group: 'Infraestructura', entity: 'websites' },
        { id: 'renewals', label: 'Renovaciones', group: 'Infraestructura', entity: 'renewals' },
        { id: 'plans', label: 'Mantenimiento', group: 'Infraestructura', entity: 'maintenance_plans' },
        { id: 'tickets', label: 'Tickets', group: 'Soporte', entity: 'tickets' },
        { id: 'incidents', label: 'Incidencias', group: 'Soporte', entity: 'incidents' },
        { id: 'surveys', label: 'Encuestas', group: 'Soporte', entity: 'surveys' },
      ]}
    />
  );
}
