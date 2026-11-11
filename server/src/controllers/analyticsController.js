import {
  getDashboard, getAccountingOverview, getManagementOverview,
  getMarketingOverview, getClientFinancials, getProjectFinancials,
} from '../services/analytics.js';
import { distributeProfits, computeDocumentTotals } from '../services/finance.js';

function check(req, res, perm) {
  if (!req.perms.includes(perm)) {
    res.status(403).json({ error: `No tienes permisos para ver esta información (${perm}).` });
    return false;
  }
  return true;
}

/** GET /api/dashboard */
export async function dashboard(_req, res) {
  return res.json(await getDashboard());
}

/** GET /api/accounting/overview?from=&to= */
export async function accounting(req, res) {
  return res.json(await getAccountingOverview(req.query.from || '', req.query.to || ''));
}

/** GET /api/management/overview?from=&to= */
export async function management(req, res) {
  return res.json(await getManagementOverview(req.query.from || '', req.query.to || '', req.user.id));
}

/** GET /api/marketing/overview */
export async function marketing(_req, res) {
  return res.json(await getMarketingOverview());
}

/** GET /api/financials/client/:id */
export async function clientFinancials(req, res) {
  if (!check(req, res, 'accounting.view')) return;
  return res.json(await getClientFinancials(req.params.id));
}

/** GET /api/financials/project/:id */
export async function projectFinancials(req, res) {
  if (!check(req, res, 'accounting.view')) return;
  const data = await getProjectFinancials(req.params.id);
  if (!data) return res.status(404).json({ error: 'Proyecto no encontrado.' });
  return res.json(data);
}

/** POST /api/management/distributions/preview — cálculo puro en backend. */
export async function previewDistribution(req, res) {
  if (!check(req, res, 'management.manage')) return;
  const { total, participants } = req.body || {};
  try {
    return res.json(distributeProfits(total, participants || []));
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

/** POST /api/accounting/document-totals — cálculo puro de cotización/factura. */
export async function documentTotals(req, res) {
  if (!check(req, res, 'accounting.manage')) return;
  return res.json(computeDocumentTotals(req.body || {}));
}
