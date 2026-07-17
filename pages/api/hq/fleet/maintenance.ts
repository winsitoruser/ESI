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
let FleetMaintenanceSchedule: any = null;
try {
  const models = require('../../../../models');
  FleetMaintenanceSchedule = models.FleetMaintenanceSchedule;
} catch {}

const safeQuery = async (sql: string, params: any = {}): Promise<any[]> => {
  if (!sequelize?.query) return [];
  try {
    const [rows] = await sequelize.query(sql, { replacements: params });
    return rows || [];
  } catch (e: any) {
    console.warn('[hq/fleet/maintenance] DB query failed:', e?.message || e);
    return [];
  }
};

// Mock maintenance data
const mockMaintenanceRecords: any[] = [
  {
    id: 'maint-1',
    vehicleId: 'veh-1',
    vehicleLicensePlate: 'B 1234 ABC',
    maintenanceType: 'scheduled',
    serviceType: 'oil_change',
    description: 'Ganti oli mesin dan filter',
    scheduledDate: '2026-02-25',
    completedDate: '2026-02-25',
    status: 'completed',
    cost: 500000,
    mileage: 45000,
    workshop: 'Auto Service Center',
    technician: 'Ahmad',
    notes: 'Semua normal',
    createdAt: '2026-02-20T10:00:00Z'
  },
  {
    id: 'maint-2',
    vehicleId: 'veh-2',
    vehicleLicensePlate: 'B 5678 DEF',
    maintenanceType: 'repair',
    serviceType: 'brake_repair',
    description: 'Perbaikan rem depan',
    scheduledDate: '2026-02-26',
    completedDate: null,
    status: 'in_progress',
    cost: 1200000,
    mileage: 52000,
    workshop: 'Brake Specialist',
    technician: 'Budi',
    notes: 'Ganti kampas rem',
    createdAt: '2026-02-24T14:00:00Z'
  }
];

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return getMaintenanceRecords(req, res);
      case 'POST':
        return createMaintenanceRecord(req, res);
      case 'PUT':
        return updateMaintenanceRecord(req, res);
      case 'DELETE':
        return deleteMaintenanceRecord(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
          errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
        );
    }
  } catch (error) {
    console.warn('Fleet Maintenance API Error: (table may not exist):', (error as any)?.message || error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Internal server error')
    );
  }
}

export default withHQAuth(handler, { module: 'fleet' });

async function getMaintenanceRecords(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  const tenantId = (session?.user as any)?.tenantId || null;
  const { vehicleId, status, maintenanceType, startDate, endDate, search } = req.query;

  // --- Try real DB first ---
  const hasDb = FleetMaintenanceSchedule && sequelize;
  if (hasDb) {
    try {
      const { Op } = require('sequelize');
      const where: any = {};
      if (tenantId) where.tenantId = tenantId;
      if (vehicleId) where.vehicleId = vehicleId;
      if (status && status !== 'all') where.status = status;
      if (maintenanceType && maintenanceType !== 'all') where.maintenanceType = maintenanceType;
      if (startDate || endDate) {
        where.nextServiceDate = {};
        if (startDate) where.nextServiceDate[Op.gte] = startDate;
        if (endDate) where.nextServiceDate[Op.lte] = endDate;
      }
      if (search) {
        where[Op.or] = [
          { maintenanceType: { [Op.iLike]: `%${search}%` } },
          { notes: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const records = await FleetMaintenanceSchedule.findAll({ where, order: [['createdAt', 'DESC']] });

      // Calculate summary
      const totalCost = records.reduce((sum: number, r: any) => sum + Number(r.actualCost || r.estimatedCost || 0), 0);
      const summary = {
        totalRecords: records.length,
        scheduled: records.filter((r: any) => r.status === 'active' || r.status === 'scheduled').length,
        inProgress: records.filter((r: any) => r.status === 'in_progress').length,
        completed: records.filter((r: any) => r.status === 'completed').length,
        totalCost
      };

      return res.status(HttpStatus.OK).json(successResponse({ records, summary }));
    } catch (e: any) {
      console.warn('[hq/fleet/maintenance] DB failed, fallback to mock:', e.message);
    }
  }

  // --- Mock fallback ---
  let records = [...mockMaintenanceRecords];
  if (vehicleId) records = records.filter(r => r.vehicleId === vehicleId);
  if (status && status !== 'all') records = records.filter(r => r.status === status);
  if (maintenanceType && maintenanceType !== 'all') records = records.filter(r => r.maintenanceType === maintenanceType);
  if (startDate) records = records.filter(r => r.scheduledDate >= startDate);
  if (endDate) records = records.filter(r => r.scheduledDate <= endDate);
  if (search) {
    const searchStr = (search as string).toLowerCase();
    records = records.filter(r => 
      r.vehicleLicensePlate?.toLowerCase().includes(searchStr) ||
      r.description?.toLowerCase().includes(searchStr) ||
      r.workshop?.toLowerCase().includes(searchStr)
    );
  }
  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);
  const summary = {
    totalRecords: records.length,
    scheduled: records.filter(r => r.status === 'scheduled').length,
    inProgress: records.filter(r => r.status === 'in_progress').length,
    completed: records.filter(r => r.status === 'completed').length,
    totalCost
  };
  return res.status(HttpStatus.OK).json(successResponse({ records, summary }));
}

async function createMaintenanceRecord(req: NextApiRequest, res: NextApiResponse) {
  if (!(await checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  sanitizeBody(req);
  const errors = validateBody(req, {
    vehicleId: V.required().string(),
    maintenanceType: V.required().oneOf(['scheduled', 'repair', 'inspection', 'emergency']),
    serviceType: V.required().string(),
    scheduledDate: V.required().date(),
    cost: V.optional().number().min(0),
  });
  if (errors) return res.status(HttpStatus.BAD_REQUEST).json(errors);

  const ctx = getTenantContext(req);
  const { vehicleId, maintenanceType, serviceType, description, scheduledDate, cost, mileage, workshop, technician, notes } = req.body;

  // --- Try real DB first ---
  if (FleetMaintenanceSchedule) {
    try {
      const record = await FleetMaintenanceSchedule.create({
        tenantId: ctx.tenantId,
        vehicleId,
        maintenanceType,
        intervalType: maintenanceType === 'scheduled' ? 'kilometer' : null,
        nextServiceDate: new Date(scheduledDate),
        nextServiceOdometer: mileage || null,
        estimatedCost: cost || null,
        notes: notes || description || null,
        status: 'active'
      });
      await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'create', entityType: 'fleet_maintenance', entityId: record.id, newValues: { vehicleId, maintenanceType, serviceType, cost }, req });
      return res.status(HttpStatus.CREATED).json(successResponse(record, undefined, 'Maintenance record created successfully'));
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to create maintenance record: ' + e.message));
    }
  }

  // --- Mock fallback ---
  const newRecord: any = {
    id: `maint-${Date.now()}`,
    vehicleId,
    maintenanceType,
    serviceType,
    description,
    scheduledDate,
    completedDate: null,
    status: 'scheduled',
    cost,
    mileage,
    workshop,
    technician,
    notes,
    createdAt: new Date().toISOString()
  };
  mockMaintenanceRecords.push(newRecord);
  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'create', entityType: 'fleet_maintenance', entityId: newRecord.id, newValues: { vehicleId, maintenanceType, serviceType, cost }, req });
  return res.status(HttpStatus.CREATED).json(successResponse(newRecord, undefined, 'Maintenance record created successfully'));
}

async function updateMaintenanceRecord(req: NextApiRequest, res: NextApiResponse) {
  if (!(await checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  sanitizeBody(req);
  const ctx = getTenantContext(req);
  const { id, ...updates } = req.body;
  if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Maintenance record ID is required'));

  if (FleetMaintenanceSchedule) {
    try {
      const record = await FleetMaintenanceSchedule.findByPk(id, { where: ctx.tenantId ? { tenantId: ctx.tenantId } : {} });
      if (!record) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Maintenance record not found'));
      const oldValues = { ...record.toJSON() };

      // Map frontend fields to DB fields
      const dbUpdates: any = { ...updates };
      if (updates.scheduledDate !== undefined) { dbUpdates.nextServiceDate = new Date(updates.scheduledDate); delete dbUpdates.scheduledDate; }
      if (updates.cost !== undefined) { dbUpdates.estimatedCost = updates.cost; delete dbUpdates.cost; }
      if (updates.mileage !== undefined) { dbUpdates.nextServiceOdometer = updates.mileage; delete dbUpdates.mileage; }
      if (updates.description !== undefined) { dbUpdates.notes = updates.description; delete dbUpdates.description; }
      if (updates.completedDate !== undefined) {
        dbUpdates.lastServiceDate = new Date(updates.completedDate);
        dbUpdates.actualCost = updates.cost || record.estimatedCost;
        if (updates.status === 'completed' || updates.status === undefined) dbUpdates.status = 'completed';
        delete dbUpdates.completedDate;
      }

      await record.update(dbUpdates);
      await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'update', entityType: 'fleet_maintenance', entityId: id, oldValues, newValues: updates, req });
      return res.status(HttpStatus.OK).json(successResponse(record, undefined, 'Maintenance record updated successfully'));
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Update failed: ' + e.message));
    }
  }

  // --- Mock fallback ---
  const recordIndex = mockMaintenanceRecords.findIndex(r => r.id === id);
  if (recordIndex === -1) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Maintenance record not found'));
  const oldValues = { ...mockMaintenanceRecords[recordIndex] };
  Object.assign(mockMaintenanceRecords[recordIndex], updates);
  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'update', entityType: 'fleet_maintenance', entityId: id, oldValues, newValues: updates, req });
  return res.status(HttpStatus.OK).json(successResponse(mockMaintenanceRecords[recordIndex], undefined, 'Maintenance record updated successfully'));
}

async function deleteMaintenanceRecord(req: NextApiRequest, res: NextApiResponse) {
  if (!(await checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  const ctx = getTenantContext(req);
  const { id } = req.body;
  if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Maintenance record ID is required'));

  if (FleetMaintenanceSchedule) {
    try {
      const record = await FleetMaintenanceSchedule.findByPk(id, { where: ctx.tenantId ? { tenantId: ctx.tenantId } : {} });
      if (!record) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Maintenance record not found'));
      const deleted = { ...record.toJSON() };
      await record.destroy();
      await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'delete', entityType: 'fleet_maintenance', entityId: id, oldValues: deleted, req });
      return res.status(HttpStatus.OK).json(successResponse(null, undefined, 'Maintenance record deleted successfully'));
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Delete failed: ' + e.message));
    }
  }

  // --- Mock fallback ---
  const recordIndex = mockMaintenanceRecords.findIndex(r => r.id === id);
  if (recordIndex === -1) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Maintenance record not found'));
  const deleted = mockMaintenanceRecords[recordIndex];
  mockMaintenanceRecords.splice(recordIndex, 1);
  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'delete', entityType: 'fleet_maintenance', entityId: id, oldValues: deleted, req });
  return res.status(HttpStatus.OK).json(successResponse(null, undefined, 'Maintenance record deleted successfully'));
}
