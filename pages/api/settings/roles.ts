import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      try {
        // Dynamic import to avoid module loading issues
        const Role = require('@/models/Role');
        
        // Get all roles
        const roles = await Role.findAll({
          order: [['createdAt', 'ASC']]
        });

        return res.status(200).json({
          success: true,
          data: roles
        });
      } catch (dbError: any) {
        console.error('Database error in roles API:', dbError);
        // Return empty array if database not ready
        return res.status(200).json({
          success: true,
          data: [],
          warning: 'Database not ready or roles table not found'
        });
      }

    } else if (req.method === 'POST') {
      try {
        // Dynamic import to avoid module loading issues
        const Role = require('@/models/Role');
        
        // Create new role
        const { name, description, permissions } = req.body;

        if (!name) {
          return res.status(400).json({ success: false, error: 'Role name is required' });
        }

        // Check if role already exists
        const existingRole = await Role.findOne({ where: { name } });
        if (existingRole) {
          return res.status(400).json({ success: false, error: 'Role already exists' });
        }

        const role = await Role.create({
          name,
          description: description || null,
          permissions: permissions || {}
        });

        return res.status(201).json({
          success: true,
          message: 'Role created successfully',
          data: role
        });
      } catch (dbError: any) {
        console.error('Database error creating role:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create role',
          details: dbError.message
        });
      }

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in roles API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process roles',
      details: error.message
    });
  }
}
