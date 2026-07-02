import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const Role = require('@/models/Role');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;

    if (req.method === 'GET') {
      const role = await Role.findByPk(id);
      
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }

      return res.status(200).json({
        success: true,
        data: role
      });

    } else if (req.method === 'PUT') {
      const { name, description, permissions } = req.body;

      const role = await Role.findByPk(id);
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }

      // Check if name is being changed and if it already exists
      if (name && name !== role.name) {
        const existingRole = await Role.findOne({ where: { name } });
        if (existingRole) {
          return res.status(400).json({ error: 'Role name already exists' });
        }
      }

      await role.update({
        name: name || role.name,
        description: description !== undefined ? description : role.description,
        permissions: permissions || role.permissions
      });

      return res.status(200).json({
        success: true,
        message: 'Role updated successfully',
        data: role
      });

    } else if (req.method === 'DELETE') {
      const role = await Role.findByPk(id);
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }

      // Prevent deletion of default roles
      const protectedRoles = ['admin', 'manager', 'cashier', 'staff'];
      if (protectedRoles.includes(role.name.toLowerCase())) {
        return res.status(400).json({ 
          error: 'Cannot delete default system roles' 
        });
      }

      await role.destroy();

      return res.status(200).json({
        success: true,
        message: 'Role deleted successfully'
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in role API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process role',
      details: error.message
    });
  }
}
