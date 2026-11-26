import ModulePage from '../components/ModulePage';
import { DevelopmentOverview } from '../components/Overviews';

export default function Development() {
  return (
    <ModulePage
      title="Desarrollo"
      description="Proyectos y ejecución: servicios, tareas, horas, entregables e historial."
      overview={<DevelopmentOverview />}
      tabs={[
        { id: 'projects', label: 'Proyectos', group: 'Proyectos', entity: 'projects', display: 'cards', summaryFields: ['project_name', 'client_id', 'status', 'priority', 'estimated_delivery_date'] },
        { id: 'services', label: 'Servicios del proyecto', group: 'Proyectos', entity: 'project_services' },
        { id: 'tasks', label: 'Tareas', group: 'Ejecución', entity: 'tasks' },
        { id: 'deliveries', label: 'Entregables', group: 'Ejecución', entity: 'deliveries' },
        { id: 'time', label: 'Registro de horas', group: 'Ejecución', entity: 'time_entries' },
        { id: 'history', label: 'Historial', group: 'Ejecución', entity: 'project_history' },
      ]}
    />
  );
}
