import { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { getTenantContext } from '../../../../lib/middleware/tenantIsolation';
import { logAudit } from '../../../../lib/audit/auditLogger';
import { validateBody, V, sanitizeBody } from '../../../../lib/middleware/withValidation';
import { checkLimit, RateLimitTier } from '../../../../lib/middleware/rateLimit';
import { 
  mockVehicles, 
  createMockVehicle,
  MockVehicle 
} from '../../../../lib/mockData/fleet';

// DB models & helpers
let sequelize: any = null;
try { sequelize = require('../../../../lib/sequelize'); } catch {}
let FleetVehicle: any = null;
try {
  const models = require('../../../../models');
  FleetVehicle = models.FleetVehicle;
} catch {}

const safeQuery = async (sql: string, params: any = {}): Promise<any[]> => {
  if (!sequelize?.query) return [];
  try {
    const [rows] = await sequelize.query(sql, { replacements: params });
    return rows || [];
  } catch (e: any) {
    console.warn('[hq/fleet/vehicles] DB query failed:', e?.message || e);
    return [];
  }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return getVehicles(req, res);
      case 'POST':
        return createVehicle(req, res);
      case 'PUT':
        return updateVehicle(req, res);
      case 'DELETE':
        return deleteVehicle(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
          errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
        );
    }
  } catch (error) {
    console.warn('Fleet Vehicles API Error: (table may not exist):', (error as any)?.message || error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Internal server error')
    );
  }
}

export default withHQAuth(handler, { module: 'fleet' });

async function getVehicles(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  const tenantId = (session?.user as any)?.tenantId || null;
  const { status, type, branch, search } = req.query;

  // --- Try real DB first ---
  const hasDb = FleetVehicle && sequelize;
  if (hasDb) {
    try {
      const { Op } = require('sequelize');
      const where: any = {};
      if (tenantId) where.tenantId = tenantId;
      if (status && status !== 'all') where.status = status;
      if (type && type !== 'all') where.vehicleType = type;
      if (branch && branch !== 'all') where.assignedBranchId = branch;
      if (search) {
        where[Op.or] = [
          { licensePlate: { [Op.iLike]: `%${search}%` } },
          { brand: { [Op.iLike]: `%${search}%` } },
          { model: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const vehicles = await FleetVehicle.findAll({ where, order: [['createdAt', 'DESC']] });

      // Stats from DB
      const allWhere: any = {};
      if (tenantId) allWhere.tenantId = tenantId;
      const allVehicles = await FleetVehicle.findAll({ where: allWhere, attributes: ['id', 'status', 'assignedDriverId'] });
      const stats = {
        total: allVehicles.length,
        active: allVehicles.filter((v: any) => v.status === 'active').length,
        maintenance: allVehicles.filter((v: any) => v.status === 'maintenance').length,
        onRoute: allVehicles.filter((v: any) => v.status === 'active' && v.assignedDriverId).length,
        inactive: allVehicles.filter((v: any) => v.status === 'inactive').length
      };

      return res.status(HttpStatus.OK).json(successResponse({ vehicles, stats }));
    } catch (e: any) {
      console.warn('[hq/fleet/vehicles] DB failed, fallback to mock:', e.message);
    }
  }

  // --- Mock fallback ---
  let vehicles = [...mockVehicles];
  if (status && status !== 'all') vehicles = vehicles.filter(v => v.status === status);
  if (type && type !== 'all') vehicles = vehicles.filter(v => v.vehicleType === type);
  if (branch && branch !== 'all') vehicles = vehicles.filter(v => v.assignedBranchId === branch);
  if (search) {
    const s = (search as string).toLowerCase();
    vehicles = vehicles.filter(v => v.licensePlate.toLowerCase().includes(s) || v.brand?.toLowerCase().includes(s) || v.model?.toLowerCase().includes(s));
  }
  const stats = {
    total: mockVehicles.length,
    active: mockVehicles.filter(v => v.status === 'active').length,
    maintenance: mockVehicles.filter(v => v.status === 'maintenance').length,
    onRoute: mockVehicles.filter(v => v.status === 'active' && v.assignedDriverId).length,
    inactive: mockVehicles.filter(v => v.status === 'inactive').length
  };
  return res.status(HttpStatus.OK).json(successResponse({ vehicles, stats }));
}

async function createVehicle(req: NextApiRequest, res: NextApiResponse) {
  if (!(await checkLimit(req, res, RateLimitTier.SENSITIVE))) return;
  sanitizeBody(req);
  const errors = validateBody(req, {
    licensePlate: V.required().string().minLength(3).maxLength(20),
    vehicleType: V.required().oneOf(['truck', 'van', 'pickup', 'motorcycle', 'car', 'bus']),
  });
  if (errors) return res.status(HttpStatus.BAD_REQUEST).json(errors);

  const ctx = getTenantContext(req);
  const { licensePlate, vehicleType, brand, model, year, color, ownershipType, purchaseDate, purchasePrice, maxWeightKg, maxVolumeM3, fuelTankCapacity, registrationNumber, registrationExpiry, insurancePolicyNumber, insuranceProvider, insuranceExpiry, assignedBranchId, notes } = req.body;

  // --- Try real DB first ---
  if (FleetVehicle) {
    try {
      const existing = await FleetVehicle.findOne({ where: { licensePlate } });
      if (existing) {
        return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.DUPLICATE_ENTRY, 'Vehicle with this license plate already exists'));
      }
      const count = await FleetVehicle.count({ where: ctx.tenantId ? { tenantId: ctx.tenantId } : {} });
      const vehicle = await FleetVehicle.create({
        tenantId: ctx.tenantId,
        vehicleNumber: `VH-${String(count + 1).padStart(3, '0')}`,
        licensePlate, vehicleType, brand, model, year, color, ownershipType,
        purchaseDate: purchaseDate || null, purchasePrice: purchasePrice || null,
        maxWeightKg: maxWeightKg || 0, maxVolumeM3: maxVolumeM3 || 0,
        fuelTankCapacity: fuelTankCapacity || 0, registrationNumber, registrationExpiry,
        insurancePolicyNumber, insuranceProvider, insuranceExpiry,
        assignedBranchId: assignedBranchId || null, notes, status: 'active'
      });
      await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'create', entityType: 'fleet_vehicle', entityId: vehicle.id, newValues: { licensePlate, vehicleType, brand, model }, req });
      return res.status(HttpStatus.CREATED).json(successResponse(vehicle, undefined, 'Vehicle created successfully'));
    } catch (e: any) {
      if (e.name === 'SequelizeUniqueConstraintError') return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.DUPLICATE_ENTRY, 'Duplicate vehicle'));
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to create vehicle: ' + e.message));
    }
  }

  // --- Mock fallback ---
  const existing = mockVehicles.find(v => v.licensePlate === licensePlate);
  if (existing) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.DUPLICATE_ENTRY, 'Vehicle with this license plate already exists'));
  const newVehicle = createMockVehicle({ licensePlate, vehicleType, brand, model, year, color, ownershipType, purchaseDate, purchasePrice, maxWeightKg, maxVolumeM3, fuelTankCapacity, registrationNumber, registrationExpiry, insurancePolicyNumber, insuranceProvider, insuranceExpiry, assignedBranchId, notes });
  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'create', entityType: 'fleet_vehicle', entityId: newVehicle.id, newValues: { licensePlate, vehicleType, brand, model }, req });
  return res.status(HttpStatus.CREATED).json(successResponse(newVehicle, undefined, 'Vehicle created successfully'));
}

async function updateVehicle(req: NextApiRequest, res: NextApiResponse) {
  if (!(await checkLimit(req, res, RateLimitTier.SENSITIVE))) return;
  sanitizeBody(req);
  const ctx = getTenantContext(req);
  const { id, ...updates } = req.body;
  if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Vehicle ID is required'));

  if (FleetVehicle) {
    try {
      const vehicle = await FleetVehicle.findByPk(id, { where: ctx.tenantId ? { tenantId: ctx.tenantId } : {} });
      if (!vehicle) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Vehicle not found'));
      const oldValues = { ...vehicle.toJSON() };
      await vehicle.update(updates);
      await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'update', entityType: 'fleet_vehicle', entityId: id, oldValues, newValues: updates, req });
      return res.status(HttpStatus.OK).json(successResponse(vehicle, undefined, 'Vehicle updated successfully'));
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Update failed: ' + e.message));
    }
  }

  // --- Mock fallback ---
  const vehicleIndex = mockVehicles.findIndex(v => v.id === id);
  if (vehicleIndex === -1) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Vehicle not found'));
  const oldValues = { ...mockVehicles[vehicleIndex] };
  Object.assign(mockVehicles[vehicleIndex], updates);
  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'update', entityType: 'fleet_vehicle', entityId: id, oldValues, newValues: updates, req });
  return res.status(HttpStatus.OK).json(successResponse(mockVehicles[vehicleIndex], undefined, 'Vehicle updated successfully'));
}

async function deleteVehicle(req: NextApiRequest, res: NextApiResponse) {
  if (!(await checkLimit(req, res, RateLimitTier.SENSITIVE))) return;
  const ctx = getTenantContext(req);
  const { id } = req.body;
  if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Vehicle ID is required'));

  if (FleetVehicle) {
    try {
      const vehicle = await FleetVehicle.findByPk(id, { where: ctx.tenantId ? { tenantId: ctx.tenantId } : {} });
      if (!vehicle) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Vehicle not found'));
      const deleted = { ...vehicle.toJSON() };
      await vehicle.destroy();
      await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'delete', entityType: 'fleet_vehicle', entityId: id, oldValues: deleted, req });
      return res.status(HttpStatus.OK).json(successResponse(null, undefined, 'Vehicle deleted successfully'));
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Delete failed: ' + e.message));
    }
  }

  // --- Mock fallback ---
  const vehicleIndex = mockVehicles.findIndex(v => v.id === id);
  if (vehicleIndex === -1) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Vehicle not found'));
  const deleted = mockVehicles[vehicleIndex];
  mockVehicles.splice(vehicleIndex, 1);
  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'delete', entityType: 'fleet_vehicle', entityId: id, oldValues: deleted, req });
  return res.status(HttpStatus.OK).json(successResponse(null, undefined, 'Vehicle deleted successfully'));
}
