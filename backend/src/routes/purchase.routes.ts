import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess, sendError } from '../utils/helpers';
import { Supplier, PurchaseOrder, PurchaseOrderItem, GoodsReceipt, GoodsReceiptItem, Product } from '../models';
import { CrudController } from '../utils/crud';

const router = Router();

// Suppliers
const supCtrl = new CrudController(Supplier, 'Supplier', ['name', 'code', 'contact_person']);
router.get('/suppliers', authenticate, supCtrl.list);
router.get('/suppliers/:id', authenticate, supCtrl.getById);
router.post('/suppliers', authenticate, authorize('admin', 'manager'), supCtrl.create);
router.put('/suppliers/:id', authenticate, authorize('admin', 'manager'), supCtrl.update);
router.delete('/suppliers/:id', authenticate, authorize('admin', 'manager'), supCtrl.delete);

// Purchase Orders
const poCtrl = new CrudController(PurchaseOrder, 'PurchaseOrder', ['po_number']);
router.get('/orders', authenticate, poCtrl.list);
router.get('/orders/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const po = await PurchaseOrder.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [
        { model: PurchaseOrderItem, as: 'items', include: [{ model: Product, attributes: ['id', 'name', 'sku'] }] },
        { model: Supplier },
      ],
    });
    if (!po) { sendError(res, 'PO not found', 404); return; }
    sendSuccess(res, po);
  } catch (error) { sendError(res, 'Failed to get PO', 500); }
});
router.post('/orders', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body, tenant_id: req.tenantId, branch_id: req.branchId || req.body.branch_id, created_by: req.user!.id };
    const items = data.items || []; delete data.items;
    const po = await PurchaseOrder.create(data);
    if (items.length > 0) {
      await PurchaseOrderItem.bulkCreate(items.map((i: any) => ({ ...i, purchase_order_id: (po as any).id })));
    }
    sendSuccess(res, po, 'PO created', 201);
  } catch (error) { sendError(res, 'Failed to create PO', 500); }
});
router.put('/orders/:id', authenticate, authorize('admin', 'manager'), poCtrl.update);
router.put('/orders/:id/approve', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const po = await PurchaseOrder.findOne({ where: { id: req.params.id, tenant_id: req.tenantId, status: 'draft' } });
    if (!po) { sendError(res, 'PO not found or not draft', 404); return; }
    await po.update({ status: 'approved', approved_by: req.user!.id, approved_at: new Date() });
    sendSuccess(res, po, 'PO approved');
  } catch (error) { sendError(res, 'Failed to approve PO', 500); }
});

// Goods Receipts
const grCtrl = new CrudController(GoodsReceipt, 'GoodsReceipt', ['receipt_no']);
router.get('/receipts', authenticate, grCtrl.list);
router.get('/receipts/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const gr = await GoodsReceipt.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [{ model: GoodsReceiptItem, as: 'items' }, { model: Supplier }, { model: PurchaseOrder }],
    });
    if (!gr) { sendError(res, 'Receipt not found', 404); return; }
    sendSuccess(res, gr);
  } catch (error) { sendError(res, 'Failed to get receipt', 500); }
});
router.post('/receipts', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const data = { ...req.body, tenant_id: req.tenantId, branch_id: req.branchId || req.body.branch_id, created_by: req.user!.id };
    const items = data.items || []; delete data.items;
    const gr = await GoodsReceipt.create(data);
    if (items.length > 0) {
      await GoodsReceiptItem.bulkCreate(items.map((i: any) => ({ ...i, goods_receipt_id: (gr as any).id })));
    }
    sendSuccess(res, gr, 'Receipt created', 201);
  } catch (error) { sendError(res, 'Failed to create receipt', 500); }
});
router.put('/receipts/:id', authenticate, grCtrl.update);

export default router;
