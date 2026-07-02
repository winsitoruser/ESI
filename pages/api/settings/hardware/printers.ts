import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const PrinterConfig = require('@/models/PrinterConfig');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const printers = await PrinterConfig.findAll({
        order: [['isDefault', 'DESC'], ['name', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        data: printers
      });

    } else if (req.method === 'POST') {
      const { name, type, connectionType, ipAddress, port, bluetoothDeviceId, bluetoothDeviceName, isDefault, isActive } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Printer name is required' });
      }

      // Validate connection type specific fields
      if (connectionType === 'network' && !ipAddress) {
        return res.status(400).json({ error: 'IP Address is required for network connection' });
      }
      
      if (connectionType === 'bluetooth' && !bluetoothDeviceId) {
        return res.status(400).json({ error: 'Bluetooth device is required' });
      }

      // If this printer is set as default, unset other defaults
      if (isDefault) {
        await PrinterConfig.update(
          { isDefault: false },
          { where: { isDefault: true } }
        );
      }

      const printer = await PrinterConfig.create({
        name,
        type: type || 'thermal',
        connectionType: connectionType || 'network',
        ipAddress: ipAddress || null,
        port: port || '9100',
        settings: connectionType === 'bluetooth' ? {
          bluetoothDeviceId,
          bluetoothDeviceName
        } : null,
        isDefault: isDefault || false,
        isActive: isActive !== false
      });

      return res.status(201).json({
        success: true,
        message: 'Printer created successfully',
        data: printer
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in printers API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process printers',
      details: error.message
    });
  }
}
