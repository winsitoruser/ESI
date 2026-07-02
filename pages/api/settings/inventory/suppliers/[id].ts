import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';

const Supplier = require('@/models/Supplier');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;

    if (req.method === 'PUT') {
      const { name, contact, phone, email, address } = req.body;

      const supplier = await Supplier.findByPk(id);
      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }

      await supplier.update({ name, contact, phone, email, address });

      return res.status(200).json({
        success: true,
        message: 'Supplier updated successfully',
        data: supplier
      });

    } else if (req.method === 'DELETE') {
      const supplier = await Supplier.findByPk(id);
      if (!supplier) {
        return res.status(404).json({ error: 'Supplier not found' });
      }

      await supplier.destroy();

      return res.status(200).json({
        success: true,
        message: 'Supplier deleted successfully'
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in supplier API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process supplier',
      details: error.message
    });
  }
}
