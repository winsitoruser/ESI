import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

let FleetDriver: any;
try {
  const models = require('../../../../models');
  FleetDriver = models.FleetDriver;
} catch (e) { console.warn('FleetDriver not available'); }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.query;

    if (req.method === 'GET') {
      if (!FleetDriver) return res.status(404).json({ error: 'Driver not found' });
      const driver = await FleetDriver.findByPk(id as string);
      if (!driver) return res.status(404).json({ error: 'Driver not found' });
      return res.status(200).json({ success: true, data: driver });

    } else if (req.method === 'PUT') {
      if (!FleetDriver) return res.status(500).json({ error: 'DB not available' });
      const driver = await FleetDriver.findByPk(id as string);
      if (!driver) return res.status(404).json({ error: 'Driver not found' });
      await driver.update(req.body);
      return res.status(200).json({ success: true, message: 'Driver berhasil diperbarui', data: driver });

    } else if (req.method === 'DELETE') {
      if (!FleetDriver) return res.status(500).json({ error: 'DB not available' });
      const driver = await FleetDriver.findByPk(id as string);
      if (!driver) return res.status(404).json({ error: 'Driver not found' });
      await driver.destroy();
      return res.status(200).json({ success: true, message: 'Driver berhasil dihapus' });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Fleet driver detail API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
