/**
 * HQ Live Fleet API
 *
 * Aggregates:
 *   - fleet_drivers + fleet_vehicles + fleet_route_assignments (hari ini)
 *   - last known fleet_gps_locations per driver
 *
 * Digunakan oleh halaman /hq/fleet/live untuk monitoring armada real-time.
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
    console.warn('[hq/fleet/live]', e?.message || e);
    return [];
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const tenantId = String((session.user as any).tenantId || '');
    const branchId = String(req.query.branch_id || '');
    const filterStatus = String(req.query.status || ''); // on_duty | available | any

    if (!sequelize) {
      const data = mockLiveFleet();
      const summary = {
        total: data.length,
        on_duty:    data.filter((d: any) => d.availability_status === 'on_duty').length,
        available:  data.filter((d: any) => d.availability_status === 'available').length,
        off_duty:   data.filter((d: any) => d.availability_status === 'off_duty').length,
        with_location: data.filter((d: any) => d.location).length,
        moving: data.filter((d: any) => d.location?.is_moving).length,
        idle:   data.filter((d: any) => d.location?.is_idle).length,
      };
      return res.json({ success: true, data, summary, timestamp: new Date().toISOString() });
    }

    // 1. Drivers with assigned vehicles (filter branch if provided)
    const drivers = await q(
      `SELECT d.id                AS driver_id,
              d.full_name,
              d.phone,
              d.availability_status,
              d.driver_number,
              d.customer_rating,
              d.safety_score,
              b.name              AS branch_name,
              v.id                AS vehicle_id,
              v.vehicle_number,
              v.license_plate,
              v.vehicle_type,
              v.current_odometer_km
         FROM fleet_drivers d
         LEFT JOIN branches b       ON d.assigned_branch_id = b.id
         LEFT JOIN fleet_vehicles v ON v.assigned_driver_id = d.id AND v.status='active'
        WHERE d.status = 'active'
          ${tenantId ? 'AND d.tenant_id = :tid' : ''}
          ${branchId ? 'AND d.assigned_branch_id = :bid' : ''}
          ${filterStatus && filterStatus !== 'any' ? 'AND d.availability_status = :st' : ''}`,
      { tid: tenantId, bid: branchId, st: filterStatus }
    );

    // 2. Today trips per driver
    const today = new Date().toISOString().split('T')[0];
    const trips = await q(
      `SELECT ra.id, ra.driver_id, ra.status, ra.scheduled_start_time, ra.actual_start_time,
              ra.actual_end_time, ra.total_distance_km, ra.scheduled_date,
              r.route_number, r.route_name, r.start_location, r.end_location,
              r.total_distance_km AS route_distance_km
         FROM fleet_route_assignments ra
         LEFT JOIN fleet_routes r ON ra.route_id = r.id
        WHERE DATE(ra.scheduled_date) = :today`,
      { today }
    );

    // 3. Latest GPS per driver — use DISTINCT ON
    const gps = await q(
      `SELECT DISTINCT ON (driver_id)
              id, driver_id, vehicle_id,
              latitude::float   AS latitude,
              longitude::float  AS longitude,
              speed_kmh::float  AS speed_kmh,
              heading::float    AS heading,
              timestamp, is_moving, is_idle
         FROM fleet_gps_locations
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
        ORDER BY driver_id, timestamp DESC`
    );
    const gpsByDriver: Record<string, any> = {};
    for (const g of gps as any[]) gpsByDriver[g.driver_id] = g;

    const tripsByDriver: Record<string, any[]> = {};
    for (const t of trips as any[]) {
      if (!t.driver_id) continue;
      (tripsByDriver[t.driver_id] = tripsByDriver[t.driver_id] || []).push(t);
    }

    const data = drivers.map((d: any) => {
      const gp = gpsByDriver[d.driver_id] || null;
      const dtrips = tripsByDriver[d.driver_id] || [];
      const active = dtrips.find((t) => t.status === 'in_progress') || null;
      return {
        ...d,
        location: gp
          ? {
              latitude: Number(gp.latitude),
              longitude: Number(gp.longitude),
              speed_kmh: Number(gp.speed_kmh || 0),
              heading: Number(gp.heading || 0),
              timestamp: gp.timestamp,
              is_moving: gp.is_moving,
              is_idle: gp.is_idle,
              age_seconds: gp.timestamp ? Math.floor((Date.now() - new Date(gp.timestamp).getTime()) / 1000) : null,
            }
          : null,
        trips_today: dtrips.length,
        completed_today: dtrips.filter((t) => t.status === 'completed').length,
        active_trip: active,
      };
    });

    // Summary counters
    const summary = {
      total: data.length,
      on_duty: data.filter((d: any) => d.availability_status === 'on_duty').length,
      available: data.filter((d: any) => d.availability_status === 'available').length,
      off_duty: data.filter((d: any) => d.availability_status === 'off_duty').length,
      with_location: data.filter((d: any) => d.location).length,
      moving: data.filter((d: any) => d.location?.is_moving).length,
      idle: data.filter((d: any) => d.location?.is_idle).length,
    };

    return res.json({ success: true, data, summary, timestamp: new Date().toISOString() });
  } catch (e: any) {
    console.error('[hq/fleet/live]', e?.message || e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/* ── Mock fallback (untuk dev tanpa DB) ─────────────────────────────── */
function mockLiveFleet() {
  const now = new Date();
  const mk = (i: number, name: string, status: string, lat: number, lng: number, moving: boolean) => ({
    driver_id: `drv-${String(i).padStart(3, '0')}`,
    driver_number: `DRV-${String(i).padStart(3, '0')}`,
    full_name: name,
    phone: '0812-' + String(1000 + i).padStart(4, '0'),
    availability_status: status,
    customer_rating: 4.6 + (i % 3) * 0.1,
    safety_score: 93 + (i % 5),
    branch_name: i < 3 ? 'Cikarang' : 'Bandung',
    vehicle_id: `veh-${i}`,
    vehicle_number: `VH-${String(i).padStart(3, '0')}`,
    license_plate: `B ${1000 + i} XYZ`,
    vehicle_type: i % 2 === 0 ? 'truck' : 'van',
    current_odometer_km: 40000 + i * 2500,
    location: {
      latitude: lat, longitude: lng,
      speed_kmh: moving ? 35 + (i * 3) % 25 : 0,
      heading: (30 + i * 22) % 360,
      timestamp: new Date(now.getTime() - (i * 60_000)).toISOString(),
      is_moving: moving, is_idle: !moving,
      age_seconds: i * 60,
    },
    trips_today: (i % 3) + 1,
    completed_today: i % 2,
    active_trip: moving ? {
      id: `ra-${i}`,
      status: 'in_progress',
      route_number: 'RT-' + i,
      route_name: 'Cikarang → Bandung',
      start_location: 'Gudang Cikarang',
      end_location: 'Cabang Bandung',
      route_distance_km: 145,
    } : null,
  });
  const data = [
    mk(1, 'Budi Santoso',   'on_duty',   -6.2608, 107.1522, true),
    mk(2, 'Agus Suprianto', 'on_duty',   -6.4682, 107.1456, true),
    mk(3, 'Dedi Kurniawan', 'available', -6.2088, 106.8456, false),
    mk(4, 'Irfan Maulana',  'on_duty',   -6.7420, 107.4502, true),
    mk(5, 'Rahmat Hidayat', 'off_duty',  -6.9175, 107.7306, false),
  ];
  return data;
}
