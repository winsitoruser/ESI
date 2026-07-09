/**
 * Shared helpers for employee portal API (attendance GPS, announcements, notifications).
 */

export type CheckInLocation = {
  lat?: number;
  lng?: number;
  address?: string;
  accuracy?: number;
  geofence?: {
    id?: string;
    name?: string;
    inside?: boolean;
    distanceM?: number;
    radiusM?: number;
  } | null;
};

export type LastClockEvent = {
  type: 'check_in' | 'check_out';
  label: string;
  time: string | null;
  date: string | null;
  location: CheckInLocation | null;
  mapsUrl: string | null;
};

export type LastCheckIn = LastClockEvent;

export function parseCheckInLocation(raw: unknown): CheckInLocation | null {
  if (!raw) return null;
  let loc: any = raw;
  if (typeof loc === 'string') {
    try { loc = JSON.parse(loc); } catch { return null; }
  }
  const lat = loc.lat ?? loc.latitude ?? loc.y;
  const lng = loc.lng ?? loc.longitude ?? loc.x;
  if (lat != null && lng != null) {
    return {
      lat: Number(lat),
      lng: Number(lng),
      address: loc.address || loc.name || loc.label || undefined,
      accuracy: loc.accuracy != null ? Number(loc.accuracy) : undefined,
      geofence: loc.geofence || null,
    };
  }
  if (loc.address || loc.name) return { address: loc.address || loc.name, geofence: loc.geofence || null };
  return null;
}

export function formatCheckInTime(val: unknown): string | null {
  if (!val) return null;
  const s = String(val);
  if (/^\d{2}:\d{2}/.test(s)) return s.substring(0, 5);
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return s.substring(0, 5);
}

export function buildClockEvent(
  type: 'check_in' | 'check_out',
  row: any,
): LastClockEvent | null {
  if (!row) return null;
  const timeKey = type === 'check_in' ? 'check_in' : 'check_out';
  const atKey = type === 'check_in' ? 'check_in_at' : 'check_out_at';
  const locKey = type === 'check_in' ? 'check_in_location' : 'check_out_location';
  const time = formatCheckInTime(row[timeKey] || row[atKey]);
  const date = row.date || row.attendance_date
    || (row[atKey] ? String(row[atKey]).split('T')[0] : null);
  const location = parseCheckInLocation(row[locKey]);
  if (!time && !location) return null;
  return {
    type,
    label: type === 'check_in' ? 'Clock In' : 'Clock Out',
    time,
    date,
    location,
    mapsUrl: location?.lat != null && location?.lng != null
      ? `https://www.google.com/maps?q=${location.lat},${location.lng}`
      : null,
  };
}

export function buildLastCheckIn(row: any): LastClockEvent | null {
  return buildClockEvent('check_in', row);
}

export function buildLastCheckOut(row: any): LastClockEvent | null {
  return buildClockEvent('check_out', row);
}

export function pickLatestClockEvent(...events: (LastClockEvent | null | undefined)[]): LastClockEvent | null {
  const valid = events.filter(Boolean) as LastClockEvent[];
  if (!valid.length) return null;
  return valid.sort((a, b) => {
    const ta = a.date && a.time ? new Date(`${a.date}T${a.time}`).getTime() : 0;
    const tb = b.date && b.time ? new Date(`${b.date}T${b.time}`).getTime() : 0;
    return tb - ta;
  })[0];
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  return `${days} hari lalu`;
}

export function normalizeAnnouncement(r: any) {
  return {
    id: r.id,
    title: r.title,
    content: r.content || '',
    category: r.category || 'general',
    priority: r.priority || 'normal',
    is_pinned: !!r.is_pinned,
    status: r.status || (r.is_active === false ? 'archived' : 'published'),
    target_audience: r.target_audience || 'all',
    target_department: r.target_department || null,
    target_branch: r.target_branch || null,
    published_at: r.published_at || r.created_at,
    expires_at: r.expires_at || null,
    view_count: Number(r.view_count || 0),
    time: formatRelativeTime(r.published_at || r.created_at),
  };
}

export function normalizeNotification(r: any) {
  return {
    id: r.id,
    title: r.title,
    message: r.message || '',
    type: r.type || 'info',
    read: !!r.read_at,
    time: formatRelativeTime(r.created_at),
    source_type: r.source_type || null,
    source_id: r.source_id || null,
  };
}

export async function resolveEmployeeContext(sequelize: any, userId: string) {
  const uid = parseInt(userId, 10) || userId;
  const [rows] = await sequelize.query(`
    SELECT e.id AS employee_id, e.name AS employee_name, e.department, e.branch_id, e.email,
      e.tenant_id, e.employment_category, e.business_vertical, e.agent_type, e.territory,
      u.tenant_id AS user_tenant_id, u.name AS user_name
    FROM users u
    LEFT JOIN employees e ON e.user_id = u.id OR e.email = u.email
    WHERE u.id = :uid
    LIMIT 1
  `, { replacements: { uid } });
  const row = rows?.[0];
  return {
    employeeId: row?.employee_id || null,
    employeeName: row?.employee_name || row?.user_name || null,
    department: row?.department || null,
    branchId: row?.branch_id || null,
    email: row?.email || null,
    tenantId: row?.tenant_id || row?.user_tenant_id || null,
    employmentCategory: row?.employment_category || null,
    businessVertical: row?.business_vertical || null,
    agentType: row?.agent_type || null,
    territory: row?.territory || null,
  };
}

export const EMPLOYEE_ATTENDANCE_WHERE = `(user_id = :userId OR employee_id IN (
  SELECT id FROM employees WHERE user_id = :userId OR email = (SELECT email FROM users WHERE id = :userId)
))`;
