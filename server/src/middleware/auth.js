import { queryOne } from '../db.js';
import { getAuthUser } from '../services/supabaseAuth.js';
import { config } from '../config.js';

/**
 * Roles que YA EXISTEN en public.perfiles (CHECK constraint):
 *   administrador, direccion, comercial, desarrollo, finanzas, soporte
 * No se crean roles nuevos. Ver SUPABASE_SCHEMA_MAP.md §1.2 y §7.
 *
 * REGLA CRÍTICA: desarrollo, comercial y soporte NO tienen acceso a
 * información financiera privada (payments, expenses, invoices, gerencia).
 */
export const PERMISSIONS = {
  administrador: ['*'],
  gerencia: ['*'],
  empleado: ['dashboard.view', 'clients.view', 'projects.view', 'work.view', 'work.manage'],
  direccion: [
    'dashboard.view', 'clients.view', 'clients.manage',
    'projects.view', 'projects.manage',
    'accounting.view', 'accounting.manage',
    'marketing.view', 'marketing.manage',
    'ops.view', 'ops.manage',
    'management.view', 'management.manage',
    'settings.view',
  ],
  finanzas: [
    'dashboard.view', 'clients.view', 'projects.view',
    'accounting.view', 'accounting.manage',
    'management.view',
    'settings.view',
  ],
  desarrollo: [
    'dashboard.view', 'clients.view', 'projects.view', 'projects.manage',
    'ops.view', 'ops.manage',
    'settings.view',
  ],
  comercial: [
    'dashboard.view', 'clients.view', 'clients.manage',
    'projects.view', 'marketing.view', 'marketing.manage',
    'settings.view',
  ],
  soporte: [
    'dashboard.view', 'clients.view', 'projects.view',
    'ops.view', 'ops.manage',
    'settings.view',
  ],
};

export const ROLE_LABELS = {
  administrador: 'Administrador',
  direccion: 'Gerencia',
  finanzas: 'Contabilidad',
  desarrollo: 'Desarrollo',
  comercial: 'Marketing',
  soporte: 'Soporte',
};

export const ROLES = Object.keys(PERMISSIONS);

export function can(role, perm) {
  const list = PERMISSIONS[role] || [];
  return list.includes('*') || list.includes(perm);
}

export function hasPermission(perms, required) {
  return Array.isArray(perms) && (perms.includes('*') || perms.includes(required));
}

export function permissionsFor(role) {
  const list = PERMISSIONS[role] || [];
  if (list.includes('*')) return ROLES.length ? ALL_PERMISSIONS.slice() : [];
  return list.slice();
}

export const ALL_PERMISSIONS = [
  'dashboard.view', 'clients.view', 'clients.manage',
  'projects.view', 'projects.manage',
  'accounting.view', 'accounting.manage',
  'marketing.view', 'marketing.manage',
  'ops.view', 'ops.manage',
  'management.view', 'management.manage',
  'users.manage', 'settings.view', 'settings.manage',
];

// Caché breve de validación de token para no golpear GoTrue en cada request.
const cache = new Map();
const TTL = 60_000;

/**
 * Modo de integración: SOLO con NODE_ENV=test y TEST_API_TOKEN definido.
 * Permite ejecutar pruebas CRUD contra la BD real sin inventar credenciales
 * de usuario. Queda totalmente desactivado en desarrollo/producción.
 */
const testEnabled = config.nodeEnv === 'test' && !!process.env.TEST_API_TOKEN;

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) {
      const e = new Error('No autenticado. Inicia sesión.');
      e.status = 401;
      throw e;
    }

    if (testEnabled && token === process.env.TEST_API_TOKEN) {
      // id = null: no existe un perfil real, así que no se escriben columnas
      // de auditoría con FK a profiles (evita violaciones de FK en las pruebas).
      req.user = {
        id: null,
        email: 'test@pixele.local',
        full_name: 'Prueba de integración',
        role: 'administrador',
        is_active: true,
      };
      req.perms = ALL_PERMISSIONS.slice();
      return next();
    }

    const hit = cache.get(token);
    let authUser = hit && Date.now() - hit.at < TTL ? hit.user : null;
    if (!authUser) {
      authUser = await getAuthUser(token);
      if (!authUser) {
        cache.delete(token);
        const e = new Error('Sesión inválida o expirada. Inicia sesión de nuevo.');
        e.status = 401;
        throw e;
      }
      cache.set(token, { user: authUser, at: Date.now() });
    }

    const profile = await queryOne(
      'select id, full_name, email, phone, role, is_active, fecha_creacion as created_at, fecha_actualizacion as updated_at from public.perfiles where id = $1',
      [authUser.id]
    );
    if (!profile) {
      const e = new Error(
        'Tu usuario de Supabase Auth no tiene perfil en public.perfiles. Ejecuta pnpm db:seed o pide a un administrador que lo cree.'
      );
      e.status = 403;
      throw e;
    }
    if (!profile.is_active) {
      const e = new Error('Tu cuenta está desactivada. Contacta al administrador.');
      e.status = 403;
      throw e;
    }

    req.user = {
      id: profile.id,
      email: profile.email || authUser.email,
      full_name: profile.full_name,
      phone: profile.phone,
      role: profile.role,
      is_active: profile.is_active,
      authEmail: authUser.email,
    };
    req.perms = permissionsFor(profile.role);
    req.accessToken = token;
    return next();
  } catch (e) {
    return next(e);
  }
}

export function requirePermission(perm) {
  return (req, _res, next) => {
    if (!req.user) {
      const e = new Error('No autenticado.');
      e.status = 401;
      return next(e);
    }
    if (!req.perms.includes(perm)) {
      const e = new Error('No tienes permisos para esta acción.');
      e.status = 403;
      return next(e);
    }
    return next();
  };
}

export function clearAuthCache() {
  cache.clear();
}
