import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { resourceUrl, resourceModule, RESOURCE_LOCATIONS } from '../lib/resourceNavigation';
import { Button, Input, Modal } from './ui';

export default function QuickCreate() {
  const { schema, can } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const choices = useMemo(() => (schema?.entities || [])
    .filter((item) => item.creatable && !item.readonly && item.view && item.manage && can(item.view) && can(item.manage) && RESOURCE_LOCATIONS[item.entity])
    .filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => resourceModule(a.entity).localeCompare(resourceModule(b.entity)) || a.label.localeCompare(b.label)),
  [schema, can, query]);

  const groups = useMemo(() => choices.reduce((result, item) => {
    const key = resourceModule(item.entity);
    (result[key] ||= []).push(item);
    return result;
  }, {}), [choices]);

  const choose = (entity) => {
    const url = resourceUrl(entity, { create: true });
    if (!url) return;
    setOpen(false);
    setQuery('');
    navigate(url);
  };

  if (!choices.length && !query) return null;

  return (
    <>
      <Button aria-label="Crear registro" title="Crear registro" className="!px-3 sm:!px-4" onClick={() => setOpen(true)}>
        <Plus size={16} className="text-[#cef009]" /><span className="hidden sm:inline">Crear</span>
      </Button>
      <Modal open={open} onClose={() => { setOpen(false); setQuery(''); }} title="Crear registro">
        <p className="mb-3 text-sm text-slate-500">Elige el tipo de dato. Solo se muestran registros que puedes crear.</p>
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input autoFocus className="pl-9" placeholder="Buscar tipo de registro…" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
          {Object.entries(groups).map(([module, items]) => (
            <section key={module}>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{module}</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {items.map((item) => (
                  <button key={item.entity} type="button" onClick={() => choose(item.entity)}
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50">
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          ))}
          {!choices.length && <p className="py-6 text-center text-sm text-slate-400">No hay tipos que coincidan con la búsqueda.</p>}
        </div>
      </Modal>
    </>
  );
}
