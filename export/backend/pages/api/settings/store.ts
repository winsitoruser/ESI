import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const Store = require('@/models/Store');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      // Get store settings
      const store = await Store.findOne({
        where: { isActive: true },
        order: [['createdAt', 'DESC']]
      });

      if (!store) {
        return res.status(200).json({
          success: true,
          data: {
            store: {
              name: '',
              address: '',
              city: '',
              province: '',
              postalCode: '',
              phone: '',
              email: '',
              website: '',
              taxId: '',
              logoUrl: '',
              description: ''
            },
            operatingHours: [
              { day: 'Senin', open: '09:00', close: '21:00', isOpen: true },
              { day: 'Selasa', open: '09:00', close: '21:00', isOpen: true },
              { day: 'Rabu', open: '09:00', close: '21:00', isOpen: true },
              { day: 'Kamis', open: '09:00', close: '21:00', isOpen: true },
              { day: 'Jumat', open: '09:00', close: '21:00', isOpen: true },
              { day: 'Sabtu', open: '09:00', close: '22:00', isOpen: true },
              { day: 'Minggu', open: '10:00', close: '20:00', isOpen: true }
            ]
          }
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          store: {
            name: store.name,
            address: store.address,
            city: store.city,
            province: store.province,
            postalCode: store.postalCode,
            phone: store.phone,
            email: store.email,
            website: store.website,
            taxId: store.taxId,
            logoUrl: store.logoUrl,
            description: store.description
          },
          operatingHours: store.operatingHours || []
        }
      });

    } else if (req.method === 'PUT') {
      // Update store settings
      const { store: storeData, operatingHours } = req.body;

      if (!storeData || !storeData.name) {
        return res.status(400).json({ error: 'Store name is required' });
      }

      // Find existing store or create new
      let store = await Store.findOne({
        where: { isActive: true }
      });

      const dataToSave = {
        name: storeData.name,
        address: storeData.address,
        city: storeData.city,
        province: storeData.province,
        postalCode: storeData.postalCode,
        phone: storeData.phone,
        email: storeData.email,
        website: storeData.website,
        taxId: storeData.taxId,
        logoUrl: storeData.logoUrl,
        description: storeData.description,
        operatingHours: operatingHours || [],
        isActive: true
      };

      if (store) {
        // Update existing
        await store.update(dataToSave);
      } else {
        // Create new
        store = await Store.create(dataToSave);
      }

      return res.status(200).json({
        success: true,
        message: 'Store settings updated successfully',
        data: store
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Error in store settings API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process store settings',
      details: error.message
    });
  }
}
