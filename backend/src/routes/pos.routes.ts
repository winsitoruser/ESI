import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess, sendError, parsePagination, sendPaginated } from '../utils/helpers';
import { PosTransaction, PosTransactionItem, Shift, HeldTransaction, PrinterConfig, Product, Customer, Table } from '../models';
import { CrudController } from '../utils/crud';
import { Op } from 'sequelize';
import logger from '../utils/logger';

const router = Router();

// ==================== TRANSACTIONS ====================
router.get('/transactions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pagination = parsePagination(req.query);
    const where: any = { tenant_id: req.tenantId };
    if (req.branchId) where.branch_id = req.branchId;
    if (req.query.status) where.status = req.query.status;
    if (req.query.payment_method) where.payment_method = req.query.payment_method;
    if (req.query.date_from || req.query.date_to) {
      where.created_at = {};
      if (req.query.date_from) where.created_at[Op.gte] = req.query.date_from;
      if (req.query.date_to) where.created_at[Op.lte] = req.query.date_to;
    }
    if (pagination.search) {
      where[Op.or] = [{ transaction_no: { [Op.iLike]: `%${pagination.search}%` } }];
    }

    const { count, rows } = await PosTransaction.findAndCountAll({
      where,
      include: [{ model: PosTransactionItem, as: 'items' }, { model: Customer }],
      order: [['created_at', 'DESC']],
      limit: pagination.limit,
      offset: ((pagination.page || 1) - 1) * (pagination.limit || 20),
    });
    sendPaginated(res, rows, count, pagination);
  } catch (error: any) {
    logger.error('List transactions error:', error);
    sendError(res, 'Failed to list transactions', 500);
  }
});

router.get('/transactions/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tx = await PosTransaction.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [
        { model: PosTransactionItem, as: 'items', include: [{ model: Product }] },
        { model: Customer },
        { model: Table },
      ],
    });
    if (!tx) { sendError(res, 'Transaction not found', 404); return; }
    sendSuccess(res, tx);
  } catch (error) {
    sendError(res, 'Failed to get transaction', 500);
  }
});

router.post('/transactions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = {
      ...req.body,
      tenant_id: req.tenantId,
      branch_id: req.branchId || req.body.branch_id,
      cashier_id: req.user!.id,
    };
    const items = data.items || [];
    delete data.items;

    const tx = await PosTransaction.create(data);
    if (items.length > 0) {
      const txItems = items.map((item: any) => ({ ...item, transaction_id: (tx as any).id }));
      await PosTransactionItem.bulkCreate(txItems);
    }

    const result = await PosTransaction.findByPk((tx as any).id, {
      include: [{ model: PosTransactionItem, as: 'items' }],
    });
    sendSuccess(res, result, 'Transaction created', 201);
  } catch (error: any) {
    logger.error('Create transaction error:', error);
    sendError(res, 'Failed to create transaction', 500);
  }
});

router.put('/transactions/:id/complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const tx = await PosTransaction.findOne({ where: { id: req.params.id, tenant_id: req.tenantId } });
    if (!tx) { sendError(res, 'Transaction not found', 404); return; }
    await tx.update({
      status: 'completed',
      paid_amount: req.body.paid_amount,
      change_amount: req.body.change_amount,
      payment_method: req.body.payment_method,
      payment_details: req.body.payment_details || {},
      completed_at: new Date(),
    });
    sendSuccess(res, tx, 'Transaction completed');
  } catch (error) {
    sendError(res, 'Failed to complete transaction', 500);
  }
});

router.put('/transactions/:id/void', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const tx = await PosTransaction.findOne({ where: { id: req.params.id, tenant_id: req.tenantId } });
    if (!tx) { sendError(res, 'Transaction not found', 404); return; }
    await tx.update({ status: 'voided', notes: req.body.reason || (tx as any).notes });
    sendSuccess(res, tx, 'Transaction voided');
  } catch (error) {
    sendError(res, 'Failed to void transaction', 500);
  }
});

// ==================== SHIFTS ====================
const shiftCtrl = new CrudController(Shift, 'Shift', ['shift_no']);
router.get('/shifts', authenticate, shiftCtrl.list);
router.get('/shifts/:id', authenticate, shiftCtrl.getById);

router.post('/shifts/open', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const existingOpen = await Shift.findOne({
      where: { tenant_id: req.tenantId, cashier_id: req.user!.id, status: 'open' },
    });
    if (existingOpen) { sendError(res, 'You already have an open shift', 400); return; }

    const shiftNo = `SH-${Date.now()}`;
    const shift = await Shift.create({
      tenant_id: req.tenantId,
      branch_id: req.branchId || req.body.branch_id,
      cashier_id: req.user!.id,
      shift_no: shiftNo,
      opening_cash: req.body.opening_cash || 0,
      opened_at: new Date(),
    });
    sendSuccess(res, shift, 'Shift opened', 201);
  } catch (error) {
    sendError(res, 'Failed to open shift', 500);
  }
});

router.put('/shifts/:id/close', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const shift = await Shift.findOne({ where: { id: req.params.id, cashier_id: req.user!.id, status: 'open' } });
    if (!shift) { sendError(res, 'Open shift not found', 404); return; }
    await shift.update({
      status: 'closed',
      closing_cash: req.body.closing_cash,
      notes: req.body.notes,
      closed_at: new Date(),
    });
    sendSuccess(res, shift, 'Shift closed');
  } catch (error) {
    sendError(res, 'Failed to close shift', 500);
  }
});

// ==================== HELD TRANSACTIONS ====================
const heldCtrl = new CrudController(HeldTransaction, 'HeldTransaction', ['hold_no']);
router.get('/held', authenticate, heldCtrl.list);
router.post('/held', authenticate, heldCtrl.create);
router.put('/held/:id/resume', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const held = await HeldTransaction.findOne({ where: { id: req.params.id, tenant_id: req.tenantId, status: 'held' } });
    if (!held) { sendError(res, 'Held transaction not found', 404); return; }
    await held.update({ status: 'resumed' });
    sendSuccess(res, held, 'Transaction resumed');
  } catch (error) {
    sendError(res, 'Failed to resume transaction', 500);
  }
});

// ==================== PRINTER CONFIG ====================
const printerCtrl = new CrudController(PrinterConfig, 'PrinterConfig', ['name']);
router.get('/printers', authenticate, printerCtrl.list);
router.post('/printers', authenticate, authorize('admin', 'manager'), printerCtrl.create);
router.put('/printers/:id', authenticate, authorize('admin', 'manager'), printerCtrl.update);
router.delete('/printers/:id', authenticate, authorize('admin', 'manager'), printerCtrl.delete);

export default router;
