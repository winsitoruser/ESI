/**
 * Customer Adapter - Sequelize Database Operations
 * Handles customer-related database queries
 */

import db from '@/models';

const { Customer, Transaction } = db;

export interface CustomerFilter {
  search?: string;
  loyaltyTier?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * Get all customers with filters
 */
export async function getCustomers(filter: CustomerFilter = {}) {
  const {
    search = '',
    loyaltyTier,
    status = 'active',
    page = 1,
    limit = 50
  } = filter;

  const offset = (page - 1) * limit;
  const where: any = {};

  if (search) {
    where[db.Sequelize.Op.or] = [
      { name: { [db.Sequelize.Op.iLike]: `%${search}%` } },
      { email: { [db.Sequelize.Op.iLike]: `%${search}%` } },
      { phone: { [db.Sequelize.Op.iLike]: `%${search}%` } }
    ];
  }

  if (loyaltyTier) {
    where.loyaltyTier = loyaltyTier;
  }

  if (status) {
    where.status = status;
  }

  const { rows: customers, count: total } = await Customer.findAndCountAll({
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']]
  });

  return {
    customers,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * Get customer by ID
 */
export async function getCustomerById(id: string) {
  return await Customer.findByPk(id);
}

/**
 * Create new customer
 */
export async function createCustomer(data: any) {
  return await Customer.create(data);
}

/**
 * Update customer
 */
export async function updateCustomer(id: string, data: any) {
  const customer = await Customer.findByPk(id);
  if (!customer) {
    throw new Error('Customer not found');
  }
  return await customer.update(data);
}

/**
 * Delete customer
 */
export async function deleteCustomer(id: string) {
  const customer = await Customer.findByPk(id);
  if (!customer) {
    throw new Error('Customer not found');
  }
  return await customer.destroy();
}

/**
 * Get customer statistics
 */
export async function getCustomerStatistics(tenantId: string) {
  const totalCustomers = await Customer.count({
    where: { tenantId, status: 'active' }
  });

  const newThisMonth = await Customer.count({
    where: {
      tenantId,
      createdAt: {
        [db.Sequelize.Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    }
  });

  return {
    totalCustomers,
    newThisMonth,
    activeCustomers: totalCustomers,
    inactiveCustomers: 0
  };
}

/**
 * Get customer purchase history
 */
export async function getCustomerPurchaseHistory(customerId: string, limit = 10) {
  return await Transaction.findAll({
    where: { customerId },
    limit,
    order: [['createdAt', 'DESC']]
  });
}

/**
 * Get loyalty programs
 */
export async function getLoyaltyPrograms(tenantId: string) {
  // Mock implementation - replace with actual database query
  return [
    {
      id: '1',
      name: 'Bronze',
      minPoints: 0,
      maxPoints: 999,
      discount: 5
    },
    {
      id: '2',
      name: 'Silver',
      minPoints: 1000,
      maxPoints: 4999,
      discount: 10
    },
    {
      id: '3',
      name: 'Gold',
      minPoints: 5000,
      maxPoints: 9999,
      discount: 15
    },
    {
      id: '4',
      name: 'Platinum',
      minPoints: 10000,
      maxPoints: null,
      discount: 20
    }
  ];
}

export default {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStatistics,
  getCustomerPurchaseHistory,
  getLoyaltyPrograms
};
