import { query, queryOne, withTransaction, mapDbError } from '../db.js';
import { CATALOG } from './catalog.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function bad(message, details) {
  const e = new Error(message);
  e.status = 400;
  if (details) e.details = details;
  return e;
}

function getDef(entity) {
  const def = CATALOG[entity];
  if (!def) {
    const e = new Error(`Entidad desconocida: ${entity}`);
    e.status = 404;
    throw e;
  }
  return def;
}

/** Normaliza y valida el body contra la whitelist de campos reales. */
export function normalize(entity, body, { partial = false } = {}) {
  const def = getDef(entity);
  const out = {};
  const errors = [];
  const src = body && typeof body === 'object' ? body : {};

  for (const [field, [type, label]] of Object.entries(def.fields)) {
    const isRequired = type.includes('!');
    const has = Object.prototype.hasOwnProperty.call(src, field);
    if (!has) {
      if (!partial && isRequired) errors.push(`${label} es obligatorio`);
      continue;
    }
    let v = src[field];
    if (typeof v === 'string') v = v.trim();
    if (v === '' || v === undefined) v = null;

    if (v === null) {
      if (isRequired) errors.push(`${label} es obligatorio`);
      else out[field] = null;
      continue;
    }

    const base = type.replace('!', '');
    if (base.startsWith('e:')) {
      const values = base.slice(2).split(',');
      if (!values.includes(String(v))) errors.push(`${label}: valor no permitido (${values.join(', ')})`);
      else out[field] = String(v);
      continue;
    }
    switch (base) {
      case 's':
        out[field] = String(v);
        break;
      case 'n':
      case 'i': {
        const num = Number(v);
        if (!Number.isFinite(num)) errors.push(`${label}: debe ser un número`);
        else out[field] = base === 'i' ? Math.trunc(num) : num;
        break;
      }
      case 'b':
        out[field] = v === true || v === 'true' || v === 1 || v === '1' || v === 'on';
        break;
      case 'u':
        if (!UUID_RE.test(String(v))) errors.push(`${label}: identificador no válido`);
        else out[field] = String(v);
        break;
      case 'd':
        if (!DATE_RE.test(String(v))) errors.push(`${label}: usa el formato AAAA-MM-DD`);
        else out[field] = String(v);
        break;
      case 'dt': {
        const s = String(v);
        out[field] = DATE_RE.test(s) ? `${s}T00:00:00` : s;
        break;
      }
      default:
        out[field] = String(v);
    }
  }

  if (errors.length) throw bad('Revisa los datos del formulario.', errors);
  return out;
}

// Normalización de tildes en SQL puro (no instala extensiones ni modifica la BD).
// Misma longitud en ambas cadenas: 22 caracteres.
const ACC_FROM = 'áéíóúàèìòùäëïöüâêîôûñç';
const ACC_TO = 'aeiouaeiouaeiouaeiounc';
const normSql = (expr) => `translate(lower(${expr}), '${ACC_FROM}', '${ACC_TO}')`;

/** Construye WHERE parametrizado a partir de búsqueda + filtros reales. */
export function buildQuery(entity, opts = {}) {
  const def = getDef(entity);
  const { q = '', page = 1, pageSize = 25, filters = {}, all = false } = opts;
  const whereParams = [];
  const where = [];

  if (q && def.search?.length) {
    const ors = def.search.map((col) => {
      whereParams.push(`%${q}%`);
      return `${normSql(col)} like ${normSql(`$${whereParams.length}`)}`;
    });
    where.push(`(${ors.join(' or ')})`);
  }

  for (const [param, col] of Object.entries(def.filters || {})) {
    const raw = filters[param];
    if (raw === undefined || raw === null || raw === '') continue;
    let value = raw;
    if (raw === 'true') value = true;
    else if (raw === 'false') value = false;
    whereParams.push(value);
    where.push(`${col} = $${whereParams.length}`);
  }

  const whereSql = where.length ? `where ${where.join(' and ')}` : '';
  const limit = all ? null : Math.min(Math.max(Number(pageSize) || 25, 1), 200);
  const offset = all ? null : (Math.max(Number(page) || 1, 1) - 1) * limit;

  const listParams = whereParams.slice();
  const listSql = `select * from public.${def.table} ${whereSql} order by ${def.order}`
    + (limit
      ? ` limit $${listParams.push(limit)} offset $${listParams.push(offset)}`
      : '');
  const countSql = `select count(*)::int as total from public.${def.table} ${whereSql}`;

  return {
    listSql, countSql, params: listParams, countParams: whereParams,
    page: Number(page) || 1, pageSize: limit || 0,
  };
}

export async function list(entity, opts) {
  const { listSql, countSql, params, countParams, page, pageSize } = buildQuery(entity, opts);
  try {
    const [rows, count] = await Promise.all([query(listSql, params), query(countSql, countParams)]);
    return { items: rows, total: count[0]?.total ?? 0, page, pageSize };
  } catch (e) {
    throw mapDbError(e);
  }
}

export async function get(entity, id) {
  const def = getDef(entity);
  if (!UUID_RE.test(String(id))) throw bad('Identificador no válido.');
  try {
    return await queryOne(`select * from public.${def.table} where id = $1`, [id]);
  } catch (e) { throw mapDbError(e); }
}

function columnsForInsert(def, data, user) {
  const cols = Object.keys(data).filter((k) => data[k] !== null);
  const values = cols.map((c) => data[c]);
  // Columnas de auditoría (created_by, registered_by, uploaded_by, user_id):
  // vienen del catálogo, nunca del request, y se rellenan con el usuario autenticado.
  if (def.auto && user?.id) {
    for (const col of Object.keys(def.auto)) {
      if (!cols.includes(col)) {
        cols.push(col);
        values.push(user.id);
      }
    }
  }
  return { cols, values };
}

export async function create(entity, body, user) {
  const def = getDef(entity);
  if (def.readonly || def.creatable === false) {
    const e = new Error(
      def.creatable === false
        ? 'Los perfiles se crean desde Supabase Auth (pnpm db:seed). Desde aquí solo se pueden editar rol, estado y datos de contacto.'
        : 'Esta entidad es de solo lectura (generada por la base de datos).'
    );
    e.status = 403;
    throw e;
  }
  const data = normalize(entity, body);
  const { cols, values } = columnsForInsert(def, data, user);
  if (!cols.length) throw bad('No hay datos para guardar.');
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  const sql = `insert into public.${def.table} (${cols.join(', ')}) values (${placeholders}) returning *`;
  try {
    return await queryOne(sql, values);
  } catch (e) { throw mapDbError(e); }
}

export async function update(entity, id, body, user) {
  const def = getDef(entity);
  if (def.readonly) {
    const e = new Error('Esta entidad es de solo lectura.');
    e.status = 403;
    throw e;
  }
  if (!UUID_RE.test(String(id))) throw bad('Identificador no válido.');
  const data = normalize(entity, body, { partial: true });
  const cols = Object.keys(data);
  if (!cols.length) throw bad('No hay cambios para guardar.');
  const values = cols.map((c) => data[c]);
  const set = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const sql = `update public.${def.table} set ${set} where id = $${cols.length + 1} returning *`;
  try {
    const row = await queryOne(sql, [...values, id]);
    if (!row) {
      const e = new Error('Registro no encontrado.');
      e.status = 404;
      throw e;
    }
    return row;
  } catch (e) { throw mapDbError(e); }
}

export async function remove(entity, id) {
  const def = getDef(entity);
  if (def.readonly || def.deletable === false || !def.manage) {
    const e = new Error('Esta entidad no se puede eliminar.');
    e.status = 403;
    throw e;
  }
  if (!UUID_RE.test(String(id))) throw bad('Identificador no válido.');
  try {
    const row = await queryOne(`delete from public.${def.table} where id = $1 returning id`, [id]);
    if (!row) {
      const e = new Error('Registro no encontrado.');
      e.status = 404;
      throw e;
    }
    return { deleted: true, id: row.id };
  } catch (e) { throw mapDbError(e); }
}

/** Relaciones directas (FK hacia la entidad) para la vista de detalle. */
export const RELATIONS = {
  clients: [
    { key: 'contacts', table: 'contacts', fk: 'client_id' },
    { key: 'projects', table: 'projects', fk: 'client_id' },
    { key: 'quotes', table: 'quotes', fk: 'client_id' },
    { key: 'invoices', table: 'invoices', fk: 'client_id' },
    { key: 'payments', table: 'payments', fk: 'client_id' },
    { key: 'documents', table: 'documents', fk: 'client_id' },
    { key: 'domains', table: 'domains', fk: 'client_id' },
    { key: 'hosting_accounts', table: 'hosting_accounts', fk: 'client_id' },
    { key: 'websites', table: 'websites', fk: 'client_id' },
    { key: 'tickets', table: 'tickets', fk: 'client_id' },
    { key: 'follow_ups', table: 'follow_ups', fk: 'client_id' },
    { key: 'maintenance_plans', table: 'maintenance_plans', fk: 'client_id' },
    { key: 'surveys', table: 'surveys', fk: 'client_id' },
    { key: 'bonuses', table: 'bonuses', fk: 'client_id' },
  ],
  projects: [
    { key: 'contracts', table: 'contracts', fk: 'project_id' },
    { key: 'quotes', table: 'quotes', fk: 'project_id' },
    { key: 'invoices', table: 'invoices', fk: 'project_id' },
    { key: 'payments', table: 'payments', fk: 'project_id' },
    { key: 'expenses', table: 'expenses', fk: 'project_id' },
    { key: 'extra_expenses', table: 'extra_expenses', fk: 'project_id' },
    { key: 'project_services', table: 'project_services', fk: 'project_id' },
    { key: 'project_costs', table: 'project_costs', fk: 'project_id' },
    { key: 'project_history', table: 'project_history', fk: 'project_id' },
    { key: 'tasks', table: 'tasks', fk: 'project_id' },
    { key: 'time_entries', table: 'time_entries', fk: 'project_id' },
    { key: 'deliveries', table: 'deliveries', fk: 'project_id' },
    { key: 'documents', table: 'documents', fk: 'project_id' },
    { key: 'domains', table: 'domains', fk: 'project_id' },
    { key: 'websites', table: 'websites', fk: 'project_id' },
    { key: 'tickets', table: 'tickets', fk: 'project_id' },
    { key: 'incidents', table: 'incidents', fk: 'project_id' },
    { key: 'bonuses', table: 'bonuses', fk: 'project_id' },
  ],
  quotes: [{ key: 'items', table: 'quote_items', fk: 'quote_id' }],
  campaigns: [{ key: 'metrics', table: 'campaign_metrics', fk: 'campaign_id' }],
  profit_distributions: [{ key: 'items', table: 'profit_distribution_items', fk: 'distribution_id' }],
  leads: [{ key: 'follow_ups', table: 'follow_ups', fk: 'lead_id' }, { key: 'quotes', table: 'quotes', fk: 'lead_id' }],
  domains: [{ key: 'renewals', table: 'renewals', fk: 'domain_id' }, { key: 'websites', table: 'websites', fk: 'domain_id' }],
  hosting_accounts: [{ key: 'renewals', table: 'renewals', fk: 'hosting_account_id' }, { key: 'websites', table: 'websites', fk: 'hosting_account_id' }],
  websites: [{ key: 'tickets', table: 'tickets', fk: 'website_id' }, { key: 'incidents', table: 'incidents', fk: 'website_id' }, { key: 'maintenance_plans', table: 'maintenance_plans', fk: 'website_id' }],
  tasks: [{ key: 'time_entries', table: 'time_entries', fk: 'task_id' }],
};

export async function detail(entity, id) {
  const row = await get(entity, id);
  if (!row) {
    const e = new Error('Registro no encontrado.');
    e.status = 404;
    throw e;
  }
  const rels = RELATIONS[entity] || [];
  const related = {};
  await Promise.all(rels.map(async (r) => {
    try {
      related[r.key] = await query(
        `select * from public.${r.table} where ${r.fk} = $1 order by created_at desc limit 100`,
        [id]
      );
    } catch {
      related[r.key] = [];
    }
  }));
  return { item: row, related, relations: rels.map((r) => r.key) };
}

export { withTransaction };
