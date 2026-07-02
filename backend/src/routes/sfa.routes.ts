import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/helpers';
import { SfaTeam, SfaTeamMember, SfaTerritory, SfaVisit, SfaLead, SfaOpportunity, SfaFieldOrder, SfaFieldOrderItem, SfaTarget, SfaTargetAssignment, SfaIncentiveScheme, SfaQuotation, Employee, Customer } from '../models';
import { CrudController } from '../utils/crud';

const router = Router();

// Teams
const teamCtrl = new CrudController(SfaTeam, 'SfaTeam', ['name']);
router.get('/teams', authenticate, teamCtrl.list);
router.get('/teams/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const team = await SfaTeam.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [{ model: SfaTeamMember, as: 'members', include: [{ model: Employee, attributes: ['id', 'name'] }] }],
    });
    if (!team) { sendError(res, 'Team not found', 404); return; }
    sendSuccess(res, team);
  } catch (error) { sendError(res, 'Failed to get team', 500); }
});
router.post('/teams', authenticate, authorize('admin', 'manager'), teamCtrl.create);
router.put('/teams/:id', authenticate, authorize('admin', 'manager'), teamCtrl.update);
router.post('/teams/:id/members', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const member = await SfaTeamMember.create({ team_id: req.params.id, ...req.body });
    sendSuccess(res, member, 'Member added', 201);
  } catch (error) { sendError(res, 'Failed to add member', 500); }
});

// Territories
const terCtrl = new CrudController(SfaTerritory, 'Territory', ['name']);
router.get('/territories', authenticate, terCtrl.list);
router.post('/territories', authenticate, authorize('admin', 'manager'), terCtrl.create);
router.put('/territories/:id', authenticate, authorize('admin', 'manager'), terCtrl.update);

// Visits
const visCtrl = new CrudController(SfaVisit, 'Visit', ['outlet_name', 'purpose']);
router.get('/visits', authenticate, visCtrl.list);
router.get('/visits/:id', authenticate, visCtrl.getById);
router.post('/visits', authenticate, visCtrl.create);
router.put('/visits/:id', authenticate, visCtrl.update);
router.put('/visits/:id/check-in', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const visit = await SfaVisit.findOne({ where: { id: req.params.id, tenant_id: req.tenantId } });
    if (!visit) { sendError(res, 'Visit not found', 404); return; }
    await visit.update({
      status: 'checked_in', check_in_time: new Date(),
      check_in_lat: req.body.latitude, check_in_lng: req.body.longitude, check_in_photo: req.body.photo_url,
    });
    sendSuccess(res, visit, 'Checked in');
  } catch (error) { sendError(res, 'Failed to check in', 500); }
});
router.put('/visits/:id/check-out', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const visit = await SfaVisit.findOne({ where: { id: req.params.id, tenant_id: req.tenantId } });
    if (!visit) { sendError(res, 'Visit not found', 404); return; }
    await visit.update({
      status: 'completed', check_out_time: new Date(), check_out_photo: req.body.photo_url, outcome: req.body.outcome, notes: req.body.notes,
    });
    sendSuccess(res, visit, 'Checked out');
  } catch (error) { sendError(res, 'Failed to check out', 500); }
});

// Leads
const leadCtrl = new CrudController(SfaLead, 'Lead', ['name', 'company', 'email']);
router.get('/leads', authenticate, leadCtrl.list);
router.get('/leads/:id', authenticate, leadCtrl.getById);
router.post('/leads', authenticate, leadCtrl.create);
router.put('/leads/:id', authenticate, leadCtrl.update);
router.delete('/leads/:id', authenticate, leadCtrl.delete);

// Opportunities
const oppCtrl = new CrudController(SfaOpportunity, 'Opportunity', ['name']);
router.get('/opportunities', authenticate, oppCtrl.list);
router.get('/opportunities/:id', authenticate, oppCtrl.getById);
router.post('/opportunities', authenticate, oppCtrl.create);
router.put('/opportunities/:id', authenticate, oppCtrl.update);

// Field Orders
const foCtrl = new CrudController(SfaFieldOrder, 'FieldOrder', ['order_no']);
router.get('/field-orders', authenticate, foCtrl.list);
router.get('/field-orders/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const fo = await SfaFieldOrder.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [{ model: SfaFieldOrderItem, as: 'items' }],
    });
    if (!fo) { sendError(res, 'Field order not found', 404); return; }
    sendSuccess(res, fo);
  } catch (error) { sendError(res, 'Failed to get field order', 500); }
});
router.post('/field-orders', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body, tenant_id: req.tenantId, salesperson_id: req.user!.id };
    const items = data.items || []; delete data.items;
    const fo = await SfaFieldOrder.create(data);
    if (items.length > 0) {
      await SfaFieldOrderItem.bulkCreate(items.map((i: any) => ({ ...i, field_order_id: (fo as any).id })));
    }
    sendSuccess(res, fo, 'Field order created', 201);
  } catch (error) { sendError(res, 'Failed to create field order', 500); }
});
router.put('/field-orders/:id', authenticate, foCtrl.update);

// Targets
const tgtCtrl = new CrudController(SfaTarget, 'Target', ['name']);
router.get('/targets', authenticate, tgtCtrl.list);
router.get('/targets/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const target = await SfaTarget.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [{ model: SfaTargetAssignment, as: 'assignments' }],
    });
    if (!target) { sendError(res, 'Target not found', 404); return; }
    sendSuccess(res, target);
  } catch (error) { sendError(res, 'Failed to get target', 500); }
});
router.post('/targets', authenticate, authorize('admin', 'manager'), tgtCtrl.create);
router.put('/targets/:id', authenticate, authorize('admin', 'manager'), tgtCtrl.update);

// Incentive Schemes
const incCtrl = new CrudController(SfaIncentiveScheme, 'IncentiveScheme', ['name']);
router.get('/incentives', authenticate, incCtrl.list);
router.post('/incentives', authenticate, authorize('admin', 'manager'), incCtrl.create);
router.put('/incentives/:id', authenticate, authorize('admin', 'manager'), incCtrl.update);

// Quotations
const quoCtrl = new CrudController(SfaQuotation, 'Quotation', ['quotation_no']);
router.get('/quotations', authenticate, quoCtrl.list);
router.get('/quotations/:id', authenticate, quoCtrl.getById);
router.post('/quotations', authenticate, quoCtrl.create);
router.put('/quotations/:id', authenticate, quoCtrl.update);
router.delete('/quotations/:id', authenticate, quoCtrl.delete);

export default router;
