import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';

let FleetRoute: any;
try {
  const models = require('../../../../models');
  FleetRoute = models.FleetRoute;
} catch (e) { console.warn('FleetRoute model not available'); }

import { mockRoutes } from '@/lib/mockData/fleetAdvanced';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    switch (req.method) {
      case 'GET': return await getRoutes(req, res, session);
      case 'POST': return await createRoute(req, res, session);
      default: return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Routes API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function getRoutes(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { status, type, search } = req.query;

  if (FleetRoute) {
    try {
      const { Op } = require('sequelize');
      const where: any = {};
      if (session.user?.tenantId) where.tenantId = session.user.tenantId;
      if (status && status !== 'all') where.status = status;
      if (type && type !== 'all') where.routeType = type;
      if (search) {
        where[Op.or] = [
          { routeName: { [Op.iLike]: `%${search}%` } },
          { routeNumber: { [Op.iLike]: `%${search}%` } },
          { startLocation: { [Op.iLike]: `%${search}%` } },
          { endLocation: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const routes = await FleetRoute.findAll({ where, order: [['routeName', 'ASC']] });
      return res.status(200).json({ success: true, data: routes, count: routes.length });
    } catch (e: any) {
      console.warn('Routes DB failed:', e.message);
    }
  }

  let routes = [...mockRoutes];
  if (status && status !== 'all') routes = routes.filter(r => r.status === status);
  if (type && type !== 'all') routes = routes.filter(r => r.routeType === type);
  return res.status(200).json({ success: true, data: routes, count: routes.length });
}

async function createRoute(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { routeName, routeType, startLocation, endLocation, totalDistanceKm, estimatedDurationMinutes, waypoints, notes } = req.body;

  if (!routeName || !routeType || !startLocation || !endLocation) {
    return res.status(400).json({ error: 'Route name, type, start and end location required' });
  }

  if (FleetRoute) {
    try {
      const count = await FleetRoute.count({ where: session.user?.tenantId ? { tenantId: session.user.tenantId } : {} });
      const route = await FleetRoute.create({
        tenantId: session.user?.tenantId,
        routeNumber: `RT-${String(count + 1).padStart(3, '0')}`,
        routeName, routeType, startLocation, endLocation,
        totalDistanceKm: totalDistanceKm || 0,
        estimatedDurationMinutes: estimatedDurationMinutes || 0,
        waypoints: waypoints || [], notes, status: 'active'
      });
      return res.status(201).json({ success: true, message: 'Rute berhasil ditambahkan', data: route });
    } catch (e: any) {
      return res.status(500).json({ error: 'Failed to create route', details: e.message });
    }
  }

  return res.status(201).json({ success: true, message: 'Route created (mock)', data: { id: `route-${Date.now()}`, ...req.body, status: 'active' } });
}
