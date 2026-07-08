import { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

// DB models & helpers
let sequelize: any = null;
try { sequelize = require('../../../../lib/sequelize'); } catch {}
let models: any = null;
try { models = require('../../../../models'); } catch {}

const safeQuery = async (sql: string, params: any = {}): Promise<any[]> => {
  if (!sequelize?.query) return [];
  try {
    const [rows] = await sequelize.query(sql, { replacements: params });
    return rows || [];
  } catch (e: any) {
    console.warn('[hq/fleet/index] DB query failed:', e?.message || e);
    return [];
  }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
        errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
      );
    }

    const session = (req as any).session;
    const tenantId = (session?.user as any)?.tenantId || null;

    // --- Try real DB first ---
    if (sequelize && sequelize.query) {
      try {
        const tenantFilter = tenantId ? `WHERE tenant_id = :tenantId` : '';
        const tenantParam = tenantId ? { tenantId } : {};

        const [vehicles] = await sequelize.query(
          `SELECT COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE status = 'active')::int AS active,
                  COUNT(*) FILTER (WHERE status = 'maintenance')::int AS maintenance,
                  COUNT(*) FILTER (WHERE status = 'inactive')::int AS inactive
           FROM fleet_vehicles ${tenantFilter}`,
          { replacements: tenantParam }
        );

        const [drivers] = await sequelize.query(
          `SELECT COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE status = 'active')::int AS active,
                  COUNT(*) FILTER (WHERE availability_status = 'available')::int AS available,
                  COUNT(*) FILTER (WHERE availability_status = 'on_duty')::int AS on_duty
           FROM fleet_drivers ${tenantFilter}`,
          { replacements: tenantParam }
        );

        const [routes] = await sequelize.query(
          `SELECT COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE status = 'active')::int AS active,
                  COALESCE(SUM(total_distance_km), 0) AS total_distance
           FROM fleet_routes ${tenantFilter}`,
          { replacements: tenantParam }
        );

        const [fuelSummary] = await sequelize.query(
          `SELECT COUNT(*)::int AS total_transactions,
                  COALESCE(SUM(total_cost), 0)::numeric(15,2) AS total_cost,
                  COALESCE(SUM(quantity_liters), 0)::numeric(15,2) AS total_liters
           FROM fleet_fuel_transactions ${tenantFilter}`,
          { replacements: tenantParam }
        );

        const [maintenanceSummary] = await sequelize.query(
          `SELECT COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE status IN ('active','scheduled'))::int AS scheduled,
                  COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
                  COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
           FROM fleet_maintenance_schedules ${tenantFilter}`,
          { replacements: tenantParam }
        );

        const v = vehicles?.[0] || {};
        const d = drivers?.[0] || {};
        const r = routes?.[0] || {};
        const f = fuelSummary?.[0] || {};
        const m = maintenanceSummary?.[0] || {};

        const overview = {
          vehicles: {
            total: v.total || 0,
            active: v.active || 0,
            maintenance: v.maintenance || 0,
            inactive: v.inactive || 0
          },
          drivers: {
            total: d.total || 0,
            active: d.active || 0,
            available: d.available || 0,
            onDuty: d.on_duty || 0
          },
          routes: {
            total: r.total || 0,
            active: r.active || 0,
            totalDistance: r.total_distance || 0
          },
          fuel: {
            totalTransactions: f.total_transactions || 0,
            totalCost: f.total_cost || 0,
            totalLiters: f.total_liters || 0
          },
          maintenance: {
            total: m.total || 0,
            scheduled: m.scheduled || 0,
            inProgress: m.in_progress || 0,
            completed: m.completed || 0
          }
        };

        return res.status(HttpStatus.OK).json(successResponse(overview));
      } catch (e: any) {
        console.warn('[hq/fleet/index] DB failed, returning empty overview:', e.message);
      }
    }

    // --- Fallback: empty overview ---
    const overview = {
      vehicles: { total: 0, active: 0, maintenance: 0, inactive: 0 },
      drivers: { total: 0, active: 0, available: 0, onDuty: 0 },
      routes: { total: 0, active: 0, totalDistance: 0 },
      fuel: { totalTransactions: 0, totalCost: 0, totalLiters: 0 },
      maintenance: { total: 0, scheduled: 0, inProgress: 0, completed: 0 }
    };

    return res.status(HttpStatus.OK).json(successResponse(overview));
  } catch (error) {
    console.warn('Fleet API Index Error: (table may not exist):', (error as any)?.message || error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Internal server error')
    );
  }
}

export default withHQAuth(handler, { module: 'fleet' });
