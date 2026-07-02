import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/helpers';
import { MfgWorkCenter, MfgBom, MfgBomItem, MfgRouting, MfgRoutingOperation, MfgWorkOrder, MfgQcTemplate, MfgQcInspection, MfgProductionPlan, MfgWasteRecord } from '../models';
import { CrudController } from '../utils/crud';

const router = Router();

// Work Centers
const wcCtrl = new CrudController(MfgWorkCenter, 'WorkCenter', ['name', 'code']);
router.get('/work-centers', authenticate, wcCtrl.list);
router.post('/work-centers', authenticate, authorize('admin', 'manager'), wcCtrl.create);
router.put('/work-centers/:id', authenticate, authorize('admin', 'manager'), wcCtrl.update);

// BOM
const bomCtrl = new CrudController(MfgBom, 'BOM', ['name']);
router.get('/boms', authenticate, bomCtrl.list);
router.get('/boms/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const bom = await MfgBom.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [{ model: MfgBomItem, as: 'items' }],
    });
    if (!bom) { sendError(res, 'BOM not found', 404); return; }
    sendSuccess(res, bom);
  } catch (error) { sendError(res, 'Failed to get BOM', 500); }
});
router.post('/boms', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body, tenant_id: req.tenantId };
    const items = data.items || []; delete data.items;
    const bom = await MfgBom.create(data);
    if (items.length > 0) {
      await MfgBomItem.bulkCreate(items.map((i: any) => ({ ...i, bom_id: (bom as any).id })));
    }
    sendSuccess(res, bom, 'BOM created', 201);
  } catch (error) { sendError(res, 'Failed to create BOM', 500); }
});
router.put('/boms/:id', authenticate, authorize('admin', 'manager'), bomCtrl.update);

// Routings
const rtCtrl = new CrudController(MfgRouting, 'Routing', ['name']);
router.get('/routings', authenticate, rtCtrl.list);
router.get('/routings/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const r = await MfgRouting.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [{ model: MfgRoutingOperation, as: 'operations' }],
    });
    if (!r) { sendError(res, 'Routing not found', 404); return; }
    sendSuccess(res, r);
  } catch (error) { sendError(res, 'Failed to get routing', 500); }
});
router.post('/routings', authenticate, authorize('admin', 'manager'), rtCtrl.create);
router.put('/routings/:id', authenticate, authorize('admin', 'manager'), rtCtrl.update);

// Work Orders
const woCtrl = new CrudController(MfgWorkOrder, 'WorkOrder', ['wo_number']);
router.get('/work-orders', authenticate, woCtrl.list);
router.get('/work-orders/:id', authenticate, woCtrl.getById);
router.post('/work-orders', authenticate, authorize('admin', 'manager'), woCtrl.create);
router.put('/work-orders/:id', authenticate, authorize('admin', 'manager'), woCtrl.update);
router.delete('/work-orders/:id', authenticate, authorize('admin'), woCtrl.delete);

// QC Templates
const qcTCtrl = new CrudController(MfgQcTemplate, 'QCTemplate', ['name']);
router.get('/qc-templates', authenticate, qcTCtrl.list);
router.post('/qc-templates', authenticate, authorize('admin', 'manager'), qcTCtrl.create);
router.put('/qc-templates/:id', authenticate, authorize('admin', 'manager'), qcTCtrl.update);

// QC Inspections
const qcICtrl = new CrudController(MfgQcInspection, 'QCInspection', ['inspection_no']);
router.get('/qc-inspections', authenticate, qcICtrl.list);
router.get('/qc-inspections/:id', authenticate, qcICtrl.getById);
router.post('/qc-inspections', authenticate, qcICtrl.create);
router.put('/qc-inspections/:id', authenticate, qcICtrl.update);

// Production Plans
const ppCtrl = new CrudController(MfgProductionPlan, 'ProductionPlan', ['name']);
router.get('/production-plans', authenticate, ppCtrl.list);
router.post('/production-plans', authenticate, authorize('admin', 'manager'), ppCtrl.create);
router.put('/production-plans/:id', authenticate, authorize('admin', 'manager'), ppCtrl.update);

// Waste Records
const wrCtrl = new CrudController(MfgWasteRecord, 'WasteRecord', []);
router.get('/waste-records', authenticate, wrCtrl.list);
router.post('/waste-records', authenticate, wrCtrl.create);

export default router;
