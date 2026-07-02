import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (req.method === 'POST') {
      const { printerSettings, receiptSettings } = req.body;

      // Validate printer settings
      if (!printerSettings || !printerSettings.printerName) {
        return res.status(400).json({ 
          success: false, 
          error: 'Printer settings required' 
        });
      }

      // Simulate test print
      // In production, this would send actual print command to printer
      console.log('Test print requested:', {
        printer: printerSettings.printerName,
        type: printerSettings.printerType,
        connection: printerSettings.connectionType
      });

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));

      return res.status(200).json({
        success: true,
        message: 'Test print berhasil dikirim ke printer',
        data: {
          printerName: printerSettings.printerName,
          timestamp: new Date().toISOString(),
          status: 'sent'
        }
      });

    } else {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in test print API:', error);
    return res.status(500).json({
      success: false,
      error: 'Test print failed',
      details: error.message
    });
  }
}
