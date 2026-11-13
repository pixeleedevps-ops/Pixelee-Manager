import ModulePage from '../components/ModulePage';
import { AccountingOverview } from '../components/Overviews';

export default function Accounting() {
  return (
    <ModulePage
      title="Contabilidad"
      description="Cotizaciones, facturas, recaudos, gastos, bonificaciones y utilidades — facturación y dinero recaudado por separado"
      overview={<AccountingOverview />}
      tabs={[
        { id: 'quotes', label: 'Cotizaciones', group: 'Facturación', entity: 'quotes' },
        { id: 'quote_items', label: 'Detalle de cotizaciones', group: 'Facturación', entity: 'quote_items' },
        { id: 'invoices', label: 'Facturas', group: 'Facturación', entity: 'invoices' },
        { id: 'contracts', label: 'Contratos', group: 'Facturación', entity: 'contracts' },
        { id: 'payments', label: 'Pagos recibidos', group: 'Recaudos', entity: 'payments' },
        { id: 'expenses', label: 'Gastos', group: 'Egresos', entity: 'expenses' },
        { id: 'extra_expenses', label: 'Gastos adicionales', group: 'Egresos', entity: 'extra_expenses' },
        { id: 'project_costs', label: 'Costos de proyectos', group: 'Egresos', entity: 'project_costs' },
        { id: 'bonuses', label: 'Bonificaciones', group: 'Utilidades y retiros', entity: 'bonuses' },
        { id: 'distributions', label: 'Distribuciones', group: 'Utilidades y retiros', entity: 'profit_distributions' },
        { id: 'items', label: 'Participaciones', group: 'Utilidades y retiros', entity: 'profit_distribution_items' },
        { id: 'withdrawals', label: 'Retiros', group: 'Utilidades y retiros', entity: 'withdrawals' },
      ]}
    />
  );
}
