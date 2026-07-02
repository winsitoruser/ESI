import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]';
import { createMockShipment, MockShipment } from '@/lib/mockData/shipments';

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
    const {
      carrier,
      driverName,
      driverPhone,
      vehicleNumber,
      estimatedDeliveryDate,
      totalPackages,
      totalWeight,
      totalVolume,
      shippingCost,
      insuranceCost,
      deliveryInstructions,
      notes,
      shippedFromBranchId,
      shippedToBranchId
    } = req.body;

    // Validate required fields
    if (!carrier) {
      return res.status(400).json({ error: 'Carrier is required' });
    }

    // Mock branch data (in real implementation, fetch from database)
    const mockBranches: Record<string, any> = {
      '6': { id: '6', code: 'WH-001', name: 'Gudang Pusat Cikarang' },
      '2': { id: '2', code: 'BR-002', name: 'Cabang Bandung' },
      '3': { id: '3', code: 'BR-003', name: 'Cabang Surabaya' },
      '4': { id: '4', code: 'BR-004', name: 'Cabang Medan' },
      '5': { id: '5', code: 'BR-005', name: 'Cabang Yogyakarta' }
    };

    const fromBranch = mockBranches[shippedFromBranchId] || mockBranches['6'];
    const toBranch = mockBranches[shippedToBranchId] || mockBranches['2'];

    // Create mock shipment
    const shipment = createMockShipment({
      requisitionId: id as string,
      carrier,
      driverName,
      driverPhone,
      vehicleNumber,
      estimatedDeliveryDate,
      totalPackages: totalPackages || 1,
      totalWeight: totalWeight || 0,
      totalVolume: totalVolume || 0,
      shippingCost: shippingCost || 0,
      insuranceCost: insuranceCost || 0,
      deliveryInstructions,
      notes,
      shippedFromBranch: fromBranch,
      shippedToBranch: toBranch,
      shippedBy: session.user?.name || 'Admin'
    });

    // TODO: When database is ready, replace with:
    // const shipment = await db.RequisitionShipment.create({...});
    // await db.InternalRequisition.update({ 
    //   current_shipment_id: shipment.id,
    //   total_shipments: sequelize.literal('total_shipments + 1'),
    //   shipping_status: 'partially_shipped'
    // }, { where: { id } });

    return res.status(201).json({
      success: true,
      message: 'Shipment created successfully',
      data: shipment
    });

  } catch (error: any) {
    console.error('Create shipment API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
