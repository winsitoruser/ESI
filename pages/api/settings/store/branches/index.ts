import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';

const Branch = require('@/models/Branch');
const Store = require('@/models/Store');
const User = require('@/models/User');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      // Get all branches
      const { storeId, isActive, type } = req.query;
      
      const where: any = {};
      if (storeId) where.storeId = storeId;
      if (isActive !== undefined) where.isActive = isActive === 'true';
      if (type) where.type = type;

      const branches = await Branch.findAll({
        where,
        include: [
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'name']
          },
          {
            model: User,
            as: 'manager',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return res.status(200).json({
        success: true,
        data: branches,
        count: branches.length
      });

    } else if (req.method === 'POST') {
      // Create new branch
      const { 
        storeId, code, name, type, address, city, province, 
        postalCode, phone, email, managerId, operatingHours, settings 
      } = req.body;

      // Validation
      if (!code || !name) {
        return res.status(400).json({ 
          success: false, 
          error: 'Code and name are required' 
        });
      }

      // Check if code already exists
      const existingBranch = await Branch.findOne({ where: { code } });
      if (existingBranch) {
        return res.status(400).json({ 
          success: false, 
          error: 'Branch code already exists' 
        });
      }

      const branch = await Branch.create({
        storeId,
        code,
        name,
        type: type || 'branch',
        address,
        city,
        province,
        postalCode,
        phone,
        email,
        managerId,
        operatingHours: operatingHours || [],
        settings: settings || {},
        isActive: true
      });

      // Fetch with associations
      const createdBranch = await Branch.findByPk(branch.id, {
        include: [
          {
            model: Store,
            as: 'store',
            attributes: ['id', 'name']
          },
          {
            model: User,
            as: 'manager',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      return res.status(201).json({
        success: true,
        message: 'Branch created successfully',
        data: createdBranch
      });

    } else {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in branches API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process request',
      details: error.message
    });
  }
}
