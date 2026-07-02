import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

let FleetFuelTransaction: any, FleetVehicle: any, FleetDriver: any;
try {
  const models = require('../../../../models');
  FleetFuelTransaction = models.FleetFuelTransaction;
  FleetVehicle = models.FleetVehicle;
  FleetDriver = models.FleetDriver;
} catch (e) { console.warn('Fuel models not available'); }

import { mockFuelTransactions } from '@/lib/mockData/fleetAdvanced';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    switch (req.method) {
      case 'GET': return await getFuel(req, res, session);
      case 'POST': return await createFuel(req, res, session);
      default: return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Fuel API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function getFuel(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { vehicleId, driverId, startDate, endDate, fuelType, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  if (FleetFuelTransaction) {
    try {
      const { Op } = require('sequelize');
      const where: any = {};
      if (session.user?.tenantId) where.tenantId = session.user.tenantId;
      if (vehicleId) where.vehicleId = vehicleId;
      if (driverId) where.driverId = driverId;
      if (fuelType && fuelType !== 'all') where.fuelType = fuelType;
      if (startDate) where.transactionDate = { ...(where.transactionDate || {}), [Op.gte]: startDate };
      if (endDate) where.transactionDate = { ...(where.transactionDate || {}), [Op.lte]: endDate };

      const includes: any[] = [];
      if (FleetVehicle) includes.push({ model: FleetVehicle, as: 'vehicle', attributes: ['id', 'vehicleNumber', 'licensePlate'], required: false });
      if (FleetDriver) includes.push({ model: FleetDriver, as: 'driver', attributes: ['id', 'driverNumber', 'fullName'], required: false });

      const { count, rows } = await FleetFuelTransaction.findAndCountAll({
        where, include: includes, order: [['transactionDate', 'DESC']], limit: take, offset
      });

      const allRecords = await FleetFuelTransaction.findAll({ where: session.user?.tenantId ? { tenantId: session.user.tenantId } : {}, attributes: ['totalCost', 'quantityLiters'] });
      const totalCost = allRecords.reduce((s: number, r: any) => s + parseFloat(r.totalCost || 0), 0);
      const totalLiters = allRecords.reduce((s: number, r: any) => s + parseFloat(r.quantityLiters || 0), 0);

      return res.status(200).json({
        success: true, data: rows,
        summary: { totalTransactions: allRecords.length, totalCost, totalLiters, avgPricePerLiter: totalLiters > 0 ? totalCost / totalLiters : 0 },
        pagination: { total: count, page: parseInt(page as string), limit: take, totalPages: Math.ceil(count / take) }
      });
    } catch (e: any) {
      console.warn('Fuel DB failed:', e.message);
    }
  }

  // Mock fallback
  let transactions = [...mockFuelTransactions];
  if (vehicleId) transactions = transactions.filter(t => t.vehicleId === vehicleId);
  if (driverId) transactions = transactions.filter(t => t.driverId === driverId);
  if (fuelType && fuelType !== 'all') transactions = transactions.filter(t => t.fuelType === fuelType);

  const totalCost = transactions.reduce((sum, t) => sum + t.totalCost, 0);
  const totalLiters = transactions.reduce((sum, t) => sum + t.quantityLiters, 0);

  return res.status(200).json({
    success: true, data: transactions.slice(offset, offset + take),
    summary: { totalTransactions: transactions.length, totalCost, totalLiters, avgPricePerLiter: totalLiters > 0 ? totalCost / totalLiters : 0 },
    pagination: { total: transactions.length, page: parseInt(page as string), limit: take, totalPages: Math.ceil(transactions.length / take) }
  });
}

async function createFuel(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { vehicleId, driverId, transactionType, transactionDate, fuelStation, fuelType, quantityLiters, pricePerLiter, odometerReading, paymentMethod, receiptNumber, notes } = req.body;

  if (!vehicleId || !quantityLiters || !pricePerLiter) {
    return res.status(400).json({ error: 'vehicleId, quantityLiters, pricePerLiter required' });
  }

  const totalCost = parseFloat(quantityLiters) * parseFloat(pricePerLiter);

  if (FleetFuelTransaction) {
    try {
      const record = await FleetFuelTransaction.create({
        tenantId: session.user?.tenantId,
        vehicleId, driverId: driverId || null,
        transactionType: transactionType || 'refill',
        transactionDate: transactionDate || new Date(),
        fuelStation, fuelType: fuelType || 'diesel',
        quantityLiters, pricePerLiter, totalCost,
        odometerReading: odometerReading || null,
        paymentMethod: paymentMethod || 'cash',
        receiptNumber, notes
      });
      return res.status(201).json({ success: true, message: 'Transaksi BBM berhasil dicatat', data: record });
    } catch (e: any) {
      return res.status(500).json({ error: 'Failed to create fuel transaction', details: e.message });
    }
  }

  return res.status(201).json({ success: true, message: 'Fuel transaction created (mock)', data: { id: `fuel-${Date.now()}`, ...req.body, totalCost } });
}
