import ModulePage from '../components/ModulePage';
import { DevelopmentOverview } from '../components/Overviews';

export default function Development() {
  return (
    <ModulePage
      title="Desarrollo"
      description="Proyectos web, fases (status real), responsables, entregables, dominios, hosting y tickets"
      overview={<DevelopmentOverview />}
      tabs={[
        { id: 'projects', label: 'Proyectos', group: 'Planificación', entity: 'projects', display: 'cards', summaryFields: ['project_name', 'client_id', 'status', 'priority', 'estimated_delivery_date'] },
        { id: 'services', label: 'Servicios', group: 'Planificación', entity: 'project_services' },
        { id: 'tasks', label: 'Tareas', group: 'Ejecución', entity: 'tasks' },
        { id: 'deliveries', label: 'Entregables', group: 'Ejecución', entity: 'deliveries' },
        { id: 'time', label: 'Registro de horas', group: 'Ejecución', entity: 'time_entries' },
        { id: 'history', label: 'Historial', group: 'Ejecución', entity: 'project_history' },
        { id: 'contracts', label: 'Contratos', group: 'Recursos del cliente', entity: 'contracts' },
        { id: 'documents', label: 'Documentos', group: 'Recursos del cliente', entity: 'documents' },
        { id: 'domains', label: 'Dominios', group: 'Recursos del cliente', entity: 'domains' },
        { id: 'hosting', label: 'Alojamiento', group: 'Recursos del cliente', entity: 'hosting_accounts' },
        { id: 'websites', label: 'Sitios web', group: 'Recursos del cliente', entity: 'websites' },
        { id: 'tickets', label: 'Tickets', group: 'Soporte', entity: 'tickets' },
        { id: 'incidents', label: 'Incidencias', group: 'Soporte', entity: 'incidents' },
      ]}
    />
  );
}
