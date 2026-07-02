import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

let FleetDriver: any;
try {
  const models = require('../../../../models');
  FleetDriver = models.FleetDriver;
} catch (e) { console.warn('FleetDriver not available'); }

import { getAvailableDrivers } from '@/lib/mockData/fleet';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { branch, licenseType } = req.query;

    if (FleetDriver) {
      try {
        const where: any = { status: 'active', availabilityStatus: 'available' };
        if (session.user?.tenantId) where.tenantId = session.user.tenantId;
        if (branch && branch !== 'all') where.assignedBranchId = branch;
        if (licenseType && licenseType !== 'all') where.licenseType = licenseType;

        const drivers = await FleetDriver.findAll({
          where,
          attributes: ['id', 'driverNumber', 'fullName', 'phone', 'licenseType', 'licenseNumber', 'totalDeliveries', 'onTimeDeliveries', 'safetyScore', 'customerRating', 'assignedBranchId'],
          order: [['fullName', 'ASC']]
        });

        return res.status(200).json({ success: true, data: drivers, count: drivers.length });
      } catch (e: any) {
        console.warn('Available drivers DB failed:', e.message);
      }
    }

    // Mock fallback
    let drivers = getAvailableDrivers();
    if (branch && branch !== 'all') drivers = drivers.filter(d => d.assignedBranchId === branch);
    if (licenseType && licenseType !== 'all') drivers = drivers.filter(d => d.licenseType === licenseType);

    const data = drivers.map(d => ({
      id: d.id, driverNumber: d.driverNumber, fullName: d.fullName,
      phone: d.phone, licenseType: d.licenseType, licenseNumber: d.licenseNumber,
      totalDeliveries: d.totalDeliveries, safetyScore: d.safetyScore,
      customerRating: d.customerRating, assignedBranchId: d.assignedBranchId
    }));

    return res.status(200).json({ success: true, data, count: data.length });
  } catch (error: any) {
    console.error('Available drivers API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
