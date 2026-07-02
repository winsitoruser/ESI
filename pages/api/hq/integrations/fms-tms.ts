import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

let sequelize: any = null;
try { sequelize = require('../../../../lib/sequelize'); } catch (e) {}

const ok = (res: NextApiResponse, data: any) => res.json({ success: true, ...data });
const err = (res: NextApiResponse, msg: string, code = 400) => res.status(code).json({ success: false, error: msg });
const q = async (sql: string, replacements?: any) => {
  if (!sequelize) return [];
  try { const [rows] = await sequelize.query(sql, { replacements }); return rows as any[]; }
  catch (e: any) { console.error('FMS-TMS Q:', e.message); return []; }
};
const qOne = async (sql: string, replacements?: any) => { const rows = await q(sql, replacements); return rows[0] || null; };
const qExec = async (sql: string, replacements?: any) => {
  if (!sequelize) return false;
  try { await sequelize.query(sql, { replacements }); return true; }
  catch (e: any) { console.error('FMS-TMS Exec:', e.message); return false; }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const tid = (session.user as any).tenantId || null;
    const action = (req.query.action as string) || '';

    switch (action) {

      // ═══════════════════════════════════════
      // UNIFIED DASHBOARD — Combined FMS + TMS overview
      // ═══════════════════════════════════════
      case 'unified-dashboard': {
        const fleet = await qOne(`SELECT
          COUNT(*) as total_vehicles,
          COUNT(*) FILTER (WHERE status='available') as available,
          COUNT(*) FILTER (WHERE status='in_use') as in_use,
          COUNT(*) FILTER (WHERE status='maintenance') as in_maintenance
          FROM fms_vehicles WHERE tenant_id=:tid AND is_active=true`, { tid });
        const drivers = await qOne(`SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE availability='available') as available,
          COUNT(*) FILTER (WHERE availability='on_trip') as on_trip
          FROM fms_drivers WHERE tenant_id=:tid AND is_active=true`, { tid });
        const shipments = await qOne(`SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status IN ('confirmed','assigned','in_transit')) as active,
          COUNT(*) FILTER (WHERE status='delivered' OR status='pod_received') as delivered,
          COALESCE(SUM(total_charge),0) as revenue
          FROM tms_shipments WHERE tenant_id=:tid AND order_date >= CURRENT_DATE - INTERVAL '30 days'`, { tid });
        const trips = await qOne(`SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status='in_progress') as active,
          COUNT(*) FILTER (WHERE status='completed') as completed,
          COALESCE(SUM(total_distance_km),0) as distance
          FROM tms_trips WHERE tenant_id=:tid AND created_at >= CURRENT_DATE - INTERVAL '30 days'`, { tid });
        const costs = await qOne(`SELECT
          COALESCE(SUM(amount) FILTER (WHERE cost_category='fuel'),0) as fuel,
          COALESCE(SUM(amount) FILTER (WHERE cost_category='maintenance'),0) as maintenance,
          COALESCE(SUM(amount) FILTER (WHERE cost_category='toll'),0) as toll,
          COALESCE(SUM(amount),0) as total
          FROM fms_cost_records WHERE tenant_id=:tid AND cost_date >= CURRENT_DATE - INTERVAL '30 days'`, { tid });
        const alerts = await q(`SELECT 'document_expiry' as type, entity_type, entity_id,
          CASE WHEN entity_type='vehicle' THEN v.vehicle_code ELSE d.driver_code END as code,
          document_type as detail, expiry_date as date
          FROM fms_documents doc
          LEFT JOIN fms_vehicles v ON doc.entity_type='vehicle' AND doc.entity_id=v.id
          LEFT JOIN fms_drivers d ON doc.entity_type='driver' AND doc.entity_id=d.id
          WHERE doc.tenant_id=:tid AND doc.status='active' AND doc.expiry_date <= CURRENT_DATE + INTERVAL '14 days' AND doc.expiry_date >= CURRENT_DATE
          UNION ALL
          SELECT 'maintenance_due' as type, 'vehicle' as entity_type, ms.vehicle_id as entity_id,
          v2.vehicle_code as code, ms.maintenance_type as detail, ms.next_due_at as date
          FROM fms_maintenance_schedules ms
          JOIN fms_vehicles v2 ON ms.vehicle_id=v2.id
          WHERE ms.tenant_id=:tid AND ms.is_active=true AND ms.next_due_at <= CURRENT_DATE + INTERVAL '7 days' AND ms.next_due_at >= CURRENT_DATE
          ORDER BY date ASC LIMIT 20`, { tid });

        return ok(res, { data: { fleet, drivers, shipments, trips, costs, alerts } });
      }

      // ═══════════════════════════════════════
      // VEHICLE UTILIZATION REPORT — Cross TMS trips
      // ═══════════════════════════════════════
      case 'vehicle-utilization': {
        const period = req.query.period || '30';
        const rows = await q(`SELECT v.id, v.vehicle_code, v.license_plate, v.vehicle_type, v.status,
          (SELECT COUNT(*) FROM tms_trips t WHERE t.vehicle_id=v.id AND t.created_at >= CURRENT_DATE - INTERVAL '${parseInt(period as string)} days') as trip_count,
          (SELECT COALESCE(SUM(t.total_distance_km),0) FROM tms_trips t WHERE t.vehicle_id=v.id AND t.created_at >= CURRENT_DATE - INTERVAL '${parseInt(period as string)} days') as total_distance,
          (SELECT COALESCE(SUM(f.total_cost),0) FROM fms_fuel_records f WHERE f.vehicle_id=v.id AND f.fill_date >= CURRENT_DATE - INTERVAL '${parseInt(period as string)} days') as fuel_cost,
          (SELECT COALESCE(SUM(m.total_cost),0) FROM fms_maintenance_records m WHERE m.vehicle_id=v.id AND m.created_at >= CURRENT_DATE - INTERVAL '${parseInt(period as string)} days') as maint_cost,
          (SELECT COALESCE(SUM(c.amount),0) FROM fms_cost_records c WHERE c.vehicle_id=v.id AND c.cost_date >= CURRENT_DATE - INTERVAL '${parseInt(period as string)} days') as total_cost,
          (SELECT COUNT(*) FROM tms_trip_shipments ts JOIN tms_trips tr ON ts.trip_id=tr.id WHERE tr.vehicle_id=v.id AND tr.created_at >= CURRENT_DATE - INTERVAL '${parseInt(period as string)} days') as shipments_carried,
          v.current_odometer_km
          FROM fms_vehicles v WHERE v.tenant_id=:tid AND v.is_active=true ORDER BY trip_count DESC`, { tid });
        return ok(res, { data: rows });
      }

      // ═══════════════════════════════════════
      // DRIVER RANKING — Safety + Performance
      // ═══════════════════════════════════════
      case 'driver-ranking': {
        const rows = await q(`SELECT d.id, d.driver_code, d.full_name, d.safety_score, d.total_trips, d.total_distance_km, d.on_time_rate, d.violations_count, d.customer_rating,
          (SELECT COUNT(*) FROM tms_trips t WHERE t.driver_id=d.id AND t.status='completed' AND t.created_at >= CURRENT_DATE - INTERVAL '30 days') as recent_trips,
          (SELECT COUNT(*) FROM fms_driver_violations dv WHERE dv.driver_id=d.id AND dv.violation_date >= CURRENT_DATE - INTERVAL '30 days') as recent_violations,
          (SELECT COUNT(*) FROM fms_inspections i WHERE i.driver_id=d.id AND i.overall_status='pass' AND i.inspection_date >= CURRENT_DATE - INTERVAL '30 days') as inspections_passed,
          (SELECT COUNT(*) FROM fms_incidents inc WHERE inc.driver_id=d.id AND inc.incident_date >= CURRENT_DATE - INTERVAL '90 days') as recent_incidents
          FROM fms_drivers d WHERE d.tenant_id=:tid AND d.is_active=true
          ORDER BY d.safety_score DESC, d.on_time_rate DESC`, { tid });
        return ok(res, { data: rows });
      }

      // ═══════════════════════════════════════
      // COST ANALYSIS — Combined FMS costs + TMS revenue
      // ═══════════════════════════════════════
      case 'profitability': {
        const revenue = await q(`SELECT to_char(order_date,'YYYY-MM') as month, COALESCE(SUM(total_charge),0) as revenue
          FROM tms_shipments WHERE tenant_id=:tid AND order_date >= CURRENT_DATE - INTERVAL '6 months'
          GROUP BY month ORDER BY month`, { tid });
        const costs = await q(`SELECT to_char(cost_date,'YYYY-MM') as month, cost_category, COALESCE(SUM(amount),0) as cost
          FROM fms_cost_records WHERE tenant_id=:tid AND cost_date >= CURRENT_DATE - INTERVAL '6 months'
          GROUP BY month, cost_category ORDER BY month`, { tid });
        const tripCosts = await q(`SELECT to_char(created_at,'YYYY-MM') as month, COALESCE(SUM(total_expense),0) as trip_expense
          FROM tms_trips WHERE tenant_id=:tid AND created_at >= CURRENT_DATE - INTERVAL '6 months'
          GROUP BY month ORDER BY month`, { tid });
        return ok(res, { data: { revenue, costs, tripCosts } });
      }

      default:
        return err(res, `Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.error('FMS-TMS Integration error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}

export default handler;
