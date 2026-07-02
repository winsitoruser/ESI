import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/helpers';
import { Asset, AssetCategory, AssetMovement, AssetMaintenanceSchedule } from '../models';
import { CrudController } from '../utils/crud';

const router = Router();

// Asset Categories
const catCtrl = new CrudController(AssetCategory, 'AssetCategory', ['name']);
router.get('/categories', authenticate, catCtrl.list);
router.post('/categories', authenticate, authorize('admin', 'manager'), catCtrl.create);
router.put('/categories/:id', authenticate, authorize('admin', 'manager'), catCtrl.update);

// Assets
const asCtrl = new CrudController(Asset, 'Asset', ['name', 'asset_no', 'serial_number']);
router.get('/', authenticate, asCtrl.list);
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const asset = await Asset.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [
        { model: AssetCategory },
        { model: AssetMovement },
        { model: AssetMaintenanceSchedule },
      ],
    });
    if (!asset) { sendError(res, 'Asset not found', 404); return; }
    sendSuccess(res, asset);
  } catch (error) { sendError(res, 'Failed to get asset', 500); }
});
router.post('/', authenticate, authorize('admin', 'manager'), asCtrl.create);
router.put('/:id', authenticate, authorize('admin', 'manager'), asCtrl.update);
router.delete('/:id', authenticate, authorize('admin'), asCtrl.delete);

// Movements
router.get('/:id/movements', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const movements = await AssetMovement.findAll({
      where: { asset_id: req.params.id }, order: [['created_at', 'DESC']],
    });
    sendSuccess(res, movements);
  } catch (error) { sendError(res, 'Failed to get movements', 500); }
});
router.post('/:id/movements', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const mv = await AssetMovement.create({ asset_id: req.params.id, ...req.body, created_by: req.user!.id });
    sendSuccess(res, mv, 'Movement recorded', 201);
  } catch (error) { sendError(res, 'Failed to record movement', 500); }
});

// Maintenance
const mntCtrl = new CrudController(AssetMaintenanceSchedule, 'AssetMaintenance', ['description']);
router.get('/maintenance/list', authenticate, mntCtrl.list);
router.post('/maintenance', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const m = await AssetMaintenanceSchedule.create({ ...req.body });
    sendSuccess(res, m, 'Maintenance scheduled', 201);
  } catch (error) { sendError(res, 'Failed to schedule maintenance', 500); }
});
router.put('/maintenance/:id', authenticate, authorize('admin', 'manager'), mntCtrl.update);

export default router;
