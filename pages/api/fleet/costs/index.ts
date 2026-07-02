import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

let FleetFuelTransaction: any, FleetMaintenanceSchedule: any;
try {
  const models = require('../../../../models');
  FleetFuelTransaction = models.FleetFuelTransaction;
  FleetMaintenanceSchedule = models.FleetMaintenanceSchedule;
} catch (e) { console.warn('Cost models not available'); }

import { mockCostRecords, getTotalCostByCategory } from '@/lib/mockData/fleetPhase2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      const { category, vehicleId, startDate, endDate } = req.query;

      // Try DB: aggregate fuel + maintenance costs
      if (FleetFuelTransaction) {
        try {
          const { Op } = require('sequelize');
          const fuelWhere: any = {};
          if (session.user?.tenantId) fuelWhere.tenantId = session.user.tenantId;
          if (vehicleId) fuelWhere.vehicleId = vehicleId;
          if (startDate) fuelWhere.transactionDate = { ...(fuelWhere.transactionDate || {}), [Op.gte]: startDate };
          if (endDate) fuelWhere.transactionDate = { ...(fuelWhere.transactionDate || {}), [Op.lte]: endDate };

          const fuelRecords = await FleetFuelTransaction.findAll({ where: fuelWhere });
          const fuelCosts = fuelRecords.map((r: any) => ({
            id: r.id, costCategory: 'fuel', amount: parseFloat(r.totalCost || 0),
            costDate: r.transactionDate, vehicleId: r.vehicleId,
            description: `BBM ${r.fuelType} - ${r.quantityLiters}L`, currency: 'IDR'
          }));

          let maintenanceCosts: any[] = [];
          if (FleetMaintenanceSchedule) {
            const maintWhere: any = { status: 'completed' };
            if (vehicleId) maintWhere.vehicleId = vehicleId;
            const maintRecords = await FleetMaintenanceSchedule.findAll({ where: maintWhere });
            maintenanceCosts = maintRecords.filter((r: any) => r.actualCost).map((r: any) => ({
              id: r.id, costCategory: 'maintenance', amount: parseFloat(r.actualCost || 0),
              costDate: r.lastServiceDate, vehicleId: r.vehicleId,
              description: `Service: ${r.maintenanceType}`, currency: 'IDR'
            }));
          }

          let allCosts = [...fuelCosts, ...maintenanceCosts];
          if (category && category !== 'all') allCosts = allCosts.filter(c => c.costCategory === category);

          const totalAmount = allCosts.reduce((s, c) => s + c.amount, 0);
          const byCategory: Record<string, number> = {};
          allCosts.forEach(c => { byCategory[c.costCategory] = (byCategory[c.costCategory] || 0) + c.amount; });

          if (allCosts.length > 0) {
            return res.status(200).json({
              success: true, data: allCosts.sort((a, b) => new Date(b.costDate).getTime() - new Date(a.costDate).getTime()),
              summary: { totalAmount, count: allCosts.length, byCategory }
            });
          }
        } catch (e: any) {
          console.warn('Costs DB failed:', e.message);
        }
      }

      // Mock fallback
      let costs = [...mockCostRecords];
      if (category && category !== 'all') costs = costs.filter(c => c.costCategory === category);
      if (vehicleId) costs = costs.filter(c => c.vehicleId === vehicleId);

      return res.status(200).json({
        success: true, data: costs,
        summary: {
          totalAmount: costs.reduce((sum, c) => sum + c.amount, 0),
          count: costs.length,
          byCategory: {
            fuel: getTotalCostByCategory('fuel'), maintenance: getTotalCostByCategory('maintenance'),
            salary: getTotalCostByCategory('salary'), insurance: getTotalCostByCategory('insurance'),
            other: getTotalCostByCategory('other')
          }
        }
      });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Costs API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
