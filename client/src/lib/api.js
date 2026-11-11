const TOKEN_KEY = 'pm_token';
const REFRESH_KEY = 'pm_refresh';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);
export const setRefreshToken = (t) => t ? localStorage.setItem(REFRESH_KEY, t) : localStorage.removeItem(REFRESH_KEY);
export const clearSession = () => { clearToken(); setRefreshToken(null); };

export function saveSession({ token, refreshToken }) {
  if (token) setToken(token);
  if (refreshToken) setRefreshToken(refreshToken);
}

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function tryRefresh() {
  const rt = getRefreshToken();
  if (!rt) return false;
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    saveSession(data);
    return !!data.token;
  } catch {
    return false;
  }
}

/** Petición JSON centralizada: token, refresh automático y manejo de errores. */
export async function api(path, { method = 'GET', body, params, retry = true } = {}) {
  let url = `/api${path}`;
  if (params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    }
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method, headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await tryRefresh()) return api(path, { method, body, params, retry: false });
    clearSession();
    if (!path.startsWith('/auth/login')) window.location.href = '/login';
  }

  let data = null;
  try { data = await res.json(); } catch { data = null; }

  if (!res.ok) {
    let message = data?.error;
    if (!message) {
      if (res.status >= 500) message = 'Error del servidor. Verifica que el API esté corriendo y la base de datos configurada.';
      else if (res.status === 404) message = 'Recurso no encontrado.';
      else if (res.status === 403) message = 'No tienes permisos para esta acción.';
      else if (res.status === 401) message = 'Sesión expirada. Inicia sesión de nuevo.';
      else message = `Error inesperado (${res.status}).`;
    }
    throw new ApiError(message, res.status, data?.details);
  }
  return data;
}

export const get = (path, params) => api(path, { params });
export const post = (path, body) => api(path, { method: 'POST', body });
export const put = (path, body) => api(path, { method: 'PUT', body });
export const del = (path) => api(path, { method: 'DELETE' });
