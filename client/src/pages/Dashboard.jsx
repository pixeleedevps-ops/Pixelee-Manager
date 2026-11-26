import { lazy, Suspense } from 'react';
import {
  Building2, FolderKanban, FileSpreadsheet, Receipt, Wallet, TrendingDown,
  TrendingUp, Target, AlertCircle, Ticket, CircleDollarSign,
} from 'lucide-react';
import { useData } from '../lib/useData';
import { StatCard, Spinner, EmptyState } from '../components/ui';
import { fmtMoney, fmtNum } from '../lib/format';

const DashboardDetails = lazy(() => import('./DashboardDetails'));

export default function Dashboard() {
  const { data, error, loading } = useData('/dashboard/summary', { fallbackPath: '/dashboard' });
  if (loading) return <Spinner />;
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>;
  if (!data) return <EmptyState icon={AlertCircle} title="Sin datos" />;

  const i = data.indicators;
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold text-slate-900">Dashboard</h1><p className="text-sm text-slate-500 mt-0.5">Resumen general del negocio · datos reales de Supabase</p></div>
      {data.alerts.length > 0 && <div className="flex flex-wrap gap-2">{data.alerts.map((a, idx) => <span key={idx} className="inline-flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-lg"><AlertCircle size={13} /> {a}</span>)}</div>}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Building2} label="Clientes" value={fmtNum(i.clients)} />
        <StatCard icon={FolderKanban} label="Proyectos activos" value={fmtNum(i.activeProjects)} tone="blue" />
        <StatCard icon={FolderKanban} label="Proyectos finalizados" value={fmtNum(i.finishedProjects)} tone="green" />
        <StatCard icon={FileSpreadsheet} label="Cotizaciones" value={fmtNum(i.quotes)} />
        <StatCard icon={Receipt} label="Facturas" value={fmtNum(i.invoices)} hint={`${i.pendingInvoices} pendiente(s)`} />
        <StatCard icon={Target} label="Prospectos" value={fmtNum(i.leads)} />
        <StatCard icon={Ticket} label="Tickets abiertos" value={fmtNum(i.openTickets)} tone={i.openTickets > 0 ? 'red' : 'default'} />
        <StatCard icon={CircleDollarSign} label="Valor contratado" value={fmtMoney(i.contracted)} />
        <StatCard icon={Wallet} label="Ingresos (recaudado)" value={fmtMoney(i.income)} tone="green" hint={`Facturado: ${fmtMoney(i.invoiced)}`} />
        <StatCard icon={TrendingDown} label="Gastos" value={fmtMoney(i.expenses)} tone="red" />
        <StatCard icon={TrendingUp} label="Utilidad neta" value={fmtMoney(i.profit)} tone="green" hint={`Margen ${fmtNum(i.margin, 2)}%`} />
        <StatCard icon={CircleDollarSign} label="Cuentas por cobrar" value={fmtMoney(i.receivables)} tone="amber" />
      </div>
      <Suspense fallback={<div className="py-8"><Spinner /></div>}><DashboardDetails initialData={data.monthly ? data : null} /></Suspense>
    </div>
  );
}
