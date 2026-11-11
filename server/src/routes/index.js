import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as auth from '../controllers/authController.js';
import * as res from '../controllers/resourceController.js';
import * as an from '../controllers/analyticsController.js';

/** Envuelve handlers async para que los errores lleguen al middleware de errores. */
function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function buildRoutes() {
  const api = Router();

  // ── Público (sin sesión) ──────────────────────────────────────────────────
  const authPublic = Router();
  authPublic.post('/login', wrap(auth.login));
  authPublic.post('/signup', wrap(auth.signup));
  authPublic.post('/refresh', wrap(auth.refresh));
  api.use('/auth', authPublic);

  // ── Todo lo demás requiere sesión de Supabase Auth ─────────────────────────
  api.use(requireAuth);

  const authPrivate = Router();
  authPrivate.get('/me', wrap(auth.me));
  authPrivate.post('/logout', wrap(auth.logout));
  api.use('/auth', authPrivate);

  // Catálogo del esquema real y opciones de FK (para formularios dinámicos)
  api.get('/schema', wrap(res.getSchema));
  api.get('/options', wrap(res.getOptions));

  // CRUD genérico sobre las 37 entidades del esquema real
  const resources = Router();
  resources.get('/:entity/schema', wrap(res.getEntitySchema));
  resources.get('/:entity/:id/detail', wrap(res.detail));
  resources.get('/:entity/:id', wrap(res.get));
  resources.get('/:entity', wrap(res.list));
  resources.post('/:entity', wrap(res.create));
  resources.put('/:entity/:id', wrap(res.update));
  resources.delete('/:entity/:id', wrap(res.remove));
  api.use('/resources', resources);

  // Vistas consolidadas (cálculos en backend)
  api.get('/dashboard', wrap(an.dashboard));
  api.get('/accounting/overview', wrap(an.accounting));
  api.get('/management/overview', wrap(an.management));
  api.get('/marketing/overview', wrap(an.marketing));
  api.get('/financials/client/:id', wrap(an.clientFinancials));
  api.get('/financials/project/:id', wrap(an.projectFinancials));
  api.post('/management/distributions/preview', wrap(an.previewDistribution));
  api.post('/accounting/document-totals', wrap(an.documentTotals));

  return api;
}
