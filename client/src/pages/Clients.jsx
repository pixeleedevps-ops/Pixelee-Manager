import ModulePage from '../components/ModulePage';
import { ClientsOverview } from '../components/Overviews';

export default function Clients() {
  return (
    <ModulePage
      title="Clientes"
      description="Empresas, contactos y toda su información relacionada desde una misma vista"
      overview={<ClientsOverview />}
      tabs={[
        { id: 'clients', label: 'Clientes', entity: 'clients' },
        { id: 'contacts', label: 'Contactos', entity: 'contacts' },
        { id: 'documents', label: 'Documentos', entity: 'documents' },
      ]}
    />
  );
}
