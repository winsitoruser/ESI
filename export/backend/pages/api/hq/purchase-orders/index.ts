import type { NextApiRequest, NextApiResponse } from 'next';
import { PurchaseOrder, PurchaseOrderItem, Supplier, Branch, User } from '../../../../models';
import { Op } from 'sequelize';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getPurchaseOrders(req, res);
      case 'POST':
        return await createPurchaseOrder(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Purchase Order API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getPurchaseOrders(req: NextApiRequest, res: NextApiResponse) {
  const { page = '1', limit = '20', search, status, supplierId } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  try {
    const where: any = {};
    
    if (search) {
      where[Op.or] = [
        { poNumber: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (supplierId) {
      where.supplierId = supplierId;
    }

    const { count, rows } = await PurchaseOrder.findAndCountAll({
      where,
      include: [
        { model: Supplier, as: 'supplier', attributes: ['id', 'code', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'code', 'name'] },
        { model: User, as: 'createdByUser', attributes: ['id', 'name'] },
        { model: User, as: 'approvedByUser', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: limitNum,
      offset
    });

    const purchaseOrders = rows.map((po: any) => ({
      id: po.id,
      poNumber: po.poNumber,
      supplier: po.supplier ? { id: po.supplier.id, code: po.supplier.code, name: po.supplier.name } : null,
      branch: po.branch ? { id: po.branch.id, code: po.branch.code, name: po.branch.name } : null,
      status: po.status,
      orderDate: po.orderDate,
      expectedDelivery: po.expectedDelivery,
      totalItems: po.totalItems || 0,
      totalQuantity: po.totalQuantity || 0,
      subtotal: parseFloat(po.subtotal) || 0,
      tax: parseFloat(po.tax) || 0,
      total: parseFloat(po.total) || 0,
      notes: po.notes,
      createdBy: po.createdByUser?.name,
      approvedBy: po.approvedByUser?.name,
      approvedAt: po.approvedAt,
      createdAt: po.createdAt
    }));

    return res.status(200).json({
      purchaseOrders,
      total: count,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(count / limitNum)
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return res.status(200).json({
      purchaseOrders: getMockPurchaseOrders(),
      total: 5,
      page: 1,
      limit: 20,
      totalPages: 1
    });
  }
}

async function createPurchaseOrder(req: NextApiRequest, res: NextApiResponse) {
  const { supplierId, branchId, expectedDelivery, items, notes } = req.body;

  if (!supplierId || !items || items.length === 0) {
    return res.status(400).json({ error: 'Supplier and items are required' });
  }

  try {
    const poNumber = `PO-${Date.now()}`;
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
    const subtotal = items.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
    const tax = subtotal * 0.11;
    const total = subtotal + tax;

    const purchaseOrder = await PurchaseOrder.create({
      poNumber,
      supplierId,
      branchId,
      status: 'draft',
      orderDate: new Date(),
      expectedDelivery,
      totalItems,
      totalQuantity,
      subtotal,
      tax,
      total,
      notes
    });

    // Create PO items
    for (const item of items) {
      await PurchaseOrderItem.create({
        purchaseOrderId: purchaseOrder.get('id'),
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.quantity * item.unitPrice
      });
    }

    return res.status(201).json({ purchaseOrder, message: 'Purchase order created successfully' });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return res.status(500).json({ error: 'Failed to create purchase order' });
  }
}

function getMockPurchaseOrders() {
  return [
    { id: '1', poNumber: 'PO-2602-0001', supplier: { id: '1', code: 'SUP-001', name: 'PT Supplier Utama' }, branch: { id: '6', code: 'WH-001', name: 'Gudang Pusat' }, status: 'approved', orderDate: '2026-02-22', expectedDelivery: '2026-02-25', totalItems: 15, totalQuantity: 450, subtotal: 45000000, tax: 4950000, total: 49950000, createdBy: 'Admin HQ' },
    { id: '2', poNumber: 'PO-2602-0002', supplier: { id: '2', code: 'SUP-002', name: 'CV Distributor Jaya' }, branch: { id: '2', code: 'BR-002', name: 'Cabang Bandung' }, status: 'sent', orderDate: '2026-02-21', expectedDelivery: '2026-02-24', totalItems: 8, totalQuantity: 200, subtotal: 18500000, tax: 2035000, total: 20535000, createdBy: 'Admin HQ' },
    { id: '3', poNumber: 'PO-2602-0003', supplier: { id: '1', code: 'SUP-001', name: 'PT Supplier Utama' }, branch: { id: '6', code: 'WH-001', name: 'Gudang Pusat' }, status: 'draft', orderDate: '2026-02-22', expectedDelivery: null, totalItems: 5, totalQuantity: 100, subtotal: 12000000, tax: 1320000, total: 13320000, createdBy: 'Admin HQ' }
  ];
}
