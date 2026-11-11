import ModulePage from '../components/ModulePage';
import { ManagementOverview } from '../components/Overviews';

export default function Management() {
  return (
    <ModulePage
      title="Gerencia"
      description="Visión consolidada del negocio, rentabilidad, cuentas por cobrar, distribuciones y sección privada de utilidades"
      overview={<ManagementOverview />}
      tabs={[
        { id: 'distributions', label: 'Distribuciones', entity: 'profit_distributions' },
        { id: 'items', label: 'Participaciones', entity: 'profit_distribution_items' },
        { id: 'withdrawals', label: 'Retiros', entity: 'withdrawals' },
        { id: 'bonuses', label: 'Bonificaciones', entity: 'bonuses' },
      ]}
    />
  );
}
