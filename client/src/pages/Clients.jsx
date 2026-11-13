import ModulePage from '../components/ModulePage';
import { ClientsOverview } from '../components/Overviews';

export default function Clients() {
  return (
    <ModulePage
      title="Clientes"
      description="Empresas, contactos y toda su información relacionada desde una misma vista"
      overview={<ClientsOverview />}
      tabs={[
        { id: 'clients', label: 'Cartera de clientes', entity: 'clients', display: 'cards', summaryFields: ['company_name', 'client_type', 'email', 'city', 'status'] },
        { id: 'projects', label: 'Proyectos activos', entity: 'projects', display: 'cards', defaultFilters: { status: 'en_proceso' }, summaryFields: ['project_name', 'client_id', 'status', 'priority', 'estimated_delivery_date'] },
        { id: 'contacts', label: 'Contactos', entity: 'contacts' },
        { id: 'documents', label: 'Documentos', entity: 'documents' },
      ]}
    />
  );
}
