import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import {
  Building2, FolderKanban, FileSpreadsheet, Receipt, Wallet, TrendingDown,
  TrendingUp, Target, AlertCircle, Activity, Package, Ticket, CircleDollarSign,
} from 'lucide-react';
import { useData, Section } from '../components/Overviews';
import { StatCard, Table, Badge, statusColor, Spinner, EmptyState } from '../components/ui';
import { fmtMoney, fmtNum, fmtDate, fmtDateTime, label } from '../lib/format';

const tooltipStyle = { backgroundColor: '#0f172a', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 };

export default function Dashboard() {
  const { data, error, loading } = useData('/dashboard');

  if (loading) return <Spinner />;
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>;
  if (!data) return <EmptyState icon={AlertCircle} title="Sin datos" />;

  const i = data.indicators;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Resumen general del negocio · datos reales de Supabase</p>
      </div>

      {data.alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.alerts.map((a, idx) => (
            <span key={idx} className="inline-flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-lg">
              <AlertCircle size={13} /> {a}
            </span>
          ))}
        </div>
      )}

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

      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="Ingresos vs gastos (últimos 6 meses)" icon={TrendingUp}>
          {data.monthly.length ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} />
                <Legend />
                <Bar dataKey="income" name="Recaudado" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-slate-400">Sin movimientos en los últimos meses.</p>}
        </Section>

        <Section title="Actividad reciente" icon={Activity}>
          {data.recentActivity.length ? (
            <Table columns={[{ label: 'Fecha' }, { label: 'Tabla' }, { label: 'Acción' }]}>
              {data.recentActivity.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 text-xs">{fmtDateTime(a.created_at)}</td>
                  <td className="px-4 py-3 text-sm">{label(a.table_name)}</td>
                  <td className="px-4 py-3"><Badge color={a.action === 'DELETE' ? 'red' : a.action === 'INSERT' ? 'green' : 'blue'}>{a.action}</Badge></td>
                </tr>
              ))}
            </Table>
          ) : <p className="text-sm text-slate-400">Sin actividad registrada todavía.</p>}
        </Section>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="Próximas entregas" icon={Package}>
          {data.upcomingDeliveries.length ? (
            <Table columns={[{ label: 'Entregable' }, { label: 'Proyecto' }, { label: 'Fecha' }, { label: 'Estado' }]}>
              {data.upcomingDeliveries.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 font-medium text-slate-700">{d.name}</td>
                  <td className="px-4 py-3">{d.project_name || '—'}</td>
                  <td className="px-4 py-3">{fmtDate(d.date)}</td>
                  <td className="px-4 py-3"><Badge color={statusColor(d.status)}>{label(d.status)}</Badge></td>
                </tr>
              ))}
            </Table>
          ) : <p className="text-sm text-slate-400">Sin entregas próximas.</p>}
        </Section>

        <Section title="Movimientos recientes (recaudos)" icon={Wallet}>
          {data.recentMovements.length ? (
            <Table columns={[{ label: 'Fecha' }, { label: 'Cliente' }, { label: 'Proyecto' }, { label: 'Monto' }, { label: 'Estado' }]}>
              {data.recentMovements.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3">{fmtDate(m.date)}</td>
                  <td className="px-4 py-3">{m.client_name || '—'}</td>
                  <td className="px-4 py-3">{m.project_name || '—'}</td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-emerald-600">{fmtMoney(m.amount)}</td>
                  <td className="px-4 py-3"><Badge color={statusColor(m.status)}>{label(m.status)}</Badge></td>
                </tr>
              ))}
            </Table>
          ) : <p className="text-sm text-slate-400">Sin recaudos registrados.</p>}
        </Section>
      </div>

      <p className="text-xs text-slate-400">
        «Ingresos» = recaudos con estado <strong>confirmado</strong>. «Facturado» se muestra por separado y nunca se suma al recaudo.
        Todos los importes en COP, calculados en el backend.
      </p>
    </div>
  );
}
