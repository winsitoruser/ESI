import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../auth/[...nextauth]';

const PrinterConfig = require('../../../../../models/PrinterConfig');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    
    // Get printer configuration
    const printer = await PrinterConfig.findByPk(id);
    
    if (!printer) {
      return res.status(404).json({ error: 'Printer not found' });
    }

    if (printer.connectionType !== 'bluetooth') {
      return res.status(400).json({ error: 'This is not a Bluetooth printer' });
    }

    // For Bluetooth printers, the actual printing happens on the client side
    // We return the printer configuration and test data
    const testData = {
      transactionNumber: 'TEST' + Date.now(),
      date: new Date(),
      items: [
        {
          name: 'Contoh Produk 1',
          quantity: 2,
          price: 10000,
          subtotal: 20000
        },
        {
          name: 'Contoh Produk 2',
          quantity: 1,
          price: 15000,
          subtotal: 15000
        }
      ],
      subtotal: 35000,
      discount: 0,
      total: 35000,
      paymentMethod: 'cash',
      cashReceived: 50000,
      change: 15000,
      cashier: session.user?.name || 'Test User'
    };

    return res.status(200).json({
      success: true,
      message: 'Test data prepared for Bluetooth printing',
      printer: {
        id: printer.id,
        name: printer.name,
        settings: printer.settings
      },
      testData
    });

  } catch (error: any) {
    console.error('Error in Bluetooth test print:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to prepare test print',
      details: error.message
    });
  }
}
