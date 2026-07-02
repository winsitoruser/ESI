import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/helpers';
import { KitchenOrder, KitchenOrderItem, KitchenRecipe, KitchenRecipeIngredient, KitchenInventoryItem, KitchenSettings } from '../models';
import { CrudController } from '../utils/crud';

const router = Router();

// Kitchen Orders
const koCtrl = new CrudController(KitchenOrder, 'KitchenOrder', ['order_no']);
router.get('/orders', authenticate, koCtrl.list);
router.get('/orders/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await KitchenOrder.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [{ model: KitchenOrderItem, as: 'items' }],
    });
    if (!order) { sendError(res, 'Order not found', 404); return; }
    sendSuccess(res, order);
  } catch (error) { sendError(res, 'Failed to get order', 500); }
});
router.post('/orders', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body, tenant_id: req.tenantId, branch_id: req.branchId || req.body.branch_id };
    const items = data.items || []; delete data.items;
    const order = await KitchenOrder.create(data);
    if (items.length > 0) {
      await KitchenOrderItem.bulkCreate(items.map((i: any) => ({ ...i, kitchen_order_id: (order as any).id })));
    }
    sendSuccess(res, order, 'Kitchen order created', 201);
  } catch (error) { sendError(res, 'Failed to create order', 500); }
});
router.put('/orders/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const order = await KitchenOrder.findOne({ where: { id: req.params.id, tenant_id: req.tenantId } });
    if (!order) { sendError(res, 'Order not found', 404); return; }
    const updateData: any = { status: req.body.status };
    if (req.body.status === 'preparing') updateData.started_at = new Date();
    if (req.body.status === 'ready') updateData.completed_at = new Date();
    if (req.body.status === 'served') updateData.served_at = new Date();
    await order.update(updateData);
    sendSuccess(res, order, 'Status updated');
  } catch (error) { sendError(res, 'Failed to update status', 500); }
});

// Recipes
const recCtrl = new CrudController(KitchenRecipe, 'KitchenRecipe', ['name']);
router.get('/recipes', authenticate, recCtrl.list);
router.get('/recipes/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const recipe = await KitchenRecipe.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [{ model: KitchenRecipeIngredient, as: 'ingredients' }],
    });
    if (!recipe) { sendError(res, 'Recipe not found', 404); return; }
    sendSuccess(res, recipe);
  } catch (error) { sendError(res, 'Failed to get recipe', 500); }
});
router.post('/recipes', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body, tenant_id: req.tenantId };
    const ingredients = data.ingredients || []; delete data.ingredients;
    const recipe = await KitchenRecipe.create(data);
    if (ingredients.length > 0) {
      await KitchenRecipeIngredient.bulkCreate(ingredients.map((i: any) => ({ ...i, recipe_id: (recipe as any).id })));
    }
    sendSuccess(res, recipe, 'Recipe created', 201);
  } catch (error) { sendError(res, 'Failed to create recipe', 500); }
});
router.put('/recipes/:id', authenticate, authorize('admin', 'manager'), recCtrl.update);
router.delete('/recipes/:id', authenticate, authorize('admin', 'manager'), recCtrl.delete);

// Kitchen Inventory
const kiCtrl = new CrudController(KitchenInventoryItem, 'KitchenInventoryItem', []);
router.get('/inventory', authenticate, kiCtrl.list);
router.post('/inventory', authenticate, authorize('admin', 'manager'), kiCtrl.create);
router.put('/inventory/:id', authenticate, authorize('admin', 'manager'), kiCtrl.update);

// Kitchen Settings
router.get('/settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await KitchenSettings.findOne({ where: { tenant_id: req.tenantId, branch_id: req.branchId } });
    sendSuccess(res, settings);
  } catch (error) { sendError(res, 'Failed to get settings', 500); }
});
router.put('/settings', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const [settings] = await KitchenSettings.upsert({
      tenant_id: req.tenantId, branch_id: req.branchId, ...req.body,
    });
    sendSuccess(res, settings, 'Settings updated');
  } catch (error) { sendError(res, 'Failed to update settings', 500); }
});

export default router;
