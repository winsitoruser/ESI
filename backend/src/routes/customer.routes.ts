import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/helpers';
import { Customer, CustomerLoyalty, LoyaltyProgram, LoyaltyTier, LoyaltyReward, PointTransaction, RewardRedemption } from '../models';
import { CrudController } from '../utils/crud';

const router = Router();

// Customers
const custCtrl = new CrudController(Customer, 'Customer', ['name', 'email', 'phone', 'code']);
router.get('/', authenticate, custCtrl.list);
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const customer = await Customer.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [{ model: CustomerLoyalty, include: [{ model: LoyaltyProgram }] }],
    });
    if (!customer) { sendError(res, 'Customer not found', 404); return; }
    sendSuccess(res, customer);
  } catch (error) { sendError(res, 'Failed to get customer', 500); }
});
router.post('/', authenticate, custCtrl.create);
router.put('/:id', authenticate, custCtrl.update);
router.delete('/:id', authenticate, authorize('admin', 'manager'), custCtrl.delete);

// Loyalty Programs
const loyCtrl = new CrudController(LoyaltyProgram, 'LoyaltyProgram', ['name']);
router.get('/loyalty/programs', authenticate, loyCtrl.list);
router.get('/loyalty/programs/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prog = await LoyaltyProgram.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [{ model: LoyaltyTier }, { model: LoyaltyReward }],
    });
    if (!prog) { sendError(res, 'Program not found', 404); return; }
    sendSuccess(res, prog);
  } catch (error) { sendError(res, 'Failed to get program', 500); }
});
router.post('/loyalty/programs', authenticate, authorize('admin', 'manager'), loyCtrl.create);
router.put('/loyalty/programs/:id', authenticate, authorize('admin', 'manager'), loyCtrl.update);

// Loyalty Tiers
router.post('/loyalty/programs/:id/tiers', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const tier = await LoyaltyTier.create({ ...req.body, program_id: req.params.id });
    sendSuccess(res, tier, 'Tier created', 201);
  } catch (error) { sendError(res, 'Failed to create tier', 500); }
});

// Loyalty Rewards
const rwdCtrl = new CrudController(LoyaltyReward, 'LoyaltyReward', ['name']);
router.get('/loyalty/rewards', authenticate, rwdCtrl.list);
router.post('/loyalty/rewards', authenticate, authorize('admin', 'manager'), rwdCtrl.create);
router.put('/loyalty/rewards/:id', authenticate, authorize('admin', 'manager'), rwdCtrl.update);

// Point Transactions
router.get('/:id/points', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const points = await PointTransaction.findAll({
      where: { tenant_id: req.tenantId, customer_id: req.params.id },
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    sendSuccess(res, points);
  } catch (error) { sendError(res, 'Failed to get points', 500); }
});

// Redeem Reward
router.post('/:id/redeem', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { reward_id } = req.body;
    const reward = await LoyaltyReward.findByPk(reward_id);
    if (!reward) { sendError(res, 'Reward not found', 404); return; }

    const loyalty = await CustomerLoyalty.findOne({ where: { customer_id: req.params.id, tenant_id: req.tenantId } });
    if (!loyalty) { sendError(res, 'Customer has no loyalty membership', 400); return; }

    if ((loyalty as any).points_balance < (reward as any).points_required) {
      sendError(res, 'Insufficient points', 400); return;
    }

    const redemption = await RewardRedemption.create({
      tenant_id: req.tenantId,
      customer_id: req.params.id,
      reward_id,
      points_used: (reward as any).points_required,
      status: 'completed',
    });

    await loyalty.update({ points_balance: (loyalty as any).points_balance - (reward as any).points_required, total_points_redeemed: (loyalty as any).total_points_redeemed + (reward as any).points_required });

    sendSuccess(res, redemption, 'Reward redeemed');
  } catch (error) { sendError(res, 'Failed to redeem reward', 500); }
});

export default router;
