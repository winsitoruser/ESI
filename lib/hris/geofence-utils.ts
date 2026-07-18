/**
 * Geofence helpers — SFA visit & attendance validation
 */

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
  try {
    const customerClause = customerId ? 'OR customer_id = :customerId::uuid' : '';
    const [rows] = await sequelize.query(`
      SELECT id, name, center_lat, center_lng, radius_meters, customer_id, reference_type
      FROM sfa_geofences
      WHERE is_active = true
        ${tenantId ? 'AND tenant_id = :tenantId::uuid' : 'AND 1=0'}
        ${customerClause}
      ORDER BY name ASC
      LIMIT 50
    `, { replacements: { tenantId, customerId: customerId || null } });
    return rows || [];
  } catch {
    return [];
  }
}

export function geofenceStatusLabel(match: GeofenceMatch | null): string {
  if (!match) return 'Geofence tidak dikonfigurasi';
  if (match.inside) return `Dalam geofence · ${match.name}`;
  return `Di luar geofence · ${match.distanceM}m dari ${match.name}`;
}
