import type { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { getTenantContext, buildTenantFilter } from '../../../../lib/middleware/tenantIsolation';
import { checkLimit, RateLimitTier } from '../../../../lib/middleware/rateLimit';
import { sanitizeBody } from '../../../../lib/middleware/withValidation';
import { logAudit } from '../../../../lib/audit/auditLogger';

const sequelize = require('../../../../lib/sequelize');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET': return await getJournalEntries(req, res);
      case 'POST': return await createJournalEntry(req, res);
      case 'PUT': return await updateJournalEntry(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
          errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
        );
    }
  } catch (error: any) {
    console.error('Journal API Error:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, error.message || 'Internal server error')
    );
  }
}

export default withHQAuth(handler, { module: 'finance_pro' });

// ─── GET: List journal entries ───
async function getJournalEntries(req: NextApiRequest, res: NextApiResponse) {
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId);
  const { id, status, startDate, endDate, page = '1', limit = '20' } = req.query;

  // Single entry with lines
  if (id) {
    const [rows] = await sequelize.query(
      `SELECT je.*, 
        COALESCE(json_agg(
          json_build_object(
            'id', jl.id, 'account_id', jl.account_id, 'account_number', jl.account_number,
            'account_name', jl.account_name, 'debit', jl.debit, 'credit', jl.credit,
            'description', jl.description, 'line_order', jl.line_order
          ) ORDER BY jl.line_order
        ) FILTER (WHERE jl.id IS NOT NULL), '[]') as lines
       FROM journal_entries je
       LEFT JOIN journal_entry_lines jl ON jl.journal_entry_id = je.id
       WHERE je.id = :id ${tf.condition.replace(/tenant_id/g, 'je.tenant_id')}
       GROUP BY je.id`,
      { replacements: { id, ...tf.replacements } }
    );
    if (!rows[0]) return res.status(404).json(errorResponse('NOT_FOUND', 'Journal entry not found'));
    return res.status(200).json(successResponse(rows[0]));
  }

  // List with filters
  const conditions = [`1=1 ${tf.condition}`];
  const replacements: any = { ...tf.replacements };

  if (status && status !== 'all') {
    conditions.push('status = :status');
    replacements.status = status;
  }
  if (startDate) {
    conditions.push('entry_date >= :startDate');
    replacements.startDate = startDate;
  }
  if (endDate) {
    conditions.push('entry_date <= :endDate');
    replacements.endDate = endDate;
  }

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  const where = conditions.join(' AND ');

  const [countRes] = await sequelize.query(
    `SELECT COUNT(*) as total FROM journal_entries WHERE ${where}`,
    { replacements }
  );
  const total = parseInt(countRes[0]?.total || '0');

  const [rows] = await sequelize.query(
    `SELECT je.*, 
      (SELECT COUNT(*) FROM journal_entry_lines WHERE journal_entry_id = je.id) as line_count
     FROM journal_entries je
     WHERE ${where}
     ORDER BY je.entry_date DESC, je.created_at DESC
     LIMIT :limit OFFSET :offset`,
    { replacements: { ...replacements, limit: parseInt(limit as string), offset } }
  );

  return res.status(200).json(successResponse(rows, {
    page: parseInt(page as string), limit: parseInt(limit as string), total
  }));
}

// ─── POST: Create journal entry with balanced lines ───
async function createJournalEntry(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  sanitizeBody(req);

  const ctx = getTenantContext(req);
  const { description, entry_date, reference_type, reference_id, lines, notes, tags, auto_post } = req.body;

  // Validate required fields
  if (!description || !entry_date || !lines || !Array.isArray(lines) || lines.length < 2) {
    return res.status(400).json(errorResponse('VALIDATION', 'description, entry_date, and at least 2 lines are required'));
  }

  // Validate double-entry balance: total debit MUST equal total credit
  let totalDebit = 0;
  let totalCredit = 0;
  for (const line of lines) {
    if (!line.account_id) {
      return res.status(400).json(errorResponse('VALIDATION', 'Each line must have an account_id'));
    }
    const debit = parseFloat(line.debit || 0);
    const credit = parseFloat(line.credit || 0);
    if (debit < 0 || credit < 0) {
      return res.status(400).json(errorResponse('VALIDATION', 'Debit and credit amounts cannot be negative'));
    }
    if (debit === 0 && credit === 0) {
      return res.status(400).json(errorResponse('VALIDATION', 'Each line must have either a debit or credit amount'));
    }
    if (debit > 0 && credit > 0) {
      return res.status(400).json(errorResponse('VALIDATION', 'A line cannot have both debit and credit'));
    }
    totalDebit += debit;
    totalCredit += credit;
  }

  // Check balance with tolerance for floating point (use 4 decimal places)
  const diff = Math.abs(totalDebit - totalCredit);
  if (diff > 0.0001) {
    return res.status(400).json(errorResponse('VALIDATION',
      `Journal entry is NOT balanced. Total Debit: ${totalDebit.toFixed(4)}, Total Credit: ${totalCredit.toFixed(4)}, Difference: ${diff.toFixed(4)}`
    ));
  }

  const t = await sequelize.transaction();
  try {
    // Generate entry number
    const dateStr = new Date(entry_date).toISOString().slice(0, 7).replace(/-/g, '');
    const tf = buildTenantFilter(ctx.tenantId);
    const [countRes] = await sequelize.query(
      `SELECT COUNT(*) as c FROM journal_entries WHERE entry_number LIKE :prefix ${tf.condition} FOR UPDATE`,
      { replacements: { prefix: `JE-${dateStr}%`, ...tf.replacements }, transaction: t }
    );
    const entryNumber = `JE-${dateStr}-${String(parseInt(countRes[0]?.c || '0') + 1).padStart(4, '0')}`;

    const status = auto_post ? 'posted' : 'draft';
    const postedAt = auto_post ? 'NOW()' : 'NULL';

    // Insert journal entry
    const [jeRows] = await sequelize.query(`
      INSERT INTO journal_entries (tenant_id, entry_number, entry_date, description, reference_type, reference_id, status, total_debit, total_credit, posted_at, posted_by, created_by, notes, tags, created_at, updated_at)
      VALUES (:tenantId, :entryNumber, :entryDate, :description, :referenceType, :referenceId, :status, :totalDebit, :totalCredit, ${postedAt}, ${auto_post ? ':userId' : 'NULL'}, :userId, :notes, :tags, NOW(), NOW())
      RETURNING *
    `, {
      replacements: {
        tenantId: ctx.tenantId, entryNumber, entryDate: entry_date, description,
        referenceType: reference_type || null, referenceId: reference_id || null,
        status, totalDebit, totalCredit, userId: ctx.userId,
        notes: notes || null, tags: tags ? JSON.stringify(tags) : null
      },
      transaction: t
    });

    const journalEntryId = jeRows[0].id;

    // Insert lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Resolve account details
      const [accRows] = await sequelize.query(
        `SELECT "accountNumber", "accountName" FROM finance_accounts WHERE id = :accId LIMIT 1`,
        { replacements: { accId: line.account_id }, transaction: t }
      );
      const accNum = accRows[0]?.accountNumber || line.account_number || '';
      const accName = accRows[0]?.accountName || line.account_name || '';

      await sequelize.query(`
        INSERT INTO journal_entry_lines (journal_entry_id, account_id, account_number, account_name, debit, credit, description, line_order, created_at)
        VALUES (:journalEntryId, :accountId, :accountNumber, :accountName, :debit, :credit, :description, :lineOrder, NOW())
      `, {
        replacements: {
          journalEntryId, accountId: line.account_id, accountNumber: accNum,
          accountName: accName, debit: parseFloat(line.debit || 0),
          credit: parseFloat(line.credit || 0), description: line.description || null,
          lineOrder: i
        },
        transaction: t
      });
    }

    // If auto-posting, update account balances
    if (auto_post) {
      for (const line of lines) {
        const debit = parseFloat(line.debit || 0);
        const credit = parseFloat(line.credit || 0);
        // For asset & expense accounts: debit increases, credit decreases
        // For liability, equity & revenue: credit increases, debit decreases
        // Simplified: update balance = balance + debit - credit for asset/expense
        //             update balance = balance + credit - debit for liability/equity/revenue
        const [accType] = await sequelize.query(
          `SELECT "accountType" FROM finance_accounts WHERE id = :accId LIMIT 1`,
          { replacements: { accId: line.account_id }, transaction: t }
        );
        if (accType[0]) {
          const type = accType[0].accountType;
          const normalDebit = ['asset', 'expense'].includes(type);
          const delta = normalDebit ? (debit - credit) : (credit - debit);
          await sequelize.query(
            `UPDATE finance_accounts SET balance = balance + :delta, "updatedAt" = NOW() WHERE id = :accId`,
            { replacements: { delta, accId: line.account_id }, transaction: t }
          );
        }
      }
    }

    await t.commit();

    await logAudit({
      tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName,
      action: 'create', entityType: 'journal_entry', entityId: journalEntryId,
      newValues: { entryNumber, description, totalDebit, totalCredit, status, lineCount: lines.length },
      req
    });

    return res.status(201).json(successResponse(jeRows[0], undefined, 'Journal entry created'));
  } catch (error: any) {
    await t.rollback();
    throw error;
  }
}

// ─── PUT: Post or void a journal entry ───
async function updateJournalEntry(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  sanitizeBody(req);

  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId);
  const { id } = req.query;
  const { action, void_reason } = req.body;

  if (!id) return res.status(400).json(errorResponse('VALIDATION', 'ID required'));
  if (!action || !['post', 'void'].includes(action)) {
    return res.status(400).json(errorResponse('VALIDATION', 'action must be "post" or "void"'));
  }

  const [oldRows] = await sequelize.query(
    `SELECT * FROM journal_entries WHERE id = :id ${tf.condition}`,
    { replacements: { id, ...tf.replacements } }
  );
  if (!oldRows[0]) return res.status(404).json(errorResponse('NOT_FOUND', 'Journal entry not found'));
  const entry = oldRows[0];

  if (action === 'post') {
    if (entry.status !== 'draft') {
      return res.status(400).json(errorResponse('VALIDATION', `Cannot post entry with status "${entry.status}"`));
    }

    const t = await sequelize.transaction();
    try {
      // Update entry status
      await sequelize.query(
        `UPDATE journal_entries SET status = 'posted', posted_at = NOW(), posted_by = :userId, updated_at = NOW() WHERE id = :id`,
        { replacements: { id, userId: ctx.userId }, transaction: t }
      );

      // Update account balances
      const [lines] = await sequelize.query(
        `SELECT jl.*, fa."accountType" FROM journal_entry_lines jl 
         LEFT JOIN finance_accounts fa ON fa.id = jl.account_id
         WHERE jl.journal_entry_id = :id`,
        { replacements: { id }, transaction: t }
      );

      for (const line of lines) {
        const normalDebit = ['asset', 'expense'].includes(line.accountType);
        const delta = normalDebit
          ? (parseFloat(line.debit) - parseFloat(line.credit))
          : (parseFloat(line.credit) - parseFloat(line.debit));
        await sequelize.query(
          `UPDATE finance_accounts SET balance = balance + :delta, "updatedAt" = NOW() WHERE id = :accId`,
          { replacements: { delta, accId: line.account_id }, transaction: t }
        );
      }

      await t.commit();

      await logAudit({
        tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName,
        action: 'update', entityType: 'journal_entry', entityId: id as string,
        oldValues: { status: 'draft' }, newValues: { status: 'posted' }, req
      });

      return res.status(200).json(successResponse({ ...entry, status: 'posted' }, undefined, 'Journal entry posted'));
    } catch (error: any) {
      await t.rollback();
      throw error;
    }
  }

  if (action === 'void') {
    if (entry.status !== 'posted') {
      return res.status(400).json(errorResponse('VALIDATION', `Cannot void entry with status "${entry.status}"`));
    }
    if (!void_reason) {
      return res.status(400).json(errorResponse('VALIDATION', 'void_reason is required'));
    }

    const t = await sequelize.transaction();
    try {
      // Reverse account balances
      const [lines] = await sequelize.query(
        `SELECT jl.*, fa."accountType" FROM journal_entry_lines jl 
         LEFT JOIN finance_accounts fa ON fa.id = jl.account_id
         WHERE jl.journal_entry_id = :id`,
        { replacements: { id }, transaction: t }
      );

      for (const line of lines) {
        const normalDebit = ['asset', 'expense'].includes(line.accountType);
        // Reverse: negate the original delta
        const delta = normalDebit
          ? (parseFloat(line.credit) - parseFloat(line.debit))
          : (parseFloat(line.debit) - parseFloat(line.credit));
        await sequelize.query(
          `UPDATE finance_accounts SET balance = balance + :delta, "updatedAt" = NOW() WHERE id = :accId`,
          { replacements: { delta, accId: line.account_id }, transaction: t }
        );
      }

      // Update entry status
      await sequelize.query(
        `UPDATE journal_entries SET status = 'voided', voided_at = NOW(), voided_by = :userId, void_reason = :reason, updated_at = NOW() WHERE id = :id`,
        { replacements: { id, userId: ctx.userId, reason: void_reason }, transaction: t }
      );

      await t.commit();

      await logAudit({
        tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName,
        action: 'update', entityType: 'journal_entry', entityId: id as string,
        oldValues: { status: 'posted' }, newValues: { status: 'voided', void_reason }, req
      });

      return res.status(200).json(successResponse({ ...entry, status: 'voided' }, undefined, 'Journal entry voided'));
    } catch (error: any) {
      await t.rollback();
      throw error;
    }
  }
}
