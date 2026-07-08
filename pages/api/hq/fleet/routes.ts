import { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { getTenantContext } from '../../../../lib/middleware/tenantIsolation';
import { logAudit } from '../../../../lib/audit/auditLogger';
import { validateBody, V, sanitizeBody } from '../../../../lib/middleware/withValidation';
import { checkLimit, RateLimitTier } from '../../../../lib/middleware/rateLimit';

// DB models & helpers
let sequelize: any = null;
try { sequelize = require('../../../../lib/sequelize'); } catch {}
let FleetRoute: any = null;
try {
  const models = require('../../../../models');
  FleetRoute = models.FleetRoute;
} catch {}

const safeQuery = async (sql: string, params: any = {}): Promise<any[]> => {
  if (!sequelize?.query) return [];
  try {
    const [rows] = await sequelize.query(sql, { replacements: params });
    return rows || [];
  } catch (e: any) {
    console.warn('[hq/fleet/routes] DB query failed:', e?.message || e);
    return [];
  }
};

// Mock routes data
const mockRoutes: any[] = [
  {
    id: 'route-1',
    routeName: 'Jakarta - Bandung',
    routeCode: 'JKT-BDG-01',
    origin: 'Jakarta',
    destination: 'Bandung',
    distance: 150,
    estimatedDuration: 180,
    status: 'active',
    vehicleId: 'veh-1',
    driverId: 'drv-1',
    stops: [
      { name: 'Rest Area KM 50', duration: 15 },
      { name: 'Toll Gate Cipularang', duration: 5 }
    ],
    createdAt: '2026-02-01T10:00:00Z'
  },
  {
    id: 'route-2',
    routeName: 'Jakarta - Surabaya',
    routeCode: 'JKT-SBY-01',
    origin: 'Jakarta',
    destination: 'Surabaya',
    distance: 800,
    estimatedDuration: 720,
    status: 'active',
    vehicleId: 'veh-2',
    driverId: 'drv-2',
    stops: [
      { name: 'Rest Area Cikampek', duration: 20 },
      { name: 'Rest Area Brebes', duration: 30 },
      { name: 'Rest Area Semarang', duration: 20 }
    ],
    createdAt: '2026-02-05T08:00:00Z'
  }
];

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return getRoutes(req, res);
      case 'POST':
        return createRoute(req, res);
      case 'PUT':
        return updateRoute(req, res);
      case 'DELETE':
        return deleteRoute(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
          errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
        );
    }
  } catch (error) {
    console.warn('Fleet Routes API Error: (table may not exist):', (error as any)?.message || error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Internal server error')
    );
  }
}

export default withHQAuth(handler, { module: 'fleet' });

async function getRoutes(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  const tenantId = (session?.user as any)?.tenantId || null;
  const { status, vehicleId, driverId, origin, destination, search } = req.query;

  // --- Try real DB first ---
  const hasDb = FleetRoute && sequelize;
  if (hasDb) {
    try {
      const { Op } = require('sequelize');
      const where: any = {};
      if (tenantId) where.tenantId = tenantId;
      if (status && status !== 'all') where.status = status;

      // Build search conditions
      if (search || vehicleId || driverId || origin || destination) {
        where[Op.and] = [];
        if (vehicleId) where[Op.and].push({ id: vehicleId }); // Note: vehicleId not a direct field in FleetRoute model — using raw SQL for complex filters
      }

      // For complex filtering with fields not in the model, use raw SQL
      let sql = 'SELECT * FROM fleet_routes WHERE 1=1';
      const params: any = {};
      if (tenantId) { sql += ' AND tenant_id = :tenantId'; params.tenantId = tenantId; }
      if (status && status !== 'all') { sql += ' AND status = :status'; params.status = status; }
      if (vehicleId) { sql += ' AND (id = :vehicleId)'; params.vehicleId = vehicleId; }
      if (origin) { sql += ' AND (start_location ILIKE :origin)'; params.origin = `%${origin}%`; }
      if (destination) { sql += ' AND (end_location ILIKE :destination)'; params.destination = `%${destination}%`; }
      if (search) {
        sql += ' AND (route_name ILIKE :search OR route_number ILIKE :search2 OR start_location ILIKE :search3 OR end_location ILIKE :search4)';
        params.search = `%${search}%`;
        params.search2 = `%${search}%`;
        params.search3 = `%${search}%`;
        params.search4 = `%${search}%`;
      }
      sql += ' ORDER BY created_at DESC';

      const routes = await safeQuery(sql, params);

      // Calculate summary
      const totalDistance = routes.reduce((sum: number, r: any) => sum + (Number(r.total_distance_km) || 0), 0);
      const summary = {
        totalRoutes: routes.length,
        activeRoutes: routes.filter((r: any) => r.status === 'active').length,
        totalDistance,
        avgDistance: routes.length > 0 ? Math.round(totalDistance / routes.length) : 0
      };

      return res.status(HttpStatus.OK).json(successResponse({ routes, summary }));
    } catch (e: any) {
      console.warn('[hq/fleet/routes] DB failed, fallback to mock:', e.message);
    }
  }

  // --- Mock fallback ---
  let routes = [...mockRoutes];
  if (status && status !== 'all') routes = routes.filter(r => r.status === status);
  if (vehicleId) routes = routes.filter(r => r.vehicleId === vehicleId);
  if (driverId) routes = routes.filter(r => r.driverId === driverId);
  if (origin) routes = routes.filter(r => r.origin.toLowerCase().includes((origin as string).toLowerCase()));
  if (destination) routes = routes.filter(r => r.destination.toLowerCase().includes((destination as string).toLowerCase()));
  if (search) {
    const searchStr = (search as string).toLowerCase();
    routes = routes.filter(r => 
      r.routeName?.toLowerCase().includes(searchStr) ||
      r.routeCode?.toLowerCase().includes(searchStr) ||
      r.origin?.toLowerCase().includes(searchStr) ||
      r.destination?.toLowerCase().includes(searchStr)
    );
  }
  const totalDistance = routes.reduce((sum, r) => sum + (r.distance || 0), 0);
  const summary = {
    totalRoutes: routes.length,
    activeRoutes: routes.filter(r => r.status === 'active').length,
    totalDistance,
    avgDistance: routes.length > 0 ? Math.round(totalDistance / routes.length) : 0
  };
  return res.status(HttpStatus.OK).json(successResponse({ routes, summary }));
}

async function createRoute(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  sanitizeBody(req);
  const errors = validateBody(req, {
    routeName: V.required().string().minLength(2).maxLength(200),
    origin: V.required().string(),
    destination: V.required().string(),
    distance: V.required().number().min(0.1),
  });
  if (errors) return res.status(HttpStatus.BAD_REQUEST).json(errors);

  const ctx = getTenantContext(req);
  const { routeName, routeCode, origin, destination, distance, estimatedDuration, waypoints, notes } = req.body;

  // --- Try real DB first ---
  if (FleetRoute) {
    try {
      const count = await FleetRoute.count({ where: ctx.tenantId ? { tenantId: ctx.tenantId } : {} });
      const route = await FleetRoute.create({
        tenantId: ctx.tenantId,
        routeNumber: routeCode || `RT-${String(count + 1).padStart(3, '0')}`,
        routeName,
        routeType: origin && destination ? `${origin} - ${destination}` : null,
        startLocation: origin,
        endLocation: destination,
        totalDistanceKm: distance,
        estimatedDurationMinutes: estimatedDuration || null,
        waypoints: waypoints || null,
        notes: notes || null,
        status: 'active'
      });
      await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'create', entityType: 'fleet_route', entityId: route.id, newValues: { routeName, origin, destination, distance }, req });
      return res.status(HttpStatus.CREATED).json(successResponse(route, undefined, 'Route created successfully'));
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to create route: ' + e.message));
    }
  }

  // --- Mock fallback ---
  const newRoute: any = {
    id: `route-${Date.now()}`,
    routeName,
    routeCode: routeCode || `RT-${Date.now()}`,
    origin,
    destination,
    distance,
    estimatedDuration,
    status: 'active',
    vehicleId: null,
    driverId: null,
    stops: waypoints || [],
    notes,
    createdAt: new Date().toISOString()
  };
  mockRoutes.push(newRoute);
  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'create', entityType: 'fleet_route', entityId: newRoute.id, newValues: { routeName, origin, destination, distance }, req });
  return res.status(HttpStatus.CREATED).json(successResponse(newRoute, undefined, 'Route created successfully'));
}

async function updateRoute(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  sanitizeBody(req);
  const ctx = getTenantContext(req);
  const { id, ...updates } = req.body;
  if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Route ID is required'));

  if (FleetRoute) {
    try {
      const route = await FleetRoute.findByPk(id, { where: ctx.tenantId ? { tenantId: ctx.tenantId } : {} });
      if (!route) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Route not found'));
      const oldValues = { ...route.toJSON() };

      // Map frontend fields to DB fields if needed
      const dbUpdates: any = { ...updates };
      if (updates.origin !== undefined) { dbUpdates.startLocation = updates.origin; delete dbUpdates.origin; }
      if (updates.destination !== undefined) { dbUpdates.endLocation = updates.destination; delete dbUpdates.destination; }
      if (updates.distance !== undefined) { dbUpdates.totalDistanceKm = updates.distance; delete dbUpdates.distance; }
      if (updates.estimatedDuration !== undefined) { dbUpdates.estimatedDurationMinutes = updates.estimatedDuration; delete dbUpdates.estimatedDuration; }
      if (updates.routeCode !== undefined) { dbUpdates.routeNumber = updates.routeCode; delete dbUpdates.routeCode; }
      if (updates.stops !== undefined) { dbUpdates.waypoints = updates.stops; delete dbUpdates.stops; }

      await route.update(dbUpdates);
      await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'update', entityType: 'fleet_route', entityId: id, oldValues, newValues: updates, req });
      return res.status(HttpStatus.OK).json(successResponse(route, undefined, 'Route updated successfully'));
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Update failed: ' + e.message));
    }
  }

  // --- Mock fallback ---
  const routeIndex = mockRoutes.findIndex(r => r.id === id);
  if (routeIndex === -1) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Route not found'));
  const oldValues = { ...mockRoutes[routeIndex] };
  Object.assign(mockRoutes[routeIndex], updates);
  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'update', entityType: 'fleet_route', entityId: id, oldValues, newValues: updates, req });
  return res.status(HttpStatus.OK).json(successResponse(mockRoutes[routeIndex], undefined, 'Route updated successfully'));
}

async function deleteRoute(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  const ctx = getTenantContext(req);
  const { id } = req.body;
  if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Route ID is required'));

  if (FleetRoute) {
    try {
      const route = await FleetRoute.findByPk(id, { where: ctx.tenantId ? { tenantId: ctx.tenantId } : {} });
      if (!route) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Route not found'));
      const deleted = { ...route.toJSON() };
      await route.destroy();
      await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'delete', entityType: 'fleet_route', entityId: id, oldValues: deleted, req });
      return res.status(HttpStatus.OK).json(successResponse(null, undefined, 'Route deleted successfully'));
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Delete failed: ' + e.message));
    }
  }

  // --- Mock fallback ---
  const routeIndex = mockRoutes.findIndex(r => r.id === id);
  if (routeIndex === -1) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Route not found'));
  const deleted = mockRoutes[routeIndex];
  mockRoutes.splice(routeIndex, 1);
  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'delete', entityType: 'fleet_route', entityId: id, oldValues: deleted, req });
  return res.status(HttpStatus.OK).json(successResponse(null, undefined, 'Route deleted successfully'));
}
