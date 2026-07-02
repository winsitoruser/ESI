import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

let FleetVehicle: any, FleetDriver: any, FleetMaintenanceSchedule: any, FleetFuelTransaction: any;
try {
  const models = require('../../../../models');
  FleetVehicle = models.FleetVehicle;
  FleetDriver = models.FleetDriver;
  FleetMaintenanceSchedule = models.FleetMaintenanceSchedule;
  FleetFuelTransaction = models.FleetFuelTransaction;
} catch (e) { console.warn('Fleet models not available'); }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.query;

    if (req.method === 'GET') {
      if (!FleetVehicle) return res.status(404).json({ error: 'Vehicle not found' });
      const vehicle = await FleetVehicle.findByPk(id as string, {
        include: [
          FleetDriver ? { model: FleetDriver, as: 'assignedDriver', required: false } : null,
          FleetMaintenanceSchedule ? { model: FleetMaintenanceSchedule, as: 'maintenanceSchedules', required: false, limit: 5, order: [['nextServiceDate', 'ASC']] } : null,
        ].filter(Boolean)
      });
      if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

      // Get fuel summary
      let fuelSummary = null;
      if (FleetFuelTransaction) {
        const fuelRecords = await FleetFuelTransaction.findAll({ where: { vehicleId: id } });
        if (fuelRecords.length > 0) {
          fuelSummary = {
            totalTransactions: fuelRecords.length,
            totalCost: fuelRecords.reduce((s: number, r: any) => s + parseFloat(r.totalCost || 0), 0),
            totalLiters: fuelRecords.reduce((s: number, r: any) => s + parseFloat(r.quantityLiters || 0), 0)
          };
        }
      }

      return res.status(200).json({ success: true, data: vehicle, fuelSummary });

    } else if (req.method === 'PUT') {
      if (!FleetVehicle) return res.status(500).json({ error: 'DB not available' });
      const vehicle = await FleetVehicle.findByPk(id as string);
      if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

      await vehicle.update(req.body);
      return res.status(200).json({ success: true, message: 'Kendaraan berhasil diperbarui', data: vehicle });

    } else if (req.method === 'DELETE') {
      if (!FleetVehicle) return res.status(500).json({ error: 'DB not available' });
      const vehicle = await FleetVehicle.findByPk(id as string);
      if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

      await vehicle.destroy();
      return res.status(200).json({ success: true, message: 'Kendaraan berhasil dihapus' });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Fleet vehicle detail API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
