import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

let FleetDriver: any;
try {
  const models = require('../../../../models');
  FleetDriver = models.FleetDriver;
} catch (e) { console.warn('FleetDriver model not available'); }

import { mockDrivers } from '@/lib/mockData/fleet';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    switch (req.method) {
      case 'GET': return await getDrivers(req, res, session);
      case 'POST': return await createDriver(req, res, session);
      default: return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Fleet drivers API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function getDrivers(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { status, availability, branch, search, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  const take = parseInt(limit as string);

  if (FleetDriver) {
    try {
      const { Op } = require('sequelize');
      const where: any = {};
      if (session.user?.tenantId) where.tenantId = session.user.tenantId;
      if (status && status !== 'all') where.status = status;
      if (availability && availability !== 'all') where.availabilityStatus = availability;
      if (branch && branch !== 'all') where.assignedBranchId = branch;
      if (search) {
        where[Op.or] = [
          { fullName: { [Op.iLike]: `%${search}%` } },
          { driverNumber: { [Op.iLike]: `%${search}%` } },
          { licenseNumber: { [Op.iLike]: `%${search}%` } },
          { phone: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const { count, rows } = await FleetDriver.findAndCountAll({
        where, order: [['fullName', 'ASC']], limit: take, offset
      });

      const allWhere: any = {};
      if (session.user?.tenantId) allWhere.tenantId = session.user.tenantId;
      const allDrivers = await FleetDriver.findAll({ where: allWhere, attributes: ['id', 'status', 'availabilityStatus'] });

      const stats = {
        total: allDrivers.length,
        active: allDrivers.filter((d: any) => d.status === 'active').length,
        available: allDrivers.filter((d: any) => d.availabilityStatus === 'available').length,
        onDuty: allDrivers.filter((d: any) => d.availabilityStatus === 'on_duty').length
      };

      return res.status(200).json({
        success: true, data: rows, stats,
        pagination: { total: count, page: parseInt(page as string), limit: take, totalPages: Math.ceil(count / take) }
      });
    } catch (e: any) {
      console.warn('Fleet drivers DB failed, mock fallback:', e.message);
    }
  }

  // Mock fallback
  let drivers = [...mockDrivers];
  if (status && status !== 'all') drivers = drivers.filter(d => d.status === status);
  if (availability && availability !== 'all') drivers = drivers.filter(d => d.availabilityStatus === availability);
  if (search) {
    const s = (search as string).toLowerCase();
    drivers = drivers.filter(d => d.fullName.toLowerCase().includes(s) || d.licenseNumber.toLowerCase().includes(s));
  }

  const stats = {
    total: mockDrivers.length,
    active: mockDrivers.filter(d => d.status === 'active').length,
    available: mockDrivers.filter(d => d.availabilityStatus === 'available').length,
    onDuty: mockDrivers.filter(d => d.availabilityStatus === 'on_duty').length
  };

  return res.status(200).json({ success: true, data: drivers.slice(offset, offset + take), stats, pagination: { total: drivers.length, page: parseInt(page as string), limit: take, totalPages: Math.ceil(drivers.length / take) } });
}

async function createDriver(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { fullName, phone, email, address, dateOfBirth, licenseNumber, licenseType, licenseIssueDate, licenseExpiryDate, employmentType, hireDate, assignedBranchId, notes } = req.body;

  if (!fullName || !licenseNumber || !licenseType) {
    return res.status(400).json({ error: 'Full name, license number, and license type are required' });
  }

  if (FleetDriver) {
    try {
      const existing = await FleetDriver.findOne({ where: { licenseNumber } });
      if (existing) return res.status(400).json({ error: 'Driver with this license number already exists' });

      const count = await FleetDriver.count({ where: session.user?.tenantId ? { tenantId: session.user.tenantId } : {} });
      const driver = await FleetDriver.create({
        tenantId: session.user?.tenantId,
        driverNumber: `DRV-${String(count + 1).padStart(3, '0')}`,
        fullName, phone, email, address, dateOfBirth: dateOfBirth || null,
        licenseNumber, licenseType, licenseIssueDate: licenseIssueDate || null,
        licenseExpiryDate: licenseExpiryDate || null, employmentType: employmentType || 'full_time',
        hireDate: hireDate || new Date(), assignedBranchId: assignedBranchId || null,
        notes, status: 'active', availabilityStatus: 'available'
      });

      return res.status(201).json({ success: true, message: 'Driver berhasil ditambahkan', data: driver });
    } catch (e: any) {
      if (e.name === 'SequelizeUniqueConstraintError') return res.status(400).json({ error: 'Duplicate driver' });
      return res.status(500).json({ error: 'Failed to create driver', details: e.message });
    }
  }

  return res.status(201).json({ success: true, message: 'Driver created (mock)', data: { id: `drv-${Date.now()}`, ...req.body, status: 'active' } });
}
