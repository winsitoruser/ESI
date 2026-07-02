import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

let FleetFuelTransaction: any;
try {
  const models = require('../../../../models');
  FleetFuelTransaction = models.FleetFuelTransaction;
} catch (e) { console.warn('FleetFuelTransaction not available'); }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.query;

    if (req.method === 'GET') {
      if (!FleetFuelTransaction) return res.status(404).json({ error: 'Transaction not found' });
      const record = await FleetFuelTransaction.findByPk(id as string);
      if (!record) return res.status(404).json({ error: 'Transaction not found' });
      return res.status(200).json({ success: true, data: record });

    } else if (req.method === 'PUT') {
      if (!FleetFuelTransaction) return res.status(500).json({ error: 'DB not available' });
      const record = await FleetFuelTransaction.findByPk(id as string);
      if (!record) return res.status(404).json({ error: 'Transaction not found' });
      await record.update(req.body);
      return res.status(200).json({ success: true, message: 'Transaksi BBM diperbarui', data: record });

    } else if (req.method === 'DELETE') {
      if (!FleetFuelTransaction) return res.status(500).json({ error: 'DB not available' });
      const record = await FleetFuelTransaction.findByPk(id as string);
      if (!record) return res.status(404).json({ error: 'Transaction not found' });
      await record.destroy();
      return res.status(200).json({ success: true, message: 'Transaksi BBM dihapus' });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Fuel detail API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
