import { CATALOG, ENTITIES, publicSchema, ALL_PERMISSIONS } from '../services/catalog.js';
import * as crud from '../services/crud.js';
import { getAllOptions } from '../services/options.js';
import { ROLE_LABELS } from '../middleware/auth.js';

function deny(res, perm) {
  return res.status(403).json({ error: `No tienes permisos para esta acción (${perm || 'lectura'}).` });
}

function entityOf(req) {
  const name = String(req.params.entity || '');
  return CATALOG[name] || null;
}

/** GET /api/schema — catálogo completo para construir la UI desde la BD real. */
export async function getSchema(req, res) {
  return res.json({
    entities: ENTITIES.map(publicSchema),
    permissions: req.perms,
    role: req.user.role,
    roleLabel: ROLE_LABELS[req.user.role] || req.user.role,
    allPermissions: ALL_PERMISSIONS,
  });
}

/** GET /api/options — opciones reales para los selects de FK. */
export async function getOptions(_req, res) {
  return res.json({ options: await getAllOptions() });
}

/** GET /api/resources/:entity/schema */
export async function getEntitySchema(req, res) {
  const schema = publicSchema(req.params.entity);
  if (!schema) return res.status(404).json({ error: 'Entidad no encontrada.' });
  const def = entityOf(req);
  if (def?.view && !req.perms.includes(def.view)) return deny(res, def.view);
  return res.json(schema);
}

/** GET /api/resources/:entity */
export async function list(req, res) {
  const def = entityOf(req);
  if (!def) return res.status(404).json({ error: 'Entidad no encontrada.' });
  if (def.view && !req.perms.includes(def.view)) return deny(res, def.view);
  const data = await crud.list(req.params.entity, {
    q: req.query.q || '',
    page: req.query.page || 1,
    pageSize: req.query.pageSize || 25,
    filters: req.query,
    all: req.query.all === 'true',
  });
  return res.json(data);
}

/** GET /api/resources/:entity/:id/detail */
export async function detail(req, res) {
  const def = entityOf(req);
  if (!def) return res.status(404).json({ error: 'Entidad no encontrada.' });
  if (def.view && !req.perms.includes(def.view)) return deny(res, def.view);
  return res.json(await crud.detail(req.params.entity, req.params.id));
}

/** GET /api/resources/:entity/:id */
export async function get(req, res) {
  const def = entityOf(req);
  if (!def) return res.status(404).json({ error: 'Entidad no encontrada.' });
  if (def.view && !req.perms.includes(def.view)) return deny(res, def.view);
  const row = await crud.get(req.params.entity, req.params.id);
  if (!row) return res.status(404).json({ error: 'Registro no encontrado.' });
  return res.json({ item: row });
}

/** POST /api/resources/:entity */
export async function create(req, res) {
  const def = entityOf(req);
  if (!def) return res.status(404).json({ error: 'Entidad no encontrada.' });
  if (!def.manage || !req.perms.includes(def.manage)) return deny(res, def.manage);
  const row = await crud.create(req.params.entity, req.body, req.user);
  return res.status(201).json({ item: row });
}

/** PUT /api/resources/:entity/:id */
export async function update(req, res) {
  const def = entityOf(req);
  if (!def) return res.status(404).json({ error: 'Entidad no encontrada.' });
  if (!def.manage || !req.perms.includes(def.manage)) return deny(res, def.manage);
  const row = await crud.update(req.params.entity, req.params.id, req.body, req.user);
  return res.json({ item: row });
}

/** DELETE /api/resources/:entity/:id */
export async function remove(req, res) {
  const def = entityOf(req);
  if (!def) return res.status(404).json({ error: 'Entidad no encontrada.' });
  if (!def.manage || !req.perms.includes(def.manage)) return deny(res, def.manage);
  return res.json(await crud.remove(req.params.entity, req.params.id));
}
