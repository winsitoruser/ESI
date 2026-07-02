import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

let FleetRouteAssignment: any, FleetRoute: any, FleetVehicle: any, FleetDriver: any;
try {
  const models = require('../../../../models');
  FleetRouteAssignment = models.FleetRouteAssignment;
  FleetRoute = models.FleetRoute;
  FleetVehicle = models.FleetVehicle;
  FleetDriver = models.FleetDriver;
} catch (e) { console.warn('Assignment models not available'); }

import { mockRouteAssignments } from '@/lib/mockData/fleetPhase2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    switch (req.method) {
      case 'GET': return await getAssignments(req, res);
      case 'POST': return await createAssignment(req, res);
      case 'PUT': return await updateAssignment(req, res);
      default: return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Route assignments API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function getAssignments(req: NextApiRequest, res: NextApiResponse) {
  const { status, vehicleId, driverId, date } = req.query;

  if (FleetRouteAssignment) {
    try {
      const where: any = {};
      if (status && status !== 'all') where.status = status;
      if (vehicleId) where.vehicleId = vehicleId;
      if (driverId) where.driverId = driverId;
      if (date) where.scheduledDate = date;

      const includes: any[] = [];
      if (FleetRoute) includes.push({ model: FleetRoute, as: 'route', attributes: ['id', 'routeNumber', 'routeName', 'startLocation', 'endLocation'], required: false });
      if (FleetVehicle) includes.push({ model: FleetVehicle, as: 'vehicle', attributes: ['id', 'vehicleNumber', 'licensePlate'], required: false });
      if (FleetDriver) includes.push({ model: FleetDriver, as: 'driver', attributes: ['id', 'driverNumber', 'fullName'], required: false });

      const assignments = await FleetRouteAssignment.findAll({
        where, include: includes, order: [['scheduledDate', 'DESC']]
      });

      return res.status(200).json({ success: true, data: assignments, count: assignments.length });
    } catch (e: any) {
      console.warn('Assignments DB failed:', e.message);
    }
  }

  // Mock fallback
  let assignments = [...mockRouteAssignments];
  if (status && status !== 'all') assignments = assignments.filter(a => a.status === status);
  if (vehicleId) assignments = assignments.filter(a => a.vehicleId === vehicleId);
  if (driverId) assignments = assignments.filter(a => a.driverId === driverId);
  if (date) assignments = assignments.filter(a => a.scheduledDate === date);

  return res.status(200).json({ success: true, data: assignments, count: assignments.length });
}

async function createAssignment(req: NextApiRequest, res: NextApiResponse) {
  const { routeId, vehicleId, driverId, scheduledDate, scheduledStartTime, notes } = req.body;

  if (!routeId || !vehicleId || !driverId || !scheduledDate) {
    return res.status(400).json({ error: 'routeId, vehicleId, driverId, scheduledDate required' });
  }

  if (FleetRouteAssignment) {
    try {
      const assignment = await FleetRouteAssignment.create({
        routeId, vehicleId, driverId, scheduledDate,
        scheduledStartTime: scheduledStartTime || null,
        status: 'scheduled', notes
      });
      return res.status(201).json({ success: true, message: 'Penugasan rute berhasil dibuat', data: assignment });
    } catch (e: any) {
      return res.status(500).json({ error: 'Failed to create assignment', details: e.message });
    }
  }

  return res.status(201).json({ success: true, data: { id: `assign-${Date.now()}`, ...req.body, status: 'scheduled' } });
}

async function updateAssignment(req: NextApiRequest, res: NextApiResponse) {
  const { id, status, actualStartTime, actualEndTime, totalDistanceKm, fuelConsumedLiters, notes } = req.body;
  if (!id) return res.status(400).json({ error: 'Assignment ID required' });

  if (FleetRouteAssignment) {
    try {
      const assignment = await FleetRouteAssignment.findByPk(id);
      if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

      const updateData: any = {};
      if (status) updateData.status = status;
      if (actualStartTime) updateData.actualStartTime = actualStartTime;
      if (actualEndTime) updateData.actualEndTime = actualEndTime;
      if (totalDistanceKm !== undefined) updateData.totalDistanceKm = totalDistanceKm;
      if (fuelConsumedLiters !== undefined) updateData.fuelConsumedLiters = fuelConsumedLiters;
      if (notes !== undefined) updateData.notes = notes;

      await assignment.update(updateData);
      return res.status(200).json({ success: true, message: 'Penugasan diperbarui', data: assignment });
    } catch (e: any) {
      return res.status(500).json({ error: 'Failed to update', details: e.message });
    }
  }

  return res.status(200).json({ success: true, data: { id, ...req.body } });
}
