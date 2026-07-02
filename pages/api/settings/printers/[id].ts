import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const { PrinterConfig } = db;
    const tenantId = (session.user as any).tenantId;

    const printer = await PrinterConfig.findOne({ where: { id, tenantId } });
    if (!printer) {
      return res.status(404).json({ error: 'Printer not found' });
    }

    switch (req.method) {
      case 'GET':
        return res.status(200).json({ success: true, data: printer });

      case 'PUT':
        const updateData = req.body;
        
        if (updateData.isDefault) {
          await PrinterConfig.update(
            { isDefault: false },
            { where: { tenantId, isDefault: true } }
          );
        }

        await printer.update(updateData);

        return res.status(200).json({
          success: true,
          message: 'Printer updated',
          data: printer
        });

      case 'DELETE':
        await printer.update({ isActive: false });
        return res.status(200).json({
          success: true,
          message: 'Printer removed'
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Printer API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
