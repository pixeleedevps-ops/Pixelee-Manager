import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Tabs } from './ui';
import ResourcePage from './ResourcePage';

/** A module overview and its active resource section. The section lives in the URL. */
export default function ModulePage({ title, description, overview, tabs, defaultTab }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultSelection = defaultTab || (overview ? '__overview' : tabs[0]?.id);
  const sectionParam = searchParams.get('section');
  const matchingTab = tabs.find((item) => item.id === sectionParam)
    || tabs.find((item) => item.group === sectionParam);
  const tab = sectionParam === 'overview' && overview
    ? '__overview'
    : matchingTab?.id || defaultSelection;
  const current = tabs.find((item) => item.id === tab);
  const groups = [...new Set(tabs.map((item) => item.group).filter(Boolean))];
  const groupedTabs = groups.length > 1;
  const defaultTabItem = tabs.find((item) => item.id === defaultTab) || tabs[0];
  const activeGroup = (tab === '__overview' ? defaultTabItem : current)?.group;
  const visibleTabs = groupedTabs && activeGroup
    ? tabs.filter((item) => item.group === activeGroup)
    : tabs;
  const urlFilters = Object.fromEntries([...searchParams.entries()]
    .filter(([key]) => key.startsWith('filter_'))
    .map(([key, value]) => [key.slice('filter_'.length), value]));
  const isGroupedNavigation = groups.length > 1;
  const topTabs = isGroupedNavigation
    ? [
        ...(overview ? [{ id: '__overview', label: 'Resumen' }] : []),
        ...groups.map((group) => ({ id: `__group:${group}`, label: group })),
      ]
    : [
        ...(overview ? [{ id: '__overview', label: 'Resumen' }] : []),
        ...tabs.map(({ id, label }) => ({ id, label })),
      ];
  const activeTopTab = tab === '__overview'
    ? '__overview'
    : isGroupedNavigation && current?.group
      ? `__group:${current.group}`
      : tab;

  const selectSection = (next) => {
    setSearchParams((previous) => {
      previous.set('section', next === '__overview' ? 'overview' : next);
      previous.delete('create');
      [...previous.keys()].filter((key) => key.startsWith('filter_')).forEach((key) => previous.delete(key));
      return previous;
    });
  };

  const selectTopTab = (next) => {
    if (next === '__overview') return selectSection(next);
    if (next.startsWith('__group:')) {
      const firstTab = tabs.find((item) => item.group === next.slice('__group:'.length));
      if (firstTab) return selectSection(firstTab.id);
      return;
    }
    selectSection(next);
  };

  const clearCreateSignal = () => {
    setSearchParams((previous) => {
      previous.delete('create');
      return previous;
    }, { replace: true });
  };

  // Normalize old module URLs and unknown section values to a stable deep link.
  const normalizedSection = tab === '__overview' ? 'overview' : tab;
  if (sectionParam !== normalizedSection) {
    // Updating search params during render is avoided; the URL is normalized below.
  }
  useEffect(() => {
    if (sectionParam === normalizedSection) return;
    setSearchParams((previous) => {
      previous.set('section', normalizedSection);
      return previous;
    }, { replace: true });
  }, [sectionParam, normalizedSection, setSearchParams]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>

      <Tabs
        tabs={topTabs}
        active={activeTopTab}
        onChange={selectTopTab}
        ariaLabel="Secciones principales del módulo"
        variant="primary"
      />

      {isGroupedNavigation && tab !== '__overview' && current && (
        <Tabs
          tabs={visibleTabs.map(({ id, label }) => ({ id, label }))}
          active={tab}
          onChange={selectSection}
          ariaLabel={`Contenido de ${activeGroup}`}
          variant="secondary"
        />
      )}

      {tab === '__overview'
        ? overview
        : current?.to ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-800">{current.label}</h2>
              <p className="mt-1 text-sm text-slate-500">Este registro se administra desde su sección principal.</p>
            </div>
            <Link to={current.to} className="inline-flex items-center rounded-lg bg-[#5170ff] px-4 py-2 text-sm font-medium text-white hover:bg-[#405ee8]">
              Abrir sección principal
            </Link>
          </div>
        ) : current && (
          <ResourcePage
            key={`${current.entity}-${Object.keys(urlFilters).sort().map((key) => `${key}:${urlFilters[key]}`).join('|')}`}
            entity={current.entity}
            compact
            display={current.display || 'table'}
            summaryFields={current.summaryFields}
            defaultFilters={{ ...(current.defaultFilters || {}), ...urlFilters }}
            autoCreate={searchParams.get('create') === current.entity}
            onAutoCreateHandled={clearCreateSignal}
            onFiltersCleared={() => setSearchParams((previous) => {
              [...previous.keys()].filter((key) => key.startsWith('filter_')).forEach((key) => previous.delete(key));
              return previous;
            }, { replace: true })}
          />
        )}
    </div>
  );
}
