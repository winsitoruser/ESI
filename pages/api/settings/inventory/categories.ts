import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const Category = require('@/models/Category');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const categories = await Category.findAll({
        order: [['name', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        data: categories
      });

    } else if (req.method === 'POST') {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Category name is required' });
      }

      const category = await Category.create({
        name,
        description: description || null
      });

      return res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in categories API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process categories',
      details: error.message
    });
  }
}
