import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const pool = config.databaseUrl
  ? new Pool({ connectionString: config.databaseUrl, max: 10, ssl: config.pgSsl })
  : null;

function noDb() {
  const err = new Error(
    'DATABASE_URL no configurado. Configura la cadena del Session pooler de Supabase en server/.env.'
  );
  err.status = 503;
  return err;
}

/** Ejecuta una consulta y devuelve las filas. */
export async function query(text, params) {
  if (!pool) throw noDb();
  const res = await pool.query(text, params);
  return res.rows;
}

/** Ejecuta una consulta y devuelve una sola fila (o null). */
export async function queryOne(text, params) {
  const rows = await query(text, params);
  return rows[0] ?? null;
}

/** Ejecuta fn dentro de una transacción. */
export async function withTransaction(fn) {
  if (!pool) throw noDb();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** Traduce errores de restricciones de Postgres a mensajes de negocio. */
export function mapDbError(e) {
  if (e.code === '23505') {
    const err = new Error('Ya existe un registro con ese valor único (código, número o referencia duplicado).');
    err.status = 409;
    return err;
  }
  if (e.code === '23503') {
    const err = new Error('Violación de relación: el registro referenciado no existe o está en uso (no se puede eliminar).');
    err.status = 409;
    return err;
  }
  if (e.code === '23514') {
    const err = new Error('Valor fuera de los límites permitidos por la base de datos. Revisa estados, importes y fechas.');
    err.status = 400;
    return err;
  }
  if (e.code === '23502') {
    const err = new Error(`Falta un campo obligatorio (${e.column || 'sin especificar'}).`);
    err.status = 400;
    return err;
  }
  return e;
}
