import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { Op } from 'sequelize';

const db = require('../../../models');
const Customer = db.Customer;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      search, 
      customerType, 
      membershipLevel, 
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      limit = 100,
      offset = 0
    } = req.query;

    // Build where clause
    const whereClause: any = {
      isActive: true
    };

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { companyName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Customer type filter
    if (customerType && (customerType === 'individual' || customerType === 'corporate')) {
      whereClause.customerType = customerType;
    }

    // Membership level filter
    if (membershipLevel) {
      whereClause.membershipLevel = membershipLevel;
    }

    // Status filter
    if (status) {
      whereClause.status = status;
    }

    // Get customers
    const customers = await Customer.findAll({
      where: whereClause,
      order: [[sortBy as string, sortOrder as string]],
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      attributes: [
        'id',
        'name',
        'phone',
        'email',
        'address',
        'city',
        'province',
        'postalCode',
        'type',
        'customerType',
        'companyName',
        'picName',
        'picPosition',
        'contact1',
        'contact2',
        'companyEmail',
        'companyAddress',
        'taxId',
        'status',
        'membershipLevel',
        'points',
        'discount',
        'totalPurchases',
        'totalSpent',
        'lastVisit',
        'birthDate',
        'gender',
        'notes',
        'isActive',
        'createdAt',
        'updatedAt'
      ]
    });

    // Get total count
    const totalCount = await Customer.count({ where: whereClause });

    // Get statistics
    const stats = await Customer.findAll({
      where: { isActive: true },
      attributes: [
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'totalCustomers'],
        [db.Sequelize.fn('COUNT', db.Sequelize.literal("CASE WHEN \"customerType\" = 'individual' THEN 1 END")), 'totalIndividual'],
        [db.Sequelize.fn('COUNT', db.Sequelize.literal("CASE WHEN \"customerType\" = 'corporate' THEN 1 END")), 'totalCorporate'],
        [db.Sequelize.fn('SUM', db.Sequelize.col('totalSpent')), 'totalRevenue'],
        [db.Sequelize.fn('AVG', db.Sequelize.col('totalSpent')), 'averageSpent']
      ],
      raw: true
    });

    return res.status(200).json({
      success: true,
      data: {
        customers: customers.map((c: any) => ({
          id: c.id,
          name: c.name,
          phoneNumber: c.phone, // Map to phoneNumber for frontend compatibility
          phone: c.phone,
          email: c.email,
          address: c.address,
          city: c.city,
          province: c.province,
          postalCode: c.postalCode,
          type: c.type,
          customerType: c.customerType,
          companyName: c.companyName,
          picName: c.picName,
          picPosition: c.picPosition,
          contact1: c.contact1,
          contact2: c.contact2,
          companyEmail: c.companyEmail,
          companyAddress: c.companyAddress,
          taxId: c.taxId,
          status: c.status,
          membershipLevel: c.membershipLevel,
          loyaltyPoints: c.points, // Map to loyaltyPoints for frontend compatibility
          points: c.points,
          discount: parseFloat(c.discount),
          totalPurchases: c.totalPurchases,
          totalSpent: parseFloat(c.totalSpent),
          lastVisit: c.lastVisit,
          birthDate: c.birthDate,
          gender: c.gender,
          notes: c.notes,
          isActive: c.isActive,
          registrationDate: c.createdAt, // Map to registrationDate for frontend compatibility
          createdAt: c.createdAt,
          updatedAt: c.updatedAt
        })),
        pagination: {
          total: totalCount,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: totalCount > (parseInt(offset as string) + parseInt(limit as string))
        },
        statistics: stats[0] || {
          totalCustomers: 0,
          totalIndividual: 0,
          totalCorporate: 0,
          totalRevenue: 0,
          averageSpent: 0
        }
      }
    });

  } catch (error: any) {
    console.error('List Customers API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
