import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/helpers';
import { CrmCustomer, CrmContact, CrmInteraction, CrmTicket, CrmTicketComment, CrmForecast, CrmAutomationRule, CrmDocument, CrmSegment, Customer } from '../models';
import { CrudController } from '../utils/crud';

const router = Router();

// CRM Customers
const ccCtrl = new CrudController(CrmCustomer, 'CrmCustomer', []);
router.get('/customers', authenticate, ccCtrl.list);
router.get('/customers/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const c = await CrmCustomer.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [{ model: Customer }, { model: CrmContact }, { model: CrmInteraction }],
    });
    if (!c) { sendError(res, 'CRM Customer not found', 404); return; }
    sendSuccess(res, c);
  } catch (error) { sendError(res, 'Failed to get CRM customer', 500); }
});
router.post('/customers', authenticate, ccCtrl.create);
router.put('/customers/:id', authenticate, ccCtrl.update);

// Contacts
router.post('/customers/:id/contacts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const contact = await CrmContact.create({ crm_customer_id: req.params.id, tenant_id: req.tenantId, ...req.body });
    sendSuccess(res, contact, 'Contact added', 201);
  } catch (error) { sendError(res, 'Failed to add contact', 500); }
});

// Interactions
router.get('/customers/:id/interactions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const interactions = await CrmInteraction.findAll({
      where: { crm_customer_id: req.params.id, tenant_id: req.tenantId },
      order: [['created_at', 'DESC']], limit: 50,
    });
    sendSuccess(res, interactions);
  } catch (error) { sendError(res, 'Failed to get interactions', 500); }
});
router.post('/customers/:id/interactions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const interaction = await CrmInteraction.create({
      crm_customer_id: req.params.id, tenant_id: req.tenantId, created_by: req.user!.id, ...req.body,
    });
    sendSuccess(res, interaction, 'Interaction recorded', 201);
  } catch (error) { sendError(res, 'Failed to record interaction', 500); }
});

// Tickets
const tkCtrl = new CrudController(CrmTicket, 'Ticket', ['ticket_no', 'subject']);
router.get('/tickets', authenticate, tkCtrl.list);
router.get('/tickets/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const t = await CrmTicket.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [{ model: CrmTicketComment }],
    });
    if (!t) { sendError(res, 'Ticket not found', 404); return; }
    sendSuccess(res, t);
  } catch (error) { sendError(res, 'Failed to get ticket', 500); }
});
router.post('/tickets', authenticate, tkCtrl.create);
router.put('/tickets/:id', authenticate, tkCtrl.update);
router.post('/tickets/:id/comments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const comment = await CrmTicketComment.create({ ticket_id: req.params.id, created_by: req.user!.id, ...req.body });
    sendSuccess(res, comment, 'Comment added', 201);
  } catch (error) { sendError(res, 'Failed to add comment', 500); }
});

// Forecasts
const fcCtrl = new CrudController(CrmForecast, 'Forecast', ['name']);
router.get('/forecasts', authenticate, fcCtrl.list);
router.post('/forecasts', authenticate, authorize('admin', 'manager'), fcCtrl.create);
router.put('/forecasts/:id', authenticate, authorize('admin', 'manager'), fcCtrl.update);

// Automation Rules
const arCtrl = new CrudController(CrmAutomationRule, 'AutomationRule', ['name']);
router.get('/automations', authenticate, arCtrl.list);
router.post('/automations', authenticate, authorize('admin'), arCtrl.create);
router.put('/automations/:id', authenticate, authorize('admin'), arCtrl.update);
router.delete('/automations/:id', authenticate, authorize('admin'), arCtrl.delete);

// Documents
const docCtrl = new CrudController(CrmDocument, 'Document', ['name']);
router.get('/documents', authenticate, docCtrl.list);
router.post('/documents', authenticate, docCtrl.create);

// Segments
const segCtrl = new CrudController(CrmSegment, 'Segment', ['name']);
router.get('/segments', authenticate, segCtrl.list);
router.post('/segments', authenticate, authorize('admin', 'manager'), segCtrl.create);
router.put('/segments/:id', authenticate, authorize('admin', 'manager'), segCtrl.update);

export default router;
