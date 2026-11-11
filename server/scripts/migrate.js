// Ejecuta los archivos SQL de supabase/migrations en orden.
// Uso: pnpm db:migrate
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import 'dotenv/config';
import { config } from '../src/config.js';

const { Pool } = pg;
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const migrationsDir = path.join(rootDir, 'supabase', 'migrations');

if (!config.databaseUrl) {
  console.error('ERROR: DATABASE_URL no está definido. Copia server/.env.example a server/.env y completa la cadena de conexión de Supabase.');
  process.exit(1);
}

const pool = new Pool({ connectionString: config.databaseUrl, ssl: config.pgSsl });

async function main() {
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();
  await pool.query(`create table if not exists schema_migrations (
    filename text primary key, applied_at timestamptz not null default now()
  )`);

  for (const file of files) {
    const done = await pool.query('select 1 from schema_migrations where filename = $1', [file]);
    if (done.rowCount > 0) {
      console.log(`= Omitida (ya aplicada): ${file}`);
      continue;
    }
    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    console.log(`> Aplicando: ${file}`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('insert into schema_migrations (filename) values ($1)', [file]);
      await client.query('COMMIT');
      console.log(`  OK`);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(`  ERROR en ${file}:`, e.message);
      throw e;
    } finally {
      client.release();
    }
  }
  console.log('Migraciones completadas.');
}

main()
  .then(() => pool.end())
  .catch(async (e) => {
    await pool.end().catch(() => {});
    process.exit(1);
  });
