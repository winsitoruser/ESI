import { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { getTenantContext } from '../../../../lib/middleware/tenantIsolation';
import { logAudit } from '../../../../lib/audit/auditLogger';
import { validateBody, V, sanitizeBody } from '../../../../lib/middleware/withValidation';
import { checkLimit, RateLimitTier } from '../../../../lib/middleware/rateLimit';

// Mock tracking data
const mockTrackingData: any[] = [
  {
    id: 'track-1',
    vehicleId: 'veh-1',
    vehicleLicensePlate: 'B 1234 ABC',
    driverId: 'drv-1',
    driverName: 'Ahmad Wijaya',
    latitude: -6.2088,
    longitude: 106.8456,
    speed: 60,
    heading: 90,
    status: 'moving',
    lastUpdate: '2026-02-26T09:30:00Z',
    routeId: 'route-1',
    routeName: 'Jakarta - Bandung'
  },
  {
    id: 'track-2',
    vehicleId: 'veh-2',
    vehicleLicensePlate: 'B 5678 DEF',
    driverId: 'drv-2',
    driverName: 'Budi Santoso',
    latitude: -6.9175,
    longitude: 107.6191,
    speed: 0,
    heading: 0,
    status: 'stopped',
    lastUpdate: '2026-02-26T09:25:00Z',
    routeId: 'route-2',
    routeName: 'Jakarta - Surabaya'
  }
];

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return getTrackingData(req, res);
      case 'POST':
        return updateTrackingData(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
          errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
        );
    }
  } catch (error) {
    console.error('Fleet Tracking API Error:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Internal server error')
    );
  }
}

export default withHQAuth(handler, { module: 'fleet' });

async function getTrackingData(req: NextApiRequest, res: NextApiResponse) {
  const { vehicleId, driverId, status, routeId } = req.query;

  let tracking = [...mockTrackingData];

  // Apply filters
  if (vehicleId) {
    tracking = tracking.filter(t => t.vehicleId === vehicleId);
  }
  if (driverId) {
    tracking = tracking.filter(t => t.driverId === driverId);
  }
  if (status && status !== 'all') {
    tracking = tracking.filter(t => t.status === status);
  }
  if (routeId) {
    tracking = tracking.filter(t => t.routeId === routeId);
  }

  // Calculate summary
  const summary = {
    totalVehicles: tracking.length,
    moving: tracking.filter(t => t.status === 'moving').length,
    stopped: tracking.filter(t => t.status === 'stopped').length,
    idle: tracking.filter(t => t.status === 'idle').length,
    avgSpeed: tracking.length > 0 
      ? Math.round(tracking.reduce((sum, t) => sum + (t.speed || 0), 0) / tracking.length)
      : 0
  };

  return res.status(HttpStatus.OK).json(
    successResponse({ tracking, summary })
  );
}

async function updateTrackingData(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.STANDARD)) return;
  sanitizeBody(req);
  const errors = validateBody(req, {
    vehicleId: V.required().string(),
    latitude: V.required().number().min(-90).max(90),
    longitude: V.required().number().min(-180).max(180),
  });
  if (errors) return res.status(HttpStatus.BAD_REQUEST).json(errors);

  const ctx = getTenantContext(req);
  const {
    vehicleId,
    latitude,
    longitude,
    speed,
    heading,
    status
  } = req.body;

  // Find existing tracking data
  const trackingIndex = mockTrackingData.findIndex(t => t.vehicleId === vehicleId);
  
  if (trackingIndex !== -1) {
    // Update existing
    Object.assign(mockTrackingData[trackingIndex], {
      latitude,
      longitude,
      speed: speed || 0,
      heading: heading || 0,
      status: status || 'moving',
      lastUpdate: new Date().toISOString()
    });

    return res.status(HttpStatus.OK).json(
      successResponse(mockTrackingData[trackingIndex], undefined, 'Tracking data updated successfully')
    );
  } else {
    // Create new
    const newTracking = {
      id: `track-${Date.now()}`,
      vehicleId,
      latitude,
      longitude,
      speed: speed || 0,
      heading: heading || 0,
      status: status || 'moving',
      lastUpdate: new Date().toISOString()
    };

    mockTrackingData.push(newTracking);

    return res.status(HttpStatus.CREATED).json(
      successResponse(newTracking, undefined, 'Tracking data created successfully')
    );
  }
}
