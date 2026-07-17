import { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { getTenantContext } from '../../../../lib/middleware/tenantIsolation';
import { logAudit } from '../../../../lib/audit/auditLogger';
import { validateBody, V, sanitizeBody } from '../../../../lib/middleware/withValidation';
import { checkLimit, RateLimitTier } from '../../../../lib/middleware/rateLimit';
import { 
  mockDrivers, 
  createMockDriver,
  MockDriver 
} from '../../../../lib/mockData/fleet';

// DB models & helpers
let sequelize: any = null;
try { sequelize = require('../../../../lib/sequelize'); } catch {}
let FleetDriver: any = null;
try {
  const models = require('../../../../models');
  FleetDriver = models.FleetDriver;
} catch {}

const safeQuery = async (sql: string, params: any = {}): Promise<any[]> => {
  if (!sequelize?.query) return [];
  try {
    const [rows] = await sequelize.query(sql, { replacements: params });
    return rows || [];
  } catch (e: any) {
    console.warn('[hq/fleet/drivers] DB query failed:', e?.message || e);
    return [];
  }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return getDrivers(req, res);
      case 'POST':
        return createDriver(req, res);
      case 'PUT':
        return updateDriver(req, res);
      case 'DELETE':
        return deleteDriver(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
          errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
        );
    }
  } catch (error) {
    console.warn('Fleet Drivers API Error: (table may not exist):', (error as any)?.message || error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Internal server error')
    );
  }
}

export default withHQAuth(handler, { module: 'fleet' });

async function getDrivers(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  const tenantId = (session?.user as any)?.tenantId || null;
  const { status, availability, branch, search } = req.query;

  // --- Try real DB first ---
  const hasDb = FleetDriver && sequelize;
  if (hasDb) {
    try {
      const { Op } = require('sequelize');
      const where: any = {};
      if (tenantId) where.tenantId = tenantId;
      if (status && status !== 'all') where.status = status;
      if (availability && availability !== 'all') where.availabilityStatus = availability;
      if (branch && branch !== 'all') where.assignedBranchId = branch;
      if (search) {
        where[Op.or] = [
          { fullName: { [Op.iLike]: `%${search}%` } },
          { licenseNumber: { [Op.iLike]: `%${search}%` } },
          { phone: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const drivers = await FleetDriver.findAll({ where, order: [['createdAt', 'DESC']] });

      // Stats from DB
      const allWhere: any = {};
      if (tenantId) allWhere.tenantId = tenantId;
      const allDrivers = await FleetDriver.findAll({ where: allWhere, attributes: ['id', 'status', 'availabilityStatus'] });
      const stats = {
        total: allDrivers.length,
        active: allDrivers.filter((d: any) => d.status === 'active').length,
        available: allDrivers.filter((d: any) => d.availabilityStatus === 'available').length,
        onDuty: allDrivers.filter((d: any) => d.availabilityStatus === 'on_duty').length,
        onLeave: allDrivers.filter((d: any) => d.availabilityStatus === 'on_leave').length
      };

      return res.status(HttpStatus.OK).json(successResponse({ drivers, stats }));
    } catch (e: any) {
      console.warn('[hq/fleet/drivers] DB failed, fallback to mock:', e.message);
    }
  }

  // --- Mock fallback ---
  let drivers = [...mockDrivers];
  if (status && status !== 'all') drivers = drivers.filter(d => d.status === status);
  if (availability && availability !== 'all') drivers = drivers.filter(d => d.availabilityStatus === availability);
  if (branch && branch !== 'all') drivers = drivers.filter(d => d.assignedBranchId === branch);
  if (search) {
    const searchStr = (search as string).toLowerCase();
    drivers = drivers.filter(d => 
      d.fullName.toLowerCase().includes(searchStr) ||
      d.licenseNumber.toLowerCase().includes(searchStr) ||
      d.phone?.toLowerCase().includes(searchStr)
    );
  }
  const stats = {
    total: mockDrivers.length,
    active: mockDrivers.filter(d => d.status === 'active').length,
    available: mockDrivers.filter(d => d.availabilityStatus === 'available').length,
    onDuty: mockDrivers.filter(d => d.availabilityStatus === 'on_duty').length,
    onLeave: mockDrivers.filter(d => d.availabilityStatus === 'on_leave').length
  };
  return res.status(HttpStatus.OK).json(successResponse({ drivers, stats }));
}

async function createDriver(req: NextApiRequest, res: NextApiResponse) {
  if (!(await checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  sanitizeBody(req);
  const errors = validateBody(req, {
    fullName: V.required().string().minLength(2).maxLength(100),
    licenseNumber: V.required().string().minLength(3),
    licenseType: V.required().oneOf(['A', 'B1', 'B2', 'C', 'D']),
  });
  if (errors) return res.status(HttpStatus.BAD_REQUEST).json(errors);

  const ctx = getTenantContext(req);
  const {
    fullName, phone, email, address, dateOfBirth,
    licenseNumber, licenseType, licenseIssueDate, licenseExpiryDate,
    employmentType, hireDate, assignedBranchId, notes
  } = req.body;

  // --- Try real DB first ---
  if (FleetDriver) {
    try {
      const existing = await FleetDriver.findOne({ where: { licenseNumber } });
      if (existing) {
        return res.status(HttpStatus.BAD_REQUEST).json(
          errorResponse(ErrorCodes.DUPLICATE_ENTRY, 'Driver with this license number already exists')
        );
      }
      const count = await FleetDriver.count({ where: ctx.tenantId ? { tenantId: ctx.tenantId } : {} });
      const driver = await FleetDriver.create({
        tenantId: ctx.tenantId,
        driverNumber: `DRV-${String(count + 1).padStart(3, '0')}`,
        fullName, phone, email, address, dateOfBirth,
        licenseNumber, licenseType, licenseIssueDate, licenseExpiryDate,
        employmentType, hireDate, assignedBranchId: assignedBranchId || null,
        notes, status: 'active', availabilityStatus: 'available'
      });
      await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'create', entityType: 'fleet_driver', entityId: driver.id, newValues: { fullName, licenseNumber, licenseType }, req });
      return res.status(HttpStatus.CREATED).json(successResponse(driver, undefined, 'Driver created successfully'));
    } catch (e: any) {
      if (e.name === 'SequelizeUniqueConstraintError') return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.DUPLICATE_ENTRY, 'Duplicate driver'));
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to create driver: ' + e.message));
    }
  }

  // --- Mock fallback ---
  const existing = mockDrivers.find(d => d.licenseNumber === licenseNumber);
  if (existing) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      errorResponse(ErrorCodes.DUPLICATE_ENTRY, 'Driver with this license number already exists')
    );
  }
  const newDriver = createMockDriver({
    fullName, phone, email, address, dateOfBirth,
    licenseNumber, licenseType, licenseIssueDate, licenseExpiryDate,
    employmentType, hireDate, assignedBranchId, notes
  });
  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'create', entityType: 'fleet_driver', entityId: newDriver.id, newValues: { fullName, licenseNumber, licenseType }, req });
  return res.status(HttpStatus.CREATED).json(successResponse(newDriver, undefined, 'Driver created successfully'));
}

async function updateDriver(req: NextApiRequest, res: NextApiResponse) {
  if (!(await checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  sanitizeBody(req);
  const ctx = getTenantContext(req);
  const { id, ...updates } = req.body;
  if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Driver ID is required'));

  if (FleetDriver) {
    try {
      const driver = await FleetDriver.findByPk(id, { where: ctx.tenantId ? { tenantId: ctx.tenantId } : {} });
      if (!driver) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Driver not found'));
      const oldValues = { ...driver.toJSON() };
      await driver.update(updates);
      await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'update', entityType: 'fleet_driver', entityId: id, oldValues, newValues: updates, req });
      return res.status(HttpStatus.OK).json(successResponse(driver, undefined, 'Driver updated successfully'));
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Update failed: ' + e.message));
    }
  }

  // --- Mock fallback ---
  const driverIndex = mockDrivers.findIndex(d => d.id === id);
  if (driverIndex === -1) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Driver not found'));
  const oldValues = { ...mockDrivers[driverIndex] };
  Object.assign(mockDrivers[driverIndex], updates);
  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'update', entityType: 'fleet_driver', entityId: id, oldValues, newValues: updates, req });
  return res.status(HttpStatus.OK).json(successResponse(mockDrivers[driverIndex], undefined, 'Driver updated successfully'));
}

async function deleteDriver(req: NextApiRequest, res: NextApiResponse) {
  if (!(await checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  const ctx = getTenantContext(req);
  const { id } = req.body;
  if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Driver ID is required'));

  if (FleetDriver) {
    try {
      const driver = await FleetDriver.findByPk(id, { where: ctx.tenantId ? { tenantId: ctx.tenantId } : {} });
      if (!driver) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Driver not found'));
      const deleted = { ...driver.toJSON() };
      await driver.destroy();
      await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'delete', entityType: 'fleet_driver', entityId: id, oldValues: deleted, req });
      return res.status(HttpStatus.OK).json(successResponse(null, undefined, 'Driver deleted successfully'));
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Delete failed: ' + e.message));
    }
  }

  // --- Mock fallback ---
  const driverIndex = mockDrivers.findIndex(d => d.id === id);
  if (driverIndex === -1) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Driver not found'));
  const deleted = mockDrivers[driverIndex];
  mockDrivers.splice(driverIndex, 1);
  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'delete', entityType: 'fleet_driver', entityId: id, oldValues: deleted, req });
  return res.status(HttpStatus.OK).json(successResponse(null, undefined, 'Driver deleted successfully'));
}
