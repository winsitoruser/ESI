import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { logAudit } from '@/lib/audit/auditLogger';

let sequelize: any = null;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

/* ─── Helpers ─── */
const ok = (res: NextApiResponse, data: any) => res.json({ success: true, ...data });
const err = (res: NextApiResponse, msg: string, code = 400) => res.status(code).json({ success: false, error: msg });

const q = async (sql: string, replacements?: any) => {
  if (!sequelize) return [];
  try { const [rows] = await sequelize.query(sql, { replacements }); return rows as any[]; }
  catch (e: any) { console.error('[FMS-Analytics] Q:', e.message); return []; }
};
const qOne = async (sql: string, replacements?: any) => {
  const rows = await q(sql, replacements); return rows[0] || null;
};

/* ─── Simple in-memory cache (TTL 60s) ─── */
const _cache: Record<string, { ts: number; data: any }> = {};
const CACHE_TTL = 60_000;
function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = _cache[key];
  if (hit && now - hit.ts < CACHE_TTL) return Promise.resolve(hit.data as T);
  return fn().then(data => { _cache[key] = { ts: now, data }; return data; });
}

/* ─── Date range helper ─── */
function parsePeriod(req: NextApiRequest): { from: string; to: string; interval: string; label: string } {
  const period = (req.query.period as string) || '30d';
  const customFrom = req.query.from as string;
  const customTo = req.query.to as string;
  const today = new Date();
  let from: Date, interval = 'day', label = '30 Hari Terakhir';

  if (customFrom && customTo) {
    return { from: customFrom, to: customTo, interval: 'day', label: `${customFrom} - ${customTo}` };
  }

  switch (period) {
    case '7d': from = new Date(today.getTime() - 7 * 86400000); label = '7 Hari Terakhir'; break;
    case '30d': from = new Date(today.getTime() - 30 * 86400000); label = '30 Hari Terakhir'; break;
    case '90d': from = new Date(today.getTime() - 90 * 86400000); interval = 'week'; label = '90 Hari Terakhir'; break;
    case '6m': from = new Date(today.getTime() - 180 * 86400000); interval = 'month'; label = '6 Bulan Terakhir'; break;
    case '12m': from = new Date(today.getTime() - 365 * 86400000); interval = 'month'; label = '12 Bulan Terakhir'; break;
    case 'ytd': from = new Date(today.getFullYear(), 0, 1); interval = 'month'; label = `YTD ${today.getFullYear()}`; break;
    default: from = new Date(today.getTime() - 30 * 86400000);
  }
  return { from: from.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10), interval, label };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const t0 = Date.now();
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const tid = (session.user as any).tenantId || null;
    const uid = (session.user as any).id;
    const uname = (session.user as any).name || '';
    const action = (req.query.action as string) || '';
    const { from, to, interval, label } = parsePeriod(req);

    const cacheKey = `${tid}:${action}:${from}:${to}`;

    console.log(`[FMS-Analytics] action=${action} period=${from}~${to} user=${uname}`);

    switch (action) {

      // ═══════════════════════════════════════════════════
      // 1. OVERVIEW — Main KPI summary with comparison
      // ═══════════════════════════════════════════════════
      case 'overview': {
        const data = await cached(`${cacheKey}:overview`, async () => {
          const daysDiff = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000));
          const prevFrom = new Date(new Date(from).getTime() - daysDiff * 86400000).toISOString().slice(0, 10);
          const prevTo = from;

          // Current period
          const fleet = await qOne(`SELECT
            COUNT(*) as total_vehicles,
            COUNT(*) FILTER (WHERE status='in_use') as in_use,
            COUNT(*) FILTER (WHERE status='available') as available,
            COUNT(*) FILTER (WHERE status='maintenance') as in_maintenance,
            COUNT(*) FILTER (WHERE status='reserved') as reserved,
            COUNT(*) FILTER (WHERE status='retired') as retired,
            ROUND(COUNT(*) FILTER (WHERE status='in_use')::numeric / NULLIF(COUNT(*),0) * 100, 1) as utilization_pct
          FROM fms_vehicles WHERE tenant_id=:tid AND is_active=true`, { tid });

          const drivers = await qOne(`SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status='active') as active,
            COUNT(*) FILTER (WHERE availability='on_trip') as on_trip,
            ROUND(AVG(safety_score),1) as avg_safety,
            ROUND(AVG(on_time_rate),1) as avg_on_time
          FROM fms_drivers WHERE tenant_id=:tid AND is_active=true`, { tid });

          const costs = await qOne(`SELECT
            COALESCE(SUM(amount),0) as total_cost,
            COUNT(*) as total_records
          FROM fms_cost_records WHERE tenant_id=:tid AND cost_date BETWEEN :from AND :to`, { tid, from, to });

          const prevCosts = await qOne(`SELECT COALESCE(SUM(amount),0) as total_cost
          FROM fms_cost_records WHERE tenant_id=:tid AND cost_date BETWEEN :from AND :to`, { tid, from: prevFrom, to: prevTo });

          const fuel = await qOne(`SELECT
            COALESCE(SUM(total_cost),0) as cost,
            COALESCE(SUM(quantity_liters),0) as liters,
            COUNT(*) as fills,
            ROUND(COALESCE(AVG(consumption_rate),0),2) as avg_consumption
          FROM fms_fuel_records WHERE tenant_id=:tid AND fill_date BETWEEN :from AND :to`, { tid, from, to });

          const prevFuel = await qOne(`SELECT COALESCE(SUM(total_cost),0) as cost
          FROM fms_fuel_records WHERE tenant_id=:tid AND fill_date BETWEEN :from AND :to`, { tid, from: prevFrom, to: prevTo });

          const maintenance = await qOne(`SELECT
            COALESCE(SUM(total_cost),0) as cost,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status='completed') as completed,
            COUNT(*) FILTER (WHERE status='in_progress') as in_progress,
            ROUND(AVG(downtime_hours),1) as avg_downtime
          FROM fms_maintenance_records WHERE tenant_id=:tid AND created_at::date BETWEEN :from AND :to`, { tid, from, to });

          const incidents = await qOne(`SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE severity='critical') as critical,
            COUNT(*) FILTER (WHERE severity='major') as major,
            COALESCE(SUM(total_cost),0) as cost
          FROM fms_incidents WHERE tenant_id=:tid AND incident_date::date BETWEEN :from AND :to`, { tid, from, to });

          const violations = await qOne(`SELECT COUNT(*) as total, COALESCE(SUM(fine_amount),0) as fines
          FROM fms_driver_violations WHERE tenant_id=:tid AND violation_date::date BETWEEN :from AND :to`, { tid, from, to });

          const costChange = Number(prevCosts?.total_cost) > 0
            ? ((Number(costs?.total_cost) - Number(prevCosts?.total_cost)) / Number(prevCosts?.total_cost) * 100).toFixed(1)
            : null;
          const fuelChange = Number(prevFuel?.cost) > 0
            ? ((Number(fuel?.cost) - Number(prevFuel?.cost)) / Number(prevFuel?.cost) * 100).toFixed(1)
            : null;

          return { fleet, drivers, costs: { ...costs, change: costChange }, fuel: { ...fuel, change: fuelChange }, maintenance, incidents, violations, period: { from, to, label } };
        });
        return ok(res, { data });
      }

      // ═══════════════════════════════════════════════════
      // 2. UTILIZATION TREND — Fleet utilization over time
      // ═══════════════════════════════════════════════════
      case 'utilization-trend': {
        const data = await cached(`${cacheKey}:util-trend`, async () => {
          const rows = await q(`SELECT kpi_date, total_vehicles, active_vehicles, utilization_rate, in_maintenance,
            total_trips, total_distance_km, total_fuel_liters, total_fuel_cost, total_maintenance_cost, total_operational_cost, cost_per_km,
            total_incidents, total_violations
          FROM fms_fleet_kpi WHERE tenant_id=:tid AND kpi_date BETWEEN :from AND :to ORDER BY kpi_date`, { tid, from, to });
          return rows;
        });
        return ok(res, { data });
      }

      // ═══════════════════════════════════════════════════
      // 3. COST ANALYTICS — Breakdown, trends, comparison
      // ═══════════════════════════════════════════════════
      case 'cost-analytics': {
        const data = await cached(`${cacheKey}:cost`, async () => {
          const byCategory = await q(`SELECT cost_category, COUNT(*) as count, COALESCE(SUM(amount),0) as total
          FROM fms_cost_records WHERE tenant_id=:tid AND cost_date BETWEEN :from AND :to
          GROUP BY cost_category ORDER BY total DESC`, { tid, from, to });

          const trend = await q(`SELECT to_char(cost_date,'YYYY-MM') as month, cost_category, COALESCE(SUM(amount),0) as total
          FROM fms_cost_records WHERE tenant_id=:tid AND cost_date BETWEEN :from AND :to
          GROUP BY month, cost_category ORDER BY month`, { tid, from, to });

          const topVehicles = await q(`SELECT v.vehicle_code, v.license_plate, v.vehicle_type,
            COALESCE(SUM(c.amount),0) as total_cost, COUNT(c.id) as record_count
          FROM fms_vehicles v LEFT JOIN fms_cost_records c ON v.id=c.vehicle_id AND c.cost_date BETWEEN :from AND :to
          WHERE v.tenant_id=:tid AND v.is_active=true
          GROUP BY v.id, v.vehicle_code, v.license_plate, v.vehicle_type
          HAVING SUM(c.amount) > 0
          ORDER BY total_cost DESC LIMIT 10`, { tid, from, to });

          const daily = await q(`SELECT cost_date::text as date, COALESCE(SUM(amount),0) as total
          FROM fms_cost_records WHERE tenant_id=:tid AND cost_date BETWEEN :from AND :to
          GROUP BY cost_date ORDER BY cost_date`, { tid, from, to });

          return { byCategory, trend, topVehicles, daily };
        });
        return ok(res, { data });
      }

      // ═══════════════════════════════════════════════════
      // 4. FUEL ANALYTICS — Efficiency, consumption, cost
      // ═══════════════════════════════════════════════════
      case 'fuel-analytics': {
        const data = await cached(`${cacheKey}:fuel`, async () => {
          const byVehicle = await q(`SELECT v.vehicle_code, v.license_plate, v.vehicle_type, v.fuel_type as veh_fuel_type,
            COUNT(f.id) as fill_count, COALESCE(SUM(f.quantity_liters),0) as total_liters,
            COALESCE(SUM(f.total_cost),0) as total_cost, ROUND(COALESCE(AVG(f.consumption_rate),0),2) as avg_consumption,
            COALESCE(MAX(f.odometer_reading) - MIN(f.odometer_reading),0) as distance_km
          FROM fms_vehicles v LEFT JOIN fms_fuel_records f ON v.id=f.vehicle_id AND f.fill_date BETWEEN :from AND :to
          WHERE v.tenant_id=:tid AND v.is_active=true
          GROUP BY v.id, v.vehicle_code, v.license_plate, v.vehicle_type, v.fuel_type
          HAVING SUM(f.quantity_liters) > 0
          ORDER BY total_cost DESC`, { tid, from, to });

          const trend = await q(`SELECT to_char(fill_date,'YYYY-MM') as month,
            COALESCE(SUM(total_cost),0) as cost, COALESCE(SUM(quantity_liters),0) as liters, COUNT(*) as fills,
            ROUND(AVG(price_per_liter),0) as avg_price
          FROM fms_fuel_records WHERE tenant_id=:tid AND fill_date BETWEEN :from AND :to
          GROUP BY month ORDER BY month`, { tid, from, to });

          const byFuelType = await q(`SELECT fuel_type, COALESCE(SUM(total_cost),0) as cost,
            COALESCE(SUM(quantity_liters),0) as liters, COUNT(*) as fills
          FROM fms_fuel_records WHERE tenant_id=:tid AND fill_date BETWEEN :from AND :to
          GROUP BY fuel_type ORDER BY cost DESC`, { tid, from, to });

          const byStation = await q(`SELECT station_name, COUNT(*) as fills, COALESCE(SUM(total_cost),0) as cost,
            COALESCE(SUM(quantity_liters),0) as liters
          FROM fms_fuel_records WHERE tenant_id=:tid AND fill_date BETWEEN :from AND :to AND station_name IS NOT NULL
          GROUP BY station_name ORDER BY cost DESC LIMIT 10`, { tid, from, to });

          const priceTrend = await q(`SELECT to_char(fill_date,'YYYY-MM-DD') as date,
            ROUND(AVG(price_per_liter),0) as avg_price, fuel_type
          FROM fms_fuel_records WHERE tenant_id=:tid AND fill_date BETWEEN :from AND :to
          GROUP BY date, fuel_type ORDER BY date`, { tid, from, to });

          return { byVehicle, trend, byFuelType, byStation, priceTrend };
        });
        return ok(res, { data });
      }

      // ═══════════════════════════════════════════════════
      // 5. MAINTENANCE ANALYTICS — MTBF, cost trends
      // ═══════════════════════════════════════════════════
      case 'maintenance-analytics': {
        const data = await cached(`${cacheKey}:maint`, async () => {
          const byType = await q(`SELECT maintenance_type, COUNT(*) as count, COALESCE(SUM(total_cost),0) as cost,
            ROUND(AVG(downtime_hours),1) as avg_downtime
          FROM fms_maintenance_records WHERE tenant_id=:tid AND created_at::date BETWEEN :from AND :to
          GROUP BY maintenance_type ORDER BY cost DESC`, { tid, from, to });

          const byCategory = await q(`SELECT category, COUNT(*) as count, COALESCE(SUM(total_cost),0) as cost
          FROM fms_maintenance_records WHERE tenant_id=:tid AND created_at::date BETWEEN :from AND :to
          GROUP BY category ORDER BY cost DESC`, { tid, from, to });

          const trend = await q(`SELECT to_char(created_at,'YYYY-MM') as month, COUNT(*) as count,
            COALESCE(SUM(total_cost),0) as cost, COALESCE(SUM(parts_cost),0) as parts, COALESCE(SUM(labor_cost),0) as labor
          FROM fms_maintenance_records WHERE tenant_id=:tid AND created_at::date BETWEEN :from AND :to
          GROUP BY month ORDER BY month`, { tid, from, to });

          const topVehicles = await q(`SELECT v.vehicle_code, v.license_plate,
            COUNT(m.id) as maint_count, COALESCE(SUM(m.total_cost),0) as total_cost,
            ROUND(AVG(m.downtime_hours),1) as avg_downtime
          FROM fms_vehicles v JOIN fms_maintenance_records m ON v.id=m.vehicle_id
          WHERE m.tenant_id=:tid AND m.created_at::date BETWEEN :from AND :to
          GROUP BY v.id, v.vehicle_code, v.license_plate ORDER BY total_cost DESC LIMIT 10`, { tid, from, to });

          const byVendor = await q(`SELECT vendor_name, COUNT(*) as count, COALESCE(SUM(total_cost),0) as cost
          FROM fms_maintenance_records WHERE tenant_id=:tid AND created_at::date BETWEEN :from AND :to AND vendor_name IS NOT NULL
          GROUP BY vendor_name ORDER BY cost DESC LIMIT 10`, { tid, from, to });

          const byPriority = await q(`SELECT priority, COUNT(*) as count, COALESCE(SUM(total_cost),0) as cost
          FROM fms_maintenance_records WHERE tenant_id=:tid AND created_at::date BETWEEN :from AND :to
          GROUP BY priority`, { tid, from, to });

          return { byType, byCategory, trend, topVehicles, byVendor, byPriority };
        });
        return ok(res, { data });
      }

      // ═══════════════════════════════════════════════════
      // 6. DRIVER ANALYTICS — Scorecard, rankings
      // ═══════════════════════════════════════════════════
      case 'driver-analytics': {
        const data = await cached(`${cacheKey}:driver`, async () => {
          const leaderboard = await q(`SELECT d.id, d.driver_code, d.full_name, d.status, d.availability,
            d.total_trips, d.total_distance_km, d.safety_score, d.on_time_rate, d.customer_rating, d.violations_count,
            (SELECT COUNT(*) FROM fms_driver_violations dv WHERE dv.driver_id=d.id AND dv.violation_date::date BETWEEN :from AND :to) as period_violations,
            (SELECT COUNT(*) FROM fms_fuel_records fr WHERE fr.driver_id=d.id AND fr.fill_date BETWEEN :from AND :to) as period_fills,
            (SELECT COALESCE(SUM(fr.total_cost),0) FROM fms_fuel_records fr WHERE fr.driver_id=d.id AND fr.fill_date BETWEEN :from AND :to) as period_fuel_cost,
            (SELECT COUNT(*) FROM fms_incidents ic WHERE ic.driver_id=d.id AND ic.incident_date::date BETWEEN :from AND :to) as period_incidents
          FROM fms_drivers d WHERE d.tenant_id=:tid AND d.is_active=true
          ORDER BY d.safety_score DESC`, { tid, from, to });

          const violationsByType = await q(`SELECT violation_type, COUNT(*) as count, severity,
            COALESCE(SUM(fine_amount),0) as fines
          FROM fms_driver_violations WHERE tenant_id=:tid AND violation_date::date BETWEEN :from AND :to
          GROUP BY violation_type, severity ORDER BY count DESC`, { tid, from, to });

          const safetyDistribution = await q(`SELECT
            CASE WHEN safety_score >= 90 THEN 'excellent'
                 WHEN safety_score >= 70 THEN 'good'
                 WHEN safety_score >= 50 THEN 'fair'
                 ELSE 'poor' END as grade,
            COUNT(*) as count
          FROM fms_drivers WHERE tenant_id=:tid AND is_active=true
          GROUP BY grade`, { tid });

          return { leaderboard, violationsByType, safetyDistribution };
        });
        return ok(res, { data });
      }

      // ═══════════════════════════════════════════════════
      // 7. VEHICLE LIFECYCLE / TCO
      // ═══════════════════════════════════════════════════
      case 'vehicle-lifecycle': {
        const data = await cached(`${cacheKey}:lifecycle`, async () => {
          const tco = await q(`SELECT v.id, v.vehicle_code, v.license_plate, v.vehicle_type, v.year, v.purchase_price,
            COALESCE(v.current_odometer_km,0) as odometer,
            COALESCE((SELECT SUM(amount) FROM fms_cost_records WHERE vehicle_id=v.id AND cost_date BETWEEN :from AND :to),0) as period_cost,
            COALESCE((SELECT SUM(total_cost) FROM fms_fuel_records WHERE vehicle_id=v.id AND fill_date BETWEEN :from AND :to),0) as period_fuel,
            COALESCE((SELECT SUM(total_cost) FROM fms_maintenance_records WHERE vehicle_id=v.id AND created_at::date BETWEEN :from AND :to),0) as period_maint,
            COALESCE((SELECT SUM(total_cost) FROM fms_incidents WHERE vehicle_id=v.id AND incident_date::date BETWEEN :from AND :to),0) as period_incident,
            COALESCE((SELECT SUM(amount) FROM fms_cost_records WHERE vehicle_id=v.id),0) as lifetime_cost,
            COALESCE((SELECT SUM(total_cost) FROM fms_fuel_records WHERE vehicle_id=v.id),0) as lifetime_fuel,
            COALESCE((SELECT SUM(total_cost) FROM fms_maintenance_records WHERE vehicle_id=v.id),0) as lifetime_maint
          FROM fms_vehicles v WHERE v.tenant_id=:tid AND v.is_active=true
          ORDER BY period_cost DESC`, { tid, from, to });

          const byType = await q(`SELECT vehicle_type, COUNT(*) as count,
            ROUND(AVG(EXTRACT(YEAR FROM CURRENT_DATE) - year),1) as avg_age,
            COALESCE(SUM(purchase_price),0) as total_value,
            ROUND(AVG(condition_rating),1) as avg_condition
          FROM fms_vehicles WHERE tenant_id=:tid AND is_active=true AND year IS NOT NULL
          GROUP BY vehicle_type ORDER BY count DESC`, { tid });

          const byOwnership = await q(`SELECT ownership_type, COUNT(*) as count,
            COALESCE(SUM(purchase_price),0) as total_value
          FROM fms_vehicles WHERE tenant_id=:tid AND is_active=true
          GROUP BY ownership_type`, { tid });

          const ageDistribution = await q(`SELECT
            CASE WHEN EXTRACT(YEAR FROM CURRENT_DATE) - year <= 2 THEN '0-2 thn'
                 WHEN EXTRACT(YEAR FROM CURRENT_DATE) - year <= 5 THEN '3-5 thn'
                 WHEN EXTRACT(YEAR FROM CURRENT_DATE) - year <= 10 THEN '6-10 thn'
                 ELSE '10+ thn' END as age_group,
            COUNT(*) as count
          FROM fms_vehicles WHERE tenant_id=:tid AND is_active=true AND year IS NOT NULL
          GROUP BY age_group ORDER BY age_group`, { tid });

          return { tco, byType, byOwnership, ageDistribution };
        });
        return ok(res, { data });
      }

      // ═══════════════════════════════════════════════════
      // 8. INCIDENT ANALYTICS
      // ═══════════════════════════════════════════════════
      case 'incident-analytics': {
        const data = await cached(`${cacheKey}:incident`, async () => {
          const byType = await q(`SELECT incident_type, COUNT(*) as count, COALESCE(SUM(total_cost),0) as cost
          FROM fms_incidents WHERE tenant_id=:tid AND incident_date::date BETWEEN :from AND :to
          GROUP BY incident_type ORDER BY count DESC`, { tid, from, to });

          const bySeverity = await q(`SELECT severity, COUNT(*) as count, COALESCE(SUM(total_cost),0) as cost
          FROM fms_incidents WHERE tenant_id=:tid AND incident_date::date BETWEEN :from AND :to
          GROUP BY severity`, { tid, from, to });

          const trend = await q(`SELECT to_char(incident_date,'YYYY-MM') as month, COUNT(*) as count, COALESCE(SUM(total_cost),0) as cost
          FROM fms_incidents WHERE tenant_id=:tid AND incident_date::date BETWEEN :from AND :to
          GROUP BY month ORDER BY month`, { tid, from, to });

          const byDriver = await q(`SELECT d.driver_code, d.full_name, COUNT(i.id) as count, COALESCE(SUM(i.total_cost),0) as cost
          FROM fms_incidents i JOIN fms_drivers d ON i.driver_id=d.id
          WHERE i.tenant_id=:tid AND i.incident_date::date BETWEEN :from AND :to
          GROUP BY d.id, d.driver_code, d.full_name ORDER BY count DESC LIMIT 10`, { tid, from, to });

          return { byType, bySeverity, trend, byDriver };
        });
        return ok(res, { data });
      }

      // ═══════════════════════════════════════════════════
      // 9. EXPORT ANALYTICS DATA
      // ═══════════════════════════════════════════════════
      case 'export-analytics': {
        const entity = req.query.entity as string;
        let rows: any[] = [];
        switch (entity) {
          case 'cost-summary':
            rows = await q(`SELECT v.vehicle_code, v.license_plate, c.cost_category, c.cost_date, c.amount, c.description, c.receipt_number
            FROM fms_cost_records c JOIN fms_vehicles v ON c.vehicle_id=v.id
            WHERE c.tenant_id=:tid AND c.cost_date BETWEEN :from AND :to ORDER BY c.cost_date DESC`, { tid, from, to }); break;
          case 'fuel-summary':
            rows = await q(`SELECT v.vehicle_code, v.license_plate, f.fill_date, f.fuel_type, f.quantity_liters, f.price_per_liter, f.total_cost, f.consumption_rate, f.station_name
            FROM fms_fuel_records f JOIN fms_vehicles v ON f.vehicle_id=v.id
            WHERE f.tenant_id=:tid AND f.fill_date BETWEEN :from AND :to ORDER BY f.fill_date DESC`, { tid, from, to }); break;
          case 'maintenance-summary':
            rows = await q(`SELECT v.vehicle_code, v.license_plate, m.work_order_number, m.maintenance_type, m.category, m.priority, m.vendor_name, m.parts_cost, m.labor_cost, m.total_cost, m.downtime_hours, m.status, m.created_at
            FROM fms_maintenance_records m JOIN fms_vehicles v ON m.vehicle_id=v.id
            WHERE m.tenant_id=:tid AND m.created_at::date BETWEEN :from AND :to ORDER BY m.created_at DESC`, { tid, from, to }); break;
          case 'driver-scorecard':
            rows = await q(`SELECT d.driver_code, d.full_name, d.status, d.total_trips, d.total_distance_km, d.safety_score, d.on_time_rate, d.violations_count, d.customer_rating
            FROM fms_drivers d WHERE d.tenant_id=:tid AND d.is_active=true ORDER BY d.safety_score DESC`, { tid }); break;
          case 'vehicle-tco':
            rows = await q(`SELECT v.vehicle_code, v.license_plate, v.vehicle_type, v.year, v.purchase_price, v.current_odometer_km,
              COALESCE((SELECT SUM(amount) FROM fms_cost_records WHERE vehicle_id=v.id),0) as total_cost,
              COALESCE((SELECT SUM(total_cost) FROM fms_fuel_records WHERE vehicle_id=v.id),0) as fuel_cost,
              COALESCE((SELECT SUM(total_cost) FROM fms_maintenance_records WHERE vehicle_id=v.id),0) as maintenance_cost
            FROM fms_vehicles v WHERE v.tenant_id=:tid AND v.is_active=true ORDER BY total_cost DESC`, { tid }); break;
          case 'kpi-history':
            rows = await q(`SELECT * FROM fms_fleet_kpi WHERE tenant_id=:tid AND kpi_date BETWEEN :from AND :to ORDER BY kpi_date`, { tid, from, to }); break;
          default: return err(res, 'Unknown export entity');
        }
        logAudit({ tenantId: tid, userId: uid, userName: uname, action: 'export' as any, entityType: 'fms_analytics', entityId: entity, newValues: { entity, from, to, rows: rows.length }, req }).catch(() => {});
        return ok(res, { data: rows });
      }

      // ═══════════════════════════════════════════════════
      // 10. SNAPSHOT — Generate/refresh today's KPI
      // ═══════════════════════════════════════════════════
      case 'refresh-kpi': {
        if (req.method !== 'POST') return err(res, 'POST only', 405);
        const today = new Date().toISOString().slice(0, 10);

        const v = await qOne(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status IN ('in_use','on_trip')) as active, COUNT(*) FILTER (WHERE status='maintenance') as maint FROM fms_vehicles WHERE tenant_id=:tid AND is_active=true`, { tid });
        const d = await qOne(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='active') as active, ROUND(AVG(safety_score),1) as avg_safety FROM fms_drivers WHERE tenant_id=:tid AND is_active=true`, { tid });
        const trips = await qOne(`SELECT COUNT(*) as total, COALESCE(SUM(total_distance_km),0) as dist FROM tms_trips WHERE tenant_id=:tid AND created_at::date=:d`, { tid, d: today });
        const fuel = await qOne(`SELECT COALESCE(SUM(quantity_liters),0) as liters, COALESCE(SUM(total_cost),0) as cost FROM fms_fuel_records WHERE tenant_id=:tid AND fill_date::date=:d`, { tid, d: today });
        const maint = await qOne(`SELECT COALESCE(SUM(total_cost),0) as cost FROM fms_maintenance_records WHERE tenant_id=:tid AND created_at::date=:d`, { tid, d: today });
        const ops = await qOne(`SELECT COALESCE(SUM(amount),0) as cost FROM fms_cost_records WHERE tenant_id=:tid AND cost_date=:d`, { tid, d: today });
        const inc = await qOne(`SELECT COUNT(*) as total FROM fms_incidents WHERE tenant_id=:tid AND incident_date::date=:d`, { tid, d: today });
        const vio = await qOne(`SELECT COUNT(*) as total FROM fms_driver_violations WHERE tenant_id=:tid AND violation_date::date=:d`, { tid, d: today });

        const totalV = parseInt(v?.total || '0');
        const activeV = parseInt(v?.active || '0');
        const utilRate = totalV > 0 ? (activeV / totalV * 100) : 0;
        const totalDist = parseFloat(trips?.dist || '0');
        const fuelCost = parseFloat(fuel?.cost || '0');
        const opsCost = parseFloat(ops?.cost || '0');
        const costPerKm = totalDist > 0 ? ((fuelCost + opsCost) / totalDist) : 0;

        const kpi = await qOne(`INSERT INTO fms_fleet_kpi (tenant_id,kpi_date,total_vehicles,active_vehicles,utilization_rate,in_maintenance,total_drivers,active_drivers,total_trips,total_distance_km,total_fuel_liters,total_fuel_cost,total_maintenance_cost,total_operational_cost,cost_per_km,total_incidents,total_violations,avg_safety_score)
          VALUES (:tid,:d,:tv,:av,:ur,:im,:td,:ad,:tt,:dist,:fl,:fc,:mc,:oc,:cpk,:ti,:tvi,:as)
          ON CONFLICT (tenant_id,kpi_date) DO UPDATE SET total_vehicles=EXCLUDED.total_vehicles, active_vehicles=EXCLUDED.active_vehicles, utilization_rate=EXCLUDED.utilization_rate, total_trips=EXCLUDED.total_trips, total_distance_km=EXCLUDED.total_distance_km, total_fuel_liters=EXCLUDED.total_fuel_liters, total_fuel_cost=EXCLUDED.total_fuel_cost, total_maintenance_cost=EXCLUDED.total_maintenance_cost, total_operational_cost=EXCLUDED.total_operational_cost, cost_per_km=EXCLUDED.cost_per_km, total_incidents=EXCLUDED.total_incidents, total_violations=EXCLUDED.total_violations, avg_safety_score=EXCLUDED.avg_safety_score
          RETURNING *`,
          { tid, d: today, tv: totalV, av: activeV, ur: utilRate, im: parseInt(v?.maint||'0'), td: parseInt(d?.total||'0'), ad: parseInt(d?.active||'0'), tt: parseInt(trips?.total||'0'), dist: totalDist, fl: parseFloat(fuel?.liters||'0'), fc: fuelCost, mc: parseFloat(maint?.cost||'0'), oc: opsCost, cpk: costPerKm, ti: parseInt(inc?.total||'0'), tvi: parseInt(vio?.total||'0'), as: parseFloat(d?.avg_safety||'0') });

        // Invalidate cache
        Object.keys(_cache).forEach(k => { if (k.startsWith(tid)) delete _cache[k]; });

        logAudit({ tenantId: tid, userId: uid, userName: uname, action: 'create' as any, entityType: 'fms_fleet_kpi', entityId: kpi?.id, newValues: kpi, req }).catch(() => {});
        return ok(res, { data: kpi, message: 'KPI snapshot refreshed' });
      }

      default:
        return err(res, `Unknown analytics action: ${action}`);
    }
  } catch (error: any) {
    console.error('[FMS-Analytics] Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  } finally {
    console.log(`[FMS-Analytics] ${req.query.action} completed in ${Date.now() - t0}ms`);
  }
}

export default handler;
