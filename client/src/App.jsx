import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Clients = lazy(() => import('./pages/Clients'));
const Accounting = lazy(() => import('./pages/Accounting'));
const Development = lazy(() => import('./pages/Development'));
const Marketing = lazy(() => import('./pages/Marketing'));
const Operations = lazy(() => import('./pages/Operations'));
const Management = lazy(() => import('./pages/Management'));
const Settings = lazy(() => import('./pages/Settings'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/** Oculta rutas completas a quien no tiene el permiso (además del control del API). */
function Guard({ perm, children }) {
  const { can } = useAuth();
  return can(perm) ? children : <Navigate to="/" replace />;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;

  return (
    <Suspense fallback={<Spinner />}><Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clientes" element={<Guard perm="clients.view"><Clients /></Guard>} />
        <Route path="/contabilidad" element={<Guard perm="accounting.view"><Accounting /></Guard>} />
        <Route path="/desarrollo" element={<Guard perm="projects.view"><Development /></Guard>} />
        <Route path="/proyectos/:id" element={<Guard perm="projects.view"><ProjectDetail /></Guard>} />
        <Route path="/marketing" element={<Guard perm="marketing.view"><Marketing /></Guard>} />
        <Route path="/operaciones" element={<Guard perm="ops.view"><Operations /></Guard>} />
        <Route path="/gerencia" element={<Guard perm="management.view"><Management /></Guard>} />
        <Route path="/configuracion" element={<Guard perm="settings.view"><Settings /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes></Suspense>
  );
}
