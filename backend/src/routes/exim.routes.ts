import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/helpers';
import { EximShipment, EximContainer, EximCustoms, EximLC, EximPartner, EximDocument } from '../models';
import { CrudController } from '../utils/crud';

const router = Router();

// Shipments
const shpCtrl = new CrudController(EximShipment, 'EximShipment', ['shipment_no']);
router.get('/shipments', authenticate, shpCtrl.list);
router.get('/shipments/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const s = await EximShipment.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [
        { model: EximContainer, as: 'containers' },
        { model: EximCustoms },
        { model: EximDocument, as: 'documents' },
      ],
    });
    if (!s) { sendError(res, 'Shipment not found', 404); return; }
    sendSuccess(res, s);
  } catch (error) { sendError(res, 'Failed to get shipment', 500); }
});
router.post('/shipments', authenticate, authorize('admin', 'manager'), shpCtrl.create);
router.put('/shipments/:id', authenticate, authorize('admin', 'manager'), shpCtrl.update);
router.delete('/shipments/:id', authenticate, authorize('admin'), shpCtrl.delete);

// Containers
router.post('/shipments/:id/containers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const c = await EximContainer.create({ shipment_id: req.params.id, ...req.body });
    sendSuccess(res, c, 'Container added', 201);
  } catch (error) { sendError(res, 'Failed to add container', 500); }
});

// Customs
router.post('/shipments/:id/customs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [customs] = await EximCustoms.upsert({ shipment_id: req.params.id, ...req.body });
    sendSuccess(res, customs, 'Customs data saved');
  } catch (error) { sendError(res, 'Failed to save customs', 500); }
});

// Documents
router.post('/shipments/:id/documents', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const doc = await EximDocument.create({ shipment_id: req.params.id, ...req.body, uploaded_by: req.user!.id });
    sendSuccess(res, doc, 'Document uploaded', 201);
  } catch (error) { sendError(res, 'Failed to upload document', 500); }
});

// Letter of Credit
const lcCtrl = new CrudController(EximLC, 'LetterOfCredit', ['lc_number']);
router.get('/lcs', authenticate, lcCtrl.list);
router.get('/lcs/:id', authenticate, lcCtrl.getById);
router.post('/lcs', authenticate, authorize('admin', 'manager'), lcCtrl.create);
router.put('/lcs/:id', authenticate, authorize('admin', 'manager'), lcCtrl.update);

// Partners
const ptnCtrl = new CrudController(EximPartner, 'Partner', ['name', 'country']);
router.get('/partners', authenticate, ptnCtrl.list);
router.get('/partners/:id', authenticate, ptnCtrl.getById);
router.post('/partners', authenticate, authorize('admin', 'manager'), ptnCtrl.create);
router.put('/partners/:id', authenticate, authorize('admin', 'manager'), ptnCtrl.update);

export default router;
