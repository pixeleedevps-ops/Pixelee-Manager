import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Wallet, TrendingUp, Activity, Package } from 'lucide-react';
import { Section } from '../components/OverviewUi';
import { useData } from '../lib/useData';
import { Table, Badge, statusColor, Spinner } from '../components/ui';
import { fmtMoney, fmtDate, fmtDateTime, label } from '../lib/format';

const tooltipStyle = { backgroundColor: '#0f172a', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 };

export default function DashboardDetails({ initialData }) {
  const { data: fetchedData, error, loading } = useData('/dashboard/details', { enabled: !initialData });
  const data = initialData || fetchedData;
  if (loading) return <div className="py-8"><Spinner /></div>;
  if (error) return <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-3">Los indicadores están disponibles; no se pudieron cargar los gráficos y la actividad: {error}</div>;
  if (!data) return null;
  return <>
    <div className="grid lg:grid-cols-2 gap-4">
      <Section title="Ingresos vs gastos (últimos 6 meses)" icon={TrendingUp}>
        {data.monthly.length ? <ResponsiveContainer width="100%" height={250}><BarChart data={data.monthly}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} /><Legend /><Bar dataKey="income" name="Recaudado" fill="#10b981" radius={[4, 4, 0, 0]} /><Bar dataKey="expenses" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="text-sm text-slate-400">Sin movimientos en los últimos meses.</p>}
      </Section>
      <Section title="Actividad reciente" icon={Activity}>
        {data.recentActivity.length ? <Table columns={[{ label: 'Fecha' }, { label: 'Tabla' }, { label: 'Acción' }]}>{data.recentActivity.map((a) => <tr key={a.id}><td className="px-4 py-3 text-xs">{fmtDateTime(a.created_at)}</td><td className="px-4 py-3 text-sm">{label(a.table_name)}</td><td className="px-4 py-3"><Badge color={a.action === 'DELETE' ? 'red' : a.action === 'INSERT' ? 'green' : 'blue'}>{a.action}</Badge></td></tr>)}</Table> : <p className="text-sm text-slate-400">Sin actividad registrada todavía.</p>}
      </Section>
    </div>
    <div className="grid lg:grid-cols-2 gap-4">
      <Section title="Próximas entregas" icon={Package}>
        {data.upcomingDeliveries.length ? <Table columns={[{ label: 'Entregable' }, { label: 'Proyecto' }, { label: 'Fecha' }, { label: 'Estado' }]}>{data.upcomingDeliveries.map((d) => <tr key={d.id}><td className="px-4 py-3 font-medium text-slate-700">{d.name}</td><td className="px-4 py-3">{d.project_name || '—'}</td><td className="px-4 py-3">{fmtDate(d.date)}</td><td className="px-4 py-3"><Badge color={statusColor(d.status)}>{label(d.status)}</Badge></td></tr>)}</Table> : <p className="text-sm text-slate-400">Sin entregas próximas.</p>}
      </Section>
      <Section title="Movimientos recientes (recaudos)" icon={Wallet}>
        {data.recentMovements.length ? <Table columns={[{ label: 'Fecha' }, { label: 'Cliente' }, { label: 'Proyecto' }, { label: 'Monto' }, { label: 'Estado' }]}>{data.recentMovements.map((m) => <tr key={m.id}><td className="px-4 py-3">{fmtDate(m.date)}</td><td className="px-4 py-3">{m.client_name || '—'}</td><td className="px-4 py-3">{m.project_name || '—'}</td><td className="px-4 py-3 tabular-nums font-semibold text-emerald-600">{fmtMoney(m.amount)}</td><td className="px-4 py-3"><Badge color={statusColor(m.status)}>{label(m.status)}</Badge></td></tr>)}</Table> : <p className="text-sm text-slate-400">Sin recaudos registrados.</p>}
      </Section>
    </div>
    <p className="text-xs text-slate-400">«Ingresos» = recaudos con estado <strong>confirmado</strong>. «Facturado» se muestra por separado y nunca se suma al recaudo. Todos los importes en COP, calculados en el backend.</p>
  </>;
}
