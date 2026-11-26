import ModulePage from '../components/ModulePage';
import { ClientsOverview } from '../components/Overviews';

export default function Clients() {
  return (
    <ModulePage
      title="Clientes"
      description="Empresas, contactos y documentos. Los proyectos y otros datos relacionados se abren desde la ficha del cliente."
      overview={<ClientsOverview />}
      tabs={[
        { id: 'clients', label: 'Cartera de clientes', group: 'Cartera', entity: 'clients', display: 'cards', summaryFields: ['company_name', 'client_type', 'email', 'city', 'status'] },
        { id: 'contacts', label: 'Contactos', group: 'Contactos y documentos', entity: 'contacts' },
        { id: 'documents', label: 'Documentos', group: 'Contactos y documentos', entity: 'documents' },
      ]}
    />
  );
}
