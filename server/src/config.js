import 'dotenv/config';

function int(v, d) {
  const n = parseInt(v ?? '', 10);
  return Number.isFinite(n) ? n : d;
}

const databaseUrl = process.env.DATABASE_URL || '';
const isSupabase = /supabase\.(co|com|net)|pooler\.supabase\.com/i.test(databaseUrl);

export const config = {
  port: int(process.env.PORT, 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Conexión directa a Postgres de Supabase (session pooler IPv4).
  // El rol postgres tiene rolbypassrls=true: RLS se conserva intacto.
  databaseUrl,
  // Supabase requiere TLS en el pooler. Nunca se usa en el frontend.
  pgSsl: isSupabase ? { rejectUnauthorized: false } : undefined,

  // Supabase Auth (GoTrue). Solo la publishable key; NUNCA la service_role key.
  supabaseUrl: (process.env.SUPABASE_URL || '').replace(/\/$/, ''),
  supabaseKey: process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '',

  // Permite auto-registro del PRIMER usuario (administrador). Por defecto true
  // solo mientras no existan perfiles; ver services/supabaseAuth.js.
  allowSignup: process.env.ALLOW_SIGNUP !== 'false',
  // FASE 1 local sin SMTP: confirma el correo tras el signup para poder entrar.
  // Equivale a «Auto Confirm» del dashboard. Desactivar con false si se
  // configura un servicio de correo o se quiere verificación por email.
  autoConfirmSignup: process.env.AUTO_CONFIRM_SIGNUP !== 'false',

  // Datos del administrador inicial para `pnpm db:seed` (NO se inventan aquí).
  adminEmail: process.env.ADMIN_EMAIL || '',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  adminName: process.env.ADMIN_NAME || '',
};

if (!config.databaseUrl) {
  console.warn('[server] DATABASE_URL no definido: las rutas de datos devolverán 503.');
}
if (!config.supabaseUrl || !config.supabaseKey) {
  console.warn('[server] SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY no definidos: el login no funcionará.');
}
