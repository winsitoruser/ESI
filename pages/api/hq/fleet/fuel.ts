import { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import { getTenantContext } from '../../../../lib/middleware/tenantIsolation';
import { logAudit } from '../../../../lib/audit/auditLogger';
import { validateBody, V, sanitizeBody } from '../../../../lib/middleware/withValidation';
import { checkLimit, RateLimitTier } from '../../../../lib/middleware/rateLimit';
import { mockFuelTransactions } from '../../../../lib/mockData/fleetAdvanced';

// DB models & helpers
let sequelize: any = null;
try { sequelize = require('../../../../lib/sequelize'); } catch {}
let FleetFuelTransaction: any = null;
try {
  const models = require('../../../../models');
  FleetFuelTransaction = models.FleetFuelTransaction;
} catch {}

const safeQuery = async (sql: string, params: any = {}): Promise<any[]> => {
  if (!sequelize?.query) return [];
  try {
    const [rows] = await sequelize.query(sql, { replacements: params });
    return rows || [];
  } catch (e: any) {
    console.warn('[hq/fleet/fuel] DB query failed:', e?.message || e);
    return [];
  }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return getFuelTransactions(req, res);
      case 'POST':
        return createFuelTransaction(req, res);
      case 'PUT':
        return updateFuelTransaction(req, res);
      case 'DELETE':
        return deleteFuelTransaction(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
          errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
        );
    }
  } catch (error) {
    console.error('Fleet Fuel API Error:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Internal server error')
    );
  }
}

export default withHQAuth(handler, { module: 'fleet' });

async function getFuelTransactions(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  const tenantId = (session?.user as any)?.tenantId || null;
  const { vehicleId, driverId, startDate, endDate, fuelType, search } = req.query;

  // --- Try real DB first ---
  const hasDb = FleetFuelTransaction && sequelize;
  if (hasDb) {
    try {
      const { Op } = require('sequelize');
      const where: any = {};
      if (tenantId) where.tenantId = tenantId;
      if (vehicleId) where.vehicleId = vehicleId;
      if (driverId) where.driverId = driverId;
      if (fuelType && fuelType !== 'all') where.fuelType = fuelType;
      if (startDate || endDate) {
        where.transactionDate = {};
        if (startDate) where.transactionDate[Op.gte] = new Date(startDate as string);
        if (endDate) where.transactionDate[Op.lte] = new Date(endDate as string);
      }
      if (search) {
        where[Op.or] = [
          { fuelStation: { [Op.iLike]: `%${search}%` } },
          { receiptNumber: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const transactions = await FleetFuelTransaction.findAll({ where, order: [['transactionDate', 'DESC']] });

      // Calculate summary
      const totalCost = transactions.reduce((sum: number, t: any) => sum + Number(t.totalCost || 0), 0);
      const totalLiters = transactions.reduce((sum: number, t: any) => sum + Number(t.quantityLiters || 0), 0);
      const avgPricePerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;
      const summary = {
        totalTransactions: transactions.length,
        totalCost,
        totalLiters,
        avgPricePerLiter: Math.round(avgPricePerLiter * 100) / 100
      };

      return res.status(HttpStatus.OK).json(successResponse({ transactions, summary }));
    } catch (e: any) {
      console.warn('[hq/fleet/fuel] DB failed, fallback to mock:', e.message);
    }
  }

  // --- Mock fallback ---
  let transactions = [...mockFuelTransactions];
  if (vehicleId) transactions = transactions.filter(t => t.vehicleId === vehicleId);
  if (driverId) transactions = transactions.filter(t => t.driverId === driverId);
  if (startDate) transactions = transactions.filter(t => t.transactionDate >= startDate);
  if (endDate) transactions = transactions.filter(t => t.transactionDate <= endDate);
  if (fuelType && fuelType !== 'all') transactions = transactions.filter(t => t.fuelType === fuelType);
  if (search) {
    const searchStr = (search as string).toLowerCase();
    transactions = transactions.filter(t => 
      t.vehicleId?.toLowerCase().includes(searchStr) ||
      t.driverId?.toLowerCase().includes(searchStr) ||
      t.fuelStation?.toLowerCase().includes(searchStr)
    );
  }
  const totalCost = transactions.reduce((sum, t) => sum + t.totalCost, 0);
  const totalLiters = transactions.reduce((sum, t) => sum + t.quantityLiters, 0);
  const avgPricePerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;
  const summary = {
    totalTransactions: transactions.length,
    totalCost,
    totalLiters,
    avgPricePerLiter: Math.round(avgPricePerLiter * 100) / 100
  };
  return res.status(HttpStatus.OK).json(successResponse({ transactions, summary }));
}

async function createFuelTransaction(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  sanitizeBody(req);
  const errors = validateBody(req, {
    vehicleId: V.required().string(),
    transactionDate: V.required().date(),
    fuelType: V.required().oneOf(['pertalite', 'pertamax', 'pertamax_turbo', 'solar', 'dexlite', 'pertamina_dex']),
    quantityLiters: V.required().number().min(0.1),
    totalCost: V.required().number().min(0),
  });
  if (errors) return res.status(HttpStatus.BAD_REQUEST).json(errors);

  const ctx = getTenantContext(req);
  const { vehicleId, driverId, transactionDate, fuelType, quantityLiters, pricePerLiter, totalCost, station, odometerReading, paymentMethod, receiptNumber, notes } = req.body;

  // --- Try real DB first ---
  if (FleetFuelTransaction) {
    try {
      const transaction = await FleetFuelTransaction.create({
        tenantId: ctx.tenantId,
        vehicleId,
        driverId: driverId || null,
        transactionType: 'refill',
        transactionDate: new Date(transactionDate),
        fuelStation: station || null,
        fuelType,
        quantityLiters,
        pricePerLiter: pricePerLiter || (totalCost / quantityLiters),
        totalCost,
        odometerReading: odometerReading || null,
        paymentMethod: paymentMethod || null,
        receiptNumber: receiptNumber || null,
        notes: notes || null
      });
      await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'create', entityType: 'fleet_fuel', entityId: transaction.id, newValues: { vehicleId, fuelType, quantityLiters, totalCost }, req });
      return res.status(HttpStatus.CREATED).json(successResponse(transaction, undefined, 'Fuel transaction created successfully'));
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Failed to create fuel transaction: ' + e.message));
    }
  }

  // --- Mock fallback ---
  const newTransaction: any = {
    id: `fuel-${Date.now()}`,
    vehicleId, driverId,
    transactionDate,
    transactionType: 'refuel',
    fuelType,
    quantityLiters,
    pricePerLiter: pricePerLiter || (totalCost / quantityLiters),
    totalCost,
    fuelStation: station || 'Unknown',
    paymentMethod: paymentMethod || 'cash',
    receiptNumber: receiptNumber || `RCP-${Date.now()}`,
    odometerReading,
    notes,
    createdAt: new Date().toISOString()
  };
  mockFuelTransactions.push(newTransaction);
  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'create', entityType: 'fleet_fuel', entityId: newTransaction.id, newValues: { vehicleId, fuelType, quantityLiters, totalCost }, req });
  return res.status(HttpStatus.CREATED).json(successResponse(newTransaction, undefined, 'Fuel transaction created successfully'));
}

async function updateFuelTransaction(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  sanitizeBody(req);
  const ctx = getTenantContext(req);
  const { id, ...updates } = req.body;
  if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Transaction ID is required'));

  if (FleetFuelTransaction) {
    try {
      const transaction = await FleetFuelTransaction.findByPk(id, { where: ctx.tenantId ? { tenantId: ctx.tenantId } : {} });
      if (!transaction) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Fuel transaction not found'));
      const oldValues = { ...transaction.toJSON() };

      // Map frontend fields to DB fields
      const dbUpdates: any = { ...updates };
      if (updates.station !== undefined) { dbUpdates.fuelStation = updates.station; delete dbUpdates.station; }

      await transaction.update(dbUpdates);
      await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'update', entityType: 'fleet_fuel', entityId: id, oldValues, newValues: updates, req });
      return res.status(HttpStatus.OK).json(successResponse(transaction, undefined, 'Fuel transaction updated successfully'));
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Update failed: ' + e.message));
    }
  }

  // --- Mock fallback ---
  const transactionIndex = mockFuelTransactions.findIndex(t => t.id === id);
  if (transactionIndex === -1) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Fuel transaction not found'));
  const oldValues = { ...mockFuelTransactions[transactionIndex] };
  Object.assign(mockFuelTransactions[transactionIndex], updates);
  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'update', entityType: 'fleet_fuel', entityId: id, oldValues, newValues: updates, req });
  return res.status(HttpStatus.OK).json(successResponse(mockFuelTransactions[transactionIndex], undefined, 'Fuel transaction updated successfully'));
}

async function deleteFuelTransaction(req: NextApiRequest, res: NextApiResponse) {
  if (!checkLimit(req, res, RateLimitTier.SENSITIVE)) return;
  const ctx = getTenantContext(req);
  const { id } = req.body;
  if (!id) return res.status(HttpStatus.BAD_REQUEST).json(errorResponse(ErrorCodes.MISSING_REQUIRED_FIELDS, 'Transaction ID is required'));

  if (FleetFuelTransaction) {
    try {
      const transaction = await FleetFuelTransaction.findByPk(id, { where: ctx.tenantId ? { tenantId: ctx.tenantId } : {} });
      if (!transaction) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Fuel transaction not found'));
      const deleted = { ...transaction.toJSON() };
      await transaction.destroy();
      await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'delete', entityType: 'fleet_fuel', entityId: id, oldValues: deleted, req });
      return res.status(HttpStatus.OK).json(successResponse(null, undefined, 'Fuel transaction deleted successfully'));
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Delete failed: ' + e.message));
    }
  }

  // --- Mock fallback ---
  const transactionIndex = mockFuelTransactions.findIndex(t => t.id === id);
  if (transactionIndex === -1) return res.status(HttpStatus.NOT_FOUND).json(errorResponse(ErrorCodes.NOT_FOUND, 'Fuel transaction not found'));
  const deleted = mockFuelTransactions[transactionIndex];
  mockFuelTransactions.splice(transactionIndex, 1);
  await logAudit({ tenantId: ctx.tenantId as string, userId: ctx.userId, userName: ctx.userName, action: 'delete', entityType: 'fleet_fuel', entityId: id, oldValues: deleted, req });
  return res.status(HttpStatus.OK).json(successResponse(null, undefined, 'Fuel transaction deleted successfully'));
}
