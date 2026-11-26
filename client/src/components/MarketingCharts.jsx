import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { fmtMoney, label } from '../lib/format';
import { Section } from './OverviewUi';

const COLORS = ['#5170ff', '#cef009', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const tooltipStyle = { backgroundColor: '#0f172a', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 };

export function ChannelChart({ rows }) {
  return <Section title="Inversión por canal"><ResponsiveContainer width="100%" height={240}><BarChart data={rows}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="channel" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtMoney(v)} /><Bar dataKey="spent" name="Inversión" fill="#5170ff" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></Section>;
}

export function LeadFunnelChart({ rows }) {
  return <Section title="Embudo de prospectos"><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={rows} dataKey="count" nameKey="status" outerRadius={85} label={(e) => `${label(e.status)}: ${e.count}`}>{rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v, label(n)]} /></PieChart></ResponsiveContainer></Section>;
}
