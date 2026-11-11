import ModulePage from '../components/ModulePage';
import { AccountingOverview } from '../components/Overviews';

export default function Accounting() {
  return (
    <ModulePage
      title="Contabilidad"
      description="Cotizaciones, facturas, recaudos, gastos, bonificaciones y utilidades — facturación y dinero recaudado por separado"
      overview={<AccountingOverview />}
      tabs={[
        { id: 'quotes', label: 'Cotizaciones', entity: 'quotes' },
        { id: 'quote_items', label: 'Ítems de cotización', entity: 'quote_items' },
        { id: 'invoices', label: 'Facturas', entity: 'invoices' },
        { id: 'payments', label: 'Recaudos', entity: 'payments' },
        { id: 'contracts', label: 'Contratos', entity: 'contracts' },
        { id: 'expenses', label: 'Gastos', entity: 'expenses' },
        { id: 'extra_expenses', label: 'Gastos extras', entity: 'extra_expenses' },
        { id: 'bonuses', label: 'Bonificaciones', entity: 'bonuses' },
        { id: 'project_costs', label: 'Costos de proyecto', entity: 'project_costs' },
        { id: 'distributions', label: 'Distribuciones', entity: 'profit_distributions' },
        { id: 'items', label: 'Participaciones', entity: 'profit_distribution_items' },
        { id: 'withdrawals', label: 'Retiros', entity: 'withdrawals' },
      ]}
    />
  );
}
