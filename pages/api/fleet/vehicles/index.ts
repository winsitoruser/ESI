import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

let FleetVehicle: any, FleetDriver: any;
try {
  const models = require('../../../../models');
  FleetVehicle = models.FleetVehicle;
  FleetDriver = models.FleetDriver;
} catch (e) { console.warn('Fleet models not available'); }

import { mockVehicles } from '@/lib/mockData/fleet';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    switch (req.method) {
      case 'GET': return await getVehicles(req, res, session);
      case 'POST': return await createVehicle(req, res, session);
      default: return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Fleet vehicles API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function getVehicles(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { status, type, branch, search, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  if (FleetVehicle) {
    try {
      const { Op } = require('sequelize');
      const where: any = {};
      if (session.user?.tenantId) where.tenantId = session.user.tenantId;
      if (status && status !== 'all') where.status = status;
      if (type && type !== 'all') where.vehicleType = type;
      if (branch && branch !== 'all') where.assignedBranchId = branch;
      if (search) {
        where[Op.or] = [
          { licensePlate: { [Op.iLike]: `%${search}%` } },
          { vehicleNumber: { [Op.iLike]: `%${search}%` } },
          { brand: { [Op.iLike]: `%${search}%` } },
          { model: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows } = await FleetVehicle.findAndCountAll({
        where,
        include: FleetDriver ? [{ model: FleetDriver, as: 'assignedDriver', required: false }] : [],
        order: [['createdAt', 'DESC']],
        limit: take,
        offset
      });

      const allWhere: any = {};
      if (session.user?.tenantId) allWhere.tenantId = session.user.tenantId;
      const allVehicles = await FleetVehicle.findAll({ where: allWhere, attributes: ['id', 'status', 'assignedDriverId'] });

      const stats = {
        total: allVehicles.length,
        active: allVehicles.filter((v: any) => v.status === 'active').length,
        maintenance: allVehicles.filter((v: any) => v.status === 'maintenance').length,
        onRoute: allVehicles.filter((v: any) => v.status === 'active' && v.assignedDriverId).length
      };

      return res.status(200).json({
        success: true,
        data: rows,
        stats,
        pagination: { total: count, page: parseInt(page as string), limit: take, totalPages: Math.ceil(count / take) }
      });
    } catch (e: any) {
      console.warn('Fleet DB query failed, using mock:', e.message);
    }
  }

  // Mock fallback
  let vehicles = [...mockVehicles];
  if (status && status !== 'all') vehicles = vehicles.filter(v => v.status === status);
  if (type && type !== 'all') vehicles = vehicles.filter(v => v.vehicleType === type);
  if (branch && branch !== 'all') vehicles = vehicles.filter(v => v.assignedBranchId === branch);
  if (search) {
    const s = (search as string).toLowerCase();
    vehicles = vehicles.filter(v => v.licensePlate.toLowerCase().includes(s) || v.brand.toLowerCase().includes(s));
  }

  const stats = {
    total: mockVehicles.length,
    active: mockVehicles.filter(v => v.status === 'active').length,
    maintenance: mockVehicles.filter(v => v.status === 'maintenance').length,
    onRoute: mockVehicles.filter(v => v.status === 'active' && v.assignedDriverId).length
  };

  return res.status(200).json({ success: true, data: vehicles.slice(offset, offset + take), stats, pagination: { total: vehicles.length, page: parseInt(page as string), limit: take, totalPages: Math.ceil(vehicles.length / take) } });
}

async function createVehicle(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { licensePlate, vehicleType, brand, model, year, color, ownershipType, purchaseDate, purchasePrice, maxWeightKg, maxVolumeM3, fuelTankCapacity, registrationNumber, registrationExpiry, insurancePolicyNumber, insuranceProvider, insuranceExpiry, assignedBranchId, notes } = req.body;

  if (!licensePlate || !vehicleType) {
    return res.status(400).json({ error: 'License plate and vehicle type are required' });
  }

  if (FleetVehicle) {
    try {
      const existing = await FleetVehicle.findOne({ where: { licensePlate } });
      if (existing) return res.status(400).json({ error: 'Vehicle with this license plate already exists' });

      const count = await FleetVehicle.count({ where: session.user?.tenantId ? { tenantId: session.user.tenantId } : {} });
      const vehicle = await FleetVehicle.create({
        tenantId: session.user?.tenantId,
        vehicleNumber: `VH-${String(count + 1).padStart(3, '0')}`,
        licensePlate, vehicleType, brand, model, year, color, ownershipType,
        purchaseDate: purchaseDate || null, purchasePrice: purchasePrice || null,
        maxWeightKg: maxWeightKg || 0, maxVolumeM3: maxVolumeM3 || 0,
        fuelTankCapacity: fuelTankCapacity || 0, registrationNumber, registrationExpiry,
        insurancePolicyNumber, insuranceProvider, insuranceExpiry,
        assignedBranchId: assignedBranchId || null, notes, status: 'active'
      });

      return res.status(201).json({ success: true, message: 'Kendaraan berhasil ditambahkan', data: vehicle });
    } catch (e: any) {
      if (e.name === 'SequelizeUniqueConstraintError') return res.status(400).json({ error: 'Duplicate vehicle' });
      return res.status(500).json({ error: 'Failed to create vehicle', details: e.message });
    }
  }

  return res.status(201).json({ success: true, message: 'Vehicle created (mock)', data: { id: `veh-${Date.now()}`, ...req.body, status: 'active' } });
}
