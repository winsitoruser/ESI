import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/helpers';
import { TmsShipment, TmsCarrier, TmsRateCard, TmsTrackingEvent } from '../models';
import { CrudController } from '../utils/crud';

const router = Router();

// Shipments
const shpCtrl = new CrudController(TmsShipment, 'Shipment', ['shipment_no']);
router.get('/shipments', authenticate, shpCtrl.list);
router.get('/shipments/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const s = await TmsShipment.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [{ model: TmsTrackingEvent, as: 'events' }],
    });
    if (!s) { sendError(res, 'Shipment not found', 404); return; }
    sendSuccess(res, s);
  } catch (error) { sendError(res, 'Failed to get shipment', 500); }
});
router.post('/shipments', authenticate, shpCtrl.create);
router.put('/shipments/:id', authenticate, shpCtrl.update);
router.delete('/shipments/:id', authenticate, authorize('admin', 'manager'), shpCtrl.delete);

router.post('/shipments/:id/tracking', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const event = await TmsTrackingEvent.create({ shipment_id: req.params.id, ...req.body, recorded_by: req.user!.id });
    await TmsShipment.update({ status: req.body.status }, { where: { id: req.params.id } });
    sendSuccess(res, event, 'Tracking event added', 201);
  } catch (error) { sendError(res, 'Failed to add tracking', 500); }
});

// Carriers
const carCtrl = new CrudController(TmsCarrier, 'Carrier', ['name', 'code']);
router.get('/carriers', authenticate, carCtrl.list);
router.get('/carriers/:id', authenticate, carCtrl.getById);
router.post('/carriers', authenticate, authorize('admin', 'manager'), carCtrl.create);
router.put('/carriers/:id', authenticate, authorize('admin', 'manager'), carCtrl.update);

// Rate Cards
const rateCtrl = new CrudController(TmsRateCard, 'RateCard', ['origin_zone', 'destination_zone']);
router.get('/rates', authenticate, rateCtrl.list);
router.post('/rates', authenticate, authorize('admin', 'manager'), rateCtrl.create);
router.put('/rates/:id', authenticate, authorize('admin', 'manager'), rateCtrl.update);
router.delete('/rates/:id', authenticate, authorize('admin'), rateCtrl.delete);

export default router;
