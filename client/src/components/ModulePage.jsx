import { useState } from 'react';
import { Tabs } from './ui';
import ResourcePage from './ResourcePage';

/**
 * Módulo con una vista consolidada (overview) y pestañas de entidades reales.
 * Cada pestaña monta un ResourcePage generado desde el esquema de Supabase.
 */
export default function ModulePage({ title, description, overview, tabs, defaultTab }) {
  const [group, setGroup] = useState(tabs.find((t) => t.id === defaultTab)?.group || tabs[0]?.group || '');
  const groups = [...new Set(tabs.map((t) => t.group).filter(Boolean))];
  const groupedTabs = groups.length > 1;
  const visibleTabs = groupedTabs ? tabs.filter((t) => t.group === group) : tabs;
  const [tab, setTab] = useState(defaultTab || (overview ? '__overview' : tabs[0]?.id));
  const current = tabs.find((t) => t.id === tab);
  const allTabs = [
    ...(overview ? [{ id: '__overview', label: 'Resumen' }] : []),
    ...visibleTabs.map((t) => ({ id: t.id, label: t.label })),
  ];

  const selectGroup = (nextGroup) => {
    setGroup(nextGroup);
    const firstTab = tabs.find((t) => t.group === nextGroup);
    if (firstTab) setTab(firstTab.id);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>

      <Tabs tabs={allTabs} active={tab} onChange={setTab} />

      {groupedTabs && tab !== '__overview' && (
        <div className="flex flex-wrap gap-2">
          {groups.map((item) => (
            <button key={item} type="button" onClick={() => selectGroup(item)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${group === item ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
              {item}
            </button>
          ))}
        </div>
      )}

      {tab === '__overview'
        ? overview
        : current && (
          <ResourcePage
            key={current.entity}
            entity={current.entity}
            compact
            display={current.display || 'table'}
            summaryFields={current.summaryFields}
            defaultFilters={current.defaultFilters || {}}
          />
        )}
    </div>
  );
}
