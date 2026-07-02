import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

let FleetVehicle: any;
try {
  const models = require('../../../../models');
  FleetVehicle = models.FleetVehicle;
} catch (e) { console.warn('FleetVehicle not available'); }

import { getActiveVehicles } from '@/lib/mockData/fleet';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { branch, vehicleType, minCapacity } = req.query;

    if (FleetVehicle) {
      try {
        const { Op } = require('sequelize');
        const where: any = { status: 'active' };
        if (session.user?.tenantId) where.tenantId = session.user.tenantId;
        if (branch && branch !== 'all') where.assignedBranchId = branch;
        if (vehicleType && vehicleType !== 'all') where.vehicleType = vehicleType;
        if (minCapacity) where.maxWeightKg = { [Op.gte]: parseFloat(minCapacity as string) };

        const vehicles = await FleetVehicle.findAll({
          where,
          attributes: ['id', 'vehicleNumber', 'licensePlate', 'vehicleType', 'brand', 'model', 'maxWeightKg', 'maxVolumeM3', 'fuelTankCapacity', 'currentOdometerKm', 'currentLocation', 'assignedBranchId'],
          order: [['vehicleNumber', 'ASC']]
        });

        return res.status(200).json({ success: true, data: vehicles, count: vehicles.length });
      } catch (e: any) {
        console.warn('Available vehicles DB failed:', e.message);
      }
    }

    // Mock fallback
    let vehicles = getActiveVehicles();
    vehicles = vehicles.filter(v => v.status === 'active');
    if (branch && branch !== 'all') vehicles = vehicles.filter(v => v.assignedBranchId === branch);
    if (vehicleType && vehicleType !== 'all') vehicles = vehicles.filter(v => v.vehicleType === vehicleType);
    if (minCapacity) vehicles = vehicles.filter(v => v.maxWeightKg >= parseFloat(minCapacity as string));

    const data = vehicles.map(v => ({
      id: v.id, vehicleNumber: v.vehicleNumber, licensePlate: v.licensePlate,
      vehicleType: v.vehicleType, brand: v.brand, model: v.model,
      maxWeightKg: v.maxWeightKg, maxVolumeM3: v.maxVolumeM3,
      currentLocation: v.currentLocation, assignedBranchId: v.assignedBranchId
    }));

    return res.status(200).json({ success: true, data, count: data.length });
  } catch (error: any) {
    console.error('Available vehicles API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
