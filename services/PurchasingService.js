const db = require('../models');

class PurchasingService {
  // Purchase Order Management
  async createPurchaseOrder(orderData) {
    try {
      const { items, ...poData } = orderData;
      
      // Create PO
      const po = await db.PurchaseOrder.create({
        ...poData,
        status: 'draft',
        orderDate: new Date()
      });

      // Create PO items
      if (items && items.length > 0) {
        const poItems = items.map(item => ({
          ...item,
          purchaseOrderId: po.id
        }));
        await db.PurchaseOrderItem.bulkCreate(poItems);
      }

      return await this.getPurchaseOrderById(po.id);
    } catch (error) {
      throw new Error(`Failed to create purchase order: ${error.message}`);
    }
  }

  async getPurchaseOrderById(id) {
    try {
      return await db.PurchaseOrder.findByPk(id, {
        include: [
          { model: db.PurchaseOrderItem, as: 'items' },
          { model: db.Supplier, as: 'supplier' }
        ]
      });
    } catch (error) {
      throw new Error(`Failed to get purchase order: ${error.message}`);
    }
  }

  async getPurchaseOrders(filters = {}) {
    try {
      const { status, supplierId, startDate, endDate, page = 1, limit = 20 } = filters;
      const where = {};
      
      if (status) {
        where.status = status;
      }
      
      if (supplierId) {
        where.supplierId = supplierId;
      }
      
      if (startDate && endDate) {
        where.orderDate = {
          [db.Sequelize.Op.between]: [startDate, endDate]
        };
      }

      const offset = (page - 1) * limit;

      const { rows, count } = await db.PurchaseOrder.findAndCountAll({
        where,
        include: [
          { model: db.PurchaseOrderItem, as: 'items' },
          { model: db.Supplier, as: 'supplier' }
        ],
        limit,
        offset,
        order: [['orderDate', 'DESC']]
      });

      return {
        purchaseOrders: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      throw new Error(`Failed to get purchase orders: ${error.message}`);
    }
  }

  async updatePurchaseOrder(id, updateData) {
    try {
      const po = await db.PurchaseOrder.findByPk(id);
      if (!po) {
        throw new Error('Purchase order not found');
      }
      
      await po.update(updateData);
      return await this.getPurchaseOrderById(id);
    } catch (error) {
      throw new Error(`Failed to update purchase order: ${error.message}`);
    }
  }

  async approvePurchaseOrder(id, approvedBy) {
    try {
      return await this.updatePurchaseOrder(id, {
        status: 'approved',
        approvedBy,
        approvedAt: new Date()
      });
    } catch (error) {
      throw new Error(`Failed to approve purchase order: ${error.message}`);
    }
  }

  async cancelPurchaseOrder(id, reason) {
    try {
      return await this.updatePurchaseOrder(id, {
        status: 'cancelled',
        cancelReason: reason,
        cancelledAt: new Date()
      });
    } catch (error) {
      throw new Error(`Failed to cancel purchase order: ${error.message}`);
    }
  }

  // Goods Receipt Management
  async createGoodsReceipt(receiptData) {
    try {
      const { items, purchaseOrderId, ...grData } = receiptData;
      
      // Create goods receipt
      const gr = await db.GoodsReceipt.create({
        ...grData,
        purchaseOrderId,
        receiptDate: new Date(),
        status: 'completed'
      });

      // Create receipt items and update stock
      if (items && items.length > 0) {
        for (const item of items) {
          // Create receipt item
          await db.GoodsReceiptItem.create({
            ...item,
            goodsReceiptId: gr.id
          });

          // Update stock
          const stock = await db.Stock.findOne({
            where: {
              productId: item.productId,
              warehouseId: grData.warehouseId || 1
            }
          });

          if (stock) {
            await stock.update({
              quantity: stock.quantity + item.quantityReceived
            });
          } else {
            await db.Stock.create({
              productId: item.productId,
              warehouseId: grData.warehouseId || 1,
              quantity: item.quantityReceived
            });
          }

          // Create stock movement
          await db.StockMovement.create({
            productId: item.productId,
            warehouseId: grData.warehouseId || 1,
            type: 'in',
            quantity: item.quantityReceived,
            reference: `GR-${gr.id}`,
            notes: `Goods receipt from PO-${purchaseOrderId}`
          });
        }
      }

      // Update PO status if fully received
      if (purchaseOrderId) {
        const po = await db.PurchaseOrder.findByPk(purchaseOrderId, {
          include: [{ model: db.PurchaseOrderItem, as: 'items' }]
        });

        if (po) {
          const allReceived = po.items.every(poItem => {
            const receivedItem = items.find(i => i.productId === poItem.productId);
            return receivedItem && receivedItem.quantityReceived >= poItem.quantity;
          });

          if (allReceived) {
            await po.update({ status: 'received' });
          } else {
            await po.update({ status: 'partial' });
          }
        }
      }

      return await this.getGoodsReceiptById(gr.id);
    } catch (error) {
      throw new Error(`Failed to create goods receipt: ${error.message}`);
    }
  }

  async getGoodsReceiptById(id) {
    try {
      return await db.GoodsReceipt.findByPk(id, {
        include: [
          { model: db.GoodsReceiptItem, as: 'items' },
          { model: db.PurchaseOrder, as: 'purchaseOrder' }
        ]
      });
    } catch (error) {
      throw new Error(`Failed to get goods receipt: ${error.message}`);
    }
  }

  async getGoodsReceipts(filters = {}) {
    try {
      const { purchaseOrderId, startDate, endDate, page = 1, limit = 20 } = filters;
      const where = {};
      
      if (purchaseOrderId) {
        where.purchaseOrderId = purchaseOrderId;
      }
      
      if (startDate && endDate) {
        where.receiptDate = {
          [db.Sequelize.Op.between]: [startDate, endDate]
        };
      }

      const offset = (page - 1) * limit;

      const { rows, count } = await db.GoodsReceipt.findAndCountAll({
        where,
        include: [
          { model: db.GoodsReceiptItem, as: 'items' },
          { model: db.PurchaseOrder, as: 'purchaseOrder' }
        ],
        limit,
        offset,
        order: [['receiptDate', 'DESC']]
      });

      return {
        goodsReceipts: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      throw new Error(`Failed to get goods receipts: ${error.message}`);
    }
  }

  // Analytics
  async getPurchaseAnalytics(filters = {}) {
    try {
      const { startDate, endDate } = filters;
      const where = {};
      
      if (startDate && endDate) {
        where.orderDate = {
          [db.Sequelize.Op.between]: [startDate, endDate]
        };
      }

      const orders = await db.PurchaseOrder.findAll({
        where,
        include: [{ model: db.PurchaseOrderItem, as: 'items' }]
      });

      const totalOrders = orders.length;
      const totalAmount = orders.reduce((sum, po) => sum + parseFloat(po.totalAmount || 0), 0);
      const approvedOrders = orders.filter(po => po.status === 'approved').length;
      const pendingOrders = orders.filter(po => po.status === 'draft' || po.status === 'pending').length;

      return {
        totalOrders,
        totalAmount,
        approvedOrders,
        pendingOrders,
        averageOrderValue: totalOrders > 0 ? totalAmount / totalOrders : 0
      };
    } catch (error) {
      throw new Error(`Failed to get purchase analytics: ${error.message}`);
    }
  }
}

module.exports = new PurchasingService();
