import { useState } from 'react';
import { Tabs } from './ui';
import ResourcePage from './ResourcePage';

/**
 * Módulo con una vista consolidada (overview) y pestañas de entidades reales.
 * Cada pestaña monta un ResourcePage generado desde el esquema de Supabase.
 */
export default function ModulePage({ title, description, overview, tabs, defaultTab }) {
  const allTabs = [
    ...(overview ? [{ id: '__overview', label: 'Resumen' }] : []),
    ...tabs.map((t) => ({ id: t.id, label: t.label })),
  ];
  const [tab, setTab] = useState(defaultTab || allTabs[0]?.id);
  const current = tabs.find((t) => t.id === tab);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>

      <Tabs tabs={allTabs} active={tab} onChange={setTab} />

      {tab === '__overview'
        ? overview
        : current && (
          <ResourcePage
            key={current.entity}
            entity={current.entity}
            compact
            defaultFilters={current.defaultFilters || {}}
          />
        )}
    </div>
  );
}
