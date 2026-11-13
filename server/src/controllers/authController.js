import { query, queryOne } from '../db.js';
import { config } from '../config.js';
import {
  signInWithPassword, signUp, refreshSession, getAuthUser, signOut,
} from '../services/supabaseAuth.js';
import { permissionsFor, ROLE_LABELS, clearAuthCache } from '../middleware/auth.js';
import { findAuthUserByEmail, createLocalAuthUser } from '../services/authAdmin.js';

/**
 * Garantiza que un usuario de Supabase Auth tenga su perfil en public.perfiles.
 * - PRIMER perfil del sistema => administrador activo.
 * - Siguientes => rol `soporte` e INACTIVO hasta que un administrador lo active.
 *
 * Importante: `profiles.role` tiene un CHECK que NO incluye el default
 * 'colaborador', por lo que SIEMPRE se envía un rol explícito válido.
 */
export async function ensureProfile(authUser) {
  const existing = await queryOne(`select id, full_name, email, phone, role, is_active,
      fecha_creacion as created_at, fecha_actualizacion as updated_at
    from public.perfiles where id = $1`, [authUser.id]);
  if (existing) return existing;
  const count = await queryOne('select count(*)::int c from public.perfiles');
  const first = count.c === 0;
  const role = first ? 'administrador' : 'soporte';
  const isActive = first;
  const name = authUser.user_metadata?.full_name
    || authUser.user_metadata?.name
    || (authUser.email || 'Usuario').split('@')[0];
  return queryOne(
    `insert into public.perfiles (id, full_name, email, role, is_active)
     values ($1, $2, $3, $4, $5)
     on conflict (id) do update set email = excluded.email
     returning id, full_name, email, phone, role, is_active,
       fecha_creacion as created_at, fecha_actualizacion as updated_at`,
    [authUser.id, name, authUser.email || null, role, isActive]
  );
}

function publicUser(profile, authEmail) {
  return {
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email || authEmail,
    phone: profile.phone,
    role: profile.role,
    roleLabel: ROLE_LABELS[profile.role] || profile.role,
    is_active: profile.is_active,
  };
}

/** POST /api/auth/login */
export async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
  }
  const session = await signInWithPassword(String(email).trim(), String(password));
  const authUser = session.user || await getAuthUser(session.access_token);
  if (!authUser) return res.status(401).json({ error: 'No se pudo obtener el usuario de Supabase Auth.' });

  let profile = await ensureProfile(authUser);
  if (!profile.is_active) {
    return res.status(403).json({
      error: 'Tu cuenta está pendiente de activación. Pide a un administrador que la active en Configuración → Usuarios.',
    });
  }
  return res.json({
    token: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in,
    user: publicUser(profile, authUser.email),
    permissions: permissionsFor(profile.role),
  });
}

/**
 * POST /api/auth/signup
 *
 * FASE 1 local (AUTO_CONFIRM_SIGNUP=true): crea el usuario de Supabase Auth
 * ya confirmado sin enviar correo, evitando el límite de envío de GoTrue.
 * Con AUTO_CONFIRM_SIGNUP=false se usa el signup estándar con verificación
 * por correo de Supabase.
 */
export async function signup(req, res) {
  if (!config.allowSignup) {
    return res.status(403).json({ error: 'El auto-registro está desactivado (ALLOW_SIGNUP=false).' });
  }
  const { email, password, fullName } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
  if (String(password).length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });

  const cleanEmail = String(email).trim();
  const name = String(fullName || '').trim();
  let authUser = null;

  if (config.autoConfirmSignup) {
    authUser = await createLocalAuthUser({ email: cleanEmail, password: String(password), fullName: name });
  } else {
    const data = await signUp(cleanEmail, String(password), name);
    const found = data.user?.id ? null : await findAuthUserByEmail(cleanEmail);
    authUser = data.user?.id
      ? data.user
      : (found ? { id: found.id, email: found.email, user_metadata: { full_name: name } } : null);
    if (!authUser?.id) {
      return res.status(201).json({
        requiresConfirmation: true,
        message: 'Cuenta creada. Revisa tu correo para confirmarla antes de iniciar sesión.',
      });
    }
  }

  if (!authUser?.id) {
    return res.status(201).json({
      requiresConfirmation: true,
      message: 'Cuenta creada. Revisa tu correo para confirmarla antes de iniciar sesión.',
    });
  }

  await ensureProfile(authUser);

  if (!config.autoConfirmSignup) {
    return res.status(201).json({
      requiresConfirmation: true,
      message: 'Cuenta creada. Confirma tu correo y luego inicia sesión.',
    });
  }

  // Usuario ya confirmado: abrimos sesión inmediatamente con Supabase Auth.
  const session = await signInWithPassword(cleanEmail, String(password));
  const profile = await ensureProfile(session.user || authUser);
  if (!profile.is_active) {
    return res.status(403).json({
      error: 'Tu cuenta fue creada pero está pendiente de activación por un administrador.',
    });
  }
  return res.status(201).json({
    requiresConfirmation: false,
    token: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in,
    user: publicUser(profile, authUser.email),
    permissions: permissionsFor(profile.role),
  });
}

/** POST /api/auth/refresh */
export async function refresh(req, res) {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: 'Falta el refresh token.' });
  const session = await refreshSession(String(refreshToken));
  return res.json({
    token: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in,
  });
}

/** GET /api/auth/me */
export async function me(req, res) {
  return res.json({
    user: publicUser(req.user, req.user.authEmail),
    permissions: req.perms,
  });
}

/** POST /api/auth/logout */
export async function logout(req, res) {
  try {
    if (req.accessToken) await signOut(req.accessToken);
  } catch { /* la sesión local se cierra igualmente */ }
  clearAuthCache();
  return res.json({ ok: true });
}
