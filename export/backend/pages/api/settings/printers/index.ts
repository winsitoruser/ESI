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

    const { PrinterConfig } = db;
    const tenantId = (session.user as any).tenantId;

    switch (req.method) {
      case 'GET':
        const printers = await PrinterConfig.findAll({
          where: { tenantId, isActive: true },
          order: [['name', 'ASC']]
        });

        return res.status(200).json({ success: true, data: printers });

      case 'POST':
        const { name, type, connectionType, ipAddress, port, usbDevice, paperWidth, isDefault, printReceipt, printKitchen, printReport } = req.body;

        if (!name || !type) {
          return res.status(400).json({ error: 'Name and type are required' });
        }

        // If setting as default, unset other defaults
        if (isDefault) {
          await PrinterConfig.update(
            { isDefault: false },
            { where: { tenantId, isDefault: true } }
          );
        }

        const printer = await PrinterConfig.create({
          tenantId,
          name,
          type,
          connectionType: connectionType || 'network',
          ipAddress,
          port: port || 9100,
          usbDevice,
          paperWidth: paperWidth || 80,
          isDefault: isDefault || false,
          isActive: true,
          printReceipt: printReceipt !== false,
          printKitchen: printKitchen || false,
          printReport: printReport || false,
          createdBy: (session.user as any).id
        });

        return res.status(201).json({
          success: true,
          message: 'Printer added',
          data: printer
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Printers API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
