import type { NextApiRequest, NextApiResponse } from 'next';
const sequelize = require('../../../../lib/sequelize');
import { successResponse, errorResponse } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { getTenantContext, buildTenantFilter } from '../../../../lib/middleware/tenantIsolation';
import { logAudit } from '../../../../lib/audit/auditLogger';
import { validateBody, V, sanitizeBody } from '../../../../lib/middleware/withValidation';
import { checkLimit, RateLimitTier } from '../../../../lib/middleware/rateLimit';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET': return await getInvoices(req, res);
      case 'POST': return await createInvoice(req, res);
      case 'PUT': return await updateInvoice(req, res);
      case 'DELETE': return await deleteInvoice(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} Not Allowed`));
    }
  } catch (error: any) {
    console.error('Finance Invoices API Error:', error);
    return res.status(500).json(errorResponse('INTERNAL_SERVER_ERROR', error.message || 'Internal server error'));
  }
}

export default withHQAuth(handler, { module: 'finance_pro' });

async function getInvoices(req: NextApiRequest, res: NextApiResponse) {
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId, 'fi');
  const { search, status, branchId, startDate, endDate, type, page = '1', limit: rawLimit = '20' } = req.query;
  const limit = String(Math.min(parseInt(rawLimit as string) || 20, 100));
  let where = 'WHERE 1=1' + tf.condition;
  const replacements: any = { ...tf.replacements };

  if (search) { where += ' AND (fi.invoice_number ILIKE :search OR s.name ILIKE :search)'; replacements.search = `%${search}%`; }
  if (status && status !== 'all') { where += ' AND fi.status = :status'; replacements.status = status; }
  if (type && type !== 'all') { where += ' AND fi.type = :type'; replacements.type = type; }
  if (branchId && branchId !== 'all') { where += ' AND fi.branch_id = :branchId'; replacements.branchId = branchId; }
  if (startDate && endDate) { where += ' AND fi.issue_date BETWEEN :startDate AND :endDate'; replacements.startDate = startDate; replacements.endDate = endDate; }

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  const [countResult] = await sequelize.query(`SELECT COUNT(*) as total FROM finance_invoices fi LEFT JOIN suppliers s ON fi.supplier_id = s.id ${where}`, { replacements });
  const [rows] = await sequelize.query(`
    SELECT fi.*, b.name as branch_name,
      COALESCE(c.name, '') as customer_name, COALESCE(s.name, '') as supplier_name,
      (SELECT COALESCE(SUM(fii.total), 0) FROM finance_invoice_items fii WHERE fii.invoice_id = fi.id) as items_total,
      (SELECT COUNT(*) FROM finance_invoice_items fii WHERE fii.invoice_id = fi.id) as item_count
    FROM finance_invoices fi
    LEFT JOIN branches b ON fi.branch_id = b.id
    LEFT JOIN customers c ON fi.customer_id = c.id
    LEFT JOIN suppliers s ON fi.supplier_id = s.id
    ${where}
    ORDER BY fi.created_at DESC
    LIMIT :limit OFFSET :offset
  `, { replacements: { ...replacements, limit: parseInt(limit as string), offset } });

  return res.status(200).json(successResponse(rows, {
    total: parseInt(countResult[0]?.total || '0'),
    page: parseInt(page as string),
    limit: parseInt(limit as string),
    totalPages: Math.ceil(parseInt(countResult[0]?.total || '0') / parseInt(limit as string))
  }));
}

async function createInvoice(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  sanitizeBody(req);
  const errors = validateBody(req, {
    type: V.required().oneOf(['sales', 'purchase', 'internal']),
    issue_date: V.required().date(),
    total_amount: V.required().number().min(0),
  });
  if (errors) return res.status(400).json(errors);

  const ctx = getTenantContext(req);
  const { branch_id, type, customer_id, supplier_id, issue_date, due_date, subtotal, tax_amount, discount_amount, total_amount, notes, items } = req.body;

  const t = await sequelize.transaction();
  try {
    const prefix = type === 'sales' ? 'INV' : type === 'purchase' ? 'PINV' : 'IBINV';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const tf = buildTenantFilter(ctx.tenantId);
    // Use FOR UPDATE to prevent race condition on concurrent invoice number generation
    const [countRes] = await sequelize.query(`SELECT COUNT(*) as c FROM finance_invoices WHERE invoice_number LIKE :prefix ${tf.condition} FOR UPDATE`, { replacements: { prefix: `${prefix}-${dateStr}%`, ...tf.replacements }, transaction: t });
    const invoiceNumber = `${prefix}-${dateStr}-${String(parseInt(countRes[0]?.c || '0') + 1).padStart(4, '0')}`;

    const [inv] = await sequelize.query(`
      INSERT INTO finance_invoices (tenant_id, branch_id, invoice_number, type, customer_id, supplier_id, issue_date, due_date, subtotal, tax_amount, discount_amount, total_amount, paid_amount, status, notes, created_by)
      VALUES (:tenant_id, :branch_id, :invoice_number, :type, :customer_id, :supplier_id, :issue_date, :due_date, :subtotal, :tax_amount, :discount_amount, :total_amount, 0, 'draft', :notes, :created_by)
      RETURNING *
    `, { replacements: { tenant_id: ctx.tenantId, branch_id: branch_id || null, invoice_number: invoiceNumber, type, customer_id: customer_id || null, supplier_id: supplier_id || null, issue_date, due_date: due_date || null, subtotal: subtotal || 0, tax_amount: tax_amount || 0, discount_amount: discount_amount || 0, total_amount, notes: notes || null, created_by: ctx.userId }, transaction: t });

    if (items && items.length > 0) {
      for (const item of items) {
        await sequelize.query(`
          INSERT INTO finance_invoice_items (invoice_id, product_id, description, quantity, unit_price, discount, tax, total)
          VALUES (:invoice_id, :product_id, :description, :quantity, :unit_price, :discount, :tax, :total)
        `, { replacements: { invoice_id: inv[0].id, product_id: item.product_id || null, description: item.description || '', quantity: item.quantity || 1, unit_price: item.unit_price || 0, discount: item.discount || 0, tax: item.tax || 0, total: item.total || 0 }, transaction: t });
      }
    }

    await t.commit();
    await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'create', entityType: 'finance_invoice', entityId: inv[0]?.id, newValues: { invoiceNumber, type, total_amount, items: items?.length || 0 }, req });
    return res.status(201).json(successResponse(inv[0], undefined, 'Invoice created'));
  } catch (error: any) {
    await t.rollback();
    throw error;
  }
}

async function updateInvoice(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  sanitizeBody(req);
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId);
  const { id } = req.query;
  if (!id) return res.status(400).json(errorResponse('VALIDATION', 'ID required'));

  const [oldRows] = await sequelize.query(`SELECT * FROM finance_invoices WHERE id = :id ${tf.condition}`, { replacements: { id, ...tf.replacements } });
  if (!oldRows[0]) return res.status(404).json(errorResponse('NOT_FOUND', 'Invoice not found'));

  const oldInvoice = oldRows[0];
  const { status, payment_amount, paid_amount, notes, due_date, idempotency_key } = req.body;

  // Idempotency check for payment operations (scoped to tenant)
  if (idempotency_key) {
    const [existing] = await sequelize.query(
      `SELECT fip.id FROM finance_invoice_payments fip
       JOIN finance_invoices fi ON fip.invoice_id = fi.id
       WHERE fip.idempotency_key = :key ${tf.condition.replace(/tenant_id/g, 'fi.tenant_id')} LIMIT 1`,
      { replacements: { key: idempotency_key, ...tf.replacements } }
    );
    if (existing && existing.length > 0) {
      return res.status(200).json(successResponse(oldInvoice, undefined, 'Payment already processed (idempotent)'));
    }
  }

  const sets: string[] = [];
  const replacements: any = { id, ...tf.replacements };

  // Handle payment: accumulate paid_amount instead of overwriting
  if (payment_amount !== undefined && payment_amount > 0) {
    if (oldInvoice.status === 'paid') {
      return res.status(400).json(errorResponse('VALIDATION', 'Invoice already fully paid'));
    }
    if (oldInvoice.status === 'cancelled') {
      return res.status(400).json(errorResponse('VALIDATION', 'Cannot pay a cancelled invoice'));
    }

    const currentPaid = parseFloat(oldInvoice.paid_amount || '0');
    const totalAmount = parseFloat(oldInvoice.total_amount || '0');
    const newPaidTotal = currentPaid + parseFloat(payment_amount);

    if (newPaidTotal > totalAmount) {
      return res.status(400).json(errorResponse('VALIDATION', `Payment of ${payment_amount} exceeds remaining balance of ${totalAmount - currentPaid}`));
    }

    sets.push('paid_amount = paid_amount + :payment_amount');
    replacements.payment_amount = parseFloat(payment_amount);

    // Auto-detect status based on accumulated payment
    if (newPaidTotal >= totalAmount) {
      sets.push("status = 'paid'");
    } else if (newPaidTotal > 0) {
      sets.push("status = 'partial'");
    }
  } else if (paid_amount !== undefined) {
    // Legacy: direct set (for backward compatibility, but prefer payment_amount)
    sets.push('paid_amount = :paid_amount');
    replacements.paid_amount = paid_amount;
  }

  if (status && payment_amount === undefined) { sets.push('status = :status'); replacements.status = status; }
  if (notes !== undefined) { sets.push('notes = :notes'); replacements.notes = notes; }
  if (due_date) { sets.push('due_date = :due_date'); replacements.due_date = due_date; }
  sets.push('updated_at = NOW()');

  const [rows] = await sequelize.query(`UPDATE finance_invoices SET ${sets.join(', ')} WHERE id = :id ${tf.condition} RETURNING *`, { replacements });
  if (!rows[0]) return res.status(404).json(errorResponse('NOT_FOUND', 'Invoice not found'));

  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'update', entityType: 'finance_invoice', entityId: id as string, oldValues: oldInvoice, newValues: { status: rows[0].status, paid_amount: rows[0].paid_amount, payment_amount, notes, due_date }, req });
  return res.status(200).json(successResponse(rows[0], undefined, 'Invoice updated'));
}

async function deleteInvoice(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId);
  const { id } = req.query;
  if (!id) return res.status(400).json(errorResponse('VALIDATION', 'ID required'));

  const [rows] = await sequelize.query(`UPDATE finance_invoices SET status = 'cancelled', updated_at = NOW() WHERE id = :id AND status != 'paid' ${tf.condition} RETURNING *`, { replacements: { id, ...tf.replacements } });
  if (!rows[0]) return res.status(404).json(errorResponse('NOT_FOUND', 'Invoice not found or already paid'));

  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'delete', entityType: 'finance_invoice', entityId: id as string, oldValues: rows[0], req });
  return res.status(200).json(successResponse(rows[0], undefined, 'Invoice cancelled'));
}
