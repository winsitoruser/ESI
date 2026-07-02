import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

// In-memory storage for demo (in production, use database)
let posSettings = {
  printer: {
    printerName: 'POS Printer',
    printerType: 'thermal',
    connectionType: 'usb',
    ipAddress: '',
    port: '9100',
    driverName: '',
    thermalModel: '',
    driverProfile: 'escpos',
    paperCutter: true
  },
  receipt: {
    showLogo: true,
    showAddress: true,
    showPhone: true,
    showEmail: true,
    showCashier: true,
    showTimestamp: true,
    showVAT: true,
    showThankyouMessage: true,
    showFooter: true,
    thankyouMessage: 'Terima kasih telah berbelanja!',
    footerText: 'Barang yang sudah dibeli tidak dapat dikembalikan',
    fontSize: 12,
    headerAlignment: 'center',
    itemsAlignment: 'left',
    footerAlignment: 'center',
    paperWidth: 80,
    logoUrl: '',
    storeAddress: 'Jl. Contoh No. 123, Jakarta',
    storePhone: '021-1234567',
    storeEmail: 'info@toko.com'
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      // Get POS settings
      return res.status(200).json({
        success: true,
        data: posSettings
      });

    } else if (req.method === 'PUT') {
      // Update POS settings
      const { printer, receipt } = req.body;

      if (printer) {
        posSettings.printer = { ...posSettings.printer, ...printer };
      }

      if (receipt) {
        posSettings.receipt = { ...posSettings.receipt, ...receipt };
      }

      // In production, save to database here
      // await POSSettings.update({ printer, receipt }, { where: { userId: session.user.id } });

      return res.status(200).json({
        success: true,
        message: 'Pengaturan berhasil disimpan',
        data: posSettings
      });

    } else {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in POS settings API:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}
