import type { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { getTenantContext, buildTenantFilter } from '../../../../lib/middleware/tenantIsolation';
import { logAudit } from '../../../../lib/audit/auditLogger';
import {
  autoCategorizeTransactions,
  autoCreateJournalEntries,
  autoReconcileTransactions,
  autoInvoiceFollowUp,
  autoPeriodClosing,
  autoCalculateTax,
  autoApproveExpenses,
  AutonomousTask,
} from '../../../../lib/finance/autonomous-accounting';

const sequelize = require('../../../../lib/sequelize');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', `Method ${req.method} Not Allowed`));
  }

  try {
    const { action = 'status' } = req.query;

    switch (action) {
      case 'status': return await getStatus(req, res);
      case 'run-all': return await runAllTasks(req, res);
      case 'categorize': return await runCategorize(req, res);
      case 'journal': return await runJournal(req, res);
      case 'reconcile': return await runReconcile(req, res);
      case 'invoice-followup': return await runInvoiceFollowUp(req, res);
      case 'period-close': return await runPeriodClose(req, res);
      case 'tax-calc': return await runTaxCalc(req, res);
      case 'expense-approve': return await runExpenseApprove(req, res);
      case 'approve-task': return await approveTask(req, res);
      case 'history': return await getHistory(req, res);
      default:
        return res.status(400).json(errorResponse('VALIDATION', `Unknown action: ${action}`));
    }
  } catch (error: any) {
    console.error('AI Autonomous Error:', error);
    return res.status(500).json(errorResponse('INTERNAL_SERVER_ERROR', error.message || 'Internal server error'));
  }
}

export default withHQAuth(handler, { module: 'finance_pro' });

// ─── Status: Overview of all autonomous task capabilities ───
async function getStatus(req: NextApiRequest, res: NextApiResponse) {
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId);
  const stats: any = {};

  try {
    // Uncategorized transactions
    const [uncategorized] = await sequelize.query(`
      SELECT COUNT(*) as cnt FROM finance_transactions
      WHERE (category IS NULL OR category = '' OR category = 'Uncategorized')
        AND "isActive" = true ${tf.condition}
    `, { replacements: tf.replacements });
    stats.uncategorizedTransactions = parseInt(uncategorized[0]?.cnt || '0');
  } catch (e) { stats.uncategorizedTransactions = 0; }

  try {
    // Transactions without journal entries
    const [unjournaled] = await sequelize.query(`
      SELECT COUNT(*) as cnt FROM finance_transactions ft
      WHERE ft.status = 'completed' AND ft."isActive" = true
        AND NOT EXISTS (
          SELECT 1 FROM journal_entries je
          WHERE je.reference_id = ft.id::text AND je.reference_type = 'finance_transaction'
        ) ${tf.condition}
    `, { replacements: tf.replacements });
    stats.unjournaledTransactions = parseInt(unjournaled[0]?.cnt || '0');
  } catch (e) { stats.unjournaledTransactions = 0; }

  try {
    // Overdue invoices/receivables
    const [overdue] = await sequelize.query(`
      SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount - COALESCE(paid_amount, 0)), 0) as total
      FROM finance_invoices
      WHERE status NOT IN ('paid', 'cancelled') AND due_date < NOW() ${tf.condition}
    `, { replacements: tf.replacements });
    stats.overdueInvoices = parseInt(overdue[0]?.cnt || '0');
    stats.overdueAmount = parseFloat(overdue[0]?.total || '0');
  } catch (e) { stats.overdueInvoices = 0; stats.overdueAmount = 0; }

  try {
    // Draft/pending expenses awaiting approval
    const [pending] = await sequelize.query(`
      SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total
      FROM finance_transactions
      WHERE "transactionType" = 'expense' AND status = 'draft'
        AND "isActive" = true ${tf.condition}
    `, { replacements: tf.replacements });
    stats.pendingExpenses = parseInt(pending[0]?.cnt || '0');
    stats.pendingExpenseAmount = parseFloat(pending[0]?.total || '0');
  } catch (e) { stats.pendingExpenses = 0; stats.pendingExpenseAmount = 0; }

  try {
    // Execution history count
    const [histCount] = await sequelize.query(`
      SELECT COUNT(*) as cnt FROM ai_task_history
      WHERE tenant_id = :tenantId
    `, { replacements: { tenantId: ctx.tenantId } });
    stats.totalTasksExecuted = parseInt(histCount[0]?.cnt || '0');
  } catch (e) { stats.totalTasksExecuted = 0; }

  const taskCapabilities = [
    { type: 'auto_categorize', title: 'Auto-Kategorisasi', description: 'Kategorikan transaksi tanpa kategori', pendingCount: stats.uncategorizedTransactions, autoApprove: true, icon: 'Tag' },
    { type: 'auto_journal', title: 'Auto-Jurnal Entri', description: 'Buat jurnal double-entry dari transaksi', pendingCount: stats.unjournaledTransactions, autoApprove: false, icon: 'BookOpen' },
    { type: 'auto_invoice_followup', title: 'Auto Follow-up Invoice', description: 'Tindakan untuk invoice jatuh tempo', pendingCount: stats.overdueInvoices, autoApprove: true, icon: 'Bell' },
    { type: 'auto_expense_approve', title: 'Auto-Approval Pengeluaran', description: 'Approve otomatis pengeluaran kecil', pendingCount: stats.pendingExpenses, autoApprove: true, icon: 'CheckCircle' },
    { type: 'auto_period_close', title: 'Auto-Closing Periode', description: 'Tutup buku bulanan otomatis', pendingCount: 1, autoApprove: false, icon: 'Lock' },
    { type: 'auto_tax_calc', title: 'Auto-Hitung Pajak', description: 'Perhitungan PPN & PPh bulanan', pendingCount: 1, autoApprove: false, icon: 'Calculator' },
    { type: 'auto_reconcile', title: 'Auto-Rekonsiliasi', description: 'Cocokkan transaksi dengan mutasi bank', pendingCount: 0, autoApprove: false, icon: 'ArrowLeftRight' },
  ];

  return res.status(200).json(successResponse({ stats, taskCapabilities }));
}

// ─── Run All Tasks ───
async function runAllTasks(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', 'POST only'));

  const tasks: AutonomousTask[] = [];

  // Run categorization
  try {
    const catResult = await executeCategorize(req);
    if (catResult) tasks.push(catResult);
  } catch (e) {}

  // Run journal
  try {
    const jrnResult = await executeJournal(req);
    if (jrnResult) tasks.push(jrnResult);
  } catch (e) {}

  // Run invoice follow-up
  try {
    const invResult = await executeInvoiceFollowUp(req);
    if (invResult) tasks.push(invResult);
  } catch (e) {}

  // Run expense approval
  try {
    const expResult = await executeExpenseApprove(req);
    if (expResult) tasks.push(expResult);
  } catch (e) {}

  // Run tax calc
  try {
    const taxResult = await executeTaxCalc(req);
    if (taxResult) tasks.push(taxResult);
  } catch (e) {}

  return res.status(200).json(successResponse({
    tasksExecuted: tasks.length,
    tasks,
    summary: {
      completed: tasks.filter(t => t.status === 'completed').length,
      needsApproval: tasks.filter(t => t.status === 'needs_approval').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      totalAffectedRecords: tasks.reduce((s, t) => s + t.affectedRecords, 0),
    },
  }));
}

// ─── Individual task runners ───

async function executeCategorize(req: NextApiRequest): Promise<AutonomousTask | null> {
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId, 'ft');

  const [txRows] = await sequelize.query(`
    SELECT ft.* FROM finance_transactions ft
    WHERE (ft.category IS NULL OR ft.category = '' OR ft.category = 'Uncategorized')
      AND ft."isActive" = true ${tf.condition}
    ORDER BY ft."transactionDate" DESC LIMIT 100
  `, { replacements: tf.replacements });

  if (!txRows || txRows.length === 0) return null;

  const { task, updates } = autoCategorizeTransactions(txRows);
  task.startedAt = new Date().toISOString();

  // Execute updates
  for (const upd of updates) {
    const sets = ['category = :category'];
    const repl: any = { id: upd.id, category: upd.category };
    if (upd.subcategory) { sets.push('subcategory = :subcategory'); repl.subcategory = upd.subcategory; }
    if (upd.expense_type) { sets.push('"expense_type" = :expenseType'); repl.expenseType = upd.expense_type; }
    sets.push('"updatedAt" = NOW()');

    await sequelize.query(
      `UPDATE finance_transactions SET ${sets.join(', ')} WHERE id = :id`,
      { replacements: repl }
    );
  }

  task.status = 'completed';
  task.completedAt = new Date().toISOString();

  await logTaskHistory(ctx, task);
  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: 'AI Guardian', action: 'update', entityType: 'ai_autonomous_task', entityId: task.id, newValues: { type: task.type, affected: task.affectedRecords }, req });

  return task;
}

async function executeJournal(req: NextApiRequest): Promise<AutonomousTask | null> {
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId, 'ft');

  const [txRows] = await sequelize.query(`
    SELECT ft.*, fa."accountType", fa."accountName", fa."accountNumber" as acc_number
    FROM finance_transactions ft
    LEFT JOIN finance_accounts fa ON ft."accountId" = fa.id
    WHERE ft.status = 'completed' AND ft."isActive" = true
      AND ft.category IS NOT NULL AND ft.category != ''
      AND NOT EXISTS (
        SELECT 1 FROM journal_entries je
        WHERE je.reference_id = ft.id::text AND je.reference_type = 'finance_transaction'
      ) ${tf.condition}
    ORDER BY ft."transactionDate" DESC LIMIT 50
  `, { replacements: tf.replacements });

  if (!txRows || txRows.length === 0) return null;

  const { task, journals } = autoCreateJournalEntries(txRows);
  task.startedAt = new Date().toISOString();

  // Create journal entries in DB
  const t = await sequelize.transaction();
  try {
    for (const j of journals) {
      const [jeRows] = await sequelize.query(`
        INSERT INTO journal_entries (tenant_id, entry_number, entry_date, description, reference_type, reference_id, status, total_debit, total_credit, created_by)
        VALUES (:tenantId, :entryNumber, :entryDate, :description, :refType, :refId, 'draft', :totalDebit, :totalCredit, :createdBy)
        RETURNING id
      `, {
        replacements: {
          tenantId: ctx.tenantId,
          entryNumber: j.entry_number,
          entryDate: j.entry_date,
          description: j.description,
          refType: j.reference_type,
          refId: j.reference_id,
          totalDebit: j.total_debit,
          totalCredit: j.total_credit,
          createdBy: 'AI Guardian',
        },
        transaction: t,
      });

      const jeId = jeRows[0]?.id;
      if (jeId && j.lines) {
        for (let idx = 0; idx < j.lines.length; idx++) {
          const line = j.lines[idx];
          await sequelize.query(`
            INSERT INTO journal_entry_lines (journal_entry_id, line_number, account_number, description, debit_amount, credit_amount)
            VALUES (:jeId, :lineNo, :accNo, :desc, :debit, :credit)
          `, {
            replacements: {
              jeId, lineNo: idx + 1,
              accNo: line.account_number,
              desc: line.description,
              debit: line.debit_amount,
              credit: line.credit_amount,
            },
            transaction: t,
          });
        }
      }
    }
    await t.commit();
    task.status = 'needs_approval';
  } catch (e: any) {
    await t.rollback();
    task.status = 'failed';
    task.error = e.message;
  }

  task.completedAt = new Date().toISOString();
  await logTaskHistory(ctx, task);

  return task;
}

async function executeInvoiceFollowUp(req: NextApiRequest): Promise<AutonomousTask | null> {
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId);

  const [invRows] = await sequelize.query(`
    SELECT *, due_date as "dueDate", total_amount as "totalAmount", paid_amount as "paidAmount",
      (total_amount - COALESCE(paid_amount, 0)) as "remainingAmount", invoice_number as "invoiceNumber",
      COALESCE(customer_name, supplier_name, '') as "customerName"
    FROM finance_invoices
    WHERE status NOT IN ('paid', 'cancelled') ${tf.condition}
    ORDER BY due_date ASC LIMIT 200
  `, { replacements: tf.replacements });

  if (!invRows || invRows.length === 0) return null;

  const { task, actions } = autoInvoiceFollowUp(invRows);
  task.startedAt = new Date().toISOString();

  if (actions.length === 0) return null;

  // Log follow-up actions to ai_task_history
  task.status = 'completed';
  task.completedAt = new Date().toISOString();
  await logTaskHistory(ctx, task);

  // Return actions for frontend display
  (task as any).followUpActions = actions;
  return task;
}

async function executeExpenseApprove(req: NextApiRequest): Promise<AutonomousTask | null> {
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId, 'ft');

  const [expRows] = await sequelize.query(`
    SELECT ft.* FROM finance_transactions ft
    WHERE ft."transactionType" = 'expense' AND ft.status = 'draft'
      AND ft."isActive" = true ${tf.condition}
    ORDER BY ft."transactionDate" DESC LIMIT 50
  `, { replacements: tf.replacements });

  if (!expRows || expRows.length === 0) return null;

  const config = {
    maxAutoApprove: 5000000, // Rp 5 juta
    allowedCategories: ['Utilities', 'Logistics', 'Maintenance', 'Office', 'Internet', 'Telepon'],
  };

  const { task, approved } = autoApproveExpenses(expRows, config);
  task.startedAt = new Date().toISOString();

  // Execute approvals
  for (const exp of approved) {
    await sequelize.query(
      `UPDATE finance_transactions SET status = 'completed', notes = COALESCE(notes, '') || ' [Auto-approved by AI Guardian]', "updatedAt" = NOW() WHERE id = :id`,
      { replacements: { id: exp.id } }
    );
  }

  task.status = 'completed';
  task.completedAt = new Date().toISOString();
  await logTaskHistory(ctx, task);

  return task;
}

async function executeTaxCalc(req: NextApiRequest): Promise<AutonomousTask | null> {
  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId, 'ft');
  const now = new Date();
  const period = { year: now.getFullYear(), month: now.getMonth() + 1 };
  const { year, month } = req.body || {};
  if (year) period.year = parseInt(year);
  if (month) period.month = parseInt(month);

  const startDate = `${period.year}-${String(period.month).padStart(2, '0')}-01`;
  const endDate = new Date(period.year, period.month, 0).toISOString().slice(0, 10);

  const [txRows] = await sequelize.query(`
    SELECT ft.* FROM finance_transactions ft
    WHERE ft."transactionDate" BETWEEN :startDate AND :endDate
      AND ft.status = 'completed' AND ft."isActive" = true ${tf.condition}
  `, { replacements: { startDate, endDate, ...tf.replacements } });

  const { task, taxSummary } = autoCalculateTax(txRows || [], [], period);
  task.startedAt = new Date().toISOString();
  task.completedAt = new Date().toISOString();

  await logTaskHistory(ctx, task);
  (task as any).taxSummary = taxSummary;

  return task;
}

// ─── Wrappers for individual POST endpoints ───
async function runCategorize(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', 'POST only'));
  const task = await executeCategorize(req);
  return res.status(200).json(successResponse(task || { message: 'Tidak ada transaksi yang perlu dikategorikan' }));
}

async function runJournal(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', 'POST only'));
  const task = await executeJournal(req);
  return res.status(200).json(successResponse(task || { message: 'Tidak ada transaksi yang perlu dijurnal' }));
}

async function runReconcile(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', 'POST only'));

  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId, 'ft');
  const { bankStatements } = req.body;

  if (!bankStatements || !Array.isArray(bankStatements) || bankStatements.length === 0) {
    return res.status(400).json(errorResponse('VALIDATION', 'bankStatements array required'));
  }

  const [txRows] = await sequelize.query(`
    SELECT ft.* FROM finance_transactions ft
    WHERE ft.status = 'completed' AND ft."isActive" = true
      AND ft."transactionDate" >= NOW() - INTERVAL '60 days' ${tf.condition}
    ORDER BY ft."transactionDate" DESC LIMIT 500
  `, { replacements: tf.replacements });

  const result = autoReconcileTransactions(txRows || [], bankStatements);
  result.task.startedAt = new Date().toISOString();
  result.task.completedAt = new Date().toISOString();

  await logTaskHistory(ctx, result.task);

  return res.status(200).json(successResponse({
    task: result.task,
    matched: result.matched,
    unmatched: result.unmatched,
  }));
}

async function runInvoiceFollowUp(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', 'POST only'));
  const task = await executeInvoiceFollowUp(req);
  return res.status(200).json(successResponse(task || { message: 'Tidak ada invoice yang perlu follow-up' }));
}

async function runPeriodClose(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', 'POST only'));

  const ctx = getTenantContext(req);
  const tf = buildTenantFilter(ctx.tenantId);
  const now = new Date();
  const { year, month } = req.body || {};
  const period = { year: year || now.getFullYear(), month: month || now.getMonth() + 1 };

  const [accounts] = await sequelize.query(`
    SELECT * FROM finance_accounts WHERE "isActive" = true ${tf.condition}
  `, { replacements: tf.replacements });

  const startDate = `${period.year}-${String(period.month).padStart(2, '0')}-01`;
  const endDate = new Date(period.year, period.month, 0).toISOString().slice(0, 10);

  const [transactions] = await sequelize.query(`
    SELECT * FROM finance_transactions
    WHERE "transactionDate" BETWEEN :startDate AND :endDate
      AND "isActive" = true ${tf.condition}
  `, { replacements: { startDate, endDate, ...tf.replacements } });

  const result = autoPeriodClosing(accounts || [], transactions || [], period);
  result.task.startedAt = new Date().toISOString();
  result.task.completedAt = new Date().toISOString();

  await logTaskHistory(ctx, result.task);

  return res.status(200).json(successResponse({
    task: result.task,
    closingSummary: result.closingSummary,
    adjustments: result.adjustments,
  }));
}

async function runTaxCalc(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', 'POST only'));
  const task = await executeTaxCalc(req);
  return res.status(200).json(successResponse(task || { message: 'Gagal menghitung pajak' }));
}

async function runExpenseApprove(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', 'POST only'));
  const task = await executeExpenseApprove(req);
  return res.status(200).json(successResponse(task || { message: 'Tidak ada pengeluaran yang perlu di-approve' }));
}

// ─── Approve a pending task ───
async function approveTask(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json(errorResponse('METHOD_NOT_ALLOWED', 'POST only'));
  const ctx = getTenantContext(req);
  const { taskId, approved } = req.body;

  if (!taskId) return res.status(400).json(errorResponse('VALIDATION', 'taskId required'));

  try {
    // Update journal entries if the approved task was a journal creation
    if (approved) {
      // Post journal entries that were in draft
      await sequelize.query(`
        UPDATE journal_entries SET status = 'posted', updated_at = NOW()
        WHERE status = 'draft' AND created_by = 'AI Guardian'
          AND tenant_id = :tenantId
      `, { replacements: { tenantId: ctx.tenantId } });
    }

    // Update task history
    await sequelize.query(`
      UPDATE ai_task_history SET status = :status, approved_by = :approvedBy, approved_at = NOW()
      WHERE task_id = :taskId AND tenant_id = :tenantId
    `, { replacements: { status: approved ? 'approved' : 'rejected', approvedBy: ctx.userName || ctx.userId, taskId, tenantId: ctx.tenantId } });

    await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: approved ? 'update' : 'delete', entityType: 'ai_autonomous_task', entityId: taskId, newValues: { approved, approvedBy: ctx.userName }, req });

    return res.status(200).json(successResponse({ taskId, approved, message: approved ? 'Task disetujui dan dieksekusi' : 'Task ditolak' }));
  } catch (e: any) {
    return res.status(500).json(errorResponse('INTERNAL_SERVER_ERROR', e.message));
  }
}

// ─── Task History ───
async function getHistory(req: NextApiRequest, res: NextApiResponse) {
  const ctx = getTenantContext(req);
  const { page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  const safeLimit = Math.min(parseInt(limit as string) || 20, 100);

  try {
    const [rows] = await sequelize.query(`
      SELECT * FROM ai_task_history
      WHERE tenant_id = :tenantId
      ORDER BY created_at DESC
      LIMIT :limit OFFSET :offset
    `, { replacements: { tenantId: ctx.tenantId, limit: safeLimit, offset } });

    const [countRes] = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM ai_task_history WHERE tenant_id = :tenantId`,
      { replacements: { tenantId: ctx.tenantId } }
    );

    return res.status(200).json(successResponse(rows, {
      total: parseInt(countRes[0]?.cnt || '0'),
      page: parseInt(page as string),
      limit: safeLimit,
    }));
  } catch (e) {
    // Table may not exist yet
    return res.status(200).json(successResponse([]));
  }
}

// ─── Helper: Log task to history table ───
async function logTaskHistory(ctx: any, task: AutonomousTask) {
  try {
    await sequelize.query(`
      INSERT INTO ai_task_history (tenant_id, task_id, task_type, title, description, status, affected_records, changes_json, executed_by, started_at, completed_at)
      VALUES (:tenantId, :taskId, :taskType, :title, :description, :status, :affected, :changes, :executedBy, :startedAt, :completedAt)
    `, {
      replacements: {
        tenantId: ctx.tenantId,
        taskId: task.id,
        taskType: task.type,
        title: task.title,
        description: task.description,
        status: task.status,
        affected: task.affectedRecords,
        changes: JSON.stringify(task.changes.slice(0, 50)),
        executedBy: task.executedBy,
        startedAt: task.startedAt || new Date().toISOString(),
        completedAt: task.completedAt || new Date().toISOString(),
      },
    });
  } catch (e: any) {
    console.warn('Failed to log task history:', e.message);
  }
}
