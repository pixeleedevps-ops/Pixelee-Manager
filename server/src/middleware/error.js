import { mapDbError } from '../db.js';

/** Envuelve controladores async para propagar errores a errorMiddleware. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function errorMiddleware(err, req, res, _next) {
  const mapped = mapDbError(err);
  const status = mapped.status || 500;
  if (status >= 500) console.error('[server]', err);
  const body = { error: mapped.message || 'Error interno del servidor.' };
  if (mapped.details?.length) body.details = mapped.details;
  return res.status(status).json(body);
}

export function notFound(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada.' });
}
