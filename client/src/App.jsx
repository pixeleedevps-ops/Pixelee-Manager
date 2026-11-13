import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Accounting from './pages/Accounting';
import Development from './pages/Development';
import Marketing from './pages/Marketing';
import Operations from './pages/Operations';
import Management from './pages/Management';
import Settings from './pages/Settings';
import ProjectDetail from './pages/ProjectDetail';

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
    <Routes>
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
    </Routes>
  );
}
