import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FolderKanban } from 'lucide-react';
import { get } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import ResourcePage, { renderValue } from '../components/ResourcePage';
import { Button, EmptyState, Spinner, Table } from '../components/ui';
import { label } from '../lib/format';

export default function ProjectDetail() {
  const { id } = useParams();
  const { schema, options } = useAuth();
  const [project, setProject] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    get(`/resources/projects/${id}/detail`).then((data) => alive && setProject(data))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id]);
  if (loading) return <Spinner />;
  if (error || !project) return <EmptyState icon={FolderKanban} title="No se pudo abrir el proyecto" description={error || 'Proyecto no encontrado.'} action={<Link to="/clientes"><Button variant="secondary"><ArrowLeft size={15} /> Volver a clientes</Button></Link>} />;
  const def = schema?.entities.find((e) => e.entity === 'projects');
  return <div className="space-y-5">
    <Link to="/clientes" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={15} /> Clientes</Link>
    <header><p className="text-sm text-slate-400">Proyecto</p><h1 className="text-2xl font-bold text-slate-900">{project.item.project_name}</h1></header>
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 rounded-xl border border-slate-200 bg-white p-5">
      {Object.entries(def?.fields || {}).map(([key, field]) => <div key={key} className="py-2 border-b border-slate-100"><p className="text-xs text-slate-400">{field.label}</p><div className="mt-1 text-sm">{renderValue(key, project.item[key], field, options, { truncate: false })}</div></div>)}
    </section>
    {Object.entries(project.related || {}).map(([name, rows]) => {
      if (!rows.length) return null;
      if (['invoices','payments','expenses','extra_expenses','project_costs','bonuses'].includes(name)) return <section key={name} className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-3 font-semibold text-slate-800">{label(name)}</h2><Table columns={Object.keys(rows[0]).filter((k) => !['id','created_at','updated_at'].includes(k)).slice(0,5).map((k) => ({label: label(k)}))}>{rows.slice(0,25).map((row) => <tr key={row.id}>{Object.keys(row).filter((k) => !['id','created_at','updated_at'].includes(k)).slice(0,5).map((k) => <td key={k} className="px-4 py-3 text-sm">{renderValue(k,row[k],null,options)}</td>)}</tr>)}</Table></section>;
      return <section key={name} className="rounded-xl border border-slate-200 bg-white p-5"><h2 className="mb-3 font-semibold text-slate-800">{label(name)}</h2><ResourcePage entity={name} compact defaultFilters={{project_id:id}} /></section>;
    })}
  </div>;
}
