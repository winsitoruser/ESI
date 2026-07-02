import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

const Customer = require('../../../models/Customer');
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
      case 'POST':
        return await createMember(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Members API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function getMembers(req: NextApiRequest, res: NextApiResponse) {
  const { search = '' } = req.query;

  const whereClause: any = {
    isActive: true,
    type: 'member'
  };

  if (search) {
    whereClause[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } }
    ];
  }

  const members = await Customer.findAll({
    where: whereClause,
    attributes: ['id', 'name', 'phone', 'email', 'points', 'discount', 'membershipLevel'],
    order: [['name', 'ASC']]
  });

  return res.status(200).json({
    success: true,
    members: members.map((m: any) => ({
      id: m.id.toString(),
      name: m.name,
      phone: m.phone,
      email: m.email,
      points: parseInt(m.points) || 0,
      discount: parseFloat(m.discount) || 10,
      membershipLevel: m.membershipLevel || 'Silver'
    }))
  });
}

async function createMember(req: NextApiRequest, res: NextApiResponse) {
  const { name, phone, email, discount = 10 } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  // Check if phone already exists
  const existingMember = await Customer.findOne({
    where: { phone }
  });

  if (existingMember) {
    return res.status(400).json({ error: 'Phone number already registered' });
  }

  const member = await Customer.create({
    name,
    phone,
    email: email || null,
    type: 'member',
    points: 0,
    discount: parseFloat(discount),
    membershipLevel: 'Silver',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return res.status(201).json({
    success: true,
    message: 'Member created successfully',
    member: {
      id: member.id.toString(),
      name: member.name,
      phone: member.phone,
      email: member.email,
      points: 0,
      discount: parseFloat(discount),
      membershipLevel: 'Silver'
    }
  });
}
