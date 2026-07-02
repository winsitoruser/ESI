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

    const { StoreSetting, Store } = db;
    const tenantId = (session.user as any).tenantId;

    switch (req.method) {
      case 'GET':
        let settings = await StoreSetting.findOne({ where: { tenantId } });
        
        if (!settings) {
          // Return default settings
          settings = {
            storeName: 'My Store',
            storeAddress: '',
            storePhone: '',
            storeEmail: '',
            currency: 'IDR',
            taxRate: 11,
            taxIncluded: true,
            receiptHeader: '',
            receiptFooter: 'Terima kasih atas kunjungan Anda!',
            logo: null,
            timezone: 'Asia/Jakarta',
            dateFormat: 'DD/MM/YYYY',
            timeFormat: 'HH:mm',
            language: 'id',
            autoLogout: 30,
            requirePin: false,
            lowStockThreshold: 10,
            enableLoyalty: true,
            enableReservation: true,
            enableKitchenDisplay: true,
            enableTableManagement: true
          };
        }

        return res.status(200).json({ success: true, data: settings });

      case 'PUT':
        const updateData = req.body;
        
        let existingSettings = await StoreSetting.findOne({ where: { tenantId } });
        
        if (existingSettings) {
          await existingSettings.update({
            ...updateData,
            updatedBy: (session.user as any).id
          });
        } else {
          existingSettings = await StoreSetting.create({
            tenantId,
            ...updateData,
            createdBy: (session.user as any).id
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Store settings updated',
          data: existingSettings
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Store Settings API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
