import { mapDbError } from '../db.js';

/** Envuelve controladores async para propagar errores a errorMiddleware. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function errorMiddleware(err, req, res, _next) {
  const mapped = mapDbError(err);
  const status = mapped.status || 500;
  if (status >= 500) {
    // Keep logs free of query text, submitted bodies, tokens and upstream errors.
    const code = typeof err.code === 'string' && /^[A-Z0-9_]+$/.test(err.code) ? err.code : 'UNCLASSIFIED';
    const kind = typeof err.name === 'string' && /^[A-Za-z]+$/.test(err.name) ? err.name : 'Error';
    console.error('[server] internal error', { method: req.method, path: req.route?.path || req.path, status, kind, code });
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
  const body = { error: mapped.message || 'Solicitud no válida.' };
  if (mapped.details?.length) body.details = mapped.details;
  return res.status(status).json(body);
}

export function notFound(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada.' });
}
