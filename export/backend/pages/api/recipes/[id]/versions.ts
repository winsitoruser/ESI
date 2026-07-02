import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import db from '../../../../../../models';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    
    if (req.method === 'GET') {
      // Get version history
      const versions = await db.RecipeHistory.findAll({
        where: { recipe_id: id },
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: db.User,
            as: 'user',
            attributes: ['id', 'name', 'email'],
            required: false
          }
        ]
      });

      return res.status(200).json({
        success: true,
        data: versions
      });
    }
    
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Recipe versions error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
