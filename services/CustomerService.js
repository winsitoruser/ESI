const db = require('../models');

class CustomerService {
  // Customer Management
  async createCustomer(customerData) {
    try {
      const customer = await db.Customer.create(customerData);
      
      // Create loyalty record if loyalty program exists
      if (customerData.loyaltyProgramId) {
        await db.CustomerLoyalty.create({
          customerId: customer.id,
          programId: customerData.loyaltyProgramId,
          points: 0,
          tier: 'bronze'
        });
      }
      
      return await this.getCustomerById(customer.id);
    } catch (error) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  async getCustomerById(id) {
    try {
      return await db.Customer.findByPk(id, {
        include: [
          { model: db.CustomerLoyalty, as: 'loyalty' }
        ]
      });
    } catch (error) {
      throw new Error(`Failed to get customer: ${error.message}`);
    }
  }

  async getCustomers(filters = {}) {
    try {
      const { search, page = 1, limit = 20 } = filters;
      const where = {};
      
      if (search) {
        where[db.Sequelize.Op.or] = [
          { name: { [db.Sequelize.Op.iLike]: `%${search}%` } },
          { email: { [db.Sequelize.Op.iLike]: `%${search}%` } },
          { phone: { [db.Sequelize.Op.iLike]: `%${search}%` } }
        ];
      }

      const offset = (page - 1) * limit;

      const { rows, count } = await db.Customer.findAndCountAll({
        where,
        include: [
          { model: db.CustomerLoyalty, as: 'loyalty' }
        ],
        limit,
        offset,
        order: [['name', 'ASC']]
      });

      return {
        customers: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      throw new Error(`Failed to get customers: ${error.message}`);
    }
  }

  async updateCustomer(id, updateData) {
    try {
      const customer = await db.Customer.findByPk(id);
      if (!customer) {
        throw new Error('Customer not found');
      }
      
      await customer.update(updateData);
      return await this.getCustomerById(id);
    } catch (error) {
      throw new Error(`Failed to update customer: ${error.message}`);
    }
  }

  async deleteCustomer(id) {
    try {
      const customer = await db.Customer.findByPk(id);
      if (!customer) {
        throw new Error('Customer not found');
      }
      
      await customer.destroy();
      return { success: true, message: 'Customer deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete customer: ${error.message}`);
    }
  }

  // Loyalty Management
  async addPoints(customerId, points, transactionId = null) {
    try {
      const loyalty = await db.CustomerLoyalty.findOne({
        where: { customerId }
      });

      if (!loyalty) {
        throw new Error('Customer loyalty not found');
      }

      const newPoints = loyalty.points + points;
      await loyalty.update({ points: newPoints });

      // Create point transaction record
      await db.PointTransaction.create({
        customerId,
        points,
        type: 'earn',
        transactionId,
        description: `Earned ${points} points from transaction`
      });

      // Check for tier upgrade
      await this.checkTierUpgrade(customerId, newPoints);

      return loyalty;
    } catch (error) {
      throw new Error(`Failed to add points: ${error.message}`);
    }
  }

  async redeemPoints(customerId, points, rewardId) {
    try {
      const loyalty = await db.CustomerLoyalty.findOne({
        where: { customerId }
      });

      if (!loyalty) {
        throw new Error('Customer loyalty not found');
      }

      if (loyalty.points < points) {
        throw new Error('Insufficient points');
      }

      const newPoints = loyalty.points - points;
      await loyalty.update({ points: newPoints });

      // Create point transaction record
      await db.PointTransaction.create({
        customerId,
        points: -points,
        type: 'redeem',
        description: `Redeemed ${points} points for reward`
      });

      // Create redemption record
      const redemption = await db.RewardRedemption.create({
        customerId,
        rewardId,
        pointsUsed: points,
        status: 'pending',
        redeemedAt: new Date()
      });

      return redemption;
    } catch (error) {
      throw new Error(`Failed to redeem points: ${error.message}`);
    }
  }

  async checkTierUpgrade(customerId, currentPoints) {
    try {
      const loyalty = await db.CustomerLoyalty.findOne({
        where: { customerId },
        include: [{ model: db.LoyaltyProgram, as: 'program' }]
      });

      if (!loyalty || !loyalty.program) {
        return;
      }

      const tiers = await db.LoyaltyTier.findAll({
        where: { programId: loyalty.programId },
        order: [['minPoints', 'DESC']]
      });

      for (const tier of tiers) {
        if (currentPoints >= tier.minPoints) {
          if (loyalty.tier !== tier.name) {
            await loyalty.update({ tier: tier.name });
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error checking tier upgrade:', error);
    }
  }

  async getCustomerPurchaseHistory(customerId, filters = {}) {
    try {
      const { page = 1, limit = 20 } = filters;
      const offset = (page - 1) * limit;

      const { rows, count } = await db.PosTransaction.findAndCountAll({
        where: { customerId },
        include: [
          { model: db.PosTransactionItem, as: 'items' }
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
      throw new Error(`Failed to get purchase history: ${error.message}`);
    }
  }

  async getCustomerStatistics(customerId) {
    try {
      const transactions = await db.PosTransaction.findAll({
        where: { 
          customerId,
          status: { [db.Sequelize.Op.ne]: 'void' }
        }
      });

      const totalSpent = transactions.reduce((sum, t) => sum + parseFloat(t.totalAmount || 0), 0);
      const totalTransactions = transactions.length;
      const averageTransaction = totalTransactions > 0 ? totalSpent / totalTransactions : 0;

      const loyalty = await db.CustomerLoyalty.findOne({
        where: { customerId }
      });

      return {
        totalSpent,
        totalTransactions,
        averageTransaction,
        loyaltyPoints: loyalty ? loyalty.points : 0,
        tier: loyalty ? loyalty.tier : 'none'
      };
    } catch (error) {
      throw new Error(`Failed to get customer statistics: ${error.message}`);
    }
  }

  // Loyalty Program Management
  async createLoyaltyProgram(programData) {
    try {
      return await db.LoyaltyProgram.create(programData);
    } catch (error) {
      throw new Error(`Failed to create loyalty program: ${error.message}`);
    }
  }

  async getLoyaltyPrograms() {
    try {
      return await db.LoyaltyProgram.findAll({
        include: [
          { model: db.LoyaltyTier, as: 'tiers' },
          { model: db.LoyaltyReward, as: 'rewards' }
        ]
      });
    } catch (error) {
      throw new Error(`Failed to get loyalty programs: ${error.message}`);
    }
  }
}

module.exports = new CustomerService();
