import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/helpers';
import { Table, TableSession, Reservation } from '../models';
import { CrudController } from '../utils/crud';

const router = Router();

// Tables
const tblCtrl = new CrudController(Table, 'Table', ['number', 'name', 'zone']);
router.get('/', authenticate, tblCtrl.list);
router.get('/:id', authenticate, tblCtrl.getById);
router.post('/', authenticate, authorize('admin', 'manager'), tblCtrl.create);
router.put('/:id', authenticate, authorize('admin', 'manager'), tblCtrl.update);
router.delete('/:id', authenticate, authorize('admin', 'manager'), tblCtrl.delete);

router.put('/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const table = await Table.findOne({ where: { id: req.params.id, tenant_id: req.tenantId } });
    if (!table) { sendError(res, 'Table not found', 404); return; }
    await table.update({ status: req.body.status });
    sendSuccess(res, table, 'Table status updated');
  } catch (error) { sendError(res, 'Failed to update table', 500); }
});

// Sessions
router.get('/:id/sessions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await TableSession.findAll({
      where: { table_id: req.params.id, tenant_id: req.tenantId },
      order: [['started_at', 'DESC']], limit: 20,
    });
    sendSuccess(res, sessions);
  } catch (error) { sendError(res, 'Failed to get sessions', 500); }
});
router.post('/:id/sessions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const session = await TableSession.create({
      ...req.body, table_id: req.params.id, tenant_id: req.tenantId, branch_id: req.branchId,
    });
    await Table.update({ status: 'occupied' }, { where: { id: req.params.id } });
    sendSuccess(res, session, 'Session started', 201);
  } catch (error) { sendError(res, 'Failed to start session', 500); }
});

// Reservations
const resCtrl = new CrudController(Reservation, 'Reservation', ['reservation_no', 'customer_name', 'customer_phone']);
router.get('/reservations/list', authenticate, resCtrl.list);
router.get('/reservations/:id', authenticate, resCtrl.getById);
router.post('/reservations', authenticate, resCtrl.create);
router.put('/reservations/:id', authenticate, resCtrl.update);
router.delete('/reservations/:id', authenticate, authorize('admin', 'manager'), resCtrl.delete);

export default router;
