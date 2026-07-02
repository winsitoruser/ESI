import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
import { 
  getMockShipmentById, 
  getMockTrackingUpdates,
  addMockTrackingUpdate 
} from '@/lib/mockData/shipments';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { shipmentId } = req.query;

    if (req.method === 'GET') {
      // Get tracking history
      const shipment = getMockShipmentById(shipmentId as string);
      if (!shipment) {
        return res.status(404).json({ error: 'Shipment not found' });
      }

      const trackingUpdates = getMockTrackingUpdates(shipmentId as string);

      return res.status(200).json({
        success: true,
        data: {
          shipment,
          trackingUpdates
        }
      });

    } else if (req.method === 'POST') {
      // Add tracking update
      const { status, location, latitude, longitude, description } = req.body;

      if (!status || !location) {
        return res.status(400).json({ error: 'Status and location are required' });
      }

      const shipment = getMockShipmentById(shipmentId as string);
      if (!shipment) {
        return res.status(404).json({ error: 'Shipment not found' });
      }

      const trackingUpdate = addMockTrackingUpdate(shipmentId as string, {
        status,
        location,
        latitude,
        longitude,
        description,
        updatedBy: session.user?.name || 'System'
      });

      // TODO: When database is ready, replace with:
      // const trackingUpdate = await db.ShipmentTrackingUpdate.create({
      //   shipment_id: shipmentId,
      //   status,
      //   location,
      //   latitude,
      //   longitude,
      //   description,
      //   updated_by: session.user.id
      // });
      // await db.RequisitionShipment.update({ 
      //   status,
      //   updated_at: new Date()
      // }, { where: { id: shipmentId } });

      return res.status(201).json({
        success: true,
        message: 'Tracking update added successfully',
        data: trackingUpdate
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Shipment tracking API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
