import { query, queryOne, withTransaction } from '../db.js';

/**
 * Utilidades de administración de Supabase Auth para FASE 1 local.
 *
 * NO modifica la estructura de la base de datos: solo escribe DATOS en
 * auth.users / auth.identities, exactamente lo que haría el Admin API con
 * «Auto Confirm». RLS, tablas de negocio, columnas y triggers quedan intactos.
 */

/** Busca un usuario de Auth por correo (GoTrue no siempre devuelve `user` en el signup). */
export async function findAuthUserByEmail(email) {
  return queryOne(
    `select id::text as id, email, email_confirmed_at from auth.users
      where lower(email) = lower($1) order by created_at desc limit 1`,
    [email]
  );
}

/** Confirma el correo de un usuario creado por el signup estándar de GoTrue. */
export async function confirmEmail(authUserId) {
  if (!authUserId) return false;
  // `confirmed_at` es columna GENERADA (LEAST(email_confirmed_at, phone_confirmed_at)):
  // no se puede escribir. Basta con `email_confirmed_at`.
  const rows = await query(
    `update auth.users
        set email_confirmed_at = coalesce(email_confirmed_at, now()),
            updated_at = now()
      where id = $1
      returning id`,
    [authUserId]
  );
  return rows.length > 0;
}

/**
 * Crea un usuario de Auth YA CONFIRMADO sin enviar correo.
 * Evita el límite de envío de GoTrue (`over_email_send_rate_limit`) y no
 * requiere SUPABASE_SERVICE_ROLE_KEY ni SMTP.
 *
 * Nota importante: GoTrue espera varias columnas de texto como cadenas vacías
 * `''`, no NULL. Si quedan NULL, el login devuelve «Database error querying
 * schema». Por eso se rellenan explícitamente.
 */
export async function createLocalAuthUser({ email, password, fullName }) {
  const existing = await findAuthUserByEmail(email);
  if (existing) {
    const e = new Error('Ya existe un usuario con ese correo. Inicia sesión.');
    e.status = 409;
    throw e;
  }

  return withTransaction(async (client) => {
    const meta = JSON.stringify({
      email, full_name: fullName || 'Usuario',
      email_verified: true, phone_verified: false,
    });
    const token = Buffer.from(`${email}:${Date.now()}`).toString('hex').slice(0, 60);

    const r = await client.query(
      `insert into auth.users (
         instance_id, id, aud, role, email, encrypted_password,
         email_confirmed_at, confirmation_token, confirmation_sent_at,
         recovery_token, email_change, email_change_token_new,
         email_change_token_current, email_change_confirm_status,
         phone_change, phone_change_token, reauthentication_token,
         raw_app_meta_data, raw_user_meta_data,
         created_at, updated_at, is_sso_user, is_anonymous
       ) values (
         '00000000-0000-0000-0000-000000000000'::uuid,
         gen_random_uuid(), 'authenticated', 'authenticated', $1::varchar,
         extensions.crypt($2::text, extensions.gen_salt('bf', 10)),
         now(), $3::varchar, now(),
         '', '', '',
         '', 0,
         '', '', '',
         '{"provider":"email","providers":["email"]}'::jsonb,
         $4::jsonb,
         now(), now(), false, false
       )
       returning id::text as id, email`,
      [email, password, token, JSON.stringify({ ...JSON.parse(meta), sub: 'pending' })]
    );
    const user = r.rows[0];

    // `sub` debe ser el id real del usuario (como lo genera GoTrue).
    await client.query(
      `update auth.users
          set raw_user_meta_data = raw_user_meta_data || jsonb_build_object('sub', $1::text)
        where id = $2::uuid`,
      [user.id, user.id]
    );

    // auth.identities.email es columna GENERADA (lower(identity_data->>'email')):
    // no se inserta.
    await client.query(
      `insert into auth.identities (
         id, provider_id, user_id, identity_data, provider,
         last_sign_in_at, created_at, updated_at
       ) values (
         gen_random_uuid(), $1::text, $1::uuid, $2::jsonb, 'email',
         now(), now(), now()
       )`,
      [user.id, JSON.stringify({
        sub: user.id, email,
        full_name: fullName || 'Usuario',
        email_verified: true, phone_verified: false,
      })]
    );

    return { id: user.id, email: user.email, user_metadata: { full_name: fullName } };
  });
}

/** Elimina una cuenta (solo scripts de verificación/limpieza). */
export async function deleteAuthUser(authUserId) {
  const r = await query(`delete from auth.users where id = $1::uuid returning id`, [authUserId]);
  return r.length > 0;
}
