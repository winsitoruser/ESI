import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const Customer = require('../../../models/Customer');
const PosTransaction = require('../../../models/PosTransaction');
const { Op } = require('sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getCustomers(req, res);
      case 'POST':
        return await createCustomer(req, res);
      case 'PUT':
        return await updateCustomer(req, res);
      case 'DELETE':
        return await deleteCustomer(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Customers API Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// GET /api/customers/crud
async function getCustomers(req: NextApiRequest, res: NextApiResponse) {
  const { 
    page = '1', 
    limit = '10', 
    search = '', 
    type = '',
    status = '',
    membershipLevel = ''
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  const whereClause: any = {};

  // Search filter
  if (search) {
    whereClause[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } }
    ];
  }

  // Type filter
  if (type && type !== 'all') {
    whereClause.type = type;
  }

  // Status filter
  if (status && status !== 'all') {
    whereClause.status = status;
  }

  // Membership level filter
  if (membershipLevel && membershipLevel !== 'all') {
    whereClause.membershipLevel = membershipLevel;
  }

  const { count, rows } = await Customer.findAndCountAll({
    where: whereClause,
    limit: limitNum,
    offset: offset,
    order: [['createdAt', 'DESC']],
    attributes: {
      exclude: ['partnerId']
    }
  });

  // Calculate statistics
  const stats = await Customer.findAll({
    attributes: [
      [Customer.sequelize.fn('COUNT', Customer.sequelize.col('id')), 'totalCustomers'],
      [Customer.sequelize.fn('SUM', Customer.sequelize.literal('CASE WHEN status = "active" THEN 1 ELSE 0 END')), 'activeCustomers'],
      [Customer.sequelize.fn('SUM', Customer.sequelize.literal('CASE WHEN type = "vip" THEN 1 ELSE 0 END')), 'vipCustomers'],
      [Customer.sequelize.fn('AVG', Customer.sequelize.col('totalSpent')), 'avgLifetimeValue']
    ],
    raw: true
  });

  return res.status(200).json({
    success: true,
    data: {
      customers: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum)
      },
      stats: stats[0] || {
        totalCustomers: 0,
        activeCustomers: 0,
        vipCustomers: 0,
        avgLifetimeValue: 0
      }
    }
  });
}

// POST /api/customers/crud
async function createCustomer(req: NextApiRequest, res: NextApiResponse) {
  const {
    name,
    phone,
    email,
    address,
    city,
    province,
    postalCode,
    type = 'walk-in',
    membershipLevel = 'Silver',
    discount = 0,
    birthDate,
    gender,
    notes
  } = req.body;

  // Validation
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  // Check if phone already exists
  if (phone) {
    const existingCustomer = await Customer.findOne({ where: { phone } });
    if (existingCustomer) {
      return res.status(400).json({ error: 'Phone number already exists' });
    }
  }

  // Check if email already exists
  if (email) {
    const existingCustomer = await Customer.findOne({ where: { email } });
    if (existingCustomer) {
      return res.status(400).json({ error: 'Email already exists' });
    }
  }

  const customer = await Customer.create({
    name,
    phone,
    email,
    address,
    city,
    province,
    postalCode,
    type,
    status: 'active',
    membershipLevel,
    points: 0,
    discount: parseFloat(discount),
    totalPurchases: 0,
    totalSpent: 0,
    birthDate,
    gender,
    notes,
    isActive: true
  });

  return res.status(201).json({
    success: true,
    message: 'Customer created successfully',
    data: customer
  });
}

// PUT /api/customers/crud?id=xxx
async function updateCustomer(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Customer ID is required' });
  }

  const customer = await Customer.findByPk(id);

  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const {
    name,
    phone,
    email,
    address,
    city,
    province,
    postalCode,
    type,
    status,
    membershipLevel,
    discount,
    birthDate,
    gender,
    notes
  } = req.body;

  // Check if phone already exists (excluding current customer)
  if (phone && phone !== customer.phone) {
    const existingCustomer = await Customer.findOne({ 
      where: { 
        phone,
        id: { [Op.ne]: id }
      } 
    });
    if (existingCustomer) {
      return res.status(400).json({ error: 'Phone number already exists' });
    }
  }

  // Check if email already exists (excluding current customer)
  if (email && email !== customer.email) {
    const existingCustomer = await Customer.findOne({ 
      where: { 
        email,
        id: { [Op.ne]: id }
      } 
    });
    if (existingCustomer) {
      return res.status(400).json({ error: 'Email already exists' });
    }
  }

  await customer.update({
    name: name || customer.name,
    phone: phone || customer.phone,
    email: email || customer.email,
    address: address !== undefined ? address : customer.address,
    city: city !== undefined ? city : customer.city,
    province: province !== undefined ? province : customer.province,
    postalCode: postalCode !== undefined ? postalCode : customer.postalCode,
    type: type || customer.type,
    status: status || customer.status,
    membershipLevel: membershipLevel || customer.membershipLevel,
    discount: discount !== undefined ? parseFloat(discount) : customer.discount,
    birthDate: birthDate !== undefined ? birthDate : customer.birthDate,
    gender: gender !== undefined ? gender : customer.gender,
    notes: notes !== undefined ? notes : customer.notes
  });

  return res.status(200).json({
    success: true,
    message: 'Customer updated successfully',
    data: customer
  });
}

// DELETE /api/customers/crud?id=xxx
async function deleteCustomer(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Customer ID is required' });
  }

  const customer = await Customer.findByPk(id);

  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  // Soft delete - set isActive to false
  await customer.update({ isActive: false, status: 'inactive' });

  // Or hard delete if needed:
  // await customer.destroy();

  return res.status(200).json({
    success: true,
    message: 'Customer deleted successfully'
  });
}
