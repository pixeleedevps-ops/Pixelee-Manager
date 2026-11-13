import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calculator, Code2, Megaphone, Briefcase,
  Settings, LogOut, Menu, Sparkles, Globe2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../lib/format';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard.view', end: true },
  { to: '/clientes', label: 'Clientes', icon: Users, perm: 'clients.view' },
  { to: '/contabilidad', label: 'Contabilidad', icon: Calculator, perm: 'accounting.view' },
  { to: '/desarrollo', label: 'Desarrollo', icon: Code2, perm: 'projects.view' },
  { to: '/marketing', label: 'Marketing', icon: Megaphone, perm: 'marketing.view' },
  { to: '/operaciones', label: 'Operaciones', icon: Globe2, perm: 'ops.view' },
  { to: '/gerencia', label: 'Gerencia', icon: Briefcase, perm: 'management.view' },
  { to: '/configuracion', label: 'Configuración', icon: Settings, perm: 'settings.view' },
];

export default function Layout() {
  const { user, logout, can, permissions } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // Los módulos principales siempre se muestran en la navegación. El servidor
  // valida permisos en las rutas/API; el menú no debe desaparecer si una
  // sesión antigua quedó sin la lista de permisos almacenada en el cliente.
  const primaryModules = new Set(['/clientes', '/contabilidad', '/desarrollo']);
  const items = NAV.filter((n) => primaryModules.has(n.to) || can(n.perm));
  const hasPermissionData = permissions.includes('*') || permissions.length > 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebar = (compact = false) => (
    <div className="flex flex-col h-full">
      <div className={`px-4 py-5 border-b border-white/10 flex items-center gap-2.5 ${compact ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
          <Sparkles size={18} />
        </div>
        {!compact && <div>
          <p className="text-white font-bold text-sm tracking-wide leading-none">PIXELÉE</p>
          <p className="text-slate-400 text-[11px] mt-0.5 tracking-widest">MANAGER</p>
        </div>}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            title={compact ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center ${compact ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <item.icon size={17} />
            {!compact && item.label}
          </NavLink>
        ))}
        {!compact && !hasPermissionData && (
          <p className="mx-3 mt-3 rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs leading-relaxed text-amber-100">
            Los módulos están visibles, pero el servidor no ha confirmado tus permisos. Si no tienes acceso, solicita que revisen tu rol.
          </p>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        {!compact && <div className="px-3 py-2 mb-2">
          <p className="text-white text-sm font-medium truncate">{user?.full_name || '—'}</p>
          <p className="text-slate-400 text-xs">{ROLE_LABELS[user?.role] || user?.role}</p>
        </div>}
        <button onClick={handleLogout}
          title="Cerrar sesión" className={`w-full flex items-center ${compact ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition`}>
          <LogOut size={17} />
          {!compact && 'Cerrar sesión'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#f3f5f8]">
      <aside className={`hidden lg:flex shrink-0 bg-[#111827] flex-col fixed inset-y-0 z-40 transition-[width] duration-200 ${expanded ? 'w-60' : 'w-[76px]'}`}>{sidebar(!expanded)}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-[#111827]">{sidebar()}</aside>
        </div>
      )}
      <div className={`flex-1 flex flex-col min-w-0 transition-[margin] duration-200 ${expanded ? 'lg:ml-60' : 'lg:ml-[76px]'}`}>
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-600" onClick={() => window.innerWidth >= 1024 ? setExpanded((v) => !v) : setOpen(true)} aria-label="Abrir o cerrar menú" title="Menú">
              <Menu size={19} />
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-800">Panel administrativo</p>
              <p className="text-xs text-slate-400 hidden sm:block">Gestión integral · COP · Supabase</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Sesión activa
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
              {(user?.full_name || '?').slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-[1800px] w-full mx-auto"><Outlet /></main>
      </div>
    </div>
  );
}
