import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/helpers';
import { EprVendor, EprProcurementRequest, EprRfq, EprRfqResponse, EprContract } from '../models';
import { CrudController } from '../utils/crud';

const router = Router();

// Vendors
const venCtrl = new CrudController(EprVendor, 'Vendor', ['name', 'code', 'contact_person']);
router.get('/vendors', authenticate, venCtrl.list);
router.get('/vendors/:id', authenticate, venCtrl.getById);
router.post('/vendors', authenticate, authorize('admin', 'manager'), venCtrl.create);
router.put('/vendors/:id', authenticate, authorize('admin', 'manager'), venCtrl.update);
router.delete('/vendors/:id', authenticate, authorize('admin'), venCtrl.delete);

// Procurement Requests
const prCtrl = new CrudController(EprProcurementRequest, 'ProcurementRequest', ['request_no', 'department']);
router.get('/requests', authenticate, prCtrl.list);
router.get('/requests/:id', authenticate, prCtrl.getById);
router.post('/requests', authenticate, prCtrl.create);
router.put('/requests/:id', authenticate, prCtrl.update);
router.put('/requests/:id/approve', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const pr = await EprProcurementRequest.findOne({ where: { id: req.params.id, tenant_id: req.tenantId, status: 'submitted' } });
    if (!pr) { sendError(res, 'Request not found', 404); return; }
    await pr.update({ status: 'approved', approved_by: req.user!.id, approved_at: new Date() });
    sendSuccess(res, pr, 'Request approved');
  } catch (error) { sendError(res, 'Failed to approve request', 500); }
});

// RFQs
const rfqCtrl = new CrudController(EprRfq, 'RFQ', ['rfq_no', 'title']);
router.get('/rfqs', authenticate, rfqCtrl.list);
router.get('/rfqs/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const rfq = await EprRfq.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [{ model: EprRfqResponse, as: 'responses', include: [{ model: EprVendor }] }],
    });
    if (!rfq) { sendError(res, 'RFQ not found', 404); return; }
    sendSuccess(res, rfq);
  } catch (error) { sendError(res, 'Failed to get RFQ', 500); }
});
router.post('/rfqs', authenticate, authorize('admin', 'manager'), rfqCtrl.create);
router.put('/rfqs/:id', authenticate, authorize('admin', 'manager'), rfqCtrl.update);

// RFQ Responses
router.post('/rfqs/:id/responses', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const resp = await EprRfqResponse.create({ rfq_id: req.params.id, ...req.body });
    sendSuccess(res, resp, 'Response submitted', 201);
  } catch (error) { sendError(res, 'Failed to submit response', 500); }
});

// Contracts
const conCtrl = new CrudController(EprContract, 'Contract', ['contract_no', 'title']);
router.get('/contracts', authenticate, conCtrl.list);
router.get('/contracts/:id', authenticate, conCtrl.getById);
router.post('/contracts', authenticate, authorize('admin', 'manager'), conCtrl.create);
router.put('/contracts/:id', authenticate, authorize('admin', 'manager'), conCtrl.update);

export default router;
