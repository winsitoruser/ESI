import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const PurchaseOrder = require('@/models/PurchaseOrder');
const PurchaseOrderItem = require('@/models/PurchaseOrderItem');
const Product = require('@/models/Product');
const Supplier = require('@/models/Supplier');
const Employee = require('@/models/Employee');
const sequelize = require('@/config/database');
const { Op } = require('sequelize');

function generatePONumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PO${year}${month}${random}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const {
        supplierId,
        status,
        startDate,
        endDate,
        limit = 50,
        offset = 0
      } = req.query;

      const where: any = {};

      if (supplierId) where.supplierId = supplierId;
      if (status) where.status = status;

      if (startDate || endDate) {
        where.orderDate = {};
        if (startDate) where.orderDate[Op.gte] = new Date(startDate as string);
        if (endDate) where.orderDate[Op.lte] = new Date(endDate as string);
      }

      const purchaseOrders = await PurchaseOrder.findAll({
        where,
        include: [
          {
            model: PurchaseOrderItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'sku']
              }
            ]
          },
          {
            model: Employee,
            as: 'creator',
            required: false,
            attributes: ['id', 'name']
          }
        ],
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        order: [['orderDate', 'DESC']]
      });

      const total = await PurchaseOrder.count({ where });

      // Calculate summary
      const summary = await PurchaseOrder.findOne({
        attributes: [
          [PurchaseOrder.sequelize.fn('COUNT', PurchaseOrder.sequelize.col('id')), 'totalOrders'],
          [PurchaseOrder.sequelize.fn('SUM', PurchaseOrder.sequelize.col('totalAmount')), 'totalValue'],
          [PurchaseOrder.sequelize.fn('COUNT', PurchaseOrder.sequelize.literal("CASE WHEN status = 'pending' THEN 1 END")), 'pendingOrders'],
          [PurchaseOrder.sequelize.fn('COUNT', PurchaseOrder.sequelize.literal("CASE WHEN status = 'approved' THEN 1 END")), 'approvedOrders']
        ],
        where,
        raw: true
      });

      return res.status(200).json({
        purchaseOrders,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        summary: {
          totalOrders: parseInt(summary?.totalOrders || '0'),
          totalValue: parseFloat(summary?.totalValue || '0'),
          pendingOrders: parseInt(summary?.pendingOrders || '0'),
          approvedOrders: parseInt(summary?.approvedOrders || '0')
        }
      });
    } catch (error: any) {
      console.error('Error fetching purchase orders:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  if (req.method === 'POST') {
    const transaction = await sequelize.transaction();

    try {
      const {
        supplierId,
        branchId,
        expectedDeliveryDate,
        items,
        paymentTerms,
        notes,
        createdBy
      } = req.body;

      if (!supplierId || !items || items.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Supplier and items are required' });
      }

      // Generate PO number
      const poNumber = generatePONumber();

      // Calculate totals
      let subtotal = 0;
      let taxAmount = 0;
      let totalAmount = 0;

      const processedItems = items.map((item: any) => {
        const itemSubtotal = item.quantity * item.unitPrice;
        const itemTax = itemSubtotal * (item.taxRate || 0) / 100;
        const itemDiscount = itemSubtotal * (item.discountRate || 0) / 100;
        const itemTotal = itemSubtotal + itemTax - itemDiscount;

        subtotal += itemSubtotal;
        taxAmount += itemTax;
        totalAmount += itemTotal;

        return {
          ...item,
          subtotal: itemSubtotal,
          taxAmount: itemTax,
          discountAmount: itemDiscount,
          totalAmount: itemTotal
        };
      });

      // Create purchase order
      const purchaseOrder = await PurchaseOrder.create({
        poNumber,
        supplierId,
        branchId,
        orderDate: new Date(),
        expectedDeliveryDate,
        status: 'draft',
        subtotal,
        taxAmount,
        discountAmount: 0,
        shippingCost: 0,
        totalAmount,
        paymentTerms,
        paymentStatus: 'unpaid',
        notes,
        createdBy
      }, { transaction });

      // Create purchase order items
      const poItems = await Promise.all(
        processedItems.map((item: any) =>
          PurchaseOrderItem.create({
            purchaseOrderId: purchaseOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            receivedQuantity: 0,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate || 0,
            taxAmount: item.taxAmount,
            discountRate: item.discountRate || 0,
            discountAmount: item.discountAmount,
            subtotal: item.subtotal,
            totalAmount: item.totalAmount,
            notes: item.notes
          }, { transaction })
        )
      );

      await transaction.commit();

      return res.status(201).json({
        message: 'Purchase order created successfully',
        purchaseOrder: {
          ...purchaseOrder.toJSON(),
          items: poItems
        }
      });
    } catch (error: any) {
      await transaction.rollback();
      console.error('Error creating purchase order:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
