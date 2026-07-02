import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

let FleetMaintenanceSchedule: any, FleetVehicle: any;
try {
  const models = require('../../../../models');
  FleetMaintenanceSchedule = models.FleetMaintenanceSchedule;
  FleetVehicle = models.FleetVehicle;
} catch (e) { console.warn('Maintenance models not available'); }

import { mockMaintenanceSchedules } from '@/lib/mockData/fleetPhase2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    switch (req.method) {
      case 'GET': return await getSchedules(req, res, session);
      case 'POST': return await createSchedule(req, res, session);
      case 'PUT': return await updateSchedule(req, res);
      default: return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Maintenance schedules API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function getSchedules(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { vehicleId, status, search } = req.query;

  if (FleetMaintenanceSchedule) {
    try {
      const { Op } = require('sequelize');
      const where: any = {};
      if (vehicleId) where.vehicleId = vehicleId;
      if (status && status !== 'all') where.status = status;

      const includes: any[] = [];
      if (FleetVehicle) includes.push({ model: FleetVehicle, as: 'vehicle', attributes: ['id', 'vehicleNumber', 'licensePlate'], required: false });

      const schedules = await FleetMaintenanceSchedule.findAll({
        where, include: includes, order: [['nextServiceDate', 'ASC']]
      });

      const stats = {
        total: schedules.length,
        active: schedules.filter((s: any) => s.status === 'active').length,
        overdue: schedules.filter((s: any) => s.status === 'overdue').length,
        completed: schedules.filter((s: any) => s.status === 'completed').length
      };

      return res.status(200).json({ success: true, data: schedules, stats });
    } catch (e: any) {
      console.warn('Maintenance DB failed:', e.message);
    }
  }

  // Mock fallback
  let schedules = [...mockMaintenanceSchedules];
  if (vehicleId) schedules = schedules.filter(s => s.vehicleId === vehicleId);
  if (status && status !== 'all') schedules = schedules.filter(s => s.status === status);

  const stats = {
    total: schedules.length,
    active: schedules.filter(s => s.status === 'active').length,
    overdue: schedules.filter(s => s.status === 'overdue').length,
    completed: schedules.filter(s => s.status === 'completed').length
  };

  return res.status(200).json({ success: true, data: schedules, stats });
}

async function createSchedule(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { vehicleId, maintenanceType, intervalType, intervalKilometers, intervalMonths, nextServiceDate, nextServiceOdometer, estimatedCost, notes } = req.body;

  if (!vehicleId || !maintenanceType) {
    return res.status(400).json({ error: 'vehicleId and maintenanceType required' });
  }

  if (FleetMaintenanceSchedule) {
    try {
      const schedule = await FleetMaintenanceSchedule.create({
        vehicleId, maintenanceType,
        intervalType: intervalType || 'kilometers',
        intervalKilometers: intervalKilometers || null,
        intervalMonths: intervalMonths || null,
        nextServiceDate: nextServiceDate || null,
        nextServiceOdometer: nextServiceOdometer || null,
        estimatedCost: estimatedCost || null,
        notes, status: 'active'
      });
      return res.status(201).json({ success: true, message: 'Jadwal maintenance berhasil dibuat', data: schedule });
    } catch (e: any) {
      return res.status(500).json({ error: 'Failed to create schedule', details: e.message });
    }
  }

  return res.status(201).json({ success: true, message: 'Schedule created (mock)', data: { id: `sched-${Date.now()}`, ...req.body, status: 'active' } });
}

async function updateSchedule(req: NextApiRequest, res: NextApiResponse) {
  const { id, status, lastServiceDate, lastServiceOdometer, actualCost, notes } = req.body;
  if (!id) return res.status(400).json({ error: 'Schedule ID required' });

  if (FleetMaintenanceSchedule) {
    try {
      const schedule = await FleetMaintenanceSchedule.findByPk(id);
      if (!schedule) return res.status(404).json({ error: 'Schedule not found' });

      const updateData: any = {};
      if (status) updateData.status = status;
      if (lastServiceDate) updateData.lastServiceDate = lastServiceDate;
      if (lastServiceOdometer) updateData.lastServiceOdometer = lastServiceOdometer;
      if (actualCost !== undefined) updateData.actualCost = actualCost;
      if (notes !== undefined) updateData.notes = notes;

      await schedule.update(updateData);
      return res.status(200).json({ success: true, message: 'Jadwal diperbarui', data: schedule });
    } catch (e: any) {
      return res.status(500).json({ error: 'Failed to update', details: e.message });
    }
  }

  return res.status(200).json({ success: true, message: 'Updated (mock)', data: { id, ...req.body } });
}
