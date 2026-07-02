/**
 * HQ — Driver Leaderboard
 *
 * Ranking driver berdasar:
 *  - trip selesai (month)
 *  - total jarak (km)
 *  - on-time rate
 *  - safety score
 *  - customer rating
 *  - insiden (negatif)
 *
 * Query: ?month=YYYY-MM&branch_id=&metric=overall|trips|distance|safety|rating
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

let sequelize: any = null;
try {
  const mod = require('../../../../lib/sequelize');
  sequelize = mod?.sequelize || mod?.default || mod;
} catch {}

const q = async (sql: string, params: any = {}): Promise<any[]> => {
  if (!sequelize?.query) return [];
  try {
    const [rows] = await sequelize.query(sql, { replacements: params });
    return (rows as any[]) || [];
  } catch (e: any) {
    console.warn('[hq/fleet/leaderboard]', e?.message || e);
    return [];
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const tenantId = String((session.user as any).tenantId || '');

    const month    = String(req.query.month || new Date().toISOString().slice(0, 7));
    const branchId = String(req.query.branch_id || '');
    const metric   = String(req.query.metric || 'overall');
    const limit    = Math.min(Number(req.query.limit) || 20, 100);

    if (!sequelize) return res.json({ success: true, data: mockLeaderboard() });

    const repl: any = { month, lim: limit };
    const branchFilter = branchId ? 'AND d.assigned_branch_id = :bid' : '';
    if (branchId) repl.bid = branchId;

    const rows = await q(
      `WITH month_stats AS (
         SELECT ra.driver_id,
                COUNT(*)::int                                               AS trips_total,
                COUNT(*) FILTER (WHERE ra.status='completed')::int          AS trips_completed,
                COUNT(*) FILTER (WHERE ra.status='cancelled')::int          AS trips_cancelled,
                COUNT(*) FILTER (WHERE ra.actual_end_time IS NOT NULL
                                 AND ra.scheduled_start_time IS NOT NULL
                                 AND ra.actual_start_time <= ra.scheduled_start_time + INTERVAL '10 minutes')::int AS on_time_trips,
                COALESCE(SUM(ra.total_distance_km),0)::float                AS distance_km,
                COALESCE(SUM(ra.fuel_consumed_liters),0)::float             AS fuel_liters,
                COUNT(*) FILTER (WHERE ra.notes ILIKE '%incident%')::int    AS incidents
           FROM fleet_route_assignments ra
          WHERE TO_CHAR(ra.scheduled_date,'YYYY-MM') = :month
          GROUP BY ra.driver_id
       ),
       month_expenses AS (
         SELECT driver_id,
                COALESCE(SUM(amount),0)::float  AS expense_amount,
                COUNT(*)::int                   AS expense_count
           FROM fleet_driver_expenses
          WHERE TO_CHAR(expense_date,'YYYY-MM') = :month
          GROUP BY driver_id
       ),
       month_pods AS (
         SELECT driver_id, COUNT(*)::int AS pod_count
           FROM fleet_delivery_proofs
          WHERE TO_CHAR(delivered_at,'YYYY-MM') = :month
          GROUP BY driver_id
       )
       SELECT d.id                                 AS driver_id,
              d.driver_number,
              d.full_name,
              d.photo_url,
              d.customer_rating::float             AS customer_rating,
              d.safety_score::float                AS safety_score,
              d.total_deliveries::int              AS total_deliveries,
              d.on_time_deliveries::int            AS total_on_time,
              d.total_distance_km::float           AS lifetime_distance_km,
              b.name                               AS branch_name,
              v.license_plate,
              COALESCE(ms.trips_total, 0)          AS trips_total,
              COALESCE(ms.trips_completed, 0)      AS trips_completed,
              COALESCE(ms.trips_cancelled, 0)      AS trips_cancelled,
              COALESCE(ms.on_time_trips, 0)        AS on_time_trips,
              COALESCE(ms.distance_km, 0)          AS distance_km,
              COALESCE(ms.fuel_liters, 0)          AS fuel_liters,
              COALESCE(ms.incidents, 0)            AS incidents,
              COALESCE(me.expense_amount, 0)       AS expense_amount,
              COALESCE(mp.pod_count, 0)            AS pod_count,
              CASE WHEN COALESCE(ms.trips_total,0) > 0
                   THEN ROUND((COALESCE(ms.on_time_trips,0)::numeric / ms.trips_total) * 100, 1)
                   ELSE 0 END                       AS on_time_rate
         FROM fleet_drivers d
         LEFT JOIN branches b        ON d.assigned_branch_id = b.id
         LEFT JOIN fleet_vehicles v  ON v.assigned_driver_id = d.id AND v.status='active'
         LEFT JOIN month_stats ms    ON ms.driver_id = d.id
         LEFT JOIN month_expenses me ON me.driver_id = d.id
         LEFT JOIN month_pods mp     ON mp.driver_id = d.id
        WHERE d.status = 'active'
          ${tenantId ? 'AND d.tenant_id = :tid' : ''}
          ${branchFilter}`,
      { ...repl, tid: tenantId }
    );

    const scored = rows.map((r: any) => {
      const trips    = Number(r.trips_completed || 0);
      const distance = Number(r.distance_km || 0);
      const onTime   = Number(r.on_time_rate || 0);
      const safety   = Number(r.safety_score || 0);
      const rating   = Number(r.customer_rating || 0);
      const pods     = Number(r.pod_count || 0);
      const inc      = Number(r.incidents || 0);

      // Weighted overall (100 max-ish)
      const score =
        (onTime * 0.30) +
        (Math.min(trips, 50) * 2 * 0.20) +              // 50 trips = 100
        (Math.min(distance, 5000) / 50 * 0.15) +        // 5000km = 100
        (safety * 0.15) +
        (rating * 20 * 0.15) +                          // rating(5) → 100
        (Math.min(pods, 50) * 2 * 0.05) -               // 50 PODs = 100
        (inc * 10);

      return {
        ...r,
        overall_score: Math.max(0, Math.round(score * 10) / 10),
      };
    });

    const sortKey: Record<string, (r: any) => number> = {
      overall:  (r) => r.overall_score,
      trips:    (r) => r.trips_completed,
      distance: (r) => r.distance_km,
      safety:   (r) => r.safety_score,
      rating:   (r) => r.customer_rating,
      pod:      (r) => r.pod_count,
    };
    const fn = sortKey[metric] || sortKey.overall;
    scored.sort((a, b) => fn(b) - fn(a));

    return res.json({
      success: true,
      data: scored.slice(0, limit).map((r, i) => ({ ...r, rank: i + 1 })),
      month,
      metric,
    });
  } catch (e: any) {
    console.error('[hq/fleet/leaderboard]', e?.message || e);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
}

function mockLeaderboard() {
  return [
    { rank: 1, driver_id: 'drv-001', driver_number: 'DRV-001', full_name: 'Budi Santoso',   branch_name: 'Cikarang', license_plate: 'B 1234 XYZ', trips_completed: 42, distance_km: 3820, on_time_rate: 97, safety_score: 98.5, customer_rating: 4.8, pod_count: 45, expense_amount: 1250000, incidents: 0, overall_score: 95.2 },
    { rank: 2, driver_id: 'drv-002', driver_number: 'DRV-002', full_name: 'Agus Suprianto', branch_name: 'Bandung',  license_plate: 'B 5678 ABC', trips_completed: 38, distance_km: 3510, on_time_rate: 94, safety_score: 96,   customer_rating: 4.7, pod_count: 40, expense_amount: 980000,  incidents: 0, overall_score: 91.3 },
    { rank: 3, driver_id: 'drv-003', driver_number: 'DRV-003', full_name: 'Dedi Kurniawan', branch_name: 'Cikarang', license_plate: 'B 9012 DEF', trips_completed: 35, distance_km: 3110, on_time_rate: 91, safety_score: 95,   customer_rating: 4.6, pod_count: 33, expense_amount: 870000,  incidents: 1, overall_score: 84.1 },
  ];
}
