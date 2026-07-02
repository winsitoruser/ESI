/**
 * Driver / Armada Portal API
 *
 * Terintegrasi dengan:
 *   - HRIS   : users, employees, employee_attendances, leave_requests, employee_claims
 *   - FMS    : fleet_drivers, fleet_vehicles, fleet_maintenance_schedules,
 *              fleet_fuel_transactions
 *   - TMS    : fleet_routes, fleet_route_assignments
 *   - GIS    : fleet_gps_locations (titik GPS, heading, speed)
 *
 * GET  actions:
 *   profile                – profil driver + kendaraan aktif + cabang
 *   summary                – ringkasan dashboard (stats hari ini, pending, dsb)
 *   today-trip             – trip/route-assignment hari ini
 *   trips                  – daftar trip (bulanan, riwayat)
 *   vehicle                – kendaraan yang di-assign (dokumen, odometer, insurance)
 *   fuel-log               – log BBM & efisiensi
 *   maintenance            – jadwal servis kendaraan
 *   performance            – performa driver (on-time %, safety score, rating)
 *   gps-history            – jejak GPS (untuk polyline rute actual)
 *   hr-summary             – ringkasan HR (attendance, cuti, klaim)
 *   notifications          – notifikasi driver
 *   pre-trip-check-latest  – inspeksi pre-trip terakhir (hari ini)
 *   pods                   – daftar Proof of Delivery per trip/bulan
 *   expenses               – daftar expense driver
 *   shift-summary          – ringkasan shift/bulanan (jam kerja, overtime, trip, distance)
 *
 * POST actions:
 *   clock-in         – absensi masuk
 *   clock-out        – absensi keluar
 *   start-trip       – mulai trip + catat GPS awal + odometer (+ auto clock-in)
 *   pause-trip       – istirahat di tengah trip
 *   complete-trip    – selesaikan trip + catat GPS akhir + odometer akhir
 *   push-gps         – kirim ping GPS berkala (dari device/app)
 *   push-gps-batch   – kirim batch GPS dari offline queue (IndexedDB)
 *   submit-fuel      – catat transaksi BBM (liter, harga, odometer)
 *   report-incident  – laporkan insiden / kerusakan
 *   submit-inspection– simpan pre-trip vehicle inspection
 *   submit-pod       – simpan Proof of Delivery (foto/ttd/nama penerima)
 *   submit-expense   – simpan pengeluaran driver (tol/parkir/makan/lain)
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

let sequelize: any = null;
try {
  // sequelize can be exported both as default and named `{ sequelize }`; cover both.
  const mod = require('../../../lib/sequelize');
  sequelize = mod?.sequelize || mod?.default || mod;
} catch (e) {
  // ignored — mock fallback
}

const q = async (sql: string, params: any = {}): Promise<any[]> => {
  if (!sequelize?.query) return [];
  try {
    const [rows] = await sequelize.query(sql, { replacements: params });
    return (rows as any[]) || [];
  } catch {
    return [];
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const userId   = String(session.user.id || '');
    const tenantId = String((session.user as any).tenantId || '');
    const action   = String(req.query.action || '');

    if (req.method === 'GET') {
      switch (action) {
        case 'profile':               return getProfile(res, userId, tenantId);
        case 'summary':               return getSummary(res, userId, tenantId);
        case 'today-trip':            return getTodayTrip(res, userId, tenantId);
        case 'trips':                 return getTrips(req, res, userId, tenantId);
        case 'vehicle':               return getVehicle(res, userId, tenantId);
        case 'fuel-log':              return getFuelLog(req, res, userId, tenantId);
        case 'maintenance':           return getMaintenance(res, userId, tenantId);
        case 'performance':           return getPerformance(res, userId, tenantId);
        case 'gps-history':           return getGpsHistory(req, res, userId, tenantId);
        case 'hr-summary':            return getHrSummary(res, userId, tenantId);
        case 'notifications':         return res.json({ success: true, data: mockNotifications() });
        case 'pre-trip-check-latest': return getLatestInspection(req, res, userId, tenantId);
        case 'pods':                  return getPods(req, res, userId, tenantId);
        case 'expenses':              return getExpenses(req, res, userId, tenantId);
        case 'shift-summary':         return getShiftSummary(req, res, userId, tenantId);
        default: return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    if (req.method === 'POST') {
      switch (action) {
        case 'clock-in':          return clockIn(res, userId, tenantId);
        case 'clock-out':         return clockOut(res, userId, tenantId);
        case 'start-trip':        return startTrip(req, res, userId, tenantId);
        case 'pause-trip':        return pauseTrip(req, res, userId, tenantId);
        case 'complete-trip':     return completeTrip(req, res, userId, tenantId);
        case 'push-gps':          return pushGps(req, res, userId, tenantId);
        case 'push-gps-batch':    return pushGpsBatch(req, res, userId, tenantId);
        case 'submit-fuel':       return submitFuel(req, res, userId, tenantId);
        case 'report-incident':   return reportIncident(req, res, userId, tenantId);
        case 'submit-inspection': return submitInspection(req, res, userId, tenantId);
        case 'submit-pod':        return submitPod(req, res, userId, tenantId);
        case 'submit-expense':    return submitExpense(req, res, userId, tenantId);
        default: return res.status(400).json({ success: false, error: 'Unknown action' });
      }
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[driver API]', e?.message || e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

/* =======================================================================
 *  Helper: resolve driver record for current user
 * ======================================================================= */
async function resolveDriver(userId: string, tenantId: string) {
  if (!sequelize) return null;
  const rows = await q(
    `SELECT d.*, b.name AS branch_name, b.code AS branch_code
       FROM fleet_drivers d
       LEFT JOIN branches b ON d.assigned_branch_id = b.id
      WHERE (d.user_id = :uid
          OR d.email = (SELECT email FROM users WHERE id = :uid))
        ${tenantId ? 'AND d.tenant_id = :tid' : ''}
      LIMIT 1`,
    { uid: userId, tid: tenantId }
  );
  return rows?.[0] || null;
}

/* =======================================================================
 *  GET: Profile (driver + branch + assigned vehicle)
 * ======================================================================= */
async function getProfile(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: mockProfile() });
  try {
    const drv = await resolveDriver(userId, tenantId);
    if (!drv) return res.json({ success: true, data: mockProfile() });

    // Assigned vehicle
    const [veh] = await q(
      `SELECT id, vehicle_number, license_plate, vehicle_type, brand, model, year,
              current_odometer_km, fuel_tank_capacity, registration_expiry, insurance_expiry
         FROM fleet_vehicles
        WHERE assigned_driver_id = :did AND status = 'active'
        LIMIT 1`,
      { did: drv.id }
    );

    return res.json({
      success: true,
      data: {
        id: drv.id,
        driver_number: drv.driver_number,
        full_name: drv.full_name,
        phone: drv.phone,
        email: drv.email,
        address: drv.address,
        license_number: drv.license_number,
        license_type: drv.license_type,
        license_expiry_date: drv.license_expiry_date,
        employment_type: drv.employment_type,
        hire_date: drv.hire_date,
        status: drv.status,
        availability_status: drv.availability_status,
        photo_url: drv.photo_url,
        branch_name: drv.branch_name,
        branch_code: drv.branch_code,
        assigned_vehicle: veh || null,
        total_deliveries: Number(drv.total_deliveries || 0),
        on_time_deliveries: Number(drv.on_time_deliveries || 0),
        total_distance_km: Number(drv.total_distance_km || 0),
        safety_score: Number(drv.safety_score || 0),
        customer_rating: Number(drv.customer_rating || 0),
      },
    });
  } catch {
    return res.json({ success: true, data: mockProfile() });
  }
}

/* =======================================================================
 *  GET: Dashboard summary (home-screen stats)
 * ======================================================================= */
async function getSummary(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: mockSummary() });
  try {
    const drv = await resolveDriver(userId, tenantId);
    if (!drv) return res.json({ success: true, data: mockSummary() });
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 7) + '-01';

    const [todayTrip] = await q(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status='scheduled')::int  AS scheduled,
              COUNT(*) FILTER (WHERE status='in_progress')::int AS in_progress,
              COUNT(*) FILTER (WHERE status='completed')::int   AS completed
         FROM fleet_route_assignments
        WHERE driver_id = :did
          AND DATE(scheduled_date) = :today`,
      { did: drv.id, today }
    );

    const [month] = await q(
      `SELECT COUNT(*) FILTER (WHERE status='completed')::int AS trips_completed,
              COALESCE(SUM(total_distance_km),0)::float AS distance_km,
              COALESCE(SUM(fuel_consumed_liters),0)::float AS fuel_liters
         FROM fleet_route_assignments
        WHERE driver_id = :did
          AND scheduled_date >= :start`,
      { did: drv.id, start: monthStart }
    );

    const [attToday] = await q(
      `SELECT check_in, check_out, status FROM employee_attendances
        WHERE (user_id = :uid OR employee_id IN
              (SELECT id FROM employees WHERE user_id = :uid OR email = (SELECT email FROM users WHERE id = :uid)))
          AND date = :today LIMIT 1`,
      { uid: userId, today }
    );

    return res.json({
      success: true,
      data: {
        today: todayTrip || { total: 0, scheduled: 0, in_progress: 0, completed: 0 },
        month: month || { trips_completed: 0, distance_km: 0, fuel_liters: 0 },
        attendance: attToday || null,
        safety_score: Number(drv.safety_score || 100),
        customer_rating: Number(drv.customer_rating || 0),
      },
    });
  } catch {
    return res.json({ success: true, data: mockSummary() });
  }
}

/* =======================================================================
 *  GET: Today's active trip (route assignment)
 * ======================================================================= */
async function getTodayTrip(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: mockTodayTrip() });
  try {
    const drv = await resolveDriver(userId, tenantId);
    if (!drv) return res.json({ success: true, data: mockTodayTrip() });
    const today = new Date().toISOString().split('T')[0];

    const rows = await q(
      `SELECT ra.id, ra.status, ra.scheduled_date, ra.scheduled_start_time,
              ra.actual_start_time, ra.actual_end_time, ra.total_distance_km,
              ra.fuel_consumed_liters, ra.notes,
              r.route_number, r.route_name, r.route_type,
              r.start_location, r.end_location, r.total_distance_km AS route_distance_km,
              r.estimated_duration_minutes, r.stops,
              v.id AS vehicle_id, v.vehicle_number, v.license_plate, v.current_odometer_km
         FROM fleet_route_assignments ra
         LEFT JOIN fleet_routes r   ON ra.route_id   = r.id
         LEFT JOIN fleet_vehicles v ON ra.vehicle_id = v.id
        WHERE ra.driver_id = :did
          AND DATE(ra.scheduled_date) = :today
        ORDER BY
          CASE ra.status WHEN 'in_progress' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END,
          ra.scheduled_start_time ASC NULLS LAST`,
      { did: drv.id, today }
    );
    return res.json({ success: true, data: rows || [] });
  } catch {
    return res.json({ success: true, data: mockTodayTrip() });
  }
}

/* =======================================================================
 *  GET: Trip history (by month)
 * ======================================================================= */
async function getTrips(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const month = String(req.query.month || new Date().toISOString().slice(0, 7));
  if (!sequelize) return res.json({ success: true, data: { trips: mockTodayTrip(), recap: { total: 3, completed: 1, distance_km: 85, on_time_rate: 95 } } });
  try {
    const drv = await resolveDriver(userId, tenantId);
    if (!drv) return res.json({ success: true, data: { trips: mockTodayTrip(), recap: { total: 3, completed: 1, distance_km: 85, on_time_rate: 95 } } });

    const trips = await q(
      `SELECT ra.id, ra.status, ra.scheduled_date, ra.scheduled_start_time,
              ra.actual_start_time, ra.actual_end_time, ra.total_distance_km,
              ra.fuel_consumed_liters,
              r.route_number, r.route_name, r.start_location, r.end_location,
              r.estimated_duration_minutes,
              v.vehicle_number, v.license_plate
         FROM fleet_route_assignments ra
         LEFT JOIN fleet_routes r   ON ra.route_id   = r.id
         LEFT JOIN fleet_vehicles v ON ra.vehicle_id = v.id
        WHERE ra.driver_id = :did
          AND TO_CHAR(ra.scheduled_date, 'YYYY-MM') = :month
        ORDER BY ra.scheduled_date DESC, ra.scheduled_start_time DESC`,
      { did: drv.id, month }
    );

    const [recap] = await q(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status='completed')::int AS completed,
              COUNT(*) FILTER (WHERE status='cancelled')::int AS cancelled,
              COALESCE(SUM(total_distance_km),0)::float AS distance_km,
              COALESCE(SUM(fuel_consumed_liters),0)::float AS fuel_liters
         FROM fleet_route_assignments
        WHERE driver_id = :did
          AND TO_CHAR(scheduled_date, 'YYYY-MM') = :month`,
      { did: drv.id, month }
    );

    const onTime = recap?.total > 0 ? Math.round(((recap.completed || 0) / recap.total) * 100) : 0;
    return res.json({ success: true, data: { trips, recap: { ...recap, on_time_rate: onTime }, month } });
  } catch {
    return res.json({ success: true, data: { trips: [], recap: { total: 0, completed: 0, distance_km: 0, fuel_liters: 0, on_time_rate: 0 } } });
  }
}

/* =======================================================================
 *  GET: Vehicle info
 * ======================================================================= */
async function getVehicle(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: mockVehicle() });
  try {
    const drv = await resolveDriver(userId, tenantId);
    if (!drv) return res.json({ success: true, data: mockVehicle() });

    const [veh] = await q(
      `SELECT v.*, b.name AS branch_name
         FROM fleet_vehicles v
         LEFT JOIN branches b ON v.assigned_branch_id = b.id
        WHERE v.assigned_driver_id = :did
        LIMIT 1`,
      { did: drv.id }
    );
    if (!veh) return res.json({ success: true, data: null });

    // doc expiry days-to-go
    const daysTo = (d: any) =>
      d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null;

    return res.json({
      success: true,
      data: {
        ...veh,
        registration_days_left: daysTo(veh.registration_expiry),
        insurance_days_left: daysTo(veh.insurance_expiry),
      },
    });
  } catch {
    return res.json({ success: true, data: mockVehicle() });
  }
}

/* =======================================================================
 *  GET: Fuel log (last 30 days for assigned vehicle)
 * ======================================================================= */
async function getFuelLog(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  if (!sequelize) return res.json({ success: true, data: mockFuelLog() });
  try {
    const drv = await resolveDriver(userId, tenantId);
    if (!drv) return res.json({ success: true, data: mockFuelLog() });

    const rows = await q(
      `SELECT ft.id, ft.transaction_date, ft.fuel_station, ft.fuel_type,
              ft.quantity_liters, ft.price_per_liter, ft.total_cost,
              ft.odometer_reading, ft.payment_method, ft.receipt_number, ft.notes,
              v.vehicle_number, v.license_plate
         FROM fleet_fuel_transactions ft
         LEFT JOIN fleet_vehicles v ON ft.vehicle_id = v.id
        WHERE ft.driver_id = :did
        ORDER BY ft.transaction_date DESC
        LIMIT :lim`,
      { did: drv.id, lim: limit }
    );

    const liters = rows.reduce((s, r: any) => s + Number(r.quantity_liters || 0), 0);
    const cost   = rows.reduce((s, r: any) => s + Number(r.total_cost || 0), 0);

    return res.json({ success: true, data: { records: rows, total_liters: liters, total_cost: cost } });
  } catch {
    return res.json({ success: true, data: mockFuelLog() });
  }
}

/* =======================================================================
 *  GET: Maintenance schedule for assigned vehicle
 * ======================================================================= */
async function getMaintenance(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: [] });
  try {
    const drv = await resolveDriver(userId, tenantId);
    if (!drv) return res.json({ success: true, data: [] });
    const [veh] = await q(
      `SELECT id, current_odometer_km FROM fleet_vehicles WHERE assigned_driver_id = :did LIMIT 1`,
      { did: drv.id }
    );
    if (!veh) return res.json({ success: true, data: [] });

    const rows = await q(
      `SELECT id, maintenance_type, interval_type, interval_kilometers, interval_months,
              last_service_date, last_service_odometer,
              next_service_date, next_service_odometer, status
         FROM fleet_maintenance_schedules
        WHERE vehicle_id = :vid
        ORDER BY next_service_date ASC NULLS LAST`,
      { vid: veh.id }
    );
    return res.json({ success: true, data: rows });
  } catch {
    return res.json({ success: true, data: [] });
  }
}

/* =======================================================================
 *  GET: Performance / KPI driver
 * ======================================================================= */
async function getPerformance(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: mockPerformance() });
  try {
    const drv = await resolveDriver(userId, tenantId);
    if (!drv) return res.json({ success: true, data: mockPerformance() });

    const total    = Number(drv.total_deliveries || 0);
    const onTime   = Number(drv.on_time_deliveries || 0);
    const distance = Number(drv.total_distance_km || 0);
    const onTimePct = total > 0 ? Math.round((onTime / total) * 1000) / 10 : 0;

    const [incidents] = await q(
      `SELECT COUNT(*)::int AS cnt FROM fleet_route_assignments
        WHERE driver_id = :did AND notes ILIKE '%incident%'`,
      { did: drv.id }
    ).catch(() => [{ cnt: 0 }]);

    return res.json({
      success: true,
      data: {
        totals: {
          deliveries: total,
          on_time: onTime,
          distance_km: distance,
          incidents: incidents?.cnt || 0,
        },
        metrics: [
          { name: 'Tepat Waktu',       actual: onTimePct,                     target: 95,  unit: '%',  trend: onTimePct >= 95 ? 'up' : 'down' },
          { name: 'Safety Score',      actual: Number(drv.safety_score || 0), target: 95,  unit: 'pt', trend: 'up' },
          { name: 'Rating Pelanggan',  actual: Number(drv.customer_rating || 0) * 20, target: 90, unit: '%', trend: 'up' },
          { name: 'Pengiriman Selesai',actual: total > 100 ? 100 : total,     target: 100, unit: '%',  trend: 'up' },
        ],
        overallScore: Math.round((onTimePct + Number(drv.safety_score || 0) + Number(drv.customer_rating || 0) * 20) / 3),
      },
    });
  } catch {
    return res.json({ success: true, data: mockPerformance() });
  }
}

/* =======================================================================
 *  GET: GPS history (latest N pings for map)
 * ======================================================================= */
async function getGpsHistory(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const since = String(req.query.since || ''); // ISO date
  if (!sequelize) return res.json({ success: true, data: mockGps() });
  try {
    const drv = await resolveDriver(userId, tenantId);
    if (!drv) return res.json({ success: true, data: mockGps() });

    const rows = await q(
      `SELECT id, latitude, longitude, altitude, speed_kmh, heading,
              accuracy_meters, timestamp, is_moving, is_idle
         FROM fleet_gps_locations
        WHERE driver_id = :did
          ${since ? 'AND timestamp >= :since' : ''}
        ORDER BY timestamp DESC
        LIMIT :lim`,
      { did: drv.id, lim: limit, ...(since ? { since } : {}) }
    );
    const points = rows.map((r: any) => ({
      ...r,
      latitude:  Number(r.latitude),
      longitude: Number(r.longitude),
      speed_kmh: Number(r.speed_kmh || 0),
      heading:   Number(r.heading || 0),
    }));
    const latest = points[0] || null;
    return res.json({ success: true, data: { points, latest, count: points.length } });
  } catch {
    return res.json({ success: true, data: mockGps() });
  }
}

/* =======================================================================
 *  GET: HR summary (attendance, leave, claims – ringkas)
 * ======================================================================= */
async function getHrSummary(res: NextApiResponse, userId: string, tenantId: string) {
  if (!sequelize) return res.json({ success: true, data: mockHr() });
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 7) + '-01';

    const [att] = await q(
      `SELECT check_in, check_out, status FROM employee_attendances
        WHERE (user_id = :uid OR employee_id IN
              (SELECT id FROM employees WHERE user_id = :uid OR email = (SELECT email FROM users WHERE id = :uid)))
          AND date = :today LIMIT 1`,
      { uid: userId, today }
    );

    const monthRows = await q(
      `SELECT status, COUNT(*)::int AS count FROM employee_attendances
        WHERE (user_id = :uid OR employee_id IN
              (SELECT id FROM employees WHERE user_id = :uid OR email = (SELECT email FROM users WHERE id = :uid)))
          AND date >= :start AND date <= :today
        GROUP BY status`,
      { uid: userId, start: monthStart, today }
    );
    const month: any = { present: 0, late: 0, absent: 0, leave: 0, wfh: 0 };
    monthRows.forEach((r: any) => (month[r.status] = r.count));

    const [pendingLeave] = await q(
      `SELECT COUNT(*)::int AS cnt FROM leave_requests lr
         LEFT JOIN employees e ON lr.employee_id = e.id
        WHERE (e.user_id = :uid OR e.email = (SELECT email FROM users WHERE id = :uid))
          AND lr.status = 'pending'`,
      { uid: userId }
    );
    const [pendingClaims] = await q(
      `SELECT COUNT(*)::int AS cnt FROM employee_claims c
         LEFT JOIN employees e ON c.employee_id = e.id
        WHERE (e.user_id = :uid OR e.email = (SELECT email FROM users WHERE id = :uid))
          AND c.status = 'pending'`,
      { uid: userId }
    );

    return res.json({
      success: true,
      data: {
        today: att || null,
        month,
        pendingLeave: pendingLeave?.cnt || 0,
        pendingClaims: pendingClaims?.cnt || 0,
      },
    });
  } catch {
    return res.json({ success: true, data: mockHr() });
  }
}

/* =======================================================================
 *  POST: clock-in / clock-out
 * ======================================================================= */
async function clockIn(res: NextApiResponse, userId: string, tenantId: string) {
  const hhmm = new Date().toTimeString().substring(0, 5);
  if (!sequelize) return res.json({ success: true, data: { check_in: hhmm } });
  try {
    const today = new Date().toISOString().split('T')[0];
    const now   = new Date().toISOString();
    await q(
      `INSERT INTO employee_attendances (user_id, date, check_in, status, created_at, updated_at)
       VALUES (:uid, :today, :now, 'present', :now, :now)
       ON CONFLICT (user_id, date) DO UPDATE SET check_in = :now, status='present', updated_at=:now`,
      { uid: userId, today, now }
    );
    return res.json({ success: true, data: { check_in: hhmm } });
  } catch {
    return res.json({ success: true, data: { check_in: hhmm } });
  }
}

async function clockOut(res: NextApiResponse, userId: string, tenantId: string) {
  const hhmm = new Date().toTimeString().substring(0, 5);
  if (!sequelize) return res.json({ success: true, data: { check_out: hhmm } });
  try {
    const today = new Date().toISOString().split('T')[0];
    const now   = new Date().toISOString();
    await q(
      `UPDATE employee_attendances SET check_out=:now, updated_at=:now
        WHERE user_id=:uid AND date=:today`,
      { uid: userId, today, now }
    );
    return res.json({ success: true, data: { check_out: hhmm } });
  } catch {
    return res.json({ success: true, data: { check_out: hhmm } });
  }
}

/* =======================================================================
 *  POST: start-trip / pause-trip / complete-trip
 * ======================================================================= */
async function startTrip(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { assignment_id, latitude, longitude, odometer } = req.body || {};
  if (!assignment_id) return res.status(400).json({ success: false, error: 'assignment_id wajib diisi' });
  if (!sequelize) return res.json({ success: true, message: 'Trip dimulai (mock)' });

  try {
    const drv = await resolveDriver(userId, tenantId);
    if (!drv) return res.status(404).json({ success: false, error: 'Driver tidak ditemukan' });

    await q(
      `UPDATE fleet_route_assignments
          SET status='in_progress', actual_start_time=NOW(), updated_at=NOW()
        WHERE id=:id AND driver_id=:did`,
      { id: assignment_id, did: drv.id }
    );
    await q(
      `UPDATE fleet_drivers SET availability_status='on_duty', updated_at=NOW() WHERE id=:did`,
      { did: drv.id }
    );

    if (typeof latitude === 'number' && typeof longitude === 'number') {
      await insertGps(drv.id, null, latitude, longitude, 0, 0, null);
    }

    if (odometer) {
      await q(
        `UPDATE fleet_vehicles SET current_odometer_km=:odo, updated_at=NOW()
          WHERE id=(SELECT vehicle_id FROM fleet_route_assignments WHERE id=:id)`,
        { odo: odometer, id: assignment_id }
      );
    }

    // Auto HRIS clock-in
    await autoAttendanceCheckIn(userId).catch(() => {});

    return res.json({ success: true, message: 'Trip dimulai. Selamat bertugas!' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Gagal memulai trip', details: e?.message });
  }
}

async function pauseTrip(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { assignment_id, reason } = req.body || {};
  if (!assignment_id) return res.status(400).json({ success: false, error: 'assignment_id wajib diisi' });
  if (!sequelize) return res.json({ success: true, message: 'Trip di-pause (mock)' });
  try {
    await q(
      `UPDATE fleet_route_assignments
          SET notes = COALESCE(notes,'') || :note, updated_at=NOW()
        WHERE id=:id`,
      { id: assignment_id, note: `\n[PAUSE ${new Date().toISOString()}] ${reason || ''}` }
    );
    return res.json({ success: true, message: 'Istirahat tercatat' });
  } catch {
    return res.status(500).json({ success: false, error: 'Gagal pause trip' });
  }
}

async function completeTrip(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { assignment_id, latitude, longitude, odometer, distance_km, fuel_liters, notes } = req.body || {};
  if (!assignment_id) return res.status(400).json({ success: false, error: 'assignment_id wajib diisi' });
  if (!sequelize) return res.json({ success: true, message: 'Trip selesai (mock)' });

  try {
    const drv = await resolveDriver(userId, tenantId);
    if (!drv) return res.status(404).json({ success: false, error: 'Driver tidak ditemukan' });

    await q(
      `UPDATE fleet_route_assignments
          SET status='completed', actual_end_time=NOW(),
              total_distance_km = COALESCE(:dist, total_distance_km),
              fuel_consumed_liters = COALESCE(:fuel, fuel_consumed_liters),
              notes = COALESCE(NULLIF(:notes,''), notes),
              updated_at=NOW()
        WHERE id=:id AND driver_id=:did`,
      { id: assignment_id, did: drv.id, dist: distance_km || null, fuel: fuel_liters || null, notes: notes || '' }
    );
    await q(
      `UPDATE fleet_drivers
          SET availability_status='available',
              total_deliveries = COALESCE(total_deliveries,0) + 1,
              on_time_deliveries = COALESCE(on_time_deliveries,0) + 1,
              total_distance_km = COALESCE(total_distance_km,0) + COALESCE(:dist,0),
              updated_at=NOW()
        WHERE id=:did`,
      { did: drv.id, dist: distance_km || 0 }
    );
    if (odometer) {
      await q(
        `UPDATE fleet_vehicles SET current_odometer_km=:odo, updated_at=NOW()
          WHERE id=(SELECT vehicle_id FROM fleet_route_assignments WHERE id=:id)`,
        { odo: odometer, id: assignment_id }
      );
    }
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      await insertGps(drv.id, null, latitude, longitude, 0, 0, null);
    }

    // Auto HRIS check-out (driver pulang kerja setelah trip terakhir selesai)
    await autoAttendanceCheckOut(userId).catch(() => {});

    return res.json({ success: true, message: 'Trip berhasil diselesaikan' });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Gagal menyelesaikan trip', details: e?.message });
  }
}

/* =======================================================================
 *  POST: push-gps (dari device / interval)
 * ======================================================================= */
async function pushGps(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { latitude, longitude, speed_kmh, heading, accuracy_meters } = req.body || {};
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ success: false, error: 'latitude/longitude required' });
  }
  if (!sequelize) return res.json({ success: true, data: { latitude, longitude, ts: new Date().toISOString() } });
  try {
    const drv = await resolveDriver(userId, tenantId);
    if (!drv) return res.status(404).json({ success: false, error: 'Driver tidak ditemukan' });
    const [veh] = await q(
      `SELECT id FROM fleet_vehicles WHERE assigned_driver_id=:did LIMIT 1`,
      { did: drv.id }
    );
    await insertGps(drv.id, veh?.id || null, latitude, longitude, speed_kmh || 0, heading || 0, accuracy_meters || null);
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Gagal kirim GPS' });
  }
}

async function insertGps(
  driverId: string,
  vehicleId: string | null,
  lat: number,
  lng: number,
  speed: number,
  heading: number,
  accuracy: number | null
) {
  if (!sequelize) return;
  try {
    await q(
      `INSERT INTO fleet_gps_locations
         (vehicle_id, driver_id, latitude, longitude, speed_kmh, heading, accuracy_meters,
          timestamp, is_moving, is_idle)
       VALUES (:vid, :did, :lat, :lng, :spd, :hdg, :acc, NOW(), :mov, :idle)`,
      { vid: vehicleId, did: driverId, lat, lng, spd: speed, hdg: heading, acc: accuracy,
        mov: (speed || 0) > 2, idle: (speed || 0) <= 2 }
    );
  } catch { /* swallow */ }
}

/* =======================================================================
 *  POST: submit-fuel
 * ======================================================================= */
async function submitFuel(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { fuel_station, fuel_type = 'diesel', quantity_liters, price_per_liter,
          odometer_reading, payment_method = 'cash', receipt_number, notes } = req.body || {};
  if (!quantity_liters || !price_per_liter) {
    return res.status(400).json({ success: false, error: 'quantity_liters dan price_per_liter wajib diisi' });
  }
  const total = Number(quantity_liters) * Number(price_per_liter);
  if (!sequelize) return res.json({ success: true, data: { quantity_liters, price_per_liter, total_cost: total } });

  try {
    const drv = await resolveDriver(userId, tenantId);
    if (!drv) return res.status(404).json({ success: false, error: 'Driver tidak ditemukan' });
    const [veh] = await q(
      `SELECT id FROM fleet_vehicles WHERE assigned_driver_id=:did LIMIT 1`,
      { did: drv.id }
    );
    if (!veh) return res.status(400).json({ success: false, error: 'Tidak ada kendaraan ter-assign' });

    await q(
      `INSERT INTO fleet_fuel_transactions
         (vehicle_id, driver_id, transaction_type, transaction_date,
          fuel_station, fuel_type, quantity_liters, price_per_liter, total_cost,
          odometer_reading, payment_method, receipt_number, notes, tenant_id,
          created_at, updated_at)
       VALUES (:vid, :did, 'refill', NOW(),
          :station, :ftype, :qty, :price, :total,
          :odo, :pm, :rcpt, :notes, :tid,
          NOW(), NOW())`,
      { vid: veh.id, did: drv.id, station: fuel_station || null, ftype: fuel_type,
        qty: quantity_liters, price: price_per_liter, total,
        odo: odometer_reading || null, pm: payment_method, rcpt: receipt_number || null,
        notes: notes || null, tid: tenantId || null }
    );
    if (odometer_reading) {
      await q(
        `UPDATE fleet_vehicles SET current_odometer_km=:odo, updated_at=NOW() WHERE id=:vid`,
        { odo: odometer_reading, vid: veh.id }
      );
    }
    return res.json({ success: true, message: 'Transaksi BBM tercatat', data: { total_cost: total } });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Gagal simpan transaksi BBM', details: e?.message });
  }
}

/* =======================================================================
 *  POST: report-incident (disimpan ke notes assignment atau tabel log)
 * ======================================================================= */
async function reportIncident(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { assignment_id, incident_type, description, latitude, longitude } = req.body || {};
  if (!incident_type || !description) {
    return res.status(400).json({ success: false, error: 'incident_type & description wajib diisi' });
  }
  if (!sequelize) return res.json({ success: true, message: 'Insiden dilaporkan (mock)' });
  try {
    const drv = await resolveDriver(userId, tenantId);
    if (!drv) return res.status(404).json({ success: false, error: 'Driver tidak ditemukan' });

    const note = `\n[INCIDENT ${incident_type.toUpperCase()} ${new Date().toISOString()}] ${description}${
      latitude && longitude ? ` @${latitude},${longitude}` : ''
    }`;
    if (assignment_id) {
      await q(
        `UPDATE fleet_route_assignments SET notes=COALESCE(notes,'') || :n, updated_at=NOW() WHERE id=:id AND driver_id=:did`,
        { n: note, id: assignment_id, did: drv.id }
      );
    }
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      await insertGps(drv.id, null, latitude, longitude, 0, 0, null);
    }
    return res.json({ success: true, message: 'Insiden berhasil dilaporkan ke pusat dispatch' });
  } catch {
    return res.status(500).json({ success: false, error: 'Gagal melaporkan insiden' });
  }
}

/* =======================================================================
 *  Auto-attendance helpers (dipakai saat start-trip / complete-trip)
 * ======================================================================= */
async function autoAttendanceCheckIn(userId: string) {
  if (!sequelize) return;
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  await q(
    `INSERT INTO employee_attendances (user_id, date, check_in, status, created_at, updated_at)
     VALUES (:uid, :today, :now, 'present', :now, :now)
     ON CONFLICT (user_id, date) DO UPDATE
        SET check_in  = COALESCE(employee_attendances.check_in, :now),
            status    = 'present',
            updated_at = :now`,
    { uid: userId, today, now }
  );
}

async function autoAttendanceCheckOut(userId: string) {
  if (!sequelize) return;
  const today = new Date().toISOString().split('T')[0];
  const now   = new Date().toISOString();
  // Hanya isi check_out kalau belum ada
  await q(
    `UPDATE employee_attendances
        SET check_out = :now, updated_at = :now
      WHERE user_id = :uid
        AND date    = :today
        AND (check_out IS NULL)`,
    { uid: userId, today, now }
  );
}

/* =======================================================================
 *  GET: latest pre-trip inspection (today / per vehicle)
 * ======================================================================= */
async function getLatestInspection(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const assignmentId = String(req.query.assignment_id || '');
  if (!sequelize) {
    return res.json({ success: true, data: null });
  }
  try {
    const drv = await resolveDriver(userId, tenantId);
    if (!drv) return res.json({ success: true, data: null });

    const today = new Date().toISOString().split('T')[0];
    const rows = await q(
      `SELECT id, inspection_type, overall_status, checklist, issues_found,
              odometer_reading, fuel_level_percent, notes, created_at, assignment_id
         FROM fleet_vehicle_inspections
        WHERE driver_id = :did
          ${assignmentId ? 'AND assignment_id = :aid' : 'AND DATE(created_at) = :today'}
        ORDER BY created_at DESC
        LIMIT 1`,
      { did: drv.id, aid: assignmentId, today }
    );
    return res.json({ success: true, data: rows?.[0] || null });
  } catch {
    return res.json({ success: true, data: null });
  }
}

/* =======================================================================
 *  POST: submit pre-trip inspection
 * ======================================================================= */
async function submitInspection(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const {
    assignment_id, inspection_type = 'pre_trip',
    odometer_reading, fuel_level_percent, checklist = {}, issues_found,
    overall_status = 'pass', photos, notes, latitude, longitude,
  } = req.body || {};

  if (!checklist || Object.keys(checklist).length === 0) {
    return res.status(400).json({ success: false, error: 'checklist wajib diisi' });
  }
  if (!sequelize) return res.json({ success: true, message: 'Inspeksi tersimpan (mock)', data: { id: `insp-${Date.now()}` } });

  try {
    const drv = await resolveDriver(userId, tenantId);
    if (!drv) return res.status(404).json({ success: false, error: 'Driver tidak ditemukan' });

    const [veh] = await q(
      `SELECT id FROM fleet_vehicles WHERE assigned_driver_id=:did LIMIT 1`,
      { did: drv.id }
    );

    const [ins] = await q(
      `INSERT INTO fleet_vehicle_inspections
         (tenant_id, assignment_id, driver_id, vehicle_id, inspection_type,
          odometer_reading, fuel_level_percent, checklist, issues_found,
          overall_status, photos, notes, latitude, longitude, created_at, updated_at)
       VALUES (:tid, :aid, :did, :vid, :itype,
          :odo, :fuel, :checklist::jsonb, :issues::jsonb,
          :ostatus, :photos::jsonb, :notes, :lat, :lng, NOW(), NOW())
       RETURNING id, overall_status, created_at`,
      {
        tid: tenantId || null, aid: assignment_id || null, did: drv.id, vid: veh?.id || null,
        itype: inspection_type, odo: odometer_reading || null, fuel: fuel_level_percent || null,
        checklist: JSON.stringify(checklist || {}),
        issues: JSON.stringify(issues_found || []),
        ostatus: overall_status, photos: JSON.stringify(photos || []),
        notes: notes || null, lat: latitude || null, lng: longitude || null,
      }
    );

    // update odometer kendaraan jika dikirim
    if (odometer_reading && veh?.id) {
      await q(
        `UPDATE fleet_vehicles SET current_odometer_km=:odo, updated_at=NOW() WHERE id=:vid`,
        { odo: odometer_reading, vid: veh.id }
      );
    }

    return res.json({
      success: true,
      message: overall_status === 'fail'
        ? 'Inspeksi tercatat — kendaraan TIDAK LAYAK (hubungi workshop)'
        : 'Inspeksi pre-trip tercatat',
      data: ins,
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Gagal simpan inspeksi', details: e?.message });
  }
}

/* =======================================================================
 *  GET: list PODs (by assignment or last 30 days)
 * ======================================================================= */
async function getPods(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const assignmentId = String(req.query.assignment_id || '');
  if (!sequelize) return res.json({ success: true, data: [] });
  try {
    const drv = await resolveDriver(userId, tenantId);
    if (!drv) return res.json({ success: true, data: [] });
    const rows = await q(
      `SELECT id, assignment_id, stop_index, recipient_name, recipient_phone, recipient_role,
              reference_number, photos, items_delivered, status,
              delivered_at, latitude, longitude, notes
         FROM fleet_delivery_proofs
        WHERE driver_id = :did
          ${assignmentId ? 'AND assignment_id = :aid' : 'AND delivered_at >= NOW() - INTERVAL \'30 days\''}
        ORDER BY delivered_at DESC
        LIMIT 200`,
      { did: drv.id, aid: assignmentId }
    );
    return res.json({ success: true, data: rows });
  } catch {
    return res.json({ success: true, data: [] });
  }
}

/* =======================================================================
 *  POST: submit Proof of Delivery
 * ======================================================================= */
async function submitPod(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const {
    assignment_id, stop_index, recipient_name, recipient_phone, recipient_role,
    reference_number, signature_data, photos, items_delivered,
    status = 'delivered', latitude, longitude, notes,
  } = req.body || {};

  if (!recipient_name) return res.status(400).json({ success: false, error: 'recipient_name wajib diisi' });
  if (!sequelize) return res.json({ success: true, message: 'POD tersimpan (mock)', data: { id: `pod-${Date.now()}` } });

  try {
    const drv = await resolveDriver(userId, tenantId);
    if (!drv) return res.status(404).json({ success: false, error: 'Driver tidak ditemukan' });
    const [veh] = await q(
      `SELECT id FROM fleet_vehicles WHERE assigned_driver_id=:did LIMIT 1`,
      { did: drv.id }
    );

    const [pod] = await q(
      `INSERT INTO fleet_delivery_proofs
         (tenant_id, assignment_id, driver_id, vehicle_id, stop_index,
          recipient_name, recipient_phone, recipient_role, reference_number,
          signature_data, photos, items_delivered, status,
          delivered_at, latitude, longitude, notes, created_at, updated_at)
       VALUES (:tid, :aid, :did, :vid, :stop,
          :rname, :rphone, :rrole, :ref,
          :sig, :photos::jsonb, :items::jsonb, :status,
          NOW(), :lat, :lng, :notes, NOW(), NOW())
       RETURNING id, reference_number, delivered_at`,
      {
        tid: tenantId || null, aid: assignment_id || null, did: drv.id, vid: veh?.id || null,
        stop: stop_index ?? null,
        rname: recipient_name, rphone: recipient_phone || null,
        rrole: recipient_role || null, ref: reference_number || null,
        sig: signature_data || null,
        photos: JSON.stringify(photos || []),
        items: JSON.stringify(items_delivered || []),
        status, lat: latitude || null, lng: longitude || null, notes: notes || null,
      }
    );
    return res.json({ success: true, message: 'Bukti pengiriman tersimpan', data: pod });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Gagal simpan POD', details: e?.message });
  }
}

/* =======================================================================
 *  GET: driver expenses (this month by default)
 * ======================================================================= */
async function getExpenses(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const month = String(req.query.month || new Date().toISOString().slice(0, 7));
  const assignmentId = String(req.query.assignment_id || '');
  if (!sequelize) return res.json({ success: true, data: { records: [], summary: { total_amount: 0, by_category: {} } } });
  try {
    const drv = await resolveDriver(userId, tenantId);
    if (!drv) return res.json({ success: true, data: { records: [], summary: { total_amount: 0, by_category: {} } } });

    const rows = await q(
      `SELECT id, assignment_id, expense_date, category, description,
              amount, currency, receipt_number, receipt_photo_url,
              payment_method, status, approved_at, rejection_reason, notes
         FROM fleet_driver_expenses
        WHERE driver_id = :did
          ${assignmentId ? 'AND assignment_id = :aid' : `AND TO_CHAR(expense_date, 'YYYY-MM') = :month`}
        ORDER BY expense_date DESC, created_at DESC
        LIMIT 300`,
      { did: drv.id, month, aid: assignmentId }
    );

    const by_category: Record<string, number> = {};
    let total_amount = 0;
    for (const r of rows as any[]) {
      const amt = Number(r.amount || 0);
      total_amount += amt;
      by_category[r.category] = (by_category[r.category] || 0) + amt;
    }
    return res.json({ success: true, data: { records: rows, summary: { total_amount, by_category } } });
  } catch {
    return res.json({ success: true, data: { records: [], summary: { total_amount: 0, by_category: {} } } });
  }
}

/* =======================================================================
 *  POST: submit driver expense
 * ======================================================================= */
async function submitExpense(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const {
    assignment_id, category, description, amount, currency = 'IDR',
    receipt_number, receipt_photo_url, payment_method = 'cash',
    latitude, longitude, notes, expense_date,
  } = req.body || {};

  if (!category) return res.status(400).json({ success: false, error: 'category wajib diisi' });
  if (amount == null || Number(amount) <= 0) {
    return res.status(400).json({ success: false, error: 'amount harus > 0' });
  }
  if (!sequelize) return res.json({ success: true, message: 'Expense tersimpan (mock)', data: { id: `exp-${Date.now()}` } });

  try {
    const drv = await resolveDriver(userId, tenantId);
    if (!drv) return res.status(404).json({ success: false, error: 'Driver tidak ditemukan' });
    const [veh] = await q(
      `SELECT id FROM fleet_vehicles WHERE assigned_driver_id=:did LIMIT 1`,
      { did: drv.id }
    );

    const [exp] = await q(
      `INSERT INTO fleet_driver_expenses
         (tenant_id, assignment_id, driver_id, vehicle_id, expense_date,
          category, description, amount, currency, receipt_number, receipt_photo_url,
          payment_method, status, latitude, longitude, notes, created_at, updated_at)
       VALUES (:tid, :aid, :did, :vid, COALESCE(:edate::date, CURRENT_DATE),
          :cat, :desc, :amt, :cur, :rcpt, :rphoto,
          :pm, 'submitted', :lat, :lng, :notes, NOW(), NOW())
       RETURNING id, category, amount, status, expense_date`,
      {
        tid: tenantId || null, aid: assignment_id || null, did: drv.id, vid: veh?.id || null,
        edate: expense_date || null, cat: category, desc: description || null,
        amt: Number(amount), cur: currency, rcpt: receipt_number || null,
        rphoto: receipt_photo_url || null, pm: payment_method,
        lat: latitude || null, lng: longitude || null, notes: notes || null,
      }
    );
    return res.json({ success: true, message: 'Expense tersimpan, menunggu persetujuan', data: exp });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Gagal simpan expense', details: e?.message });
  }
}

/* =======================================================================
 *  POST: push-gps-batch (dari IndexedDB offline queue)
 * ======================================================================= */
async function pushGpsBatch(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const { points } = req.body || {};
  if (!Array.isArray(points) || points.length === 0) {
    return res.status(400).json({ success: false, error: 'points[] required' });
  }
  if (!sequelize) return res.json({ success: true, data: { saved: points.length, mock: true } });

  try {
    const drv = await resolveDriver(userId, tenantId);
    if (!drv) return res.status(404).json({ success: false, error: 'Driver tidak ditemukan' });
    const [veh] = await q(
      `SELECT id FROM fleet_vehicles WHERE assigned_driver_id=:did LIMIT 1`,
      { did: drv.id }
    );

    let saved = 0;
    for (const p of points.slice(0, 500)) {
      const lat = Number(p.latitude), lng = Number(p.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      try {
        await q(
          `INSERT INTO fleet_gps_locations
             (vehicle_id, driver_id, latitude, longitude, speed_kmh, heading, accuracy_meters,
              timestamp, is_moving, is_idle)
           VALUES (:vid, :did, :lat, :lng, :spd, :hdg, :acc, :ts, :mov, :idle)`,
          {
            vid: veh?.id || null, did: drv.id, lat, lng,
            spd: Number(p.speed_kmh || 0), hdg: Number(p.heading || 0),
            acc: p.accuracy_meters ?? null,
            ts: p.timestamp ? new Date(p.timestamp).toISOString() : new Date().toISOString(),
            mov: (p.speed_kmh || 0) > 2, idle: (p.speed_kmh || 0) <= 2,
          }
        );
        saved++;
      } catch { /* skip bad ping */ }
    }
    return res.json({ success: true, data: { saved, received: points.length } });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Gagal simpan batch GPS', details: e?.message });
  }
}

/* =======================================================================
 *  GET: Shift / hours summary (HRIS integration untuk payroll)
 *
 *  Menghitung:
 *   - days_worked        (jumlah hari dengan attendance present/late)
 *   - total_hours        (sum check_out - check_in, cap 16 jam/hari)
 *   - regular_hours      (≤ 8 jam/hari)
 *   - overtime_hours     (> 8 jam/hari)
 *   - trip metrics (completed, distance, fuel)
 *   - delivery count (POD)
 *   - expense approved (klaim reimburse yg sudah disetujui)
 * ======================================================================= */
async function getShiftSummary(req: NextApiRequest, res: NextApiResponse, userId: string, tenantId: string) {
  const month = String(req.query.month || new Date().toISOString().slice(0, 7));
  const monthStart = `${month}-01`;
  const monthEnd = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 1)
    .toISOString().slice(0, 10);

  if (!sequelize) return res.json({ success: true, data: mockShiftSummary(month) });

  try {
    const drv = await resolveDriver(userId, tenantId);
    if (!drv) return res.json({ success: true, data: mockShiftSummary(month) });

    // Attendance rows
    const attRows = await q(
      `SELECT date, check_in, check_out, status
         FROM employee_attendances
        WHERE (user_id = :uid OR employee_id IN
              (SELECT id FROM employees WHERE user_id = :uid OR email = (SELECT email FROM users WHERE id = :uid)))
          AND date >= :start AND date < :end
        ORDER BY date ASC`,
      { uid: userId, start: monthStart, end: monthEnd }
    );

    let daysWorked = 0;
    let totalMs = 0;
    let regularMs = 0;
    let overtimeMs = 0;
    let lateDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    const daily: any[] = [];

    const HOUR = 3600_000;
    const DAY_CAP = 16 * HOUR;
    const REG_CAP = 8 * HOUR;

    for (const a of attRows as any[]) {
      if (a.status === 'leave')       leaveDays++;
      if (a.status === 'absent')      absentDays++;
      if (a.status === 'late')        lateDays++;
      if (['present', 'late', 'wfh'].includes(a.status)) daysWorked++;

      let workMs = 0;
      if (a.check_in && a.check_out) {
        const inT  = new Date(a.check_in).getTime();
        const outT = new Date(a.check_out).getTime();
        if (outT > inT) workMs = Math.min(outT - inT, DAY_CAP);
      }
      totalMs  += workMs;
      const reg = Math.min(workMs, REG_CAP);
      regularMs  += reg;
      overtimeMs += Math.max(0, workMs - REG_CAP);
      daily.push({
        date: a.date,
        status: a.status,
        check_in: a.check_in,
        check_out: a.check_out,
        hours: Math.round((workMs / HOUR) * 100) / 100,
        overtime: Math.max(0, Math.round(((workMs - REG_CAP) / HOUR) * 100) / 100),
      });
    }

    // Trip aggregates from route assignments
    const [tripSum] = await q(
      `SELECT COUNT(*) FILTER (WHERE status='completed')::int     AS trips_completed,
              COUNT(*) FILTER (WHERE status='cancelled')::int     AS trips_cancelled,
              COALESCE(SUM(total_distance_km),0)::float           AS distance_km,
              COALESCE(SUM(fuel_consumed_liters),0)::float        AS fuel_liters,
              COALESCE(SUM(EXTRACT(EPOCH FROM (actual_end_time - actual_start_time))/3600),0)::float AS driving_hours
         FROM fleet_route_assignments
        WHERE driver_id = :did AND TO_CHAR(scheduled_date,'YYYY-MM') = :month`,
      { did: drv.id, month }
    );

    const [podSum] = await q(
      `SELECT COUNT(*)::int AS pod_count
         FROM fleet_delivery_proofs
        WHERE driver_id = :did AND TO_CHAR(delivered_at,'YYYY-MM') = :month`,
      { did: drv.id, month }
    );

    const [expSum] = await q(
      `SELECT COUNT(*)::int                                   AS total_count,
              COALESCE(SUM(amount) FILTER (WHERE status='approved'),0)::float AS approved_amount,
              COALESCE(SUM(amount) FILTER (WHERE status='paid'),0)::float     AS paid_amount,
              COALESCE(SUM(amount) FILTER (WHERE status='submitted'),0)::float AS pending_amount
         FROM fleet_driver_expenses
        WHERE driver_id = :did AND TO_CHAR(expense_date,'YYYY-MM') = :month`,
      { did: drv.id, month }
    );

    return res.json({
      success: true,
      data: {
        month,
        days_worked:    daysWorked,
        late_days:      lateDays,
        absent_days:    absentDays,
        leave_days:     leaveDays,
        total_hours:    Math.round((totalMs / HOUR) * 100) / 100,
        regular_hours:  Math.round((regularMs / HOUR) * 100) / 100,
        overtime_hours: Math.round((overtimeMs / HOUR) * 100) / 100,
        avg_hours_per_day: daysWorked > 0
          ? Math.round((totalMs / HOUR / daysWorked) * 100) / 100
          : 0,
        trips: tripSum || { trips_completed: 0, trips_cancelled: 0, distance_km: 0, fuel_liters: 0, driving_hours: 0 },
        pod_count: podSum?.pod_count || 0,
        expense: expSum || { total_count: 0, approved_amount: 0, paid_amount: 0, pending_amount: 0 },
        daily,
      },
    });
  } catch (e: any) {
    console.warn('[shift-summary]', e?.message || e);
    return res.json({ success: true, data: mockShiftSummary(month) });
  }
}

function mockShiftSummary(month: string) {
  return {
    month,
    days_worked: 22,
    late_days: 1,
    absent_days: 0,
    leave_days: 1,
    total_hours: 198,
    regular_hours: 176,
    overtime_hours: 22,
    avg_hours_per_day: 9,
    trips: { trips_completed: 42, trips_cancelled: 0, distance_km: 3820, fuel_liters: 520, driving_hours: 120 },
    pod_count: 45,
    expense: { total_count: 18, approved_amount: 980000, paid_amount: 850000, pending_amount: 130000 },
    daily: [],
  };
}

/* =======================================================================
 *  MOCK DATA (dev fallback)
 * ======================================================================= */
function mockProfile() {
  return {
    id: 'drv-001',
    driver_number: 'DRV-001',
    full_name: 'Budi Santoso',
    phone: '0812-3456-7890',
    email: 'budi.santoso@example.com',
    address: 'Jl. Raya Cikarang No. 123, Bekasi',
    license_number: 'SIM-B1-001-2020',
    license_type: 'SIM B1',
    license_expiry_date: '2027-03-10',
    employment_type: 'permanent',
    hire_date: '2020-06-01',
    status: 'active',
    availability_status: 'on_duty',
    photo_url: null,
    branch_name: 'Gudang Pusat Cikarang',
    branch_code: 'GDG-CKR',
    assigned_vehicle: {
      id: 'veh-001',
      vehicle_number: 'VH-001',
      license_plate: 'B 1234 XYZ',
      vehicle_type: 'truck',
      brand: 'Mitsubishi',
      model: 'Colt Diesel FE 74',
      year: 2022,
      current_odometer_km: 45230,
      registration_expiry: '2027-01-15',
      insurance_expiry: '2026-12-31',
    },
    total_deliveries: 1250,
    on_time_deliveries: 1188,
    total_distance_km: 125000,
    safety_score: 98.5,
    customer_rating: 4.8,
  };
}

function mockSummary() {
  return {
    today: { total: 3, scheduled: 1, in_progress: 1, completed: 1 },
    month: { trips_completed: 42, distance_km: 3820, fuel_liters: 520 },
    attendance: { check_in: '07:45', check_out: null, status: 'present' },
    safety_score: 98.5,
    customer_rating: 4.8,
  };
}

function mockTodayTrip() {
  return [
    {
      id: 'ra-001',
      status: 'in_progress',
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_start_time: '08:00',
      actual_start_time: new Date(Date.now() - 3600000).toISOString(),
      total_distance_km: null,
      fuel_consumed_liters: null,
      route_number: 'RT-JKT-BDG-01',
      route_name: 'Jakarta – Bandung via Tol',
      route_type: 'delivery',
      start_location: 'Gudang Cikarang',
      end_location: 'Cabang Bandung',
      route_distance_km: 145,
      estimated_duration_minutes: 180,
      stops: [
        { name: 'Rest Area KM-57', lat: -6.4682, lng: 107.1456 },
        { name: 'Warehouse Bandung Timur', lat: -6.9175, lng: 107.7306 },
      ],
      vehicle_id: 'veh-001',
      vehicle_number: 'VH-001',
      license_plate: 'B 1234 XYZ',
      current_odometer_km: 45230,
    },
    {
      id: 'ra-002',
      status: 'scheduled',
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_start_time: '14:00',
      route_number: 'RT-BDG-JKT-01',
      route_name: 'Bandung – Jakarta (Return)',
      route_type: 'pickup',
      start_location: 'Cabang Bandung',
      end_location: 'Gudang Cikarang',
      route_distance_km: 145,
      estimated_duration_minutes: 180,
      stops: [],
      vehicle_number: 'VH-001',
      license_plate: 'B 1234 XYZ',
    },
    {
      id: 'ra-003',
      status: 'completed',
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_start_time: '05:30',
      actual_start_time: new Date(Date.now() - 10800000).toISOString(),
      actual_end_time: new Date(Date.now() - 7200000).toISOString(),
      total_distance_km: 45.5,
      fuel_consumed_liters: 6.2,
      route_number: 'RT-CKR-LCL-04',
      route_name: 'Cikarang Lokal – Delivery Pagi',
      route_type: 'multi_stop',
      start_location: 'Gudang Cikarang',
      end_location: 'Gudang Cikarang',
      stops: [],
    },
  ];
}

function mockVehicle() {
  return {
    id: 'veh-001',
    vehicle_number: 'VH-001',
    license_plate: 'B 1234 XYZ',
    vehicle_type: 'truck',
    brand: 'Mitsubishi',
    model: 'Colt Diesel FE 74',
    year: 2022,
    color: 'Putih',
    ownership_type: 'owned',
    max_weight_kg: 5000,
    max_volume_m3: 15,
    fuel_tank_capacity: 100,
    registration_number: 'STNK-001-2022',
    registration_expiry: '2027-01-15',
    ownership_document: 'BPKB-001',
    insurance_policy_number: 'INS-VH-001-2024',
    insurance_provider: 'Asuransi Sinar Mas',
    insurance_expiry: '2026-12-31',
    status: 'active',
    current_location: 'Dalam Perjalanan',
    current_odometer_km: 45230,
    last_service_date: '2026-02-20',
    next_service_due_km: 50000,
    branch_name: 'Gudang Pusat Cikarang',
    registration_days_left: 275,
    insurance_days_left: 258,
  };
}

function mockFuelLog() {
  const now = Date.now();
  const recs = [
    { id: 'f1', transaction_date: new Date(now - 86400000 * 2).toISOString(), fuel_station: 'Shell Tol Cikampek', fuel_type: 'diesel', quantity_liters: 60, price_per_liter: 7450, total_cost: 447000, odometer_reading: 45200, payment_method: 'fuel_card', vehicle_number: 'VH-001', license_plate: 'B 1234 XYZ' },
    { id: 'f2', transaction_date: new Date(now - 86400000 * 6).toISOString(), fuel_station: 'Pertamina MT Haryono', fuel_type: 'diesel', quantity_liters: 55, price_per_liter: 7400, total_cost: 407000, odometer_reading: 44800, payment_method: 'fuel_card', vehicle_number: 'VH-001', license_plate: 'B 1234 XYZ' },
    { id: 'f3', transaction_date: new Date(now - 86400000 * 12).toISOString(), fuel_station: 'BP-AKR Cibitung', fuel_type: 'diesel', quantity_liters: 70, price_per_liter: 7500, total_cost: 525000, odometer_reading: 44300, payment_method: 'fuel_card', vehicle_number: 'VH-001', license_plate: 'B 1234 XYZ' },
  ];
  return { records: recs, total_liters: recs.reduce((s, r) => s + r.quantity_liters, 0), total_cost: recs.reduce((s, r) => s + r.total_cost, 0) };
}

function mockPerformance() {
  return {
    totals: { deliveries: 1250, on_time: 1188, distance_km: 125000, incidents: 2 },
    metrics: [
      { name: 'Tepat Waktu',        actual: 95.0,  target: 95, unit: '%',  trend: 'up' },
      { name: 'Safety Score',       actual: 98.5,  target: 95, unit: 'pt', trend: 'up' },
      { name: 'Rating Pelanggan',   actual: 96.0,  target: 90, unit: '%',  trend: 'up' },
      { name: 'Pengiriman Selesai', actual: 100,   target: 100, unit: '%', trend: 'up' },
    ],
    overallScore: 96,
  };
}

function mockGps() {
  const now = Date.now();
  // Simulated Cikarang → Bandung trajectory
  const base = [
    [-6.2608, 107.1522], [-6.3012, 107.2008], [-6.3801, 107.2510],
    [-6.4682, 107.1456], [-6.5512, 107.2105], [-6.6450, 107.3201],
    [-6.7420, 107.4502], [-6.8431, 107.5800], [-6.9175, 107.7306],
  ] as [number, number][];
  const points = base.map((p, i) => ({
    id: `gps-${i}`,
    latitude:  p[0],
    longitude: p[1],
    speed_kmh: 55 + (i % 4) * 5,
    heading:   (100 + i * 6) % 360,
    accuracy_meters: 8,
    timestamp: new Date(now - (base.length - i) * 300000).toISOString(),
    is_moving: true,
    is_idle: false,
  }));
  return { points, latest: points[points.length - 1], count: points.length };
}

function mockHr() {
  return {
    today: { check_in: '07:45', check_out: null, status: 'present' },
    month: { present: 18, late: 1, absent: 0, leave: 1, wfh: 0 },
    pendingLeave: 0,
    pendingClaims: 1,
  };
}

function mockNotifications() {
  return [
    { id: 'n1', title: 'Trip baru ditugaskan', message: 'RT-JKT-BDG-01 dijadwalkan 08:00 hari ini',                   time: '2 jam lalu', read: false, type: 'info' },
    { id: 'n2', title: 'STNK mendekati jatuh tempo', message: 'STNK B 1234 XYZ akan expired dalam 30 hari',           time: '1 hari lalu', read: false, type: 'warning' },
    { id: 'n3', title: 'Trip selesai — Bonus tepat waktu', message: 'Anda menyelesaikan RT-CKR-LCL-04 15 mnt lbh awal', time: '5 jam lalu', read: true,  type: 'success' },
  ];
}
