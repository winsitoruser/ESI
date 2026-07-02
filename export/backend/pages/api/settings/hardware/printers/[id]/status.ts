import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]';

// Use dynamic import for CommonJS module
const getDb = () => require('../../../../../../models');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { PrinterConfig } = getDb();
    const printerId = req.query.id as string;

    if (req.method === 'GET') {
      // Get printer and check its status
      const printer = await PrinterConfig.findByPk(printerId);
      
      if (!printer) {
        return res.status(404).json({ success: false, error: 'Printer not found' });
      }

      // Simulate status check (in real implementation, this would ping the printer)
      let status = 'offline';
      
      if (printer.connectionType === 'network' && printer.ipAddress) {
        try {
          // Simple TCP connection test
          const net = require('net');
          const socket = new net.Socket();
          
          socket.setTimeout(3000);
          
          await new Promise((resolve, reject) => {
            socket.connect(printer.port || 9100, printer.ipAddress, () => {
              status = 'online';
              socket.destroy();
              resolve(true);
            });
            
            socket.on('error', () => {
              reject(new Error('Connection failed'));
            });
            
            socket.on('timeout', () => {
              socket.destroy();
              reject(new Error('Connection timeout'));
            });
          });
        } catch (error) {
          status = 'offline';
        }
      } else if (printer.connectionType === 'bluetooth') {
        // For Bluetooth, we can't easily check status from server
        // Return unknown status
        status = 'unknown';
      } else if (printer.connectionType === 'usb') {
        // For USB, we'd need system-level access
        // Return unknown status
        status = 'unknown';
      }

      return res.status(200).json({
        success: true,
        data: {
          id: printer.id,
          name: printer.name,
          status,
          lastChecked: new Date().toISOString()
        }
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error checking printer status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check printer status',
      details: error.message
    });
  }
}
