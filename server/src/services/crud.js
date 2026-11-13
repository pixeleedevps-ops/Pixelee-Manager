import { query, queryOne, withTransaction, mapDbError, TABLE_NAMES, COLUMN_NAMES } from '../db.js';
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

function dbColumn(entity, column) { return COLUMN_NAMES[entity]?.[column] || column; }
function dbTable(entity, def = getDef(entity)) { return TABLE_NAMES[entity] || def.table; }
function selectColumns(entity) {
  const def = getDef(entity);
  const columns = [...new Set(['id', ...Object.keys(def.fields || {}), ...Object.keys(def.auto || {}), ...Object.keys(COLUMN_NAMES[entity] || {})])];
  return columns
    .map((column) => `${dbColumn(entity, column)}${dbColumn(entity, column) !== column ? ` as ${column}` : ''}`).join(', ');
}

function translateOrder(entity, order) {
  return order.split(',').map((piece) => {
    const match = piece.trim().match(/^(?:(\w+)\.)?(\w+)(.*)$/);
    if (!match) return piece;
    const [, prefix = '', column, suffix] = match;
    return `${prefix}${dbColumn(entity, column)}${suffix}`;
  }).join(', ');
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
  const dbCol = (column) => dbColumn(entity, column);
  const { q = '', page = 1, pageSize = 25, filters = {}, all = false } = opts;
  const whereParams = [];
  const where = [];

  if (q && def.search?.length) {
    const ors = def.search.map((col) => {
      whereParams.push(`%${q}%`);
      return `${normSql(dbCol(col))} like ${normSql(`$${whereParams.length}`)}`;
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
    where.push(`${dbCol(col)} = $${whereParams.length}`);
  }

  const whereSql = where.length ? `where ${where.join(' and ')}` : '';
  const limit = all ? null : Math.min(Math.max(Number(pageSize) || 25, 1), 200);
  const offset = all ? null : (Math.max(Number(page) || 1, 1) - 1) * limit;

  const listParams = whereParams.slice();
  const dbOrder = translateOrder(entity, def.order);
  const dbWhere = whereSql;
  const listSql = `select ${selectColumns(entity)} from public.${dbTable(entity, def)} ${dbWhere} order by ${dbOrder}`
    + (limit
      ? ` limit $${listParams.push(limit)} offset $${listParams.push(offset)}`
      : '');
  const countSql = `select count(*)::int as total from public.${dbTable(entity, def)} ${dbWhere}`;

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
  return await queryOne(`select ${selectColumns(entity)} from public.${dbTable(entity, def)} where id = $1`, [id]);
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
  if (entity === 'payments' && data.status === 'confirmado') await assertPaymentWithinProjectTotal(data.project_id, data.amount);
  const { cols, values } = columnsForInsert(def, data, user);
  if (!cols.length) throw bad('No hay datos para guardar.');
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
  const dbCols = cols.map((c) => dbColumn(entity, c));
  const sql = `insert into public.${dbTable(entity, def)} (${dbCols.join(', ')}) values (${placeholders}) returning ${selectColumns(entity)}`;
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
  if (entity === 'payments' && ('amount' in data || 'project_id' in data || 'status' in data)) {
    const existing = await get(entity, id);
    if (!existing) {
      const e = new Error('Registro no encontrado.');
      e.status = 404;
      throw e;
    }
    if ((data.status ?? existing.status) === 'confirmado') {
      await assertPaymentWithinProjectTotal(data.project_id || existing.project_id, data.amount ?? existing.amount, id);
    }
  }
  const cols = Object.keys(data);
  if (!cols.length) throw bad('No hay cambios para guardar.');
  const values = cols.map((c) => data[c]);
  const set = cols.map((c, i) => `${dbColumn(entity, c)} = $${i + 1}`).join(', ');
  const sql = `update public.${dbTable(entity, def)} set ${set} where id = $${cols.length + 1} returning ${selectColumns(entity)}`;
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

async function assertPaymentWithinProjectTotal(projectId, amount, excludePaymentId = null) {
  const project = await queryOne(
    `select p.valor_total as project_total,
       coalesce((select sum(coalesce(ct.valor_contrato, 0)) from public.contratos ct
         where ct.proyecto_id = p.id and ct.estado <> 'cancelado'), 0) as contract_total
     from public.proyectos p where p.id = $1`,
    [projectId]
  );
  if (!project) throw bad('Selecciona un proyecto válido para registrar el pago.');
  const total = Number(project.contract_total) || Number(project.project_total) || 0;
  const prior = await queryOne(
    `select coalesce(sum(valor), 0) as paid from public.pagos
     where proyecto_id = $1 and estado = 'confirmado' and ($2::uuid is null or id <> $2)`,
    [projectId, excludePaymentId]
  );
  const paid = Number(prior?.paid) || 0;
  const next = Number(amount) || 0;
  if (next + paid > total + 0.005) {
    const e = new Error(`El pago excede el saldo disponible del proyecto. Total: ${total}; confirmado previamente: ${paid}; máximo permitido: ${Math.max(total - paid, 0)}.`);
    e.status = 400;
    throw e;
  }
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
    const row = await queryOne(`delete from public.${dbTable(entity, def)} where id = $1 returning id`, [id]);
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
      const relatedDef = getDef(r.table);
      const columns = selectColumns(r.table);
      const fk = dbColumn(r.table, r.fk);
      const created = dbColumn(r.table, 'created_at');
      related[r.key] = await query(
        `select ${columns} from public.${dbTable(r.table, relatedDef)} where ${fk} = $1 order by ${created} desc limit 100`,
        [id]
      );
    } catch {
      related[r.key] = [];
    }
  }));
  return { item: row, related, relations: rels.filter((r) => CATALOG[r.table]).map((r) => r.key) };
}

export { withTransaction };
