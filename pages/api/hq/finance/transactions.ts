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
      case 'GET': return await getTransactions(req, res);
      case 'POST': return await createTransaction(req, res);
      case 'PUT': return await updateTransaction(req, res);
      case 'DELETE': return await deleteTransaction(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} Not Allowed`));
    }
  } catch (error: any) {
    console.error('Finance Transactions API Error:', error);
    return res.status(500).json(errorResponse('INTERNAL_SERVER_ERROR', error.message || 'Internal server error'));
  }
}

export default withHQAuth(handler, { module: ['finance_pro', 'finance_lite'] });

async function getTransactions(req: NextApiRequest, res: NextApiResponse) {
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId, 'ft');
  const { search, type, status, startDate, endDate, page = '1', limit: rawLimit = '20' } = req.query;
  const limit = String(Math.min(parseInt(rawLimit as string) || 20, 100));
  let where = 'WHERE 1=1' + tf.condition;
  const replacements: any = { ...tf.replacements };

  if (search) { where += ` AND (ft."transactionNumber" ILIKE :search OR ft.description ILIKE :search OR ft."contactName" ILIKE :search)`; replacements.search = `%${search}%`; }
  if (type && type !== 'all') { where += ` AND ft."transactionType" = :type`; replacements.type = type; }
  if (status && status !== 'all') { where += ' AND ft.status = :status'; replacements.status = status; }
  if (startDate && endDate) { where += ` AND ft."transactionDate" BETWEEN :startDate AND :endDate`; replacements.startDate = startDate; replacements.endDate = endDate; }

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  const [countResult] = await sequelize.query(`SELECT COUNT(*) as total FROM finance_transactions ft ${where}`, { replacements });
  const [rows] = await sequelize.query(`
    SELECT ft.*,
      fa."accountName" as account_name, fa."accountNumber" as account_code
    FROM finance_transactions ft
    LEFT JOIN finance_accounts fa ON ft."accountId" = fa.id
    ${where}
    ORDER BY ft."transactionDate" DESC
    LIMIT :limit OFFSET :offset
  `, { replacements: { ...replacements, limit: parseInt(limit as string), offset } });

  return res.status(200).json(successResponse(rows, {
    total: parseInt(countResult[0]?.total || '0'),
    page: parseInt(page as string),
    limit: parseInt(limit as string),
    totalPages: Math.ceil(parseInt(countResult[0]?.total || '0') / parseInt(limit as string))
  }));
}

async function createTransaction(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  sanitizeBody(req);
  const errors = validateBody(req, {
    transactionType: V.required().oneOf(['income', 'expense', 'transfer']),
    amount: V.required().number().min(0),
    description: V.required().string().maxLength(500),
  });
  if (errors) return res.status(400).json(errors);

  const ctx = getTenantContext(req);
  const { transactionType, accountId, category, subcategory, amount, description, referenceType, referenceId, paymentMethod, contactId, contactName, notes, tags, expense_type } = req.body;

  if (parseFloat(amount) <= 0) {
    return res.status(400).json(errorResponse('VALIDATION', 'Amount must be greater than zero'));
  }

  const t = await sequelize.transaction();
  try {
    const prefix = transactionType === 'income' ? 'INC' : transactionType === 'expense' ? 'EXP' : 'TRF';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const tf = buildTenantFilter(ctx.tenantId);
    // Use FOR UPDATE to prevent race condition on concurrent inserts
    const [countRes] = await sequelize.query(
      `SELECT COUNT(*) as c FROM finance_transactions WHERE "transactionNumber" LIKE :prefix ${tf.condition} FOR UPDATE`,
      { replacements: { prefix: `${prefix}-${dateStr}%`, ...tf.replacements }, transaction: t }
    );
    const txnNumber = `${prefix}-${dateStr}-${String(parseInt(countRes[0]?.c || '0') + 1).padStart(4, '0')}`;

    const [rows] = await sequelize.query(`
      INSERT INTO finance_transactions (tenant_id, "transactionNumber", "transactionDate", "transactionType", "accountId", category, subcategory, amount, description, "referenceType", "referenceId", "paymentMethod", "contactId", "contactName", notes, tags, expense_type, status, "createdBy", "isActive", "createdAt", "updatedAt")
      VALUES (:tenantId, :txnNumber, NOW(), :transactionType, :accountId, :category, :subcategory, :amount, :description, :referenceType, :referenceId, :paymentMethod, :contactId, :contactName, :notes, :tags, :expenseType, 'draft', :createdBy, true, NOW(), NOW())
      RETURNING *
    `, { replacements: { tenantId: ctx.tenantId, txnNumber, transactionType, accountId: accountId || null, category: category || null, subcategory: subcategory || null, amount, description, referenceType: referenceType || null, referenceId: referenceId || null, paymentMethod: paymentMethod || null, contactId: contactId || null, contactName: contactName || null, notes: notes || null, tags: tags ? JSON.stringify(tags) : null, expenseType: (transactionType === 'expense' && expense_type) ? expense_type : null, createdBy: ctx.userId }, transaction: t });

    await t.commit();

    await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'create', entityType: 'finance_transaction', entityId: rows[0]?.id, newValues: { txnNumber, transactionType, amount, description }, req });

    return res.status(201).json(successResponse(rows[0], undefined, 'Transaction created'));
  } catch (error: any) {
    await t.rollback();
    throw error;
  }
}

async function updateTransaction(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  sanitizeBody(req);
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId);
  const { id } = req.query;
  if (!id) return res.status(400).json(errorResponse('VALIDATION', 'ID required'));

  // Fetch old values for audit diff
  const [oldRows] = await sequelize.query(`SELECT * FROM finance_transactions WHERE id = :id ${tf.condition}`, { replacements: { id, ...tf.replacements } });
  if (!oldRows[0]) return res.status(404).json(errorResponse('NOT_FOUND', 'Transaction not found'));

  const { status, description, amount, notes, category } = req.body;
  const sets: string[] = [];
  const replacements: any = { id, ...tf.replacements };

  if (status) { sets.push('status = :status'); replacements.status = status; }
  if (description) { sets.push('description = :description'); replacements.description = description; }
  if (amount !== undefined) { sets.push('amount = :amount'); replacements.amount = amount; }
  if (notes !== undefined) { sets.push('notes = :notes'); replacements.notes = notes; }
  if (category) { sets.push('category = :category'); replacements.category = category; }
  sets.push('"updatedAt" = NOW()');

  const [rows] = await sequelize.query(`UPDATE finance_transactions SET ${sets.join(', ')} WHERE id = :id ${tf.condition} RETURNING *`, { replacements });
  if (!rows[0]) return res.status(404).json(errorResponse('NOT_FOUND', 'Transaction not found'));

  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'update', entityType: 'finance_transaction', entityId: id as string, oldValues: oldRows[0], newValues: { status, description, amount, notes, category }, req });

  return res.status(200).json(successResponse(rows[0], undefined, 'Transaction updated'));
}

async function deleteTransaction(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId);
  const { id } = req.query;
  if (!id) return res.status(400).json(errorResponse('VALIDATION', 'ID required'));

  const [rows] = await sequelize.query(`UPDATE finance_transactions SET status = 'cancelled', "updatedAt" = NOW() WHERE id = :id AND status != 'completed' ${tf.condition} RETURNING *`, { replacements: { id, ...tf.replacements } });
  if (!rows[0]) return res.status(404).json(errorResponse('NOT_FOUND', 'Transaction not found or completed'));

  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'delete', entityType: 'finance_transaction', entityId: id as string, oldValues: rows[0], req });

  return res.status(200).json(successResponse(rows[0], undefined, 'Transaction cancelled'));
}
