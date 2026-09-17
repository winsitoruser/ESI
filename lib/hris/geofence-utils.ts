/**
 * Geofence helpers — SFA visit & attendance validation
 */
import { safeQueryWithSavepoint } from '@/lib/saas/tenant-request-bound';

export type GeofenceMatch = {
  id: string;
  name: string;
  distanceM: number;
  inside: boolean;
  radiusM: number;
};

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function matchGeofences(
  lat: number,
  lng: number,
  fences: Array<{
    id: string;
    name: string;
    center_lat: number | string;
    center_lng: number | string;
    radius_meters?: number | string | null;
  }>,
): GeofenceMatch | null {
  if (!fences?.length) return null;
  let best: GeofenceMatch | null = null;
  for (const f of fences) {
    const clat = Number(f.center_lat);
    const clng = Number(f.center_lng);
    if (!Number.isFinite(clat) || !Number.isFinite(clng)) continue;
    const radius = Number(f.radius_meters) || 200;
    const distanceM = Math.round(haversineMeters(lat, lng, clat, clng));
    const inside = distanceM <= radius;
    const match: GeofenceMatch = {
      id: String(f.id),
      name: f.name,
      distanceM,
      inside,
      radiusM: radius,
    };
    if (!best || (inside && !best.inside) || (inside === best.inside && distanceM < best.distanceM)) {
      best = match;
    }
  }
  return best;
}

export async function loadActiveGeofences(
  sequelize: any,
  tenantId: string | null,
  customerId?: string | null,
): Promise<any[]> {
  if (!sequelize) return [];
  const customerClause = customerId ? 'OR customer_id = :customerId::uuid' : '';
  return safeQueryWithSavepoint(
    sequelize,
    `SELECT id, name, center_lat, center_lng, radius_meters, customer_id, reference_type
     FROM sfa_geofences
     WHERE is_active = true
       ${tenantId ? 'AND tenant_id = :tenantId::uuid' : 'AND 1=0'}
       ${customerClause}
     ORDER BY name ASC
     LIMIT 50`,
    { tenantId, customerId: customerId || null },
    'sfa_geofences',
  );
}

export function geofenceStatusLabel(match: GeofenceMatch | null): string {
  if (!match) return 'Geofence tidak dikonfigurasi';
  if (match.inside) return `Dalam geofence · ${match.name}`;
  return `Di luar geofence · ${match.distanceM}m dari ${match.name}`;
}

/** Clock is allowed when no fences exist, outside is permitted, or the punch is inside. */
export function geofenceClockAllowed(
  match: GeofenceMatch | null,
  opts: { fenceCount: number; allowOutside?: boolean },
): { ok: true } | { ok: false; error: string; code: 'OUTSIDE_GEOFENCE' } {
  if (!opts.fenceCount || opts.allowOutside) return { ok: true };
  if (match?.inside) return { ok: true };
  const dist = match ? `${match.distanceM}m dari ${match.name}, max ${match.radiusM}m` : 'lokasi tidak terdeteksi';
  return {
    ok: false,
    code: 'OUTSIDE_GEOFENCE',
    error: `Anda berada di luar area kantor (${dist})`,
  };
}
