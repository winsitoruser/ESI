import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';

const PosTransaction = require('../../../../../models/PosTransaction');
const PosTransactionItem = require('../../../../../models/PosTransactionItem');
const Employee = require('../../../../../models/Employee');
const Customer = require('../../../../../models/Customer');
const Product = require('../../../../../models/Product');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    const transaction = await PosTransaction.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'cashier',
          attributes: ['id', 'name', 'position']
        },
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'phone', 'email'],
          required: false
        },
        {
          model: PosTransactionItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'sku', 'category', 'unit']
            }
          ]
        }
      ]
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    return res.status(200).json({ transaction });
  } catch (error: any) {
    console.error('Get Transaction Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
