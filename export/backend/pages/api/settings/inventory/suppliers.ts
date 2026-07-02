import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const Supplier = require('@/models/Supplier');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const suppliers = await Supplier.findAll({
        order: [['name', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        data: suppliers
      });

    } else if (req.method === 'POST') {
      const { name, contact, phone, email, address } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Supplier name is required' });
      }

      const supplier = await Supplier.create({
        name,
        contact: contact || null,
        phone: phone || null,
        email: email || null,
        address: address || null
      });

      return res.status(201).json({
        success: true,
        message: 'Supplier created successfully',
        data: supplier
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in suppliers API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process suppliers',
      details: error.message
    });
  }
}
