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

    const { id } = req.query;

    if (req.method === 'GET') {
      // Get single branch
      const branch = await Branch.findByPk(id, {
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

      if (!branch) {
        return res.status(404).json({ 
          success: false, 
          error: 'Branch not found' 
        });
      }

      return res.status(200).json({
        success: true,
        data: branch
      });

    } else if (req.method === 'PUT') {
      // Update branch
      const branch = await Branch.findByPk(id);

      if (!branch) {
        return res.status(404).json({ 
          success: false, 
          error: 'Branch not found' 
        });
      }

      const { 
        code, name, type, address, city, province, 
        postalCode, phone, email, managerId, operatingHours, 
        settings, isActive 
      } = req.body;

      // Check if code is being changed and already exists
      if (code && code !== branch.code) {
        const existingBranch = await Branch.findOne({ where: { code } });
        if (existingBranch) {
          return res.status(400).json({ 
            success: false, 
            error: 'Branch code already exists' 
          });
        }
      }

      await branch.update({
        code: code || branch.code,
        name: name || branch.name,
        type: type || branch.type,
        address: address !== undefined ? address : branch.address,
        city: city !== undefined ? city : branch.city,
        province: province !== undefined ? province : branch.province,
        postalCode: postalCode !== undefined ? postalCode : branch.postalCode,
        phone: phone !== undefined ? phone : branch.phone,
        email: email !== undefined ? email : branch.email,
        managerId: managerId !== undefined ? managerId : branch.managerId,
        operatingHours: operatingHours !== undefined ? operatingHours : branch.operatingHours,
        settings: settings !== undefined ? settings : branch.settings,
        isActive: isActive !== undefined ? isActive : branch.isActive
      });

      // Fetch updated branch with associations
      const updatedBranch = await Branch.findByPk(id, {
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

      return res.status(200).json({
        success: true,
        message: 'Branch updated successfully',
        data: updatedBranch
      });

    } else if (req.method === 'DELETE') {
      // Delete/deactivate branch
      const branch = await Branch.findByPk(id);

      if (!branch) {
        return res.status(404).json({ 
          success: false, 
          error: 'Branch not found' 
        });
      }

      // Soft delete by setting isActive to false
      await branch.update({ isActive: false });

      return res.status(200).json({
        success: true,
        message: 'Branch deactivated successfully'
      });

    } else {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in branch API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process request',
      details: error.message
    });
  }
}
