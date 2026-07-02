import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/helpers';
import { MktCampaign, MktCampaignChannel, MktSegment, MktPromotion, MktBudget, Promo, PromoProduct, PromoCategory, Voucher } from '../models';
import { CrudController } from '../utils/crud';

const router = Router();

// Campaigns
const campCtrl = new CrudController(MktCampaign, 'Campaign', ['name']);
router.get('/campaigns', authenticate, campCtrl.list);
router.get('/campaigns/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const c = await MktCampaign.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [{ model: MktCampaignChannel, as: 'channels' }],
    });
    if (!c) { sendError(res, 'Campaign not found', 404); return; }
    sendSuccess(res, c);
  } catch (error) { sendError(res, 'Failed to get campaign', 500); }
});
router.post('/campaigns', authenticate, authorize('admin', 'manager'), campCtrl.create);
router.put('/campaigns/:id', authenticate, authorize('admin', 'manager'), campCtrl.update);
router.delete('/campaigns/:id', authenticate, authorize('admin'), campCtrl.delete);

// Segments
const segCtrl = new CrudController(MktSegment, 'Segment', ['name']);
router.get('/segments', authenticate, segCtrl.list);
router.post('/segments', authenticate, authorize('admin', 'manager'), segCtrl.create);
router.put('/segments/:id', authenticate, authorize('admin', 'manager'), segCtrl.update);

// Promotions
const promoCtrl = new CrudController(MktPromotion, 'Promotion', ['name']);
router.get('/promotions', authenticate, promoCtrl.list);
router.post('/promotions', authenticate, authorize('admin', 'manager'), promoCtrl.create);
router.put('/promotions/:id', authenticate, authorize('admin', 'manager'), promoCtrl.update);

// Budgets
const budCtrl = new CrudController(MktBudget, 'MktBudget', ['name']);
router.get('/budgets', authenticate, budCtrl.list);
router.post('/budgets', authenticate, authorize('admin', 'manager'), budCtrl.create);
router.put('/budgets/:id', authenticate, authorize('admin', 'manager'), budCtrl.update);

// ==================== PROMOS & VOUCHERS ====================
const pmCtrl = new CrudController(Promo, 'Promo', ['name', 'code']);
router.get('/promos', authenticate, pmCtrl.list);
router.get('/promos/:id', authenticate, pmCtrl.getById);
router.post('/promos', authenticate, authorize('admin', 'manager'), pmCtrl.create);
router.put('/promos/:id', authenticate, authorize('admin', 'manager'), pmCtrl.update);
router.delete('/promos/:id', authenticate, authorize('admin'), pmCtrl.delete);

router.post('/promos/:id/products', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const pp = await PromoProduct.create({ promo_id: req.params.id, ...req.body });
    sendSuccess(res, pp, 'Product added to promo', 201);
  } catch (error) { sendError(res, 'Failed to add product', 500); }
});
router.post('/promos/:id/categories', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const pc = await PromoCategory.create({ promo_id: req.params.id, ...req.body });
    sendSuccess(res, pc, 'Category added to promo', 201);
  } catch (error) { sendError(res, 'Failed to add category', 500); }
});

const vchCtrl = new CrudController(Voucher, 'Voucher', ['name', 'code']);
router.get('/vouchers', authenticate, vchCtrl.list);
router.get('/vouchers/:id', authenticate, vchCtrl.getById);
router.post('/vouchers', authenticate, authorize('admin', 'manager'), vchCtrl.create);
router.put('/vouchers/:id', authenticate, authorize('admin', 'manager'), vchCtrl.update);
router.delete('/vouchers/:id', authenticate, authorize('admin'), vchCtrl.delete);

export default router;
