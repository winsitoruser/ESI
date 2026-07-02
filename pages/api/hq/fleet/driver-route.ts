/**
 * HQ — Per-driver route overlay data
 *
 * GET /api/hq/fleet/driver-route?driver_id=...
 * Returns:
 *   plannedStops  — start + route.stops + end (untuk planned polyline)
 *   actualPath    — GPS history hari ini (last 200 pings) untuk actual trail
 *   active_trip   — info trip (kalau ada)
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
    console.warn('[hq/fleet/driver-route]', e?.message || e);
    return [];
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const driverId = String(req.query.driver_id || '');
    if (!driverId) return res.status(400).json({ success: false, error: 'driver_id required' });

    if (!sequelize) return res.json({ success: true, data: { plannedStops: [], actualPath: [], active_trip: null } });

    // Active / scheduled trip today
    const today = new Date().toISOString().split('T')[0];
    const [trip] = await q(
      `SELECT ra.id, ra.status, ra.scheduled_date, ra.actual_start_time, ra.actual_end_time,
              r.route_number, r.route_name, r.start_location, r.end_location,
              r.start_latitude::float  AS start_lat, r.start_longitude::float AS start_lng,
              r.end_latitude::float    AS end_lat,   r.end_longitude::float   AS end_lng,
              r.stops
         FROM fleet_route_assignments ra
         LEFT JOIN fleet_routes r ON ra.route_id = r.id
        WHERE ra.driver_id = :did
          AND DATE(ra.scheduled_date) = :today
        ORDER BY CASE ra.status WHEN 'in_progress' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END,
                 ra.scheduled_start_time ASC NULLS LAST
        LIMIT 1`,
      { did: driverId, today }
    );

    const plannedStops: any[] = [];
    if (trip) {
      if (trip.start_lat && trip.start_lng) {
        plannedStops.push({ name: trip.start_location || 'Start', lat: Number(trip.start_lat), lng: Number(trip.start_lng), type: 'start' });
      }
      const stops = Array.isArray(trip.stops) ? trip.stops : (typeof trip.stops === 'string' ? safeParse(trip.stops) : []);
      (stops || []).forEach((s: any) => {
        const lat = Number(s.lat ?? s.latitude);
        const lng = Number(s.lng ?? s.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          plannedStops.push({ name: s.name || s.label || s.address || 'Stop', lat, lng, type: 'stop' });
        }
      });
      if (trip.end_lat && trip.end_lng) {
        plannedStops.push({ name: trip.end_location || 'Tujuan', lat: Number(trip.end_lat), lng: Number(trip.end_lng), type: 'end' });
      }
    }

    // Actual GPS path (last 200 pings, today or from trip start)
    const since = trip?.actual_start_time ? new Date(trip.actual_start_time).toISOString() : `${today}T00:00:00Z`;
    const pings = await q(
      `SELECT latitude::float AS lat, longitude::float AS lng, timestamp
         FROM fleet_gps_locations
        WHERE driver_id = :did AND timestamp >= :since
        ORDER BY timestamp ASC
        LIMIT 500`,
      { did: driverId, since }
    );
    const actualPath = (pings as any[])
      .map((p) => [Number(p.lat), Number(p.lng)] as [number, number])
      .filter(([la, ln]) => Number.isFinite(la) && Number.isFinite(ln));

    return res.json({
      success: true,
      data: {
        plannedStops,
        actualPath,
        active_trip: trip || null,
      },
    });
  } catch (e: any) {
    console.error('[hq/fleet/driver-route]', e?.message || e);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
}

function safeParse(s: string) {
  try { return JSON.parse(s); } catch { return []; }
}
