import ModulePage from '../components/ModulePage';
import { DevelopmentOverview } from '../components/Overviews';

export default function Development() {
  return (
    <ModulePage
      title="Desarrollo"
      description="Proyectos web, fases (status real), responsables, entregables, dominios, hosting y tickets"
      overview={<DevelopmentOverview />}
      tabs={[
        { id: 'projects', label: 'Proyectos', entity: 'projects' },
        { id: 'services', label: 'Servicios del proyecto', entity: 'project_services' },
        { id: 'tasks', label: 'Tareas', entity: 'tasks' },
        { id: 'time', label: 'Horas', entity: 'time_entries' },
        { id: 'deliveries', label: 'Entregables', entity: 'deliveries' },
        { id: 'history', label: 'Historial', entity: 'project_history' },
        { id: 'contracts', label: 'Contratos', entity: 'contracts' },
        { id: 'documents', label: 'Documentos', entity: 'documents' },
        { id: 'domains', label: 'Dominios', entity: 'domains' },
        { id: 'hosting', label: 'Hosting', entity: 'hosting_accounts' },
        { id: 'websites', label: 'Sitios', entity: 'websites' },
        { id: 'tickets', label: 'Tickets', entity: 'tickets' },
        { id: 'incidents', label: 'Incidencias', entity: 'incidents' },
      ]}
    />
  );
}
