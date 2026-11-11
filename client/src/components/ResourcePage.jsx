import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, Plus, Pencil, Trash2, Eye, ChevronLeft, ChevronRight,
  X, Inbox, ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { get, post, put, del } from '../lib/api';
import {
  fmtMoney, fmtNum, fmtDate, fmtDateTime, label, isMoneyField,
  toDateInput, toDateTimeInput,
} from '../lib/format';
import {
  Modal, Button, Field, Input, Select, Textarea, Badge, statusColor,
  Table, EmptyState, Spinner, ConfirmDialog, Toast,
} from './ui';

/* ─── Formateo de celdas según el tipo real del campo ─────────────────────── */
export function renderValue(field, value, fieldDef, options = {}, opts = {}) {
  if (value === null || value === undefined || value === '') return <span className="text-slate-300">—</span>;
  const type = fieldDef?.type || 's';
  const base = type.replace('!', '');

  if (base.startsWith('e:')) return <Badge color={statusColor(String(value))}>{label(value)}</Badge>;
  if (base === 'b') return value ? <Badge color="green">Sí</Badge> : <Badge color="gray">No</Badge>;
  if (base === 'u') {
    const found = (options[field] || []).find((o) => o.id === value);
    return <span className="text-slate-700">{found?.label || String(value).slice(0, 8) + '…'}</span>;
  }
  if (base === 'd') return <span className="whitespace-nowrap">{fmtDate(value)}</span>;
  if (base === 'dt') return <span className="whitespace-nowrap">{fmtDateTime(value)}</span>;
  if (base === 'n' || base === 'i') {
    if (isMoneyField(field)) return <span className="tabular-nums whitespace-nowrap">{fmtMoney(value)}</span>;
    return <span className="tabular-nums">{fmtNum(value, 2)}</span>;
  }
  if (/(_url|^site_url|^file_url|^quote_url|^invoice_url|^contract_url|^receipt_url|^delivery_url|^panel_url|^admin_url)/.test(field)) {
    return (
      <a href={String(value)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
        Ver enlace <ExternalLink size={12} />
      </a>
    );
  }
  const s = String(value);
  return <span className={opts.truncate !== false ? 'line-clamp-2' : ''}>{s.length > 90 ? s.slice(0, 90) + '…' : s}</span>;
}

/* ─── Columnas visibles: derivadas del esquema, sin columnas ficticias ────── */
function visibleColumns(def, items) {
  // Entidades de solo lectura generadas por triggers (activity_logs,
  // schema_migrations) no declaran campos editables: se derivan de la fila real.
  if (!Object.keys(def.fields).length && items?.length) {
    return Object.keys(items[0])
      .filter((k) => !['id', 'created_at', 'updated_at', 'old_data', 'new_data'].includes(k))
      .slice(0, 6)
      .map((k) => [k, { type: 's', label: label(k) }]);
  }
  const skip = /notes|description|_url$/i;
  const entries = Object.entries(def.fields).filter(([k]) => !skip.test(k));
  return (entries.length ? entries : Object.entries(def.fields)).slice(0, 6);
}

const RELATED_TABLE = {
  items: 'profit_distribution_items',
  metrics: 'campaign_metrics',
  quotes: 'quotes',
  follow_ups: 'follow_ups',
};

function RelatedTable({ name, rows, schema, options }) {
  const table = RELATED_TABLE[name] || name;
  const def = schema?.entities.find((e) => e.table === table);
  if (!rows?.length) return null;
  const keys = Object.keys(rows[0])
    .filter((k) => !['id', 'created_at', 'updated_at', 'notes', 'old_data', 'new_data'].includes(k))
    .filter((k) => !k.endsWith('_id') || !Object.keys(rows[0]).some((x) => x === k.slice(0, -3)))
    .slice(0, 5);
  return (
    <div className="mb-5">
      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
        {def?.label || label(name)} <span className="text-slate-400">({rows.length})</span>
      </h4>
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-slate-50">
            <tr>{keys.map((k) => <th key={k} className="px-3 py-2 text-left font-semibold text-slate-500">{def?.fields?.[k]?.label || label(k)}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.slice(0, 12).map((r, i) => (
              <tr key={r.id || i} className="hover:bg-slate-50">
                {keys.map((k) => (
                  <td key={k} className="px-3 py-2 text-slate-600">
                    {renderValue(k, r[k], def?.fields?.[k], options)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Control de formulario generado desde el tipo real ───────────────────── */
function FormField({ name, def, value, onChange, options }) {
  const type = def.type.replace('!', '');
  const common = { value: value ?? '', onChange: (e) => onChange(name, e.target.value) };
  const opts = options[name] || [];

  if (type.startsWith('e:')) {
    const values = def.values || type.slice(2).split(',');
    return (
      <Field label={def.label} required={def.required}>
        <Select {...common}>
          <option value="">— Seleccionar —</option>
          {values.map((v) => <option key={v} value={v}>{label(v)}</option>)}
        </Select>
      </Field>
    );
  }
  if (type === 'u') {
    return (
      <Field label={def.label} required={def.required}
        hint={opts.length ? undefined : 'No hay registros relacionados todavía. Créalos primero en su módulo.'}>
        <Select {...common}>
          <option value="">— Seleccionar —</option>
          {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </Select>
      </Field>
    );
  }
  if (type === 'b') {
    return (
      <Field label={def.label} required={def.required}>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="w-4 h-4" checked={!!value}
            onChange={(e) => onChange(name, e.target.checked)} />
          Sí / activo
        </label>
      </Field>
    );
  }
  if (type === 'd') return <Field label={def.label} required={def.required}><Input type="date" {...common} /></Field>;
  if (type === 'dt') return <Field label={def.label} required={def.required}><Input type="datetime-local" {...common} /></Field>;
  if (type === 'n' || type === 'i') {
    return <Field label={def.label} required={def.required}><Input type="number" step={type === 'i' ? '1' : '0.01'} {...common} /></Field>;
  }
  if (/_url$/.test(name)) return <Field label={def.label} required={def.required}><Input type="url" placeholder="https://drive.google.com/…" {...common} /></Field>;
  if (/notes|description/i.test(name)) return <Field label={def.label} required={def.required}><Textarea rows={3} {...common} /></Field>;
  return <Field label={def.label} required={def.required}><Input type="text" {...common} /></Field>;
}

/* ─── Página de recurso ───────────────────────────────────────────────────── */
export default function ResourcePage({
  entity, title, description, compact = false,
  defaultFilters = {}, onChanged,
}) {
  const { schema, options, reloadOptions, can } = useAuth();
  const def = useMemo(
    () => schema?.entities.find((e) => e.entity === entity) || null,
    [schema, entity]
  );

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [form, setForm] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);

  // Debounce de búsqueda
  useEffect(() => {
    const t = setTimeout(() => { setQ(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    if (!def) return;
    setLoading(true);
    setError('');
    try {
      const data = await get(`/resources/${entity}`, { q, page, pageSize, ...filters });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [def, entity, q, page, pageSize, filters]);

  useEffect(() => { load(); }, [load]);

  if (!def) {
    return <EmptyState icon={Inbox} title="Esquema no disponible" description="No se pudo cargar la definición de esta entidad desde Supabase." />;
  }

  const columns = visibleColumns(def, items);
  const detailFields = Object.keys(def.fields).length
    ? Object.entries(def.fields)
    : Object.entries(detail?.item || {})
        .filter(([k]) => !['old_data', 'new_data'].includes(k))
        .map(([k]) => [k, { type: k.includes('date') || k.includes('_at') ? 'dt' : 's', label: label(k) }]);
  const canManage = !def.readonly && !!def.manage && can(def.manage);
  const canCreate = def.creatable && canManage;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const openCreate = () => {
    const initial = {};
    for (const [k, f] of Object.entries(def.fields)) {
      initial[k] = f.type.replace('!', '') === 'b' ? false : '';
    }
    for (const [k, v] of Object.entries(defaultFilters)) if (k in initial) initial[k] = v;
    setFormValues(initial);
    setFormError('');
    setForm({ mode: 'create' });
  };

  const openEdit = (item) => {
    const vals = {};
    for (const [k, f] of Object.entries(def.fields)) {
      const t = f.type.replace('!', '');
      let v = item[k] ?? '';
      if (t === 'd') v = toDateInput(v);
      else if (t === 'dt') v = toDateTimeInput(v);
      else if (t === 'b') v = !!v;
      else if (v === null) v = '';
      vals[k] = v;
    }
    setFormValues(vals);
    setFormError('');
    setForm({ mode: 'edit', item });
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (form.mode === 'edit') await put(`/resources/${entity}/${form.item.id}`, formValues);
      else await post(`/resources/${entity}`, formValues);
      setForm(null);
      setToast(form.mode === 'edit' ? 'Registro actualizado.' : 'Registro creado.');
      await reloadOptions();
      await load();
      onChanged?.();
    } catch (err) {
      setFormError(err.message + (err.details?.length ? ` — ${err.details.join(' · ')}` : ''));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await del(`/resources/${entity}/${confirm.id}`);
      setToast('Registro eliminado.');
      setConfirm(null);
      await reloadOptions();
      await load();
      onChanged?.();
    } catch (e) {
      setToast(e.message);
      setConfirm(null);
    }
  };

  const openDetail = async (id) => {
    try { setDetail(await get(`/resources/${entity}/${id}/detail`)); }
    catch (e) { setToast(e.message); }
  };

  const filterFields = def.filters.map((f) => {
    const fd = def.fields[f];
    const values = fd?.type.startsWith('e:') ? (fd.values || fd.type.slice(2).split(',')) : null;
    return { key: f, label: fd?.label || label(f), values, options: options[f] || [] };
  });

  return (
    <div className={compact ? '' : 'space-y-5'}>
      <Toast message={toast} onClose={() => setToast('')} />

      {!compact && (
        <div className="flex flex-wrap justify-between items-end gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{title || def.label}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{description || `Gestión de ${def.label.toLowerCase()} · datos reales de Supabase`}</p>
          </div>
          {canCreate && <Button onClick={openCreate}><Plus size={16} /> Nuevo</Button>}
        </div>
      )}
      {compact && canCreate && (
        <div className="flex justify-end mb-3"><Button onClick={openCreate}><Plus size={16} /> Nuevo</Button></div>
      )}

      {def.hint && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{def.hint}</p>}

      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" placeholder={`Buscar en ${def.label.toLowerCase()}…`}
            value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        {filterFields.map((f) => (
          <div key={f.key} className="min-w-[150px]">
            {f.values ? (
              <Select value={filters[f.key] || ''} onChange={(e) => { setFilters({ ...filters, [f.key]: e.target.value }); setPage(1); }}>
                <option value="">{f.label}: todos</option>
                {f.values.map((v) => <option key={v} value={v}>{label(v)}</option>)}
              </Select>
            ) : f.options.length ? (
              <Select value={filters[f.key] || ''} onChange={(e) => { setFilters({ ...filters, [f.key]: e.target.value }); setPage(1); }}>
                <option value="">{f.label}: todos</option>
                {f.options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </Select>
            ) : null}
          </div>
        ))}
        {(q || Object.values(filters).some(Boolean)) && (
          <Button variant="ghost" className="!px-3 !py-2" onClick={() => { setSearchInput(''); setQ(''); setFilters({}); setPage(1); }}>
            <X size={14} /> Limpiar
          </Button>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState icon={Inbox} title="Sin registros"
          description={q || Object.values(filters).some(Boolean)
            ? 'No hay resultados con esos filtros. Prueba a limpiar la búsqueda.'
            : `Todavía no hay ${def.label.toLowerCase()} en la base de datos. Crea el primero con el botón «Nuevo».`}
          action={canCreate ? <Button onClick={openCreate}><Plus size={16} /> Crear registro</Button> : null} />
      ) : (
        <>
          <Table columns={[...columns.map(([, f]) => ({ label: f.label })), { label: 'Acciones', align: 'right' }]}>
            {items.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/70">
                {columns.map(([k, f]) => <td key={k} className="px-4 py-3 text-slate-600">{renderValue(k, row[k], f, options)}</td>)}
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => openDetail(row.id)} className="p-1.5 text-slate-400 hover:text-blue-600" title="Ver detalle"><Eye size={15} /></button>
                  {canManage && <button onClick={() => openEdit(row)} className="p-1.5 text-slate-400 hover:text-slate-800" title="Editar"><Pencil size={15} /></button>}
                  {canManage && def.deletable && <button onClick={() => setConfirm({ id: row.id, name: row[columns[0][0]] })} className="p-1.5 text-slate-400 hover:text-red-600" title="Eliminar"><Trash2 size={15} /></button>}
                </td>
              </tr>
            ))}
          </Table>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
            <span>{total} registro(s) · página {page} de {pages}</span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={15} /> Anterior</Button>
              <Button variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Siguiente <ChevronRight size={15} /></Button>
            </div>
          </div>
        </>
      )}

      {/* Formulario crear/editar */}
      <Modal open={!!form} onClose={() => setForm(null)} wide
        title={form?.mode === 'edit' ? `Editar ${def.label.toLowerCase()}` : `Nuevo ${def.label.toLowerCase()}`}
        footer={<>
          <Button variant="secondary" onClick={() => setForm(null)}>Cancelar</Button>
          <Button onClick={save} loading={saving}>Guardar</Button>
        </>}>
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          {Object.entries(def.fields).map(([name, f]) => (
            <FormField key={name} name={name} def={f} value={formValues[name]}
              onChange={(k, v) => setFormValues((prev) => ({ ...prev, [k]: v }))} options={options} />
          ))}
          {formError && <div className="sm:col-span-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{formError}</div>}
        </form>
      </Modal>

      {/* Vista de detalle con relaciones */}
      <Modal open={!!detail} onClose={() => setDetail(null)} wide title={`Detalle · ${def.label}`}>
        {detail && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mb-6">
              {detailFields.map(([k, f]) => (
                <div key={k} className="py-2 border-b border-slate-100">
                  <p className="text-xs text-slate-400">{f.label}</p>
                  <div className="text-sm text-slate-800 mt-0.5">{renderValue(k, detail.item[k], f, options, { truncate: false })}</div>
                </div>
              ))}
            </div>
            <h3 className="text-sm font-bold text-slate-700 mb-3">Información relacionada</h3>
            {Object.entries(detail.related).filter(([, rows]) => rows?.length).length === 0
              ? <p className="text-sm text-slate-400">No hay registros relacionados todavía.</p>
              : Object.entries(detail.related).map(([key, rows]) => (
                <RelatedTable key={key} name={key} rows={rows} schema={schema} options={options} />
              ))}
          </>
        )}
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={remove}
        title="Eliminar registro"
        message={`¿Eliminar «${confirm?.name || 'este registro'}»? Esta acción no se puede deshacer. Si tiene registros relacionados, la base de datos impedirá el borrado.`} />
    </div>
  );
}
