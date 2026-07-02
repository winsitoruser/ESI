const db = require('../models');

class PosService {
  // Transaction Management
  async createTransaction(transactionData) {
    try {
      const transaction = await db.PosTransaction.create(transactionData);
      
      if (transactionData.items && transactionData.items.length > 0) {
        const items = transactionData.items.map(item => ({
          ...item,
          transactionId: transaction.id
        }));
        await db.PosTransactionItem.bulkCreate(items);
      }
      
      return await this.getTransactionById(transaction.id);
    } catch (error) {
      throw new Error(`Failed to create transaction: ${error.message}`);
    }
  }

  async getTransactionById(id) {
    try {
      return await db.PosTransaction.findByPk(id, {
        include: [
          { model: db.PosTransactionItem, as: 'items' },
          { model: db.Customer, as: 'customer' }
        ]
      });
    } catch (error) {
      throw new Error(`Failed to get transaction: ${error.message}`);
    }
  }

  async getTransactions(filters = {}) {
    try {
      const { startDate, endDate, status, page = 1, limit = 20 } = filters;
      const where = {};
      
      if (startDate && endDate) {
        where.createdAt = {
          [db.Sequelize.Op.between]: [startDate, endDate]
        };
      }
      
      if (status) {
        where.status = status;
      }

      const offset = (page - 1) * limit;

      const { rows, count } = await db.PosTransaction.findAndCountAll({
        where,
        include: [
          { model: db.PosTransactionItem, as: 'items' },
          { model: db.Customer, as: 'customer' }
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      return {
        transactions: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      throw new Error(`Failed to get transactions: ${error.message}`);
    }
  }

  async updateTransaction(id, updateData) {
    try {
      const transaction = await db.PosTransaction.findByPk(id);
      if (!transaction) {
        throw new Error('Transaction not found');
      }
      
      await transaction.update(updateData);
      return await this.getTransactionById(id);
    } catch (error) {
      throw new Error(`Failed to update transaction: ${error.message}`);
    }
  }

  async voidTransaction(id, reason) {
    try {
      return await this.updateTransaction(id, {
        status: 'void',
        voidReason: reason,
        voidedAt: new Date()
      });
    } catch (error) {
      throw new Error(`Failed to void transaction: ${error.message}`);
    }
  }

  // Shift Management
  async openShift(shiftData) {
    try {
      const activeShift = await db.Shift.findOne({
        where: { status: 'open', cashierId: shiftData.cashierId }
      });
      
      if (activeShift) {
        throw new Error('Cashier already has an active shift');
      }

      return await db.Shift.create({
        ...shiftData,
        status: 'open',
        openedAt: new Date()
      });
    } catch (error) {
      throw new Error(`Failed to open shift: ${error.message}`);
    }
  }

  async closeShift(shiftId, closeData) {
    try {
      const shift = await db.Shift.findByPk(shiftId);
      if (!shift) {
        throw new Error('Shift not found');
      }
      
      if (shift.status !== 'open') {
        throw new Error('Shift is not open');
      }

      await shift.update({
        ...closeData,
        status: 'closed',
        closedAt: new Date()
      });

      return shift;
    } catch (error) {
      throw new Error(`Failed to close shift: ${error.message}`);
    }
  }

  async getActiveShift(cashierId) {
    try {
      return await db.Shift.findOne({
        where: { cashierId, status: 'open' }
      });
    } catch (error) {
      throw new Error(`Failed to get active shift: ${error.message}`);
    }
  }

  async getShiftSummary(shiftId) {
    try {
      const shift = await db.Shift.findByPk(shiftId);
      if (!shift) {
        throw new Error('Shift not found');
      }

      const transactions = await db.PosTransaction.findAll({
        where: {
          shiftId,
          status: { [db.Sequelize.Op.ne]: 'void' }
        }
      });

      const totalSales = transactions.reduce((sum, t) => sum + parseFloat(t.totalAmount || 0), 0);
      const totalTransactions = transactions.length;
      const cashTransactions = transactions.filter(t => t.paymentMethod === 'cash').length;
      const cardTransactions = transactions.filter(t => t.paymentMethod === 'card').length;

      return {
        shift,
        totalSales,
        totalTransactions,
        cashTransactions,
        cardTransactions,
        transactions
      };
    } catch (error) {
      throw new Error(`Failed to get shift summary: ${error.message}`);
    }
  }

  // Sales Analytics
  async getDailySales(date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const transactions = await db.PosTransaction.findAll({
        where: {
          createdAt: {
            [db.Sequelize.Op.between]: [startOfDay, endOfDay]
          },
          status: { [db.Sequelize.Op.ne]: 'void' }
        }
      });

      const totalSales = transactions.reduce((sum, t) => sum + parseFloat(t.totalAmount || 0), 0);
      const totalTransactions = transactions.length;
      const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

      return {
        date,
        totalSales,
        totalTransactions,
        averageTransaction,
        transactions
      };
    } catch (error) {
      throw new Error(`Failed to get daily sales: ${error.message}`);
    }
  }

  async getTopProducts(filters = {}) {
    try {
      const { startDate, endDate, limit = 10 } = filters;
      const where = {};
      
      if (startDate && endDate) {
        where.createdAt = {
          [db.Sequelize.Op.between]: [startDate, endDate]
        };
      }

      const items = await db.PosTransactionItem.findAll({
        include: [{
          model: db.PosTransaction,
          as: 'transaction',
          where,
          attributes: []
        }, {
          model: db.Product,
          as: 'product'
        }],
        attributes: [
          'productId',
          [db.Sequelize.fn('SUM', db.Sequelize.col('quantity')), 'totalQuantity'],
          [db.Sequelize.fn('SUM', db.Sequelize.col('subtotal')), 'totalRevenue']
        ],
        group: ['productId', 'product.id'],
        order: [[db.Sequelize.fn('SUM', db.Sequelize.col('quantity')), 'DESC']],
        limit
      });

      return items;
    } catch (error) {
      throw new Error(`Failed to get top products: ${error.message}`);
    }
  }
}

module.exports = new PosService();
