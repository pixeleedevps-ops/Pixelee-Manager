/**
 * Integración con Supabase Auth (GoTrue) mediante su REST API.
 *
 * Solo se usa la PUBLISHABLE KEY para operaciones de usuario final.
 * `createConfirmedUser` usa la SERVICE_ROLE_KEY exclusivamente en el backend
 * y solo la emplea el script `pnpm db:seed`. Nunca se envía al frontend.
 */
import { config } from '../config.js';

const base = () => `${config.supabaseUrl}/auth/v1`;

function headers(extra = {}) {
  if (!config.supabaseUrl || !config.supabaseKey) {
    const e = new Error('Supabase Auth no configurado (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY).');
    e.status = 503;
    throw e;
  }
  return {
    apikey: config.supabaseKey,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function call(path, { method = 'GET', body, token, service = false } = {}) {
  const h = headers(token ? { Authorization: `Bearer ${token}` } : {});
  if (service) {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
      const e = new Error(
        'Se requiere SUPABASE_SERVICE_ROLE_KEY en el backend para esta operación (o desactivar "Confirm email" en Supabase).'
      );
      e.status = 503;
      throw e;
    }
    h.apikey = key;
    h.Authorization = `Bearer ${key}`;
  }
  const res = await fetch(`${base()}${path}`, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
}

/** Configuración pública de Auth (para detectar si el alta está habilitada). */
export async function authSettings() {
  const r = await call('/settings');
  return r.data || {};
}

/** Inicio de sesión con email/password. Devuelve la sesión de Supabase. */
export async function signInWithPassword(email, password) {
  const r = await call('/token?grant_type=password', {
    method: 'POST',
    body: { email, password },
  });
  if (!r.ok) {
    const msg = r.data?.error_description || r.data?.msg || r.data?.message || 'Credenciales inválidas.';
    const e = new Error(msg);
    e.status = r.status === 400 || r.status === 401 ? 401 : r.status;
    throw e;
  }
  return r.data; // { access_token, refresh_token, expires_in, user, ... }
}

/** Alta de usuario. Si mailer_autoconfirm=false, no habrá sesión hasta confirmar el correo. */
export async function signUp(email, password, fullName) {
  const r = await call('/signup', {
    method: 'POST',
    body: { email, password, data: { full_name: fullName } },
  });
  if (!r.ok) {
    const msg = r.data?.error_description || r.data?.msg || r.data?.message || 'No se pudo crear el usuario.';
    const e = new Error(msg);
    e.status = r.status;
    throw e;
  }
  return r.data;
}

/** Renueva la sesión con el refresh_token de Supabase. */
export async function refreshSession(refreshToken) {
  const r = await call('/token?grant_type=refresh_token', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  });
  if (!r.ok) {
    const e = new Error('Sesión expirada. Inicia sesión de nuevo.');
    e.status = 401;
    throw e;
  }
  return r.data;
}

/**
 * Valida un access_token y devuelve el usuario de Auth.
 * Es la forma de verificar el JWT sin exponer el JWT secret en la aplicación.
 */
export async function getAuthUser(accessToken) {
  const r = await call('/user', { token: accessToken });
  if (!r.ok) return null;
  return r.data;
}

/**
 * Crea un usuario YA CONFIRMADO (solo scripts de administración).
 * Requiere SUPABASE_SERVICE_ROLE_KEY; no se usa en el runtime de la API.
 */
export async function createConfirmedUser({ email, password, fullName }) {
  const r = await call('/admin/users', {
    method: 'POST',
    service: true,
    body: {
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    },
  });
  if (!r.ok) {
    const msg = r.data?.error_description || r.data?.msg || r.data?.message || 'No se pudo crear el usuario.';
    const e = new Error(msg);
    e.status = r.status;
    throw e;
  }
  return r.data;
}

/** Cierra la sesión del lado de Supabase (revoca el refresh token). */
export async function signOut(accessToken) {
  await call('/logout', { method: 'POST', token: accessToken });
}
