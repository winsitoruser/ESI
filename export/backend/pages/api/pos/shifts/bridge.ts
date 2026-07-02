import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

/**
 * Bridge handler untuk Shift Management di modul POS
 * Implementasi dengan Sequelize
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Autentikasi
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const tenantId = (session?.user as any)?.tenantId;
    const userId = (session?.user as any)?.id;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    // Gunakan adapter POS untuk shifts
    const { getActiveShift, getShiftById, openShift, closeShift } = require('../../../../server/sequelize/adapters/pos-adapter');
    
    switch (req.method) {
      case 'GET':
        if (req.query.id) {
          // Get shift by ID
          const shift = await getShiftById(req.query.id as string);
          if (!shift) {
            return res.status(404).json({ 
              error: 'Shift not found',
              success: false 
            });
          }
          return res.status(200).json({
            shift,
            success: true,
            adapter: 'sequelize'
          });
        } else {
          // Get active shift for cashier
          const activeShift = await getActiveShift(tenantId, userId);
          return res.status(200).json({ 
            activeShift,
            success: true,
            adapter: 'sequelize'
          });
        }
      
      case 'POST':
        // Open a new shift
        const shiftData = {
          ...req.body,
          cashierId: userId,
          tenantId
        };
        const newShift = await openShift(shiftData);
        return res.status(201).json({
          shift: newShift,
          success: true,
          adapter: 'sequelize',
          message: 'Shift successfully opened'
        });
      
      case 'PUT':
        // Close an existing shift
        if (!req.query.id) {
          return res.status(400).json({ error: 'Shift ID is required' });
        }
        
        const closeData = {
          ...req.body,
          id: req.query.id as string
        };
        
        const closedShift = await closeShift(closeData);
        return res.status(200).json({
          shift: closedShift,
          success: true,
          adapter: 'sequelize',
          message: 'Shift successfully closed'
        });
        
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err: any) {
    console.error('Error handling POS shifts request:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
      success: false,
      // Data fallback dengan skema warna merah-oranye sesuai preferensi user
      fallback: {
        activeShift: null,
        shifts: []
      }
    });
  }
}
