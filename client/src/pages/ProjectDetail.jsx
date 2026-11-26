import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FolderKanban, ChevronDown, ChevronRight } from 'lucide-react';
import { get } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { RelatedTable, renderValue } from '../components/ResourcePage';
import { Button, EmptyState, Spinner } from '../components/ui';
import { resourceUrl } from '../lib/resourceNavigation';

export default function ProjectDetail() {
  const { id } = useParams();
  const { schema, options } = useAuth();
  const [project, setProject] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState({});
  const [relatedErrors, setRelatedErrors] = useState({});
  const [openRelation, setOpenRelation] = useState(null);
  const [relatedLoading, setRelatedLoading] = useState(null);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    get(`/resources/projects/${id}/detail`, { includeRelated: 'false' }, { signal: controller.signal }).then((data) => alive && setProject(data))
      .catch((e) => { if (alive && e.name !== 'AbortError') setError(e.message); })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; controller.abort(); };
  }, [id]);
  const toggleRelation = async (name) => {
    if (openRelation === name) { setOpenRelation(null); return; }
    setOpenRelation(name);
    if (related[name]) return;
    setRelatedLoading(name);
    try {
      const result = await get(`/resources/projects/${id}/related/${name}`);
      setRelated((current) => ({ ...current, [name]: result.items || [] }));
      setRelatedErrors((current) => ({ ...current, [name]: '' }));
    } catch (e) { setRelatedErrors((current) => ({ ...current, [name]: e.message })); }
    finally { setRelatedLoading(null); }
  };
  if (loading) return <Spinner />;
  if (error || !project) return <EmptyState icon={FolderKanban} title="No se pudo abrir el proyecto" description={error || 'Proyecto no encontrado.'} action={<Link to="/clientes"><Button variant="secondary"><ArrowLeft size={15} /> Volver a clientes</Button></Link>} />;
  const def = schema?.entities.find((e) => e.entity === 'projects');
  return <div className="space-y-5">
    <Link to="/clientes" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft size={15} /> Clientes</Link>
    <header><p className="text-sm text-slate-400">Proyecto</p><h1 className="text-2xl font-bold text-slate-900">{project.item.project_name}</h1></header>
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 rounded-xl border border-slate-200 bg-white p-5">
      {Object.entries(def?.fields || {}).map(([key, field]) => <div key={key} className="py-2 border-b border-slate-100"><p className="text-xs text-slate-400">{field.label}</p><div className="mt-1 text-sm">{renderValue(key, project.item[key], field, options, { truncate: false })}</div></div>)}
    </section>
    {(project.relations || []).map((name) => {
      const rows = related[name] || [];
      const isOpen = openRelation === name;
      const relationFilters = { project_id: id };
      const target = resourceUrl(name, { filters: relationFilters });
      const fieldDef = schema?.entities.find((item) => item.entity === name || item.table === name);
      return (
        <section key={name} className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button className="flex items-center gap-2 font-semibold text-slate-800" onClick={() => toggleRelation(name)} aria-expanded={isOpen}>
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              {fieldDef?.label || name}
            </button>
            {target && <Link to={target} className="text-sm font-semibold text-[#5170ff] hover:underline">Abrir administración</Link>}
          </div>
          {isOpen && (relatedLoading === name ? <div className="py-4"><Spinner /></div>
            : relatedErrors[name] ? <p className="mt-3 text-sm text-red-600">{relatedErrors[name]}</p>
              : rows.length ? <div className="mt-4"><RelatedTable name={name} rows={rows} schema={schema} options={options} filters={relationFilters} /></div>
                : <p className="mt-3 text-sm text-slate-400">Sin registros relacionados.</p>)}
        </section>
      );
    })}
  </div>;
}
