import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const SalesOrder = require('@/models/SalesOrder');
const SalesOrderItem = require('@/models/SalesOrderItem');
const Product = require('@/models/Product');
const Customer = require('@/models/Customer');
const Stock = require('@/models/Stock');
const sequelize = require('@/config/database');
const { Op } = require('sequelize');

function generateSONumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SO${year}${month}${random}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const {
        customerId,
        status,
        startDate,
        endDate,
        limit = 50,
        offset = 0
      } = req.query;

      const where: any = {};

      if (customerId) where.customerId = customerId;
      if (status) where.status = status;

      if (startDate || endDate) {
        where.orderDate = {};
        if (startDate) where.orderDate[Op.gte] = new Date(startDate as string);
        if (endDate) where.orderDate[Op.lte] = new Date(endDate as string);
      }

      const salesOrders = await SalesOrder.findAll({
        where,
        include: [
          {
            model: Customer,
            as: 'customer',
            attributes: ['id', 'name', 'email', 'phone']
          },
          {
            model: SalesOrderItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'sku']
              }
            ]
          }
        ],
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        order: [['orderDate', 'DESC']]
      });

      const total = await SalesOrder.count({ where });

      const summary = await SalesOrder.findOne({
        attributes: [
          [SalesOrder.sequelize.fn('COUNT', SalesOrder.sequelize.col('id')), 'totalOrders'],
          [SalesOrder.sequelize.fn('SUM', SalesOrder.sequelize.col('totalAmount')), 'totalValue'],
          [SalesOrder.sequelize.fn('COUNT', SalesOrder.sequelize.literal("CASE WHEN status = 'pending' THEN 1 END")), 'pendingOrders'],
          [SalesOrder.sequelize.fn('COUNT', SalesOrder.sequelize.literal("CASE WHEN status = 'completed' THEN 1 END")), 'completedOrders']
        ],
        where,
        raw: true
      });

      return res.status(200).json({
        salesOrders,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        summary: {
          totalOrders: parseInt(summary?.totalOrders || '0'),
          totalValue: parseFloat(summary?.totalValue || '0'),
          pendingOrders: parseInt(summary?.pendingOrders || '0'),
          completedOrders: parseInt(summary?.completedOrders || '0')
        }
      });
    } catch (error: any) {
      console.error('Error fetching sales orders:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  if (req.method === 'POST') {
    const transaction = await sequelize.transaction();

    try {
      const {
        customerId,
        branchId,
        requiredDate,
        items,
        shippingAddress,
        shippingMethod,
        shippingCost,
        notes,
        createdBy
      } = req.body;

      if (!customerId || !items || items.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Customer and items are required' });
      }

      // Check stock availability for all items
      for (const item of items) {
        const stock = await Stock.findOne({
          where: { 
            productId: item.productId,
            branchId: branchId || null
          },
          transaction
        });

        if (!stock) {
          await transaction.rollback();
          return res.status(400).json({ 
            error: `Stock record not found for product ${item.productId}` 
          });
        }

        const availableQty = parseFloat(stock.quantity) - parseFloat(stock.reservedQuantity);
        if (availableQty < item.quantity) {
          await transaction.rollback();
          return res.status(400).json({ 
            error: `Insufficient stock for product ${item.productId}`,
            available: availableQty,
            requested: item.quantity
          });
        }
      }

      // Generate SO number
      const soNumber = generateSONumber();

      // Calculate totals
      let subtotal = 0;
      let taxAmount = 0;
      let discountAmount = 0;
      let totalAmount = 0;

      const processedItems = items.map((item: any) => {
        const itemSubtotal = item.quantity * item.unitPrice;
        const itemTax = itemSubtotal * (item.taxRate || 0) / 100;
        const itemDiscount = itemSubtotal * (item.discountRate || 0) / 100;
        const itemTotal = itemSubtotal + itemTax - itemDiscount;

        subtotal += itemSubtotal;
        taxAmount += itemTax;
        discountAmount += itemDiscount;
        totalAmount += itemTotal;

        return {
          ...item,
          subtotal: itemSubtotal,
          taxAmount: itemTax,
          discountAmount: itemDiscount,
          totalAmount: itemTotal
        };
      });

      totalAmount += parseFloat(shippingCost || 0);

      // Create sales order
      const salesOrder = await SalesOrder.create({
        soNumber,
        customerId,
        branchId,
        orderDate: new Date(),
        requiredDate,
        status: 'draft',
        paymentStatus: 'unpaid',
        subtotal,
        taxAmount,
        discountAmount,
        shippingCost: shippingCost || 0,
        totalAmount,
        shippingAddress,
        shippingMethod,
        notes,
        createdBy
      }, { transaction });

      // Create sales order items and reserve stock
      const soItems = await Promise.all(
        processedItems.map(async (item: any) => {
          const soItem = await SalesOrderItem.create({
            salesOrderId: salesOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            shippedQuantity: 0,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate || 0,
            taxAmount: item.taxAmount,
            discountRate: item.discountRate || 0,
            discountAmount: item.discountAmount,
            subtotal: item.subtotal,
            totalAmount: item.totalAmount,
            notes: item.notes
          }, { transaction });

          // Reserve stock
          const stock = await Stock.findOne({
            where: { 
              productId: item.productId,
              branchId: branchId || null
            },
            transaction
          });

          await stock.update({
            reservedQuantity: parseFloat(stock.reservedQuantity) + parseFloat(item.quantity)
          }, { transaction });

          return soItem;
        })
      );

      await transaction.commit();

      return res.status(201).json({
        message: 'Sales order created successfully',
        salesOrder: {
          ...salesOrder.toJSON(),
          items: soItems
        }
      });
    } catch (error: any) {
      await transaction.rollback();
      console.error('Error creating sales order:', error);
      return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
