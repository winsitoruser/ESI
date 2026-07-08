import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

// Local response helpers — frontend checks d.success
const ok = (data: any) => ({ success: true, data });
const fail = (code: string, msg: string) => ({ success: false, error: { code, message: msg } });

const sequelize = require('../../../../lib/sequelize');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const action = (req.query.action as string) || 'dashboard';

  try {
    switch (method) {
      case 'GET': return handleGet(req, res, action);
      case 'POST': return handlePost(req, res, action);
      case 'PUT': return handlePut(req, res, action);
      case 'DELETE': return handleDelete(req, res, action);
      default: return res.status(405).json(fail('METHOD_NOT_ALLOWED', 'Method not allowed'));
    }
  } catch (error: any) {
    console.warn(`[EPR API] Error (${action}):`, error.message);
    return res.status(500).json(fail('INTERNAL_ERROR', error.message));
  }
}

export default withHQAuth(handler, { module: 'e-procurement' });

// ==========================================
// GET HANDLERS
// ==========================================
async function handleGet(req: NextApiRequest, res: NextApiResponse, action: string) {
  switch (action) {
    case 'dashboard': return getDashboard(req, res);
    case 'vendors': return getVendors(req, res);
    case 'vendor-detail': return getVendorDetail(req, res);
    case 'rfqs': return getRfqs(req, res);
    case 'rfq-detail': return getRfqDetail(req, res);
    case 'tenders': return getTenders(req, res);
    case 'tender-detail': return getTenderDetail(req, res);
    case 'procurement-requests': return getProcurementRequests(req, res);
    case 'contracts': return getContracts(req, res);
    case 'contract-detail': return getContractDetail(req, res);
    case 'evaluations': return getEvaluations(req, res);
    case 'purchase-orders': return getPurchaseOrders(req, res);
    case 'po-detail': return getPODetail(req, res);
    case 'goods-receipts': return getGoodsReceipts(req, res);
    case 'grn-detail': return getGRNDetail(req, res);
    case 'invoices': return getInvoices(req, res);
    case 'invoice-detail': return getInvoiceDetail(req, res);
    case 'approvals': return getApprovals(req, res);
    case 'audit-trail': return getAuditTrail(req, res);
    case 'budget-allocations': return getBudgetAllocations(req, res);
    case 'categories': return getCategories(req, res);
    case 'analytics': return getAnalytics(req, res);
    case 'settings': return getSettings(req, res);
    default:
      return res.status(400).json(fail('INVALID_ACTION', `Unknown GET action: ${action}`));
  }
}

async function getDashboard(req: NextApiRequest, res: NextApiResponse) {
  const [vendorStats] = await sequelize.query(`
    SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'active') as active,
      COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
      COUNT(*) FILTER (WHERE status = 'blacklisted') as blacklisted,
      COALESCE(AVG(rating), 0) as avg_rating,
      COALESCE(SUM(total_spend), 0) as total_spend
    FROM epr_vendors
  `);

  const [rfqStats] = await sequelize.query(`
    SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'draft') as draft,
      COUNT(*) FILTER (WHERE status = 'published') as published,
      COUNT(*) FILTER (WHERE status = 'closed') as closed,
      COUNT(*) FILTER (WHERE status = 'awarded') as awarded,
      COALESCE(SUM(estimated_budget), 0) as total_budget
    FROM epr_rfqs
  `);

  const [tenderStats] = await sequelize.query(`
    SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'draft') as draft,
      COUNT(*) FILTER (WHERE status IN ('announcement', 'registration', 'submission')) as ongoing,
      COUNT(*) FILTER (WHERE status = 'awarded') as awarded,
      COALESCE(SUM(estimated_value), 0) as total_value
    FROM epr_tenders
  `);

  const [contractStats] = await sequelize.query(`
    SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'active') as active,
      COUNT(*) FILTER (WHERE status = 'expired') as expired,
      COUNT(*) FILTER (WHERE end_date <= CURRENT_DATE + INTERVAL '30 days' AND status = 'active') as expiring_soon,
      COALESCE(SUM(total_value), 0) as total_value
    FROM epr_contracts
  `);

  const [prStats] = await sequelize.query(`
    SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'submitted') as pending_approval,
      COUNT(*) FILTER (WHERE status = 'approved') as approved,
      COUNT(*) FILTER (WHERE status = 'in_process') as in_process,
      COALESCE(SUM(estimated_budget), 0) as total_budget
    FROM epr_procurement_requests
  `);

  const [recentRfqs] = await sequelize.query(`
    SELECT r.id, r.rfq_number, r.title, r.status, r.closing_date, r.estimated_budget,
      COALESCE((SELECT COUNT(*) FROM epr_rfq_responses rr WHERE rr.rfq_id = r.id), 0) as total_responses
    FROM epr_rfqs r ORDER BY r.created_at DESC LIMIT 5
  `);

  const [recentTenders] = await sequelize.query(`
    SELECT t.id, t.tender_number, t.title, t.status, t.submission_deadline, t.estimated_value,
      COALESCE((SELECT COUNT(*) FROM epr_tender_bids tb WHERE tb.tender_id = t.id), 0) as total_bids
    FROM epr_tenders t ORDER BY t.created_at DESC LIMIT 5
  `);

  const [topVendors] = await sequelize.query(`
    SELECT id, vendor_code, name, category, rating, total_orders, total_spend
    FROM epr_vendors WHERE status = 'active' ORDER BY rating DESC, total_orders DESC LIMIT 10
  `);

  const [poStats] = await sequelize.query(`
    SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'draft') as draft,
      COUNT(*) FILTER (WHERE status = 'approved') as approved,
      COUNT(*) FILTER (WHERE status = 'sent') as sent,
      COUNT(*) FILTER (WHERE status = 'partial_received') as partial_received,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_po,
      COALESCE(SUM(total_amount), 0) as total_value
    FROM epr_purchase_orders
  `).catch(() => [[{}]]);

  const [invoiceStats] = await sequelize.query(`
    SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'draft') as draft,
      COUNT(*) FILTER (WHERE status = 'submitted') as submitted,
      COUNT(*) FILTER (WHERE status = 'approved') as approved_inv,
      COUNT(*) FILTER (WHERE status = 'paid') as paid,
      COUNT(*) FILTER (WHERE match_status = 'matched') as matched,
      COUNT(*) FILTER (WHERE match_status = 'unmatched') as unmatched,
      COALESCE(SUM(total_amount), 0) as total_value,
      COALESCE(SUM(total_amount) FILTER (WHERE status != 'paid'), 0) as outstanding
    FROM epr_invoices
  `).catch(() => [[{}]]);

  const [grnStats] = await sequelize.query(`
    SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'draft') as draft,
      COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed
    FROM epr_goods_receipts
  `).catch(() => [[{}]]);

  const [pendingApprovals] = await sequelize.query(`
    SELECT entity_type, COUNT(*) as count
    FROM epr_approvals WHERE status = 'pending'
    GROUP BY entity_type
  `).catch(() => [[]]);

  return res.status(200).json(ok({
    vendorStats: vendorStats[0] || {},
    rfqStats: rfqStats[0] || {},
    tenderStats: tenderStats[0] || {},
    contractStats: contractStats[0] || {},
    prStats: prStats[0] || {},
    poStats: poStats[0] || {},
    invoiceStats: invoiceStats[0] || {},
    grnStats: grnStats[0] || {},
    pendingApprovals: pendingApprovals || [],
    recentRfqs, recentTenders, topVendors
  }));
}

async function getVendors(req: NextApiRequest, res: NextApiResponse) {
  const { page = '1', limit = '20', status, category, search } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  let where = 'WHERE 1=1';
  const reps: any = {};
  if (status && status !== 'all') { where += ' AND status = :status'; reps.status = status; }
  if (category) { where += ' AND category = :category'; reps.category = category; }
  if (search) { where += ' AND (name ILIKE :search OR vendor_code ILIKE :search)'; reps.search = `%${search}%`; }

  const [rows] = await sequelize.query(`SELECT * FROM epr_vendors ${where} ORDER BY created_at DESC LIMIT :lim OFFSET :off`, { replacements: { ...reps, lim: parseInt(limit as string), off: offset } });
  const [[{ count }]] = await sequelize.query(`SELECT COUNT(*) as count FROM epr_vendors ${where}`, { replacements: reps });

  return res.status(200).json(ok({ rows, total: parseInt(count), page: parseInt(page as string) }));
}

async function getVendorDetail(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const [[vendor]] = await sequelize.query(`SELECT * FROM epr_vendors WHERE id = :id`, { replacements: { id } });
  if (!vendor) return res.status(404).json(fail('NOT_FOUND', 'Vendor not found'));

  const [contracts] = await sequelize.query(`SELECT * FROM epr_contracts WHERE vendor_id = :id ORDER BY created_at DESC`, { replacements: { id } });
  const [evaluations] = await sequelize.query(`SELECT * FROM epr_evaluations WHERE vendor_id = :id ORDER BY created_at DESC`, { replacements: { id } });
  const [rfqResponses] = await sequelize.query(`
    SELECT r.*, rfq.rfq_number, rfq.title as rfq_title
    FROM epr_rfq_responses r JOIN epr_rfqs rfq ON r.rfq_id = rfq.id WHERE r.vendor_id = :id ORDER BY r.created_at DESC
  `, { replacements: { id } });

  return res.status(200).json(ok({ ...vendor, contracts, evaluations, rfqResponses }));
}

async function getRfqs(req: NextApiRequest, res: NextApiResponse) {
  const { page = '1', limit = '20', status, search } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  let where = 'WHERE 1=1';
  const reps: any = {};
  if (status && status !== 'all') { where += ' AND status = :status'; reps.status = status; }
  if (search) { where += ' AND (title ILIKE :search OR rfq_number ILIKE :search)'; reps.search = `%${search}%`; }

  const [rows] = await sequelize.query(`SELECT * FROM epr_rfqs ${where} ORDER BY created_at DESC LIMIT :lim OFFSET :off`, { replacements: { ...reps, lim: parseInt(limit as string), off: offset } });
  const [[{ count }]] = await sequelize.query(`SELECT COUNT(*) as count FROM epr_rfqs ${where}`, { replacements: reps });

  return res.status(200).json(ok({ rows, total: parseInt(count) }));
}

async function getRfqDetail(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const [[rfq]] = await sequelize.query(`SELECT * FROM epr_rfqs WHERE id = :id`, { replacements: { id } });
  if (!rfq) return res.status(404).json(fail('NOT_FOUND', 'RFQ not found'));

  const [items] = await sequelize.query(`SELECT * FROM epr_rfq_items WHERE rfq_id = :id ORDER BY sort_order`, { replacements: { id } });
  const [responses] = await sequelize.query(`
    SELECT r.*, v.name as vendor_name_full, v.rating as vendor_rating
    FROM epr_rfq_responses r LEFT JOIN epr_vendors v ON r.vendor_id = v.id WHERE r.rfq_id = :id ORDER BY r.overall_score DESC
  `, { replacements: { id } });

  return res.status(200).json(ok({ ...rfq, items, responses }));
}

async function getTenders(req: NextApiRequest, res: NextApiResponse) {
  const { page = '1', limit = '20', status, search } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  let where = 'WHERE 1=1';
  const reps: any = {};
  if (status && status !== 'all') { where += ' AND status = :status'; reps.status = status; }
  if (search) { where += ' AND (title ILIKE :search OR tender_number ILIKE :search)'; reps.search = `%${search}%`; }

  const [rows] = await sequelize.query(`SELECT * FROM epr_tenders ${where} ORDER BY created_at DESC LIMIT :lim OFFSET :off`, { replacements: { ...reps, lim: parseInt(limit as string), off: offset } });
  const [[{ count }]] = await sequelize.query(`SELECT COUNT(*) as count FROM epr_tenders ${where}`, { replacements: reps });

  return res.status(200).json(ok({ rows, total: parseInt(count) }));
}

async function getTenderDetail(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const [[tender]] = await sequelize.query(`SELECT * FROM epr_tenders WHERE id = :id`, { replacements: { id } });
  if (!tender) return res.status(404).json(fail('NOT_FOUND', 'Tender not found'));

  const [bids] = await sequelize.query(`
    SELECT b.*, v.name as vendor_full_name, v.rating as vendor_rating
    FROM epr_tender_bids b LEFT JOIN epr_vendors v ON b.vendor_id = v.id WHERE b.tender_id = :id ORDER BY b.overall_score DESC
  `, { replacements: { id } });

  return res.status(200).json(ok({ ...tender, bids }));
}

async function getProcurementRequests(req: NextApiRequest, res: NextApiResponse) {
  const { page = '1', limit = '20', status, search } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  let where = 'WHERE 1=1';
  const reps: any = {};
  if (status && status !== 'all') { where += ' AND status = :status'; reps.status = status; }
  if (search) { where += ' AND (title ILIKE :search OR request_number ILIKE :search)'; reps.search = `%${search}%`; }

  const [rows] = await sequelize.query(`SELECT * FROM epr_procurement_requests ${where} ORDER BY created_at DESC LIMIT :lim OFFSET :off`, { replacements: { ...reps, lim: parseInt(limit as string), off: offset } });
  const [[{ count }]] = await sequelize.query(`SELECT COUNT(*) as count FROM epr_procurement_requests ${where}`, { replacements: reps });

  return res.status(200).json(ok({ rows, total: parseInt(count) }));
}

async function getContracts(req: NextApiRequest, res: NextApiResponse) {
  const { page = '1', limit = '20', status, search } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  let where = 'WHERE 1=1';
  const reps: any = {};
  if (status && status !== 'all') { where += ' AND status = :status'; reps.status = status; }
  if (search) { where += ' AND (title ILIKE :search OR contract_number ILIKE :search)'; reps.search = `%${search}%`; }

  const [rows] = await sequelize.query(`SELECT * FROM epr_contracts ${where} ORDER BY created_at DESC LIMIT :lim OFFSET :off`, { replacements: { ...reps, lim: parseInt(limit as string), off: offset } });
  const [[{ count }]] = await sequelize.query(`SELECT COUNT(*) as count FROM epr_contracts ${where}`, { replacements: reps });

  return res.status(200).json(ok({ rows, total: parseInt(count) }));
}

async function getContractDetail(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const [[contract]] = await sequelize.query(`SELECT c.*, v.name as vendor_full_name FROM epr_contracts c LEFT JOIN epr_vendors v ON c.vendor_id = v.id WHERE c.id = :id`, { replacements: { id } });
  if (!contract) return res.status(404).json(fail('NOT_FOUND', 'Contract not found'));
  return res.status(200).json(ok(contract));
}

async function getEvaluations(req: NextApiRequest, res: NextApiResponse) {
  const { vendorId, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  let where = 'WHERE 1=1';
  const reps: any = {};
  if (vendorId) { where += ' AND vendor_id = :vendorId'; reps.vendorId = vendorId; }

  const [rows] = await sequelize.query(`SELECT * FROM epr_evaluations ${where} ORDER BY created_at DESC LIMIT :lim OFFSET :off`, { replacements: { ...reps, lim: parseInt(limit as string), off: offset } });
  const [[{ count }]] = await sequelize.query(`SELECT COUNT(*) as count FROM epr_evaluations ${where}`, { replacements: reps });

  return res.status(200).json(ok({ rows, total: parseInt(count) }));
}

async function getPurchaseOrders(req: NextApiRequest, res: NextApiResponse) {
  const { page = '1', limit = '20', status, search, vendorId } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  let where = 'WHERE 1=1';
  const reps: any = {};
  if (status && status !== 'all') { where += ' AND status = :status'; reps.status = status; }
  if (vendorId) { where += ' AND vendor_id = :vendorId'; reps.vendorId = vendorId; }
  if (search) { where += ' AND (title ILIKE :search OR po_number ILIKE :search OR vendor_name ILIKE :search)'; reps.search = `%${search}%`; }

  const [rows] = await sequelize.query(`SELECT * FROM epr_purchase_orders ${where} ORDER BY created_at DESC LIMIT :lim OFFSET :off`, { replacements: { ...reps, lim: parseInt(limit as string), off: offset } });
  const [[{ count }]] = await sequelize.query(`SELECT COUNT(*) as count FROM epr_purchase_orders ${where}`, { replacements: reps });

  return res.status(200).json(ok({ rows, total: parseInt(count), page: parseInt(page as string) }));
}

async function getPODetail(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const [[po]] = await sequelize.query(`SELECT p.*, v.name as vendor_full_name, v.email as vendor_email, v.phone as vendor_phone FROM epr_purchase_orders p LEFT JOIN epr_vendors v ON p.vendor_id = v.id WHERE p.id = :id`, { replacements: { id } });
  if (!po) return res.status(404).json(fail('NOT_FOUND', 'PO not found'));

  const [items] = await sequelize.query(`SELECT * FROM epr_po_items WHERE po_id = :id ORDER BY line_number`, { replacements: { id } });
  const [receipts] = await sequelize.query(`SELECT * FROM epr_goods_receipts WHERE po_id = :id ORDER BY created_at DESC`, { replacements: { id } });
  const [invoices] = await sequelize.query(`SELECT * FROM epr_invoices WHERE po_id = :id ORDER BY created_at DESC`, { replacements: { id } });
  const [approvals] = await sequelize.query(`SELECT * FROM epr_approvals WHERE entity_type = 'purchase_order' AND entity_id = :id ORDER BY step`, { replacements: { id } });
  const [audit] = await sequelize.query(`SELECT * FROM epr_audit_trail WHERE entity_type = 'purchase_order' AND entity_id = :id ORDER BY created_at DESC LIMIT 20`, { replacements: { id } });

  return res.status(200).json(ok({ ...po, items, receipts, invoices, approvals, audit }));
}

async function getGoodsReceipts(req: NextApiRequest, res: NextApiResponse) {
  const { page = '1', limit = '20', status, search, poId } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  let where = 'WHERE 1=1';
  const reps: any = {};
  if (status && status !== 'all') { where += ' AND status = :status'; reps.status = status; }
  if (poId) { where += ' AND po_id = :poId'; reps.poId = poId; }
  if (search) { where += ' AND (grn_number ILIKE :search OR vendor_name ILIKE :search OR po_number ILIKE :search)'; reps.search = `%${search}%`; }

  const [rows] = await sequelize.query(`SELECT * FROM epr_goods_receipts ${where} ORDER BY created_at DESC LIMIT :lim OFFSET :off`, { replacements: { ...reps, lim: parseInt(limit as string), off: offset } });
  const [[{ count }]] = await sequelize.query(`SELECT COUNT(*) as count FROM epr_goods_receipts ${where}`, { replacements: reps });

  return res.status(200).json(ok({ rows, total: parseInt(count), page: parseInt(page as string) }));
}

async function getGRNDetail(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const [[grn]] = await sequelize.query(`SELECT g.*, v.name as vendor_full_name FROM epr_goods_receipts g LEFT JOIN epr_vendors v ON g.vendor_id = v.id WHERE g.id = :id`, { replacements: { id } });
  if (!grn) return res.status(404).json(fail('NOT_FOUND', 'GRN not found'));

  const [items] = await sequelize.query(`SELECT gi.*, pi.product_name as po_product_name, pi.unit_price FROM epr_grn_items gi LEFT JOIN epr_po_items pi ON gi.po_item_id = pi.id WHERE gi.grn_id = :id`, { replacements: { id } });
  return res.status(200).json(ok({ ...grn, items }));
}

async function getInvoices(req: NextApiRequest, res: NextApiResponse) {
  const { page = '1', limit = '20', status, search, matchStatus } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  let where = 'WHERE 1=1';
  const reps: any = {};
  if (status && status !== 'all') { where += ' AND status = :status'; reps.status = status; }
  if (matchStatus && matchStatus !== 'all') { where += ' AND match_status = :matchStatus'; reps.matchStatus = matchStatus; }
  if (search) { where += ' AND (invoice_number ILIKE :search OR vendor_name ILIKE :search OR vendor_invoice_number ILIKE :search)'; reps.search = `%${search}%`; }

  const [rows] = await sequelize.query(`SELECT * FROM epr_invoices ${where} ORDER BY created_at DESC LIMIT :lim OFFSET :off`, { replacements: { ...reps, lim: parseInt(limit as string), off: offset } });
  const [[{ count }]] = await sequelize.query(`SELECT COUNT(*) as count FROM epr_invoices ${where}`, { replacements: reps });

  return res.status(200).json(ok({ rows, total: parseInt(count), page: parseInt(page as string) }));
}

async function getInvoiceDetail(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const [[invoice]] = await sequelize.query(`SELECT i.*, v.name as vendor_full_name FROM epr_invoices i LEFT JOIN epr_vendors v ON i.vendor_id = v.id WHERE i.id = :id`, { replacements: { id } });
  if (!invoice) return res.status(404).json(fail('NOT_FOUND', 'Invoice not found'));

  const [items] = await sequelize.query(`SELECT ii.*, pi.product_name FROM epr_invoice_items ii LEFT JOIN epr_po_items pi ON ii.po_item_id = pi.id WHERE ii.invoice_id = :id`, { replacements: { id } });
  return res.status(200).json(ok({ ...invoice, items }));
}

async function getApprovals(req: NextApiRequest, res: NextApiResponse) {
  const { status, entityType, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  let where = 'WHERE 1=1';
  const reps: any = {};
  if (status && status !== 'all') { where += ' AND status = :status'; reps.status = status; }
  if (entityType) { where += ' AND entity_type = :entityType'; reps.entityType = entityType; }

  const [rows] = await sequelize.query(`SELECT * FROM epr_approvals ${where} ORDER BY created_at DESC LIMIT :lim OFFSET :off`, { replacements: { ...reps, lim: parseInt(limit as string), off: offset } });
  const [[{ count }]] = await sequelize.query(`SELECT COUNT(*) as count FROM epr_approvals ${where}`, { replacements: reps });

  return res.status(200).json(ok({ rows, total: parseInt(count) }));
}

async function getAuditTrail(req: NextApiRequest, res: NextApiResponse) {
  const { entityType, entityId, page = '1', limit = '50' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  let where = 'WHERE 1=1';
  const reps: any = {};
  if (entityType) { where += ' AND entity_type = :entityType'; reps.entityType = entityType; }
  if (entityId) { where += ' AND entity_id = :entityId'; reps.entityId = entityId; }

  const [rows] = await sequelize.query(`SELECT * FROM epr_audit_trail ${where} ORDER BY created_at DESC LIMIT :lim OFFSET :off`, { replacements: { ...reps, lim: parseInt(limit as string), off: offset } });
  return res.status(200).json(ok({ rows }));
}

async function getBudgetAllocations(req: NextApiRequest, res: NextApiResponse) {
  const { department, fiscalYear, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  let where = 'WHERE 1=1';
  const reps: any = {};
  if (department) { where += ' AND department = :department'; reps.department = department; }
  if (fiscalYear) { where += ' AND fiscal_year = :fiscalYear'; reps.fiscalYear = fiscalYear; }

  const [rows] = await sequelize.query(`SELECT * FROM epr_budget_allocations ${where} ORDER BY department, category LIMIT :lim OFFSET :off`, { replacements: { ...reps, lim: parseInt(limit as string), off: offset } });
  const [[{ count }]] = await sequelize.query(`SELECT COUNT(*) as count FROM epr_budget_allocations ${where}`, { replacements: reps });

  return res.status(200).json(ok({ rows, total: parseInt(count) }));
}

async function getCategories(req: NextApiRequest, res: NextApiResponse) {
  const [rows] = await sequelize.query(`SELECT * FROM epr_categories WHERE is_active = true ORDER BY sort_order, name`);
  return res.status(200).json(ok(rows));
}

async function getAnalytics(req: NextApiRequest, res: NextApiResponse) {
  const [spendByCategory] = await sequelize.query(`
    SELECT category, COUNT(*) as vendor_count, COALESCE(SUM(total_spend), 0) as spend
    FROM epr_vendors WHERE status = 'active' GROUP BY category ORDER BY spend DESC
  `);

  const [monthlySpend] = await sequelize.query(`
    SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COALESCE(SUM(total_value), 0) as value
    FROM epr_contracts WHERE status = 'active' GROUP BY TO_CHAR(created_at, 'YYYY-MM') ORDER BY month DESC LIMIT 12
  `);

  const [vendorPerformance] = await sequelize.query(`
    SELECT vendor_name, AVG(overall_score) as avg_score, COUNT(*) as eval_count
    FROM epr_evaluations GROUP BY vendor_name ORDER BY avg_score DESC LIMIT 10
  `);

  const [poByStatus] = await sequelize.query(`
    SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as value
    FROM epr_purchase_orders GROUP BY status ORDER BY count DESC
  `).catch(() => [[]]);

  const [monthlyPO] = await sequelize.query(`
    SELECT TO_CHAR(order_date, 'YYYY-MM') as month, COUNT(*) as count, COALESCE(SUM(total_amount), 0) as value
    FROM epr_purchase_orders WHERE order_date IS NOT NULL
    GROUP BY TO_CHAR(order_date, 'YYYY-MM') ORDER BY month DESC LIMIT 12
  `).catch(() => [[]]);

  const [invoiceAging] = await sequelize.query(`
    SELECT
      COUNT(*) FILTER (WHERE due_date >= CURRENT_DATE) as current_count,
      COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND due_date >= CURRENT_DATE - 30) as overdue_30,
      COUNT(*) FILTER (WHERE due_date < CURRENT_DATE - 30 AND due_date >= CURRENT_DATE - 60) as overdue_60,
      COUNT(*) FILTER (WHERE due_date < CURRENT_DATE - 60) as overdue_90_plus,
      COALESCE(SUM(total_amount - paid_amount) FILTER (WHERE status != 'paid'), 0) as total_outstanding
    FROM epr_invoices
  `).catch(() => [[{}]]);

  const [topVendorsBySpend] = await sequelize.query(`
    SELECT vendor_name, COUNT(*) as po_count, COALESCE(SUM(total_amount), 0) as total_spend
    FROM epr_purchase_orders WHERE status NOT IN ('draft', 'cancelled')
    GROUP BY vendor_name ORDER BY total_spend DESC LIMIT 10
  `).catch(() => [[]]);

  const [deliveryPerformance] = await sequelize.query(`
    SELECT
      COUNT(*) as total_delivered,
      COUNT(*) FILTER (WHERE actual_delivery <= expected_delivery) as on_time,
      COUNT(*) FILTER (WHERE actual_delivery > expected_delivery) as late
    FROM epr_purchase_orders WHERE actual_delivery IS NOT NULL AND expected_delivery IS NOT NULL
  `).catch(() => [[{}]]);

  return res.status(200).json(ok({
    spendByCategory, monthlySpend, vendorPerformance,
    poByStatus: poByStatus || [], monthlyPO: monthlyPO || [],
    invoiceAging: invoiceAging[0] || {},
    topVendorsBySpend: topVendorsBySpend || [],
    deliveryPerformance: deliveryPerformance[0] || {}
  }));
}

async function getSettings(req: NextApiRequest, res: NextApiResponse) {
  const [rows] = await sequelize.query(`SELECT * FROM epr_settings ORDER BY setting_key`);
  return res.status(200).json(ok(rows));
}

// ==========================================
// POST HANDLERS
// ==========================================
async function handlePost(req: NextApiRequest, res: NextApiResponse, action: string) {
  const data = req.body;

  switch (action) {
    case 'vendors': {
      const code = `VND-${Date.now().toString(36).toUpperCase()}`;
      const [result] = await sequelize.query(`
        INSERT INTO epr_vendors (id, tenant_id, vendor_code, name, vendor_type, category, status, npwp,
          address, city, province, postal_code, country, phone, email, website, contact_person, contact_phone,
          bank_name, bank_account, bank_holder, payment_terms, notes, created_by)
        VALUES (gen_random_uuid(), :tenantId, :code, :name, :vendorType, :category, :status, :npwp,
          :address, :city, :province, :postalCode, :country, :phone, :email, :website, :contactPerson, :contactPhone,
          :bankName, :bankAccount, :bankHolder, :paymentTerms, :notes, :createdBy)
        RETURNING *
      `, { replacements: { tenantId: data.tenantId || null, code, name: data.name,
        vendorType: data.vendorType || 'supplier', category: data.category || null, status: data.status || 'active',
        npwp: data.npwp || null, address: data.address || null, city: data.city || null,
        province: data.province || null, postalCode: data.postalCode || null, country: data.country || 'Indonesia',
        phone: data.phone || null, email: data.email || null, website: data.website || null,
        contactPerson: data.contactPerson || null, contactPhone: data.contactPhone || null,
        bankName: data.bankName || null, bankAccount: data.bankAccount || null, bankHolder: data.bankAccountName || data.contactPerson || null,
        paymentTerms: data.paymentTerms || 'net30', notes: data.notes || null, createdBy: data.createdBy || null }});
      return res.status(201).json(ok(result[0]));
    }
    case 'rfqs': {
      const num = `RFQ-${Date.now().toString(36).toUpperCase()}`;
      const [result] = await sequelize.query(`
        INSERT INTO epr_rfqs (id, tenant_id, rfq_number, title, description, status, priority, category,
          closing_date, estimated_budget, currency, delivery_address, delivery_date, terms_conditions,
          invited_vendors, requested_by_name, created_by)
        VALUES (gen_random_uuid(), :tenantId, :num, :title, :description, :status, :priority, :category,
          :closingDate, :estimatedBudget, :currency, :deliveryAddress, :deliveryDate, :termsConditions,
          :invitedVendors, :requestedByName, :createdBy)
        RETURNING *
      `, { replacements: { tenantId: data.tenantId || null, num, title: data.title, description: data.description || null,
        status: data.status || 'draft', priority: data.priority || 'normal', category: data.category || null,
        closingDate: data.closingDate || null, estimatedBudget: data.estimatedBudget || 0, currency: data.currency || 'IDR',
        deliveryAddress: data.deliveryAddress || null, deliveryDate: data.deliveryDate || null,
        termsConditions: data.termsConditions || null, invitedVendors: JSON.stringify(data.invitedVendors || []),
        requestedByName: data.requestedByName || null, createdBy: data.createdBy || null }});
      return res.status(201).json(ok(result[0]));
    }
    case 'rfq-items': {
      const [result] = await sequelize.query(`
        INSERT INTO epr_rfq_items (id, rfq_id, item_name, specification, quantity, uom, estimated_price, notes, sort_order)
        VALUES (gen_random_uuid(), :rfqId, :itemName, :specification, :quantity, :uom, :estimatedPrice, :notes, :sortOrder)
        RETURNING *
      `, { replacements: { rfqId: data.rfqId, itemName: data.itemName, specification: data.specification || null,
        quantity: data.quantity, uom: data.uom || 'pcs', estimatedPrice: data.estimatedPrice || 0,
        notes: data.notes || null, sortOrder: data.sortOrder || 0 }});
      return res.status(201).json(ok(result[0]));
    }
    case 'rfq-responses': {
      const [result] = await sequelize.query(`
        INSERT INTO epr_rfq_responses (id, rfq_id, vendor_id, vendor_name, status, total_price, delivery_days,
          payment_terms, warranty, item_prices, remarks, submitted_at)
        VALUES (gen_random_uuid(), :rfqId, :vendorId, :vendorName, 'submitted', :totalPrice, :deliveryDays,
          :paymentTerms, :warranty, :itemPrices, :remarks, NOW())
        RETURNING *
      `, { replacements: { rfqId: data.rfqId, vendorId: data.vendorId, vendorName: data.vendorName || null,
        totalPrice: data.totalPrice || 0, deliveryDays: data.deliveryDays || null, paymentTerms: data.paymentTerms || null,
        warranty: data.warranty || null, itemPrices: JSON.stringify(data.itemPrices || []), remarks: data.remarks || null }});
      return res.status(201).json(ok(result[0]));
    }
    case 'tenders': {
      const num = `TND-${Date.now().toString(36).toUpperCase()}`;
      const [result] = await sequelize.query(`
        INSERT INTO epr_tenders (id, tenant_id, tender_number, title, description, tender_type, status, category,
          estimated_value, currency, announcement_date, registration_deadline, submission_deadline,
          requirements, evaluation_criteria, committee_members, notes, created_by)
        VALUES (gen_random_uuid(), :tenantId, :num, :title, :description, :tenderType, :status, :category,
          :estimatedValue, :currency, :announcementDate, :registrationDeadline, :submissionDeadline,
          :requirements, :evaluationCriteria, :committeeMembers, :notes, :createdBy)
        RETURNING *
      `, { replacements: { tenantId: data.tenantId || null, num, title: data.title, description: data.description || null,
        tenderType: data.tenderType || 'open', status: data.status || 'draft', category: data.category || null,
        estimatedValue: data.estimatedValue || 0, currency: data.currency || 'IDR',
        announcementDate: data.announcementDate || null, registrationDeadline: data.registrationDeadline || null,
        submissionDeadline: data.submissionDeadline || null, requirements: JSON.stringify(data.requirements || []),
        evaluationCriteria: JSON.stringify(data.evaluationCriteria || []),
        committeeMembers: JSON.stringify(data.committeeMembers || []),
        notes: data.notes || null, createdBy: data.createdBy || null }});
      return res.status(201).json(ok(result[0]));
    }
    case 'tender-bids': {
      const bidNum = `BID-${Date.now().toString(36).toUpperCase()}`;
      const [result] = await sequelize.query(`
        INSERT INTO epr_tender_bids (id, tender_id, vendor_id, vendor_name, bid_number, status, bid_amount,
          technical_proposal, delivery_schedule, documents, submitted_at)
        VALUES (gen_random_uuid(), :tenderId, :vendorId, :vendorName, :bidNum, 'submitted', :bidAmount,
          :technicalProposal, :deliverySchedule, :documents, NOW())
        RETURNING *
      `, { replacements: { tenderId: data.tenderId, vendorId: data.vendorId, vendorName: data.vendorName || null,
        bidNum, bidAmount: data.bidAmount, technicalProposal: data.technicalProposal || null,
        deliverySchedule: data.deliverySchedule || null, documents: JSON.stringify(data.documents || []) }});
      return res.status(201).json(ok(result[0]));
    }
    case 'procurement-requests': {
      const num = `PR-${Date.now().toString(36).toUpperCase()}`;
      const [result] = await sequelize.query(`
        INSERT INTO epr_procurement_requests (id, tenant_id, request_number, title, description, status, priority,
          department, requested_by_name, needed_date, estimated_budget, currency, items, justification, created_by)
        VALUES (gen_random_uuid(), :tenantId, :num, :title, :description, :status, :priority,
          :department, :requestedByName, :neededDate, :estimatedBudget, :currency, :items, :justification, :createdBy)
        RETURNING *
      `, { replacements: { tenantId: data.tenantId || null, num, title: data.title, description: data.description || null,
        status: data.status || 'draft', priority: data.priority || 'normal', department: data.department || null,
        requestedByName: data.requestedByName || null, neededDate: data.neededDate || null,
        estimatedBudget: data.estimatedBudget || 0, currency: data.currency || 'IDR',
        items: JSON.stringify(data.items || []), justification: data.justification || null, createdBy: data.createdBy || null }});
      return res.status(201).json(ok(result[0]));
    }
    case 'contracts': {
      const num = `CTR-${Date.now().toString(36).toUpperCase()}`;
      const [result] = await sequelize.query(`
        INSERT INTO epr_contracts (id, tenant_id, contract_number, title, vendor_id, vendor_name, contract_type,
          status, start_date, end_date, total_value, currency, payment_terms, delivery_terms, terms_conditions,
          auto_renew, renewal_notice_days, penalty_terms, created_by)
        VALUES (gen_random_uuid(), :tenantId, :num, :title, :vendorId, :vendorName, :contractType,
          :status, :startDate, :endDate, :totalValue, :currency, :paymentTerms, :deliveryTerms, :termsConditions,
          :autoRenew, :renewalNoticeDays, :penaltyTerms, :createdBy)
        RETURNING *
      `, { replacements: { tenantId: data.tenantId || null, num, title: data.title, vendorId: data.vendorId,
        vendorName: data.vendorName || null, contractType: data.contractType || 'purchase', status: data.status || 'draft',
        startDate: data.startDate, endDate: data.endDate, totalValue: data.totalValue || 0, currency: data.currency || 'IDR',
        paymentTerms: data.paymentTerms || null, deliveryTerms: data.deliveryTerms || null,
        termsConditions: data.termsConditions || null, autoRenew: data.autoRenew || false,
        renewalNoticeDays: data.renewalNoticeDays || 30, penaltyTerms: data.penaltyClause || null,
        createdBy: data.createdBy || null }});
      return res.status(201).json(ok(result[0]));
    }
    case 'evaluations': {
      const overall = ((data.qualityScore || 0) + (data.deliveryScore || 0) + (data.priceScore || 0) +
        (data.serviceScore || 0) + (data.complianceScore || 0)) / 5;
      const grade = overall >= 90 ? 'A' : overall >= 75 ? 'B' : overall >= 60 ? 'C' : overall >= 40 ? 'D' : 'F';
      const [result] = await sequelize.query(`
        INSERT INTO epr_evaluations (id, tenant_id, vendor_id, vendor_name, evaluation_period, quality_score,
          delivery_score, price_score, service_score, compliance_score, overall_score, grade,
          strengths, weaknesses, recommendations, evaluated_by_name, created_by)
        VALUES (gen_random_uuid(), :tenantId, :vendorId, :vendorName, :evaluationPeriod, :qualityScore,
          :deliveryScore, :priceScore, :serviceScore, :complianceScore, :overallScore, :grade,
          :strengths, :weaknesses, :recommendations, :evaluatedByName, :createdBy)
        RETURNING *
      `, { replacements: { tenantId: data.tenantId || null, vendorId: data.vendorId, vendorName: data.vendorName || null,
        evaluationPeriod: data.evaluationPeriod || null, qualityScore: data.qualityScore || 0,
        deliveryScore: data.deliveryScore || 0, priceScore: data.priceScore || 0, serviceScore: data.serviceScore || 0,
        complianceScore: data.complianceScore || 0, overallScore: overall, grade,
        strengths: data.strengths || null, weaknesses: data.weaknesses || null, recommendations: data.recommendations || null,
        evaluatedByName: data.evaluatedByName || null, createdBy: data.createdBy || null }});
      return res.status(201).json(ok(result[0]));
    }
    case 'purchase-orders': {
      const poNum = `PO-${Date.now().toString(36).toUpperCase()}`;
      const [result] = await sequelize.query(`
        INSERT INTO epr_purchase_orders (id, tenant_id, po_number, title, description, vendor_id, vendor_name,
          pr_id, rfq_id, contract_id, status, priority, order_date, expected_delivery,
          subtotal, discount_amount, tax_amount, shipping_cost, total_amount, currency,
          payment_terms, delivery_terms, delivery_address, shipping_method, department, budget_code,
          terms_conditions, internal_notes, vendor_notes, created_by, created_by_name)
        VALUES (gen_random_uuid(), :tenantId, :poNum, :title, :description, :vendorId, :vendorName,
          :prId, :rfqId, :contractId, :status, :priority, :orderDate, :expectedDelivery,
          :subtotal, :discountAmount, :taxAmount, :shippingCost, :totalAmount, :currency,
          :paymentTerms, :deliveryTerms, :deliveryAddress, :shippingMethod, :department, :budgetCode,
          :termsConditions, :internalNotes, :vendorNotes, :createdBy, :createdByName)
        RETURNING *
      `, { replacements: {
        tenantId: data.tenantId || null, poNum, title: data.title, description: data.description || null,
        vendorId: data.vendorId, vendorName: data.vendorName || null,
        prId: data.prId || null, rfqId: data.rfqId || null, contractId: data.contractId || null,
        status: data.status || 'draft', priority: data.priority || 'normal',
        orderDate: data.orderDate || new Date().toISOString().split('T')[0],
        expectedDelivery: data.expectedDelivery || null,
        subtotal: data.subtotal || 0, discountAmount: data.discountAmount || 0,
        taxAmount: data.taxAmount || 0, shippingCost: data.shippingCost || 0,
        totalAmount: data.totalAmount || 0, currency: data.currency || 'IDR',
        paymentTerms: data.paymentTerms || null, deliveryTerms: data.deliveryTerms || null,
        deliveryAddress: data.deliveryAddress || null, shippingMethod: data.shippingMethod || null,
        department: data.department || null, budgetCode: data.budgetCode || null,
        termsConditions: data.termsConditions || null, internalNotes: data.internalNotes || null,
        vendorNotes: data.vendorNotes || null, createdBy: data.createdBy || null,
        createdByName: data.createdByName || null
      }});
      // Auto-create audit trail
      await sequelize.query(`INSERT INTO epr_audit_trail (id, entity_type, entity_id, entity_number, action, description, performed_by_name, created_at)
        VALUES (gen_random_uuid(), 'purchase_order', :entityId, :entityNum, 'created', 'Purchase Order created', :by, NOW())`,
        { replacements: { entityId: result[0].id, entityNum: poNum, by: data.createdByName || 'System' }}).catch(() => {});
      return res.status(201).json(ok(result[0]));
    }
    case 'po-items': {
      const [result] = await sequelize.query(`
        INSERT INTO epr_po_items (id, po_id, line_number, product_id, product_code, product_name, description,
          category, quantity, uom, unit_price, discount_percent, tax_percent, line_total, notes)
        VALUES (gen_random_uuid(), :poId, :lineNumber, :productId, :productCode, :productName, :description,
          :category, :quantity, :uom, :unitPrice, :discountPercent, :taxPercent, :lineTotal, :notes)
        RETURNING *
      `, { replacements: {
        poId: data.poId, lineNumber: data.lineNumber || 1, productId: data.productId || null,
        productCode: data.productCode || null, productName: data.productName,
        description: data.description || null, category: data.category || null,
        quantity: data.quantity, uom: data.uom || 'pcs', unitPrice: data.unitPrice,
        discountPercent: data.discountPercent || 0, taxPercent: data.taxPercent || 0,
        lineTotal: data.lineTotal || (data.quantity * data.unitPrice), notes: data.notes || null
      }});
      return res.status(201).json(ok(result[0]));
    }
    case 'goods-receipts': {
      const grnNum = `GRN-${Date.now().toString(36).toUpperCase()}`;
      const [result] = await sequelize.query(`
        INSERT INTO epr_goods_receipts (id, tenant_id, grn_number, po_id, po_number, vendor_id, vendor_name,
          status, receipt_date, delivery_note_number, warehouse_location, received_by_name,
          inspection_notes, notes, created_by)
        VALUES (gen_random_uuid(), :tenantId, :grnNum, :poId, :poNumber, :vendorId, :vendorName,
          :status, :receiptDate, :deliveryNoteNumber, :warehouseLocation, :receivedByName,
          :inspectionNotes, :notes, :createdBy)
        RETURNING *
      `, { replacements: {
        tenantId: data.tenantId || null, grnNum, poId: data.poId, poNumber: data.poNumber || null,
        vendorId: data.vendorId || null, vendorName: data.vendorName || null,
        status: data.status || 'draft', receiptDate: data.receiptDate || new Date().toISOString().split('T')[0],
        deliveryNoteNumber: data.deliveryNoteNumber || null, warehouseLocation: data.warehouseLocation || null,
        receivedByName: data.receivedByName || null, inspectionNotes: data.inspectionNotes || null,
        notes: data.notes || null, createdBy: data.createdBy || null
      }});
      await sequelize.query(`INSERT INTO epr_audit_trail (id, entity_type, entity_id, entity_number, action, description, performed_by_name, created_at)
        VALUES (gen_random_uuid(), 'goods_receipt', :entityId, :entityNum, 'created', 'Goods Receipt created', :by, NOW())`,
        { replacements: { entityId: result[0].id, entityNum: grnNum, by: data.receivedByName || 'System' }}).catch(() => {});
      return res.status(201).json(ok(result[0]));
    }
    case 'grn-items': {
      const [result] = await sequelize.query(`
        INSERT INTO epr_grn_items (id, grn_id, po_item_id, product_name, ordered_qty, received_qty,
          rejected_qty, accepted_qty, uom, batch_number, expiry_date, storage_location,
          inspection_result, rejection_reason, notes)
        VALUES (gen_random_uuid(), :grnId, :poItemId, :productName, :orderedQty, :receivedQty,
          :rejectedQty, :acceptedQty, :uom, :batchNumber, :expiryDate, :storageLocation,
          :inspectionResult, :rejectionReason, :notes)
        RETURNING *
      `, { replacements: {
        grnId: data.grnId, poItemId: data.poItemId || null, productName: data.productName,
        orderedQty: data.orderedQty || 0, receivedQty: data.receivedQty || 0,
        rejectedQty: data.rejectedQty || 0, acceptedQty: data.acceptedQty || (data.receivedQty - (data.rejectedQty || 0)),
        uom: data.uom || 'pcs', batchNumber: data.batchNumber || null, expiryDate: data.expiryDate || null,
        storageLocation: data.storageLocation || null, inspectionResult: data.inspectionResult || 'passed',
        rejectionReason: data.rejectionReason || null, notes: data.notes || null
      }});
      return res.status(201).json(ok(result[0]));
    }
    case 'invoices': {
      const invNum = `INV-${Date.now().toString(36).toUpperCase()}`;
      const [result] = await sequelize.query(`
        INSERT INTO epr_invoices (id, tenant_id, invoice_number, vendor_invoice_number, po_id, po_number,
          grn_id, vendor_id, vendor_name, status, invoice_date, due_date,
          subtotal, tax_amount, discount_amount, total_amount, currency,
          payment_method, match_status, notes, created_by)
        VALUES (gen_random_uuid(), :tenantId, :invNum, :vendorInvoiceNumber, :poId, :poNumber,
          :grnId, :vendorId, :vendorName, :status, :invoiceDate, :dueDate,
          :subtotal, :taxAmount, :discountAmount, :totalAmount, :currency,
          :paymentMethod, :matchStatus, :notes, :createdBy)
        RETURNING *
      `, { replacements: {
        tenantId: data.tenantId || null, invNum, vendorInvoiceNumber: data.vendorInvoiceNumber || null,
        poId: data.poId || null, poNumber: data.poNumber || null, grnId: data.grnId || null,
        vendorId: data.vendorId || null, vendorName: data.vendorName || null,
        status: data.status || 'draft', invoiceDate: data.invoiceDate || new Date().toISOString().split('T')[0],
        dueDate: data.dueDate || null, subtotal: data.subtotal || 0, taxAmount: data.taxAmount || 0,
        discountAmount: data.discountAmount || 0, totalAmount: data.totalAmount || 0,
        currency: data.currency || 'IDR', paymentMethod: data.paymentMethod || null,
        matchStatus: data.matchStatus || 'unmatched', notes: data.notes || null,
        createdBy: data.createdBy || null
      }});
      await sequelize.query(`INSERT INTO epr_audit_trail (id, entity_type, entity_id, entity_number, action, description, performed_by_name, created_at)
        VALUES (gen_random_uuid(), 'invoice', :entityId, :entityNum, 'created', 'Invoice created', :by, NOW())`,
        { replacements: { entityId: result[0].id, entityNum: invNum, by: 'System' }}).catch(() => {});
      return res.status(201).json(ok(result[0]));
    }
    case 'approvals': {
      const [result] = await sequelize.query(`
        INSERT INTO epr_approvals (id, tenant_id, entity_type, entity_id, entity_number, step, total_steps,
          approver_role, approver_name, status, amount, due_date)
        VALUES (gen_random_uuid(), :tenantId, :entityType, :entityId, :entityNumber, :step, :totalSteps,
          :approverRole, :approverName, 'pending', :amount, :dueDate)
        RETURNING *
      `, { replacements: {
        tenantId: data.tenantId || null, entityType: data.entityType, entityId: data.entityId,
        entityNumber: data.entityNumber || null, step: data.step || 1, totalSteps: data.totalSteps || 1,
        approverRole: data.approverRole || null, approverName: data.approverName || null,
        amount: data.amount || 0, dueDate: data.dueDate || null
      }});
      return res.status(201).json(ok(result[0]));
    }
    case 'budget-allocations': {
      const [result] = await sequelize.query(`
        INSERT INTO epr_budget_allocations (id, tenant_id, budget_code, department, fiscal_year, fiscal_period,
          category, allocated_amount, committed_amount, spent_amount, remaining_amount, currency, status, notes, created_by)
        VALUES (gen_random_uuid(), :tenantId, :budgetCode, :department, :fiscalYear, :fiscalPeriod,
          :category, :allocatedAmount, 0, 0, :allocatedAmount, :currency, 'active', :notes, :createdBy)
        RETURNING *
      `, { replacements: {
        tenantId: data.tenantId || null, budgetCode: data.budgetCode,
        department: data.department, fiscalYear: data.fiscalYear || new Date().getFullYear(),
        fiscalPeriod: data.fiscalPeriod || null, category: data.category || null,
        allocatedAmount: data.allocatedAmount || 0, currency: data.currency || 'IDR',
        notes: data.notes || null, createdBy: data.createdBy || null
      }});
      return res.status(201).json(ok(result[0]));
    }
    default:
      return res.status(400).json(fail('INVALID_ACTION', `Unknown POST action: ${action}`));
  }
}

// ==========================================
// PUT HANDLERS
// ==========================================
async function handlePut(req: NextApiRequest, res: NextApiResponse, action: string) {
  const { id } = req.query;
  const data = req.body;
  if (!id) return res.status(400).json(fail('MISSING_ID', 'ID is required'));

  const buildUpdate = (fieldMap: Record<string, string>, data: any) => {
    const fields: string[] = [];
    const replacements: any = { id };
    for (const [key, col] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) { fields.push(`${col} = :${key}`); replacements[key] = data[key]; }
    }
    return { fields, replacements };
  };

  switch (action) {
    case 'vendors': {
      const { fields, replacements } = buildUpdate({
        name: 'name', legalName: 'legal_name', vendorType: 'vendor_type', category: 'category',
        status: 'status', address: 'address', city: 'city', province: 'province', phone: 'phone',
        email: 'email', contactPerson: 'contact_person', contactPhone: 'contact_phone',
        bankName: 'bank_name', bankAccount: 'bank_account', paymentTerms: 'payment_terms',
        rating: 'rating', notes: 'notes'
      }, data);
      if (fields.length === 0) return res.status(400).json(fail('NO_FIELDS', 'No fields'));
      fields.push('updated_at = NOW()');
      const [result] = await sequelize.query(`UPDATE epr_vendors SET ${fields.join(', ')} WHERE id = :id RETURNING *`, { replacements });
      return res.status(200).json(ok(result[0]));
    }
    case 'rfqs': {
      const { fields, replacements } = buildUpdate({
        title: 'title', description: 'description', status: 'status', priority: 'priority',
        closingDate: 'closing_date', estimatedBudget: 'estimated_budget', termsConditions: 'terms_conditions'
      }, data);
      if (fields.length === 0) return res.status(400).json(fail('NO_FIELDS', 'No fields'));
      fields.push('updated_at = NOW()');
      const [result] = await sequelize.query(`UPDATE epr_rfqs SET ${fields.join(', ')} WHERE id = :id RETURNING *`, { replacements });
      return res.status(200).json(ok(result[0]));
    }
    case 'tenders': {
      const { fields, replacements } = buildUpdate({
        title: 'title', description: 'description', status: 'status', tenderType: 'tender_type',
        estimatedValue: 'estimated_value', submissionDeadline: 'submission_deadline',
        winnerId: 'winner_id', winnerName: 'winner_name', notes: 'notes'
      }, data);
      if (fields.length === 0) return res.status(400).json(fail('NO_FIELDS', 'No fields'));
      fields.push('updated_at = NOW()');
      const [result] = await sequelize.query(`UPDATE epr_tenders SET ${fields.join(', ')} WHERE id = :id RETURNING *`, { replacements });
      return res.status(200).json(ok(result[0]));
    }
    case 'procurement-requests': {
      const { fields, replacements } = buildUpdate({
        title: 'title', description: 'description', status: 'status', priority: 'priority',
        neededDate: 'needed_date', estimatedBudget: 'estimated_budget', justification: 'justification'
      }, data);
      if (fields.length === 0) return res.status(400).json(fail('NO_FIELDS', 'No fields'));
      fields.push('updated_at = NOW()');
      const [result] = await sequelize.query(`UPDATE epr_procurement_requests SET ${fields.join(', ')} WHERE id = :id RETURNING *`, { replacements });
      return res.status(200).json(ok(result[0]));
    }
    case 'contracts': {
      const { fields, replacements } = buildUpdate({
        title: 'title', status: 'status', contractType: 'contract_type', startDate: 'start_date',
        endDate: 'end_date', totalValue: 'total_value', paymentTerms: 'payment_terms',
        deliveryTerms: 'delivery_terms', autoRenew: 'auto_renew', notes: 'notes'
      }, data);
      if (fields.length === 0) return res.status(400).json(fail('NO_FIELDS', 'No fields'));
      fields.push('updated_at = NOW()');
      const [result] = await sequelize.query(`UPDATE epr_contracts SET ${fields.join(', ')} WHERE id = :id RETURNING *`, { replacements });
      return res.status(200).json(ok(result[0]));
    }
    case 'rfq-responses': {
      const { fields, replacements } = buildUpdate({
        status: 'status', technicalScore: 'technical_score', priceScore: 'price_score', totalScore: 'total_score'
      }, data);
      if (fields.length === 0) return res.status(400).json(fail('NO_FIELDS', 'No fields'));
      fields.push('updated_at = NOW()');
      const [result] = await sequelize.query(`UPDATE epr_rfq_responses SET ${fields.join(', ')} WHERE id = :id RETURNING *`, { replacements });
      return res.status(200).json(ok(result[0]));
    }
    case 'tender-bids': {
      const { fields, replacements } = buildUpdate({
        status: 'status', technicalScore: 'technical_score', priceScore: 'price_score',
        totalScore: 'total_score', evaluationNotes: 'evaluation_notes'
      }, data);
      if (fields.length === 0) return res.status(400).json(fail('NO_FIELDS', 'No fields'));
      fields.push('updated_at = NOW()');
      const [result] = await sequelize.query(`UPDATE epr_tender_bids SET ${fields.join(', ')} WHERE id = :id RETURNING *`, { replacements });
      return res.status(200).json(ok(result[0]));
    }
    case 'purchase-orders': {
      const { fields, replacements } = buildUpdate({
        title: 'title', description: 'description', status: 'status', priority: 'priority',
        vendorId: 'vendor_id', vendorName: 'vendor_name', orderDate: 'order_date',
        expectedDelivery: 'expected_delivery', actualDelivery: 'actual_delivery',
        subtotal: 'subtotal', discountAmount: 'discount_amount', taxAmount: 'tax_amount',
        shippingCost: 'shipping_cost', totalAmount: 'total_amount',
        paymentTerms: 'payment_terms', deliveryTerms: 'delivery_terms',
        deliveryAddress: 'delivery_address', department: 'department', budgetCode: 'budget_code',
        internalNotes: 'internal_notes', vendorNotes: 'vendor_notes',
        approvalStatus: 'approval_status', sentToVendor: 'sent_to_vendor',
        receivedPercent: 'received_percent', invoicedPercent: 'invoiced_percent'
      }, data);
      if (fields.length === 0) return res.status(400).json(fail('NO_FIELDS', 'No fields'));
      fields.push('updated_at = NOW()');
      const [result] = await sequelize.query(`UPDATE epr_purchase_orders SET ${fields.join(', ')} WHERE id = :id RETURNING *`, { replacements });
      // Audit trail for status change
      if (data.status) {
        await sequelize.query(`INSERT INTO epr_audit_trail (id, entity_type, entity_id, action, field_name, new_value, description, performed_by_name, created_at)
          VALUES (gen_random_uuid(), 'purchase_order', :id, 'status_change', 'status', :status, :desc, :by, NOW())`,
          { replacements: { id, status: data.status, desc: `Status changed to ${data.status}`, by: data.updatedBy || 'System' }}).catch(() => {});
      }
      return res.status(200).json(ok(result[0]));
    }
    case 'goods-receipts': {
      const { fields, replacements } = buildUpdate({
        status: 'status', inspectionStatus: 'inspection_status', inspectionNotes: 'inspection_notes',
        qualityCheckPassed: 'quality_check_passed', inspectedByName: 'inspected_by_name',
        totalItems: 'total_items', totalReceived: 'total_received', totalRejected: 'total_rejected'
      }, data);
      if (fields.length === 0) return res.status(400).json(fail('NO_FIELDS', 'No fields'));
      fields.push('updated_at = NOW()');
      const [result] = await sequelize.query(`UPDATE epr_goods_receipts SET ${fields.join(', ')} WHERE id = :id RETURNING *`, { replacements });
      return res.status(200).json(ok(result[0]));
    }
    case 'invoices': {
      const { fields, replacements } = buildUpdate({
        status: 'status', matchStatus: 'match_status', poMatch: 'po_match', grnMatch: 'grn_match',
        paidAmount: 'paid_amount', paymentDate: 'payment_date', paymentReference: 'payment_reference',
        paymentMethod: 'payment_method', approvalStatus: 'approval_status',
        priceVariance: 'price_variance', quantityVariance: 'quantity_variance'
      }, data);
      if (fields.length === 0) return res.status(400).json(fail('NO_FIELDS', 'No fields'));
      fields.push('updated_at = NOW()');
      const [result] = await sequelize.query(`UPDATE epr_invoices SET ${fields.join(', ')} WHERE id = :id RETURNING *`, { replacements });
      return res.status(200).json(ok(result[0]));
    }
    case 'approvals': {
      const { fields, replacements } = buildUpdate({
        status: 'status', decision: 'decision', comments: 'comments',
        delegatedToName: 'delegated_to_name'
      }, data);
      if (data.decision) { fields.push('decided_at = NOW()'); }
      if (fields.length === 0) return res.status(400).json(fail('NO_FIELDS', 'No fields'));
      fields.push('updated_at = NOW()');
      const [result] = await sequelize.query(`UPDATE epr_approvals SET ${fields.join(', ')} WHERE id = :id RETURNING *`, { replacements });
      return res.status(200).json(ok(result[0]));
    }
    case 'budget-allocations': {
      const { fields, replacements } = buildUpdate({
        allocatedAmount: 'allocated_amount', committedAmount: 'committed_amount',
        spentAmount: 'spent_amount', remainingAmount: 'remaining_amount',
        status: 'status', notes: 'notes'
      }, data);
      if (fields.length === 0) return res.status(400).json(fail('NO_FIELDS', 'No fields'));
      fields.push('updated_at = NOW()');
      const [result] = await sequelize.query(`UPDATE epr_budget_allocations SET ${fields.join(', ')} WHERE id = :id RETURNING *`, { replacements });
      return res.status(200).json(ok(result[0]));
    }
    default:
      return res.status(400).json(fail('INVALID_ACTION', `Unknown PUT action: ${action}`));
  }
}

// ==========================================
// DELETE HANDLERS
// ==========================================
async function handleDelete(req: NextApiRequest, res: NextApiResponse, action: string) {
  const { id } = req.query;
  if (!id) return res.status(400).json(fail('MISSING_ID', 'ID is required'));

  const tableMap: Record<string, string> = {
    vendors: 'epr_vendors', rfqs: 'epr_rfqs', 'rfq-items': 'epr_rfq_items',
    'rfq-responses': 'epr_rfq_responses', tenders: 'epr_tenders', 'tender-bids': 'epr_tender_bids',
    'procurement-requests': 'epr_procurement_requests', contracts: 'epr_contracts', evaluations: 'epr_evaluations',
    'purchase-orders': 'epr_purchase_orders', 'po-items': 'epr_po_items',
    'goods-receipts': 'epr_goods_receipts', 'grn-items': 'epr_grn_items',
    invoices: 'epr_invoices', 'invoice-items': 'epr_invoice_items',
    approvals: 'epr_approvals', 'budget-allocations': 'epr_budget_allocations'
  };

  const table = tableMap[action];
  if (!table) return res.status(400).json(fail('INVALID_ACTION', `Unknown DELETE action: ${action}`));

  await sequelize.query(`DELETE FROM ${table} WHERE id = :id`, { replacements: { id } });
  return res.status(200).json(ok({ deleted: true }));
}
