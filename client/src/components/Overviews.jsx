import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Building2, FolderKanban, Wallet, TrendingDown, TrendingUp, Receipt,
  FileSpreadsheet, Target, Megaphone, Users, Clock, Package, Lock, Eye,
  Activity, AlertCircle, Globe2, Server, RefreshCw, Ticket, Shield, Database,
  CircleDollarSign, PiggyBank, ArrowDownToLine, BarChart3,
} from 'lucide-react';
import { get } from '../lib/api';
import { fmtMoney, fmtNum, fmtDate, fmtDateTime, label } from '../lib/format';
import { StatCard, Table, Badge, statusColor, Spinner, EmptyState } from './ui';

const COLORS = ['#0f172a', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const tooltipStyle = { backgroundColor: '#0f172a', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 };

/** Hook de carga con estados de carga / error / vacío. */
export function useData(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    get(path).then((d) => { if (alive) { setData(d); setError(''); } })
      .catch((e) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [path]);
  return { data, error, loading };
}

function State({ loading, error, children, empty }) {
  if (loading) return <Spinner />;
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>;
  if (empty) return <EmptyState icon={Database} title="Sin datos todavía" description="Los indicadores se calculan a partir de los registros reales de Supabase. Crea registros en las pestañas de este módulo." />;
  return children;
}

export function Section({ title, icon: Icon, children, extra }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          {Icon && <Icon size={16} className="text-slate-500" />}{title}
        </h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

/* ───────────────────────── CONTABILIDAD ─────────────────────────────────── */
export function AccountingOverview() {
  const { data, error, loading } = useData('/accounting/overview');
  return (
    <State loading={loading} error={error} empty={!data}>
      {data && <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={CircleDollarSign} label="Valor contratado" value={fmtMoney(data.totals.contracted)} />
          <StatCard icon={Receipt} label="Facturado (emitido)" value={fmtMoney(data.totals.invoiced)} hint="No es dinero recaudado" tone="blue" />
          <StatCard icon={Wallet} label="Recaudado" value={fmtMoney(data.totals.collected)} hint="Solo pagos confirmados" tone="green" />
          <StatCard icon={TrendingUp} label="Saldo por cobrar" value={fmtMoney(data.totals.balance)} tone="amber" />
          <StatCard icon={TrendingDown} label="Gastos" value={fmtMoney(data.totals.totalExpenses)} hint={`Normales ${fmtMoney(data.totals.normalExpenses)} · Extras ${fmtMoney(data.totals.extraExpenses)}`} tone="red" />
          <StatCard icon={PiggyBank} label="Bonificaciones" value={fmtMoney(data.totals.bonuses)} hint="Aplicadas" />
          <StatCard icon={TrendingUp} label="Utilidad" value={fmtMoney(data.totals.profit)} tone="green" />
          <StatCard icon={BarChart3} label="Margen" value={`${fmtNum(data.totals.margin, 2)}%`} tone="blue" />
        </div>

        <div className="grid lg:grid-cols-2 gap-4 mt-4">
          <Section title="Cuentas por cobrar por cliente" icon={Users}>
            {data.receivables.length ? (
              <Table columns={[{ label: 'Cliente' }, { label: 'Contratado' }, { label: 'Recaudado' }, { label: 'Saldo' }]}>
                {data.receivables.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium text-slate-700">{r.name}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtMoney(r.contracted)}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtMoney(r.collected)}</td>
                    <td className="px-4 py-3 tabular-nums font-semibold text-amber-600">{fmtMoney(r.balance)}</td>
                  </tr>
                ))}
              </Table>
            ) : <p className="text-sm text-slate-400">No hay saldos pendientes.</p>}
          </Section>

          <Section title="Rentabilidad por proyecto" icon={FolderKanban}>
            {data.byProject.length ? (
              <Table columns={[{ label: 'Proyecto' }, { label: 'Ingresos' }, { label: 'Gastos' }, { label: 'Utilidad' }, { label: 'Margen' }]}>
                {data.byProject.slice(0, 8).map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3"><span className="font-medium text-slate-700">{r.name}</span><span className="block text-xs text-slate-400">{r.client_name}</span></td>
                    <td className="px-4 py-3 tabular-nums">{fmtMoney(r.collected)}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtMoney(r.expenses)}</td>
                    <td className="px-4 py-3 tabular-nums font-semibold text-emerald-600">{fmtMoney(r.profit)}</td>
                    <td className="px-4 py-3"><Badge color={r.margin > 0 ? 'green' : 'gray'}>{fmtNum(r.margin, 1)}%</Badge></td>
                  </tr>
                ))}
              </Table>
            ) : <p className="text-sm text-slate-400">Aún no hay proyectos.</p>}
          </Section>
        </div>

        <p className="text-xs text-slate-400 mt-3">
          Registros: {data.counts.quotes} cotizaciones · {data.counts.invoices} facturas · {data.counts.payments} recaudos · {data.counts.expenses} gastos · {data.counts.bonuses} bonificaciones.
          Facturación y recaudo se mantienen separados; cada movimiento es individual y trazable.
        </p>
      </>}
    </State>
  );
}

/* ───────────────────────── MARKETING ────────────────────────────────────── */
export function MarketingOverview() {
  const { data, error, loading } = useData('/marketing/overview');
  return (
    <State loading={loading} error={error} empty={!data}>
      {data && <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Megaphone} label="Campañas" value={fmtNum(data.indicators.campaigns)} />
          <StatCard icon={CircleDollarSign} label="Presupuesto" value={fmtMoney(data.indicators.budget)} tone="blue" />
          <StatCard icon={Wallet} label="Inversión registrada" value={fmtMoney(data.indicators.spent)} />
          <StatCard icon={Target} label="Leads de campaña" value={fmtNum(data.indicators.leads)} tone="green" />
          <StatCard icon={TrendingUp} label="Conversiones" value={fmtNum(data.indicators.conversions)} tone="green" />
          <StatCard icon={BarChart3} label="CPA promedio" value={fmtMoney(data.indicators.cpa)} />
          <StatCard icon={BarChart3} label="CPL promedio" value={fmtMoney(data.indicators.cpl)} />
          <StatCard icon={Target} label="Tasa de conversión" value={`${fmtNum(data.indicators.conversionRate, 2)}%`} tone="blue" />
        </div>

        <div className="grid lg:grid-cols-2 gap-4 mt-4">
          <Section title="Inversión por canal" icon={Megaphone}>
            {data.byChannel.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.byChannel}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} />
                  <Bar dataKey="spent" name="Inversión" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-slate-400">Sin campañas registradas.</p>}
          </Section>
          <Section title="Embudo de prospectos" icon={Target}>
            {data.leadFunnel.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={data.leadFunnel} dataKey="count" nameKey="status" outerRadius={85} label={(e) => `${label(e.status)}: ${e.count}`}>
                    {data.leadFunnel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v, label(n)]} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-slate-400">Sin prospectos registrados.</p>}
          </Section>
        </div>

        <div className="mt-4">
          <Section title="Rendimiento por campaña" icon={BarChart3}>
            {data.campaigns.length ? (
              <Table columns={[{ label: 'Campaña' }, { label: 'Canal' }, { label: 'Presupuesto' }, { label: 'Inversión' }, { label: 'Leads' }, { label: 'Conv.' }, { label: 'CPA' }, { label: 'Estado' }]}>
                {data.campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium text-slate-700">{c.name}</td>
                    <td className="px-4 py-3">{c.channel || '—'}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtMoney(c.budget)}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtMoney(c.spent)}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtNum(c.leads)}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtNum(c.conversions)}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtMoney(Number(c.conversions) > 0 ? Number(c.spent) / Number(c.conversions) : 0)}</td>
                    <td className="px-4 py-3"><Badge color={statusColor(c.status)}>{label(c.status)}</Badge></td>
                  </tr>
                ))}
              </Table>
            ) : <p className="text-sm text-slate-400">Sin campañas.</p>}
          </Section>
        </div>
        <p className="text-xs text-slate-400 mt-3">Inversión, leads y conversiones se registran manualmente. FASE 1 no integra Google Ads API ni Meta Ads API.</p>
      </>}
    </State>
  );
}

/* ───────────────────────── GERENCIA ─────────────────────────────────────── */
export function ManagementOverview() {
  const { data, error, loading } = useData('/management/overview');
  return (
    <State loading={loading} error={error} empty={!data}>
      {data && <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Wallet} label="Ingresos (recaudado)" value={fmtMoney(data.totals.collected)} tone="green" />
          <StatCard icon={TrendingDown} label="Gastos totales" value={fmtMoney(data.totals.totalExpenses)} tone="red" />
          <StatCard icon={TrendingUp} label="Utilidad neta" value={fmtMoney(data.totals.profit)} tone="green" />
          <StatCard icon={BarChart3} label="Margen" value={`${fmtNum(data.totals.margin, 2)}%`} tone="blue" />
          <StatCard icon={CircleDollarSign} label="Valor contratado" value={fmtMoney(data.totals.contracted)} />
          <StatCard icon={Receipt} label="Cuentas por cobrar" value={fmtMoney(data.totals.balance)} tone="amber" />
          <StatCard icon={PiggyBank} label="Bonificaciones" value={fmtMoney(data.totals.bonuses)} />
          <StatCard icon={Users} label="Clientes con saldo" value={fmtNum(data.receivables.length)} />
        </div>

        {/* Sección privada del administrador */}
        <div className="mt-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/50 p-5">
          <h2 className="text-sm font-bold text-indigo-900 flex items-center gap-2 mb-4">
            <Lock size={16} /> Mis utilidades y participaciones <span className="text-xs font-normal text-indigo-500">· Solo visible para ti</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard icon={PiggyBank} label="Acumulado" value={fmtMoney(data.myUtilities.accumulated)} tone="green" />
            <StatCard icon={ArrowDownToLine} label="Retirado" value={fmtMoney(data.myUtilities.withdrawn)} />
            <StatCard icon={CircleDollarSign} label="Pendiente" value={fmtMoney(data.myUtilities.pending)} tone="blue" />
          </div>
          {data.myUtilities.items.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <Table columns={[{ label: 'Periodo' }, { label: 'Porcentaje' }, { label: 'Monto' }, { label: 'Estado' }]}>
                {data.myUtilities.items.map((it) => (
                  <tr key={it.id}>
                    <td className="px-4 py-3">{fmtDate(it.period_start)} → {fmtDate(it.period_end)}</td>
                    <td className="px-4 py-3">{fmtNum(it.percentage, 2)}%</td>
                    <td className="px-4 py-3 tabular-nums font-semibold">{fmtMoney(it.amount)}</td>
                    <td className="px-4 py-3"><Badge color={statusColor(it.status)}>{label(it.status)}</Badge></td>
                  </tr>
                ))}
              </Table>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-4 mt-4">
          <Section title="Rentabilidad por cliente" icon={Building2}>
            {data.byClient.length ? (
              <Table columns={[{ label: 'Cliente' }, { label: 'Facturado' }, { label: 'Recaudado' }, { label: 'Saldo' }]}>
                {data.byClient.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium text-slate-700">{r.name}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtMoney(r.invoiced)}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtMoney(r.collected)}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtMoney(r.balance)}</td>
                  </tr>
                ))}
              </Table>
            ) : <p className="text-sm text-slate-400">Sin clientes.</p>}
          </Section>
          <Section title="Distribuciones de utilidades" icon={PiggyBank}>
            {data.distributions.length ? (
              <Table columns={[{ label: 'Periodo' }, { label: 'Utilidad' }, { label: 'Distribuido' }, { label: 'Participantes' }, { label: 'Estado' }]}>
                {data.distributions.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-3">{fmtDate(d.period_start)} → {fmtDate(d.period_end)}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtMoney(d.total_profit)}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtMoney(d.distributed)}</td>
                    <td className="px-4 py-3">{d.participants}</td>
                    <td className="px-4 py-3"><Badge color={statusColor(d.status)}>{label(d.status)}</Badge></td>
                  </tr>
                ))}
              </Table>
            ) : <p className="text-sm text-slate-400">Sin distribuciones.</p>}
          </Section>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 mt-4">
          <Section title="Retiros" icon={ArrowDownToLine}>
            {data.withdrawals.length ? (
              <Table columns={[{ label: 'Fecha' }, { label: 'Beneficiario' }, { label: 'Monto' }, { label: 'Notas' }]}>
                {data.withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td className="px-4 py-3">{fmtDate(w.withdrawn_at)}</td>
                    <td className="px-4 py-3">{w.profile_name || '—'}</td>
                    <td className="px-4 py-3 tabular-nums font-semibold">{fmtMoney(w.amount)}</td>
                    <td className="px-4 py-3 text-slate-500">{w.notes || '—'}</td>
                  </tr>
                ))}
              </Table>
            ) : <p className="text-sm text-slate-400">Sin retiros.</p>}
          </Section>
          <Section title="Actividad del equipo" icon={Clock}>
            {data.teamActivity.length ? (
              <Table columns={[{ label: 'Fecha' }, { label: 'Persona' }, { label: 'Proyecto' }, { label: 'Horas' }]}>
                {data.teamActivity.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-3">{fmtDate(t.work_date)}</td>
                    <td className="px-4 py-3">{t.user_name || '—'}</td>
                    <td className="px-4 py-3">{t.project_name || '—'}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtNum(t.hours, 2)}</td>
                  </tr>
                ))}
              </Table>
            ) : <p className="text-sm text-slate-400">Sin horas registradas.</p>}
          </Section>
        </div>
      </>}
    </State>
  );
}

/* ───────────────────────── DESARROLLO ───────────────────────────────────── */
export function DevelopmentOverview() {
  const { data, error, loading } = useData('/dashboard');
  return (
    <State loading={loading} error={error} empty={!data}>
      {data && <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={FolderKanban} label="Proyectos activos" value={fmtNum(data.indicators.activeProjects)} tone="blue" />
          <StatCard icon={FolderKanban} label="Proyectos finalizados" value={fmtNum(data.indicators.finishedProjects)} tone="green" />
          <StatCard icon={Package} label="Próximas entregas" value={fmtNum(data.upcomingDeliveries.length)} tone="amber" />
          <StatCard icon={Ticket} label="Tickets abiertos" value={fmtNum(data.indicators.openTickets)} tone="red" />
        </div>
        <div className="grid lg:grid-cols-2 gap-4 mt-4">
          <Section title="Próximas entregas" icon={Package}>
            {data.upcomingDeliveries.length ? (
              <Table columns={[{ label: 'Entregable' }, { label: 'Proyecto' }, { label: 'Cliente' }, { label: 'Fecha' }, { label: 'Estado' }]}>
                {data.upcomingDeliveries.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-3 font-medium text-slate-700">{d.name}</td>
                    <td className="px-4 py-3">{d.project_name || '—'}</td>
                    <td className="px-4 py-3">{d.client_name || '—'}</td>
                    <td className="px-4 py-3">{fmtDate(d.date)}</td>
                    <td className="px-4 py-3"><Badge color={statusColor(d.status)}>{label(d.status)}</Badge></td>
                  </tr>
                ))}
              </Table>
            ) : <p className="text-sm text-slate-400">Sin entregas próximas.</p>}
          </Section>
          <Section title="Fechas estimadas de entrega" icon={Clock}>
            {data.upcomingProjectDates.length ? (
              <Table columns={[{ label: 'Proyecto' }, { label: 'Cliente' }, { label: 'Entrega estimada' }, { label: 'Estado' }]}>
                {data.upcomingProjectDates.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium text-slate-700">{p.name}</td>
                    <td className="px-4 py-3">{p.client_name || '—'}</td>
                    <td className="px-4 py-3">{fmtDate(p.date)}</td>
                    <td className="px-4 py-3"><Badge color={statusColor(p.status)}>{label(p.status)}</Badge></td>
                  </tr>
                ))}
              </Table>
            ) : <p className="text-sm text-slate-400">Sin fechas próximas.</p>}
          </Section>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          La «fase» se representa con el <code className="bg-slate-100 px-1 rounded">status</code> real del proyecto
          (pendiente, en_proceso, en_revisión, pausado, finalizado, cancelado) y el avance de tareas/entregables.
          El esquema no tiene una columna <code className="bg-slate-100 px-1 rounded">phase</code>.
        </p>
      </>}
    </State>
  );
}

/* ───────────────────────── CLIENTES ─────────────────────────────────────── */
export function ClientsOverview() {
  const { data, error, loading } = useData('/dashboard');
  return (
    <State loading={loading} error={error} empty={!data}>
      {data && <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={Building2} label="Total clientes" value={fmtNum(data.indicators.clients)} />
          <StatCard icon={FileSpreadsheet} label="Cotizaciones" value={fmtNum(data.indicators.quotes)} />
          <StatCard icon={Receipt} label="Facturas" value={fmtNum(data.indicators.invoices)} />
          <StatCard icon={Target} label="Prospectos" value={fmtNum(data.indicators.leads)} />
        </div>
        <div className="mt-4">
          <Section title="Actividad reciente (auditoría de la base de datos)" icon={Activity}>
            {data.recentActivity.length ? (
              <Table columns={[{ label: 'Fecha' }, { label: 'Tabla' }, { label: 'Acción' }, { label: 'Registro' }]}>
                {data.recentActivity.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3">{fmtDateTime(a.created_at)}</td>
                    <td className="px-4 py-3">{label(a.table_name)}</td>
                    <td className="px-4 py-3"><Badge color={a.action === 'DELETE' ? 'red' : a.action === 'INSERT' ? 'green' : 'blue'}>{a.action}</Badge></td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{String(a.record_id || '').slice(0, 8)}</td>
                  </tr>
                ))}
              </Table>
            ) : <p className="text-sm text-slate-400">Sin actividad registrada todavía. Los triggers de Supabase la llenan automáticamente al crear o editar registros.</p>}
          </Section>
        </div>
        <p className="text-xs text-slate-400 mt-3">En la pestaña <strong>Clientes</strong>, abre el ícono <Eye className="inline" size={12} /> para ver proyectos, contratos, facturas, recaudos, documentos, dominios, hosting, sitios, tickets y más de cada cliente en una sola vista.</p>
      </>}
    </State>
  );
}

/* ───────────────────────── OPERACIONES ──────────────────────────────────── */
export function OperationsOverview() {
  const { data, error, loading } = useData('/dashboard');
  return (
    <State loading={loading} error={error} empty={!data}>
      {data && <>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard icon={Ticket} label="Tickets abiertos" value={fmtNum(data.indicators.openTickets)} tone="red" />
          <StatCard icon={Package} label="Próximas entregas" value={fmtNum(data.upcomingDeliveries.length)} tone="amber" />
          <StatCard icon={Building2} label="Clientes" value={fmtNum(data.indicators.clients)} />
        </div>
        <div className="mt-4">
          <Section title="Inventario de operaciones" icon={Globe2}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { icon: Globe2, name: 'Dominios', entity: 'domains' },
                { icon: Server, name: 'Hosting', entity: 'hosting_accounts' },
                { icon: Globe2, name: 'Sitios web', entity: 'websites' },
                { icon: RefreshCw, name: 'Renovaciones', entity: 'renewals' },
                { icon: Clock, name: 'Mantenimiento', entity: 'maintenance_plans' },
                { icon: Ticket, name: 'Tickets', entity: 'tickets' },
                { icon: AlertCircle, name: 'Incidencias', entity: 'incidents' },
                { icon: Activity, name: 'Encuestas', entity: 'surveys' },
              ].map((x) => (
                <div key={x.entity} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <x.icon size={18} className="text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">{x.name}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">Usa las pestañas de arriba para administrar cada entidad. Los vencimientos de dominios y hosting se controlan en <strong>Renovaciones</strong>.</p>
          </Section>
        </div>
      </>}
    </State>
  );
}

/* ───────────────────────── CONFIGURACIÓN ────────────────────────────────── */
export function SettingsOverview() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    get('/health').then(setHealth).catch((e) => setError(e.message));
  }, []);
  return (
    <State loading={!health && !error} error={error}>
      {health && <>
        <div className="grid sm:grid-cols-3 gap-3">
          <StatCard icon={Database} label="Servicio API" value={health.ok ? 'Activo' : 'Error'} tone={health.ok ? 'green' : 'red'} />
          <StatCard icon={Shield} label="Base de datos" value={health.database === 'configurada' ? 'Conectada' : 'Sin configurar'} tone={health.database === 'configurada' ? 'green' : 'red'} />
          <StatCard icon={Shield} label="Supabase Auth" value={health.supabaseAuth === 'configurada' ? 'Conectado' : 'Sin configurar'} tone={health.supabaseAuth === 'configurada' ? 'green' : 'red'} />
        </div>
        <div className="mt-4">
          <Section title="Arquitectura y seguridad" icon={Shield}>
            <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
              <li>Los datos provienen <strong>exclusivamente</strong> de tu proyecto Supabase <code className="bg-slate-100 px-1 rounded">pyboszwmrzvzzpekmeps</code>.</li>
              <li>El esquema existente (31 tablas) se conserva intacto; solo se añadieron 6 tablas incrementales para funcionalidades sin equivalente.</li>
              <li>RLS permanece activado y sin modificaciones. El backend aplica la matriz de permisos por rol (<code className="bg-slate-100 px-1 rounded">public.profiles.role</code>).</li>
              <li>Los roles son los reales: administrador, direccion, comercial, desarrollo, finanzas, soporte. No se crearon roles nuevos.</li>
              <li>Desarrollo, comercial y soporte no pueden leer información financiera ni la vista de Gerencia.</li>
              <li>El frontend nunca recibe la cadena de conexión ni claves privadas: todas las consultas pasan por Express.</li>
              <li>Documentos, contratos y comprobantes se gestionan con enlaces manuales (Google Drive API pospuesta para FASE 2).</li>
            </ul>
          </Section>
        </div>
        <div className="mt-4">
          <Section title="Esquema de la base de datos" icon={Database}>
            <p className="text-sm text-slate-600">
              La referencia completa de tablas, columnas, relaciones, restricciones, triggers y RLS está en
              <code className="bg-slate-100 px-1 rounded mx-1">SUPABASE_SCHEMA_MAP.md</code>.
              Los formularios de este panel se generan a partir del catálogo real expuesto por <code className="bg-slate-100 px-1 rounded">/api/schema</code>:
              no incluyen campos ficticios.
            </p>
          </Section>
        </div>
      </>}
    </State>
  );
}
