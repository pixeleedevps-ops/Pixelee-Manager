import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  api, getToken, saveSession, clearSession,
} from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [schema, setSchema] = useState(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [options, setOptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const optionsCache = useRef({});
  const optionsRequest = useRef(null);
  const bootstrapStarted = useRef(false);

  const loadOptions = useCallback(async (keys = [], force = false) => {
    const requested = [...new Set(keys)];
    if (force) requested.forEach((key) => { delete optionsCache.current[key]; });
    const missing = requested.filter((key) => !Object.hasOwn(optionsCache.current, key));
    if (!missing.length) return optionsCache.current;
    if (optionsRequest.current) await optionsRequest.current;
    const stillMissing = missing.filter((key) => !Object.hasOwn(optionsCache.current, key));
    if (!stillMissing.length) return optionsCache.current;
    try {
      optionsRequest.current = api('/options', { params: { keys: stillMissing.join(',') } });
      const data = await optionsRequest.current;
      optionsCache.current = { ...optionsCache.current, ...(data.options || {}) };
      setOptions(optionsCache.current);
    } catch { /* el formulario mostrará sus errores de carga */ }
    finally { optionsRequest.current = null; }
    return optionsCache.current;
  }, []);

  const loadSchema = useCallback(async () => {
    setSchemaLoading(true);
    try { setSchema(await api('/schema')); }
    catch { setSchema(null); }
    finally { setSchemaLoading(false); }
  }, []);

  const bootstrap = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setPermissions([]);
      setLoading(false);
      return;
    }
    try {
      const me = await api('/auth/me');
      setUser(me.user);
      setPermissions(me.permissions || []);
      loadSchema();
    } catch (e) {
      setUser(null);
      setPermissions([]);
      setAuthError(e.message);
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [loadSchema]);

  useEffect(() => {
    if (bootstrapStarted.current) return;
    bootstrapStarted.current = true;
    bootstrap();
  }, [bootstrap]);

  const applySession = async (data) => {
    saveSession(data);
    setUser(data.user);
    setPermissions(data.permissions || []);
    loadSchema();
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
    optionsCache.current = {};
  };

  // useCallback: identidad estable. Si no, los efectos que dependen de [can]
  // entran en bucle infinito de peticiones.
  const can = useCallback(
    (perm) => permissions.includes('*') || permissions.includes(perm),
    [permissions]
  );

  return (
    <AuthContext.Provider value={{
      user, permissions, loading, schema, schemaLoading, options, authError,
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
