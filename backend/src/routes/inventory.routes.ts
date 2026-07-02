import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess, sendError, parsePagination, sendPaginated } from '../utils/helpers';
import { Warehouse, Location, Stock, StockMovement, StockAdjustment, StockAdjustmentItem, StockOpname, StockOpnameItem, Product } from '../models';
import { CrudController } from '../utils/crud';
import { Op } from 'sequelize';
import logger from '../utils/logger';

const router = Router();

// ==================== WAREHOUSES ====================
const whCtrl = new CrudController(Warehouse, 'Warehouse', ['name', 'code']);
router.get('/warehouses', authenticate, whCtrl.list);
router.get('/warehouses/:id', authenticate, whCtrl.getById);
router.post('/warehouses', authenticate, authorize('admin', 'manager'), whCtrl.create);
router.put('/warehouses/:id', authenticate, authorize('admin', 'manager'), whCtrl.update);
router.delete('/warehouses/:id', authenticate, authorize('admin', 'manager'), whCtrl.delete);

// Locations
const locCtrl = new CrudController(Location, 'Location', ['name', 'code']);
router.get('/warehouses/:id/locations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const locations = await Location.findAll({ where: { warehouse_id: req.params.id } });
    sendSuccess(res, locations);
  } catch (error) { sendError(res, 'Failed to get locations', 500); }
});
router.post('/warehouses/:id/locations', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const loc = await Location.create({ ...req.body, warehouse_id: req.params.id });
    sendSuccess(res, loc, 'Location created', 201);
  } catch (error) { sendError(res, 'Failed to create location', 500); }
});

// ==================== STOCK ====================
router.get('/stocks', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pagination = parsePagination(req.query);
    const where: any = { tenant_id: req.tenantId };
    if (req.branchId) where.branch_id = req.branchId;
    if (req.query.warehouse_id) where.warehouse_id = req.query.warehouse_id;
    if (req.query.low_stock === 'true') {
      where.available_qty = { [Op.lte]: 0 };
    }

    const { count, rows } = await Stock.findAndCountAll({
      where,
      include: [{ model: Product, attributes: ['id', 'name', 'sku', 'barcode'] }, { model: Warehouse, attributes: ['id', 'name'] }],
      order: [['product_id', 'ASC']],
      limit: pagination.limit,
      offset: ((pagination.page || 1) - 1) * (pagination.limit || 20),
    });
    sendPaginated(res, rows, count, pagination);
  } catch (error) { sendError(res, 'Failed to get stocks', 500); }
});

router.get('/stocks/:productId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const stocks = await Stock.findAll({
      where: { tenant_id: req.tenantId, product_id: req.params.productId },
      include: [{ model: Warehouse, attributes: ['id', 'name'] }],
    });
    sendSuccess(res, stocks);
  } catch (error) { sendError(res, 'Failed to get stock', 500); }
});

// ==================== STOCK MOVEMENTS ====================
router.get('/movements', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pagination = parsePagination(req.query);
    const where: any = { tenant_id: req.tenantId };
    if (req.branchId) where.branch_id = req.branchId;
    if (req.query.type) where.type = req.query.type;
    if (req.query.product_id) where.product_id = req.query.product_id;

    const { count, rows } = await StockMovement.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: pagination.limit,
      offset: ((pagination.page || 1) - 1) * (pagination.limit || 20),
    });
    sendPaginated(res, rows, count, pagination);
  } catch (error) { sendError(res, 'Failed to get movements', 500); }
});

// ==================== STOCK ADJUSTMENTS ====================
const adjCtrl = new CrudController(StockAdjustment, 'StockAdjustment', ['adjustment_no']);
router.get('/adjustments', authenticate, adjCtrl.list);
router.get('/adjustments/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const adj = await StockAdjustment.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [{ model: StockAdjustmentItem, as: 'items' }],
    });
    if (!adj) { sendError(res, 'Adjustment not found', 404); return; }
    sendSuccess(res, adj);
  } catch (error) { sendError(res, 'Failed to get adjustment', 500); }
});
router.post('/adjustments', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body, tenant_id: req.tenantId, branch_id: req.branchId || req.body.branch_id, created_by: req.user!.id };
    const items = data.items || [];
    delete data.items;
    const adj = await StockAdjustment.create(data);
    if (items.length > 0) {
      await StockAdjustmentItem.bulkCreate(items.map((i: any) => ({ ...i, adjustment_id: (adj as any).id })));
    }
    const result = await StockAdjustment.findByPk((adj as any).id, { include: [{ model: StockAdjustmentItem, as: 'items' }] });
    sendSuccess(res, result, 'Adjustment created', 201);
  } catch (error) { sendError(res, 'Failed to create adjustment', 500); }
});
router.put('/adjustments/:id/approve', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const adj = await StockAdjustment.findOne({ where: { id: req.params.id, tenant_id: req.tenantId, status: 'draft' } });
    if (!adj) { sendError(res, 'Adjustment not found or not draft', 404); return; }
    await adj.update({ status: 'approved', approved_by: req.user!.id, approved_at: new Date() });
    sendSuccess(res, adj, 'Adjustment approved');
  } catch (error) { sendError(res, 'Failed to approve adjustment', 500); }
});

// ==================== STOCK OPNAME ====================
const opnCtrl = new CrudController(StockOpname, 'StockOpname', ['opname_no']);
router.get('/opnames', authenticate, opnCtrl.list);
router.get('/opnames/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const opn = await StockOpname.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [{ model: StockOpnameItem, as: 'items' }],
    });
    if (!opn) { sendError(res, 'Opname not found', 404); return; }
    sendSuccess(res, opn);
  } catch (error) { sendError(res, 'Failed to get opname', 500); }
});
router.post('/opnames', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body, tenant_id: req.tenantId, branch_id: req.branchId || req.body.branch_id, created_by: req.user!.id };
    const items = data.items || [];
    delete data.items;
    const opn = await StockOpname.create(data);
    if (items.length > 0) {
      await StockOpnameItem.bulkCreate(items.map((i: any) => ({ ...i, opname_id: (opn as any).id })));
    }
    sendSuccess(res, opn, 'Opname created', 201);
  } catch (error) { sendError(res, 'Failed to create opname', 500); }
});
router.put('/opnames/:id', authenticate, authorize('admin', 'manager'), opnCtrl.update);

export default router;
