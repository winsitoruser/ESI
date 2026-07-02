import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/helpers';
import { FinanceAccount, JournalEntry, JournalEntryLine, FinanceTransaction, FinanceInvoice, FinanceInvoiceItem, FinancePayment, FinanceBudget, TaxSetting } from '../models';
import { CrudController } from '../utils/crud';

const router = Router();

// Chart of Accounts
const accCtrl = new CrudController(FinanceAccount, 'Account', ['name', 'code']);
router.get('/accounts', authenticate, accCtrl.list);
router.get('/accounts/:id', authenticate, accCtrl.getById);
router.post('/accounts', authenticate, authorize('admin', 'manager'), accCtrl.create);
router.put('/accounts/:id', authenticate, authorize('admin', 'manager'), accCtrl.update);
router.delete('/accounts/:id', authenticate, authorize('admin'), accCtrl.delete);

// Journal Entries
const jeCtrl = new CrudController(JournalEntry, 'JournalEntry', ['entry_no', 'description']);
router.get('/journals', authenticate, jeCtrl.list);
router.get('/journals/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const je = await JournalEntry.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [{ model: JournalEntryLine, as: 'lines', include: [{ model: FinanceAccount, attributes: ['id', 'code', 'name'] }] }],
    });
    if (!je) { sendError(res, 'Journal entry not found', 404); return; }
    sendSuccess(res, je);
  } catch (error) { sendError(res, 'Failed to get journal entry', 500); }
});
router.post('/journals', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body, tenant_id: req.tenantId, created_by: req.user!.id };
    const lines = data.lines || []; delete data.lines;
    const je = await JournalEntry.create(data);
    if (lines.length > 0) {
      await JournalEntryLine.bulkCreate(lines.map((l: any) => ({ ...l, journal_entry_id: (je as any).id })));
    }
    sendSuccess(res, je, 'Journal entry created', 201);
  } catch (error) { sendError(res, 'Failed to create journal entry', 500); }
});
router.put('/journals/:id', authenticate, authorize('admin', 'manager'), jeCtrl.update);
router.put('/journals/:id/post', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const je = await JournalEntry.findOne({ where: { id: req.params.id, tenant_id: req.tenantId, status: 'draft' } });
    if (!je) { sendError(res, 'Journal entry not found or not draft', 404); return; }
    await je.update({ status: 'posted', posted_at: new Date(), approved_by: req.user!.id });
    sendSuccess(res, je, 'Journal entry posted');
  } catch (error) { sendError(res, 'Failed to post journal entry', 500); }
});

// Transactions (cash flow)
const txCtrl = new CrudController(FinanceTransaction, 'FinanceTransaction', ['description', 'category']);
router.get('/transactions', authenticate, txCtrl.list);
router.get('/transactions/:id', authenticate, txCtrl.getById);
router.post('/transactions', authenticate, txCtrl.create);
router.put('/transactions/:id', authenticate, txCtrl.update);

// Invoices
const invCtrl = new CrudController(FinanceInvoice, 'Invoice', ['invoice_no']);
router.get('/invoices', authenticate, invCtrl.list);
router.get('/invoices/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const inv = await FinanceInvoice.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [
        { model: FinanceInvoiceItem, as: 'items' },
        { model: FinancePayment, as: 'payments' },
      ],
    });
    if (!inv) { sendError(res, 'Invoice not found', 404); return; }
    sendSuccess(res, inv);
  } catch (error) { sendError(res, 'Failed to get invoice', 500); }
});
router.post('/invoices', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body, tenant_id: req.tenantId, created_by: req.user!.id };
    const items = data.items || []; delete data.items;
    const inv = await FinanceInvoice.create(data);
    if (items.length > 0) {
      await FinanceInvoiceItem.bulkCreate(items.map((i: any) => ({ ...i, invoice_id: (inv as any).id })));
    }
    sendSuccess(res, inv, 'Invoice created', 201);
  } catch (error) { sendError(res, 'Failed to create invoice', 500); }
});
router.put('/invoices/:id', authenticate, authorize('admin', 'manager'), invCtrl.update);

// Payments
router.post('/invoices/:id/payments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const payment = await FinancePayment.create({
      ...req.body, tenant_id: req.tenantId, invoice_id: req.params.id, created_by: req.user!.id,
    });
    sendSuccess(res, payment, 'Payment recorded', 201);
  } catch (error) { sendError(res, 'Failed to record payment', 500); }
});

// Budgets
const budCtrl = new CrudController(FinanceBudget, 'Budget', ['name', 'department']);
router.get('/budgets', authenticate, budCtrl.list);
router.get('/budgets/:id', authenticate, budCtrl.getById);
router.post('/budgets', authenticate, authorize('admin', 'manager'), budCtrl.create);
router.put('/budgets/:id', authenticate, authorize('admin', 'manager'), budCtrl.update);

// Tax Settings
const taxCtrl = new CrudController(TaxSetting, 'TaxSetting', ['name']);
router.get('/taxes', authenticate, taxCtrl.list);
router.post('/taxes', authenticate, authorize('admin'), taxCtrl.create);
router.put('/taxes/:id', authenticate, authorize('admin'), taxCtrl.update);

export default router;
