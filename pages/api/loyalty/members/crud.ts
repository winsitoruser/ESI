import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

const Customer = require('../../../../models/Customer');
const PosTransaction = require('../../../../models/PosTransaction');
const { Op } = require('sequelize');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await getMembers(req, res);
      case 'PUT':
        return await updateMemberPoints(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Loyalty Members API Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

async function getMembers(req: NextApiRequest, res: NextApiResponse) {
  const { 
    page = '1', 
    limit = '10', 
    search = '',
    tier = '',
    sortBy = 'points',
    order = 'DESC'
  } = req.query;

  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const offset = (pageNum - 1) * limitNum;

  const whereClause: any = {
    type: { [Op.in]: ['member', 'vip'] },
    isActive: true
  };

  if (search) {
    whereClause[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } }
    ];
  }

  if (tier && tier !== 'all') {
    whereClause.membershipLevel = tier;
  }

  const { count, rows } = await Customer.findAndCountAll({
    where: whereClause,
    limit: limitNum,
    offset: offset,
    order: [[sortBy as string, order as string]],
    attributes: [
      'id', 'name', 'email', 'phone', 'membershipLevel', 
      'points', 'discount', 'totalPurchases', 'totalSpent', 
      'lastVisit', 'createdAt'
    ]
  });

  return res.status(200).json({
    success: true,
    data: {
      members: rows.map((m: any) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        phone: m.phone,
        tier: m.membershipLevel,
        points: m.points,
        discount: parseFloat(m.discount),
        totalPurchases: m.totalPurchases,
        totalSpent: parseFloat(m.totalSpent),
        lastVisit: m.lastVisit,
        joinDate: m.createdAt
      })),
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum)
      }
    }
  });
}

async function updateMemberPoints(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const { points, action = 'add', reason } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Member ID is required' });
  }

  if (!points || points <= 0) {
    return res.status(400).json({ error: 'Valid points amount is required' });
  }

  const member = await Customer.findByPk(id);

  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }

  let newPoints = member.points;

  if (action === 'add') {
    newPoints += points;
  } else if (action === 'subtract') {
    newPoints = Math.max(0, newPoints - points);
  } else if (action === 'set') {
    newPoints = points;
  }

  await member.update({ points: newPoints });

  return res.status(200).json({
    success: true,
    message: `Points ${action}ed successfully`,
    data: {
      id: member.id,
      name: member.name,
      previousPoints: member.points,
      newPoints: newPoints,
      action,
      reason
    }
  });
}
