/**
 * Alta del usuario administrador inicial.
 *
 * NO inventa credenciales: lee ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME
 * desde server/.env. Si no están definidos, explica cómo crear el usuario
 * desde el dashboard de Supabase (Authentication → Add user → Auto Confirm).
 *
 * Uso: pnpm db:seed
 */
import 'dotenv/config';
import pg from 'pg';
import { config } from '../src/config.js';
import { createConfirmedUser, signInWithPassword, getAuthUser } from '../src/services/supabaseAuth.js';

const { Pool } = pg;
const pool = config.databaseUrl
  ? new Pool({ connectionString: config.databaseUrl, ssl: config.pgSsl })
  : null;

async function main() {
  if (!pool) {
    console.error('ERROR: falta DATABASE_URL en server/.env.');
    process.exit(1);
  }

  const { adminEmail, adminPassword, adminName } = config;
  if (!adminEmail || !adminPassword) {
    console.log('No hay ADMIN_EMAIL / ADMIN_PASSWORD en server/.env.\n');
    console.log('OPCIÓN RECOMENDADA (sin claves adicionales):');
    console.log('  1. Supabase Dashboard → Authentication → Users → Add user → Create new user');
    console.log('  2. Marca "Auto Confirm" y elige correo + contraseña');
    console.log('  3. Inicia sesión en http://localhost:5173 con esas credenciales.');
    console.log('     El backend creará el perfil como administrador automáticamente.\n');
    console.log('Alternativa: define SUPABASE_SERVICE_ROLE_KEY + ADMIN_EMAIL + ADMIN_PASSWORD');
    console.log('en server/.env y vuelve a ejecutar pnpm db:seed.\n');
    await pool.end();
    return;
  }

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let authId;

  if (key) {
    const user = await createConfirmedUser({
      email: adminEmail, password: adminPassword, fullName: adminName || 'Administrador',
    });
    authId = user.id;
    console.log(`Usuario de Supabase Auth creado (confirmado): ${adminEmail}`);
  } else {
    // Sin service role: intentamos login con un usuario ya existente en Auth.
    try {
      const session = await signInWithPassword(adminEmail, adminPassword);
      authId = session.user?.id || (await getAuthUser(session.access_token))?.id;
      console.log(`Usuario de Supabase Auth existente: ${adminEmail}`);
    } catch (e) {
      console.error('No se pudo crear ni localizar el usuario en Supabase Auth.');
      console.error('Detalle:', e.message);
      console.error('Crea el usuario desde el dashboard de Supabase o define SUPABASE_SERVICE_ROLE_KEY.');
      await pool.end();
      process.exit(1);
    }
  }

  if (!authId) {
    console.error('No se obtuvo el id del usuario de Auth.');
    await pool.end();
    process.exit(1);
  }

  const count = await pool.query('select count(*)::int c from public.profiles');
  const first = count.rows[0].c === 0;
  const role = first ? 'administrador' : 'soporte';
  await pool.query(
    `insert into public.profiles (id, full_name, email, role, is_active)
     values ($1,$2,$3,$4,$5)
     on conflict (id) do update set
       full_name = excluded.full_name,
       email = excluded.email,
       is_active = true`,
    [authId, adminName || 'Administrador', adminEmail, role, true]
  );
  console.log(`Perfil listo: rol=${role}, activo=true`);
  console.log('\nAhora inicia sesión en http://localhost:5173');
  await pool.end();
}

main().catch(async (e) => {
  console.error('ERROR:', e.message);
  if (pool) await pool.end().catch(() => {});
  process.exit(1);
});
