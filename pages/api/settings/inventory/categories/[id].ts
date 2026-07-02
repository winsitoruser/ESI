import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';

const Category = require('@/models/Category');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;

    if (req.method === 'PUT') {
      const { name, description } = req.body;

      const category = await Category.findByPk(id);
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }

      await category.update({ name, description });

      return res.status(200).json({
        success: true,
        message: 'Category updated successfully',
        data: category
      });

    } else if (req.method === 'DELETE') {
      const category = await Category.findByPk(id);
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }

      await category.destroy();

      return res.status(200).json({
        success: true,
        message: 'Category deleted successfully'
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in category API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process category',
      details: error.message
    });
  }
}
