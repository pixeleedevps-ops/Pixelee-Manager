import ModulePage from '../components/ModulePage';
import { AccountingOverview } from '../components/Overviews';

export default function Accounting() {
  return (
    <ModulePage
      title="Contabilidad"
      description="Ventas, recaudos, gastos y utilidades organizados por flujo; facturación y dinero recibido permanecen separados."
      overview={<AccountingOverview />}
      tabs={[
        { id: 'quotes', label: 'Cotizaciones', group: 'Ventas y contratos', entity: 'quotes' },
        { id: 'quote_items', label: 'Ítems de cotización', group: 'Ventas y contratos', entity: 'quote_items' },
        { id: 'invoices', label: 'Facturas', group: 'Ventas y contratos', entity: 'invoices' },
        { id: 'contracts', label: 'Contratos', group: 'Ventas y contratos', entity: 'contracts' },
        { id: 'payments', label: 'Pagos recibidos', group: 'Recaudos', entity: 'payments' },
        { id: 'expenses', label: 'Gastos', group: 'Gastos y costos', entity: 'expenses' },
        { id: 'extra_expenses', label: 'Gastos adicionales', group: 'Gastos y costos', entity: 'extra_expenses' },
        { id: 'project_costs', label: 'Costos de proyectos', group: 'Gastos y costos', entity: 'project_costs' },
        { id: 'bonuses', label: 'Bonificaciones', group: 'Utilidades y retiros', entity: 'bonuses' },
        { id: 'distributions', label: 'Distribuciones', group: 'Utilidades y retiros', entity: 'profit_distributions' },
        { id: 'items', label: 'Participaciones', group: 'Utilidades y retiros', entity: 'profit_distribution_items' },
        { id: 'withdrawals', label: 'Retiros', group: 'Utilidades y retiros', entity: 'withdrawals' },
      ]}
    />
  );
}
