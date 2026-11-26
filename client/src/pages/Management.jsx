import { Link } from 'react-router-dom';
import ModulePage from '../components/ModulePage';
import { ManagementOverview } from '../components/Overviews';
import { resourceUrl } from '../lib/resourceNavigation';

function ManagementHome() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link to={resourceUrl('profit_distributions')} className="rounded-lg bg-[#5170ff] px-4 py-2 text-sm font-medium text-white hover:bg-[#405ee8]">Administrar utilidades</Link>
        <Link to={resourceUrl('withdrawals')} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-[#5170ff]/40 hover:text-[#5170ff]">Administrar retiros</Link>
      </div>
      <ManagementOverview />
    </div>
  );
}

export default function Management() {
  return (
    <ModulePage
      title="Gerencia"
      description="Visión consolidada del negocio y accesos al módulo donde se administran las utilidades y los retiros."
      overview={<ManagementHome />}
      tabs={[]}
    />
  );
}
