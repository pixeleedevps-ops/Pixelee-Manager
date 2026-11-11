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
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((n) => can(n.perm));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-white/10 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
          <Sparkles size={18} />
        </div>
        <div>
          <p className="text-white font-bold text-sm tracking-wide leading-none">PIXELÉE</p>
          <p className="text-slate-400 text-[11px] mt-0.5 tracking-widest">MANAGER</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <item.icon size={17} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 py-2 mb-2">
          <p className="text-white text-sm font-medium truncate">{user?.full_name || '—'}</p>
          <p className="text-slate-400 text-xs">{ROLE_LABELS[user?.role] || user?.role}</p>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition">
          <LogOut size={17} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex w-64 shrink-0 bg-slate-900 flex-col fixed inset-y-0">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-slate-900">{sidebar}</aside>
        </div>
      )}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setOpen(true)} aria-label="Abrir menú">
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
        <main className="flex-1 p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
