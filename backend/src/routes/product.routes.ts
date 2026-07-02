import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/helpers';
import { Category, Product, ProductVariant, ProductPrice, Unit, Stock } from '../models';
import { CrudController } from '../utils/crud';

const router = Router();

// Categories
const catCtrl = new CrudController(Category, 'Category', ['name']);
router.get('/categories', authenticate, catCtrl.list);
router.get('/categories/:id', authenticate, catCtrl.getById);
router.post('/categories', authenticate, authorize('admin', 'manager'), catCtrl.create);
router.put('/categories/:id', authenticate, authorize('admin', 'manager'), catCtrl.update);
router.delete('/categories/:id', authenticate, authorize('admin', 'manager'), catCtrl.delete);

// Products
const prodCtrl = new CrudController(Product, 'Product', ['name', 'sku', 'barcode'], [
  { model: Category, attributes: ['id', 'name'] },
  { model: ProductVariant, as: undefined },
]);
router.get('/', authenticate, prodCtrl.list);
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [
        { model: Category },
        { model: ProductVariant },
        { model: ProductPrice },
        { model: Stock },
      ],
    });
    if (!product) { sendError(res, 'Product not found', 404); return; }
    sendSuccess(res, product);
  } catch (error) {
    sendError(res, 'Failed to get product', 500);
  }
});
router.post('/', authenticate, authorize('admin', 'manager'), prodCtrl.create);
router.put('/:id', authenticate, authorize('admin', 'manager'), prodCtrl.update);
router.delete('/:id', authenticate, authorize('admin', 'manager'), prodCtrl.delete);

// Product Variants
router.get('/:id/variants', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const variants = await ProductVariant.findAll({ where: { product_id: req.params.id } });
    sendSuccess(res, variants);
  } catch (error) {
    sendError(res, 'Failed to get variants', 500);
  }
});
router.post('/:id/variants', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const variant = await ProductVariant.create({ ...req.body, product_id: req.params.id });
    sendSuccess(res, variant, 'Variant created', 201);
  } catch (error) {
    sendError(res, 'Failed to create variant', 500);
  }
});

// Product Prices
router.get('/:id/prices', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const prices = await ProductPrice.findAll({ where: { product_id: req.params.id } });
    sendSuccess(res, prices);
  } catch (error) {
    sendError(res, 'Failed to get prices', 500);
  }
});
router.post('/:id/prices', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const price = await ProductPrice.create({ ...req.body, product_id: req.params.id });
    sendSuccess(res, price, 'Price created', 201);
  } catch (error) {
    sendError(res, 'Failed to create price', 500);
  }
});

// Units
const unitCtrl = new CrudController(Unit, 'Unit', ['name']);
router.get('/units/list', authenticate, unitCtrl.list);
router.post('/units', authenticate, authorize('admin', 'manager'), unitCtrl.create);
router.put('/units/:id', authenticate, authorize('admin', 'manager'), unitCtrl.update);

export default router;
