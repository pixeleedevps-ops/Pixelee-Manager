import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  api, getToken, saveSession, clearSession,
} from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [schema, setSchema] = useState(null);
  const [options, setOptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const loadOptions = useCallback(async () => {
    try {
      const data = await api('/options');
      setOptions(data.options || {});
    } catch { /* se mostrará en cada formulario si hace falta */ }
  }, []);

  const bootstrap = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setPermissions([]);
      setLoading(false);
      return;
    }
    try {
      const [me, sch] = await Promise.all([api('/auth/me'), api('/schema')]);
      setUser(me.user);
      setPermissions(me.permissions || []);
      setSchema(sch);
      await loadOptions();
    } catch (e) {
      setUser(null);
      setPermissions([]);
      setAuthError(e.message);
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [loadOptions]);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  const applySession = async (data) => {
    saveSession(data);
    setUser(data.user);
    setPermissions(data.permissions || []);
    const sch = await api('/schema');
    setSchema(sch);
    await loadOptions();
    return data.user;
  };

  const login = async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    return applySession(data);
  };

  const signup = async (email, password, fullName) =>
    api('/auth/signup', { method: 'POST', body: { email, password, fullName } });

  const logout = async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* cerrar local igualmente */ }
    clearSession();
    setUser(null);
    setPermissions([]);
    setSchema(null);
    setOptions({});
  };

  // useCallback: identidad estable. Si no, los efectos que dependen de [can]
  // entran en bucle infinito de peticiones.
  const can = useCallback(
    (perm) => permissions.includes('*') || permissions.includes(perm),
    [permissions]
  );

  return (
    <AuthContext.Provider value={{
      user, permissions, loading, schema, options, authError,
      login, signup, logout, can, applySession, reloadOptions: loadOptions,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
