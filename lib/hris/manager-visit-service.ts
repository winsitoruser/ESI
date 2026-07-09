/**
 * Manager visit reports — laporan & bukti kunjungan tim (sfa_visits)
 */

import { verifyEmployeeInTeam } from './manager-team-member-service';
import { resolveManagerContext, buildTeamEmployeeFilter } from './manager-team-filter';

export type VisitEvidenceItem = { url: string; caption?: string; type?: string; ts?: string };

export type ManagerVisitSummary = {
  date: string;
  total: number;
  planned: number;
  checked_in: number;
  completed: number;
  cancelled: number;
  with_photos: number;
  team_members_active: number;
};

export type ManagerVisitListItem = {
  id: string;
  visit_number: string;
  employee_id: string;
  employee_name: string;
  employee_code: string | null;
  customer_name: string;
  customer_address: string;
  visit_type: string;
  purpose: string;
  status: string;
  visit_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  duration_minutes: number;
  outcome: string | null;
  outcome_notes: string | null;
  order_taken: boolean;
  order_value: number;
  check_in_geofence_name: string | null;
  check_in_geofence_status: string | null;
  check_in_geofence_distance_m: number | null;
  check_out_geofence_name: string | null;
  check_out_geofence_status: string | null;
  evidence_count: number;
  has_photos: boolean;
  thumbnail_url: string | null;
};

export type ManagerVisitDetail = ManagerVisitListItem & {
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_in_address: string | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  check_out_address: string | null;
  check_in_photo_url: string | null;
  check_out_photo_url: string | null;
  next_visit_date: string | null;
  is_adhoc: boolean;
  evidence_photos: VisitEvidenceItem[];
  maps_url: string | null;
};

function parseEvidence(raw: unknown): VisitEvidenceItem[] {
  if (!raw) return [];
  try {
    const arr = Array.isArray(raw) ? raw : JSON.parse(String(raw || '[]'));
    return arr.map((item: any) => {
      if (typeof item === 'string') return { url: item };
      if (item?.url) return { url: item.url, caption: item.caption, type: item.type, ts: item.ts };
      return null;
    }).filter(Boolean) as VisitEvidenceItem[];
  } catch {
    return [];
  }
}

function countEvidence(row: any): number {
  let n = 0;
  if (row.check_in_photo_url) n++;
  if (row.check_out_photo_url) n++;
  n += parseEvidence(row.products_discussed || row.evidence_photos).length;
  return n;
}

function firstThumbnail(row: any): string | null {
  if (row.check_in_photo_url) return row.check_in_photo_url;
  if (row.check_out_photo_url) return row.check_out_photo_url;
  const ev = parseEvidence(row.products_discussed || row.evidence_photos);
  return ev[0]?.url || null;
}

function mapVisitListRow(row: any): ManagerVisitListItem {
  const evidenceCount = countEvidence(row);
  return {
    id: String(row.id),
    visit_number: row.visit_number || '',
    employee_id: String(row.employee_id || row.owner_employee_id || ''),
    employee_name: row.employee_name || 'Karyawan',
    employee_code: row.employee_code || null,
    customer_name: row.customer_name || '-',
    customer_address: row.check_in_address || row.customer_address || '',
    visit_type: row.visit_type || 'regular',
    purpose: row.purpose || '',
    status: row.status || 'planned',
    visit_date: row.visit_date ? String(row.visit_date).split('T')[0] : '',
    check_in_time: row.check_in_time || null,
    check_out_time: row.check_out_time || null,
    duration_minutes: Number(row.duration_minutes) || 0,
    outcome: row.outcome || null,
    outcome_notes: row.outcome_notes || null,
    order_taken: !!row.order_taken,
    order_value: Number(row.order_value) || 0,
    check_in_geofence_name: row.check_in_geofence_name || null,
    check_in_geofence_status: row.check_in_geofence_status || null,
    check_in_geofence_distance_m: row.check_in_geofence_distance_m != null ? Number(row.check_in_geofence_distance_m) : null,
    check_out_geofence_name: row.check_out_geofence_name || null,
    check_out_geofence_status: row.check_out_geofence_status || null,
    evidence_count: evidenceCount,
    has_photos: evidenceCount > 0,
    thumbnail_url: firstThumbnail(row),
  };
}

function mapVisitDetail(row: any): ManagerVisitDetail {
  const base = mapVisitListRow(row);
  const extraEvidence = parseEvidence(row.products_discussed || row.evidence_photos);
  const evidence_photos: VisitEvidenceItem[] = [
    ...(row.check_in_photo_url ? [{ url: row.check_in_photo_url, caption: 'Foto check-in', type: 'check_in' }] : []),
    ...(row.check_out_photo_url ? [{ url: row.check_out_photo_url, caption: 'Foto check-out', type: 'check_out' }] : []),
    ...extraEvidence,
  ];
  const lat = row.check_in_lat != null ? Number(row.check_in_lat) : null;
  const lng = row.check_in_lng != null ? Number(row.check_in_lng) : null;
  return {
    ...base,
    check_in_lat: lat,
    check_in_lng: lng,
    check_in_address: row.check_in_address || null,
    check_out_lat: row.check_out_lat != null ? Number(row.check_out_lat) : null,
    check_out_lng: row.check_out_lng != null ? Number(row.check_out_lng) : null,
    check_out_address: row.check_out_address || null,
    check_in_photo_url: row.check_in_photo_url || null,
    check_out_photo_url: row.check_out_photo_url || null,
    next_visit_date: row.next_visit_date ? String(row.next_visit_date).split('T')[0] : null,
    is_adhoc: !!row.is_adhoc,
    evidence_photos,
    maps_url: lat != null && lng != null ? `https://www.google.com/maps?q=${lat},${lng}` : null,
  };
}

const VISIT_SELECT = `
  v.id, v.visit_number, v.customer_name, v.visit_type, v.purpose, v.status, v.visit_date,
  v.check_in_time, v.check_out_time, v.check_in_lat, v.check_in_lng, v.check_in_address,
  v.check_out_lat, v.check_out_lng, v.check_out_address,
  v.check_in_photo_url, v.check_out_photo_url,
  v.check_in_geofence_name, v.check_in_geofence_status, v.check_in_geofence_distance_m,
  v.check_out_geofence_name, v.check_out_geofence_status,
  v.duration_minutes, v.outcome, v.outcome_notes, v.order_taken, v.order_value,
  v.next_visit_date, v.is_adhoc, v.products_discussed,
  e.id AS owner_employee_id, e.name AS employee_name, e.employee_code
`;

function employeeVisitJoin() {
  return `
    JOIN employees e ON (
      v.employee_id = e.id
      OR (e.user_id IS NOT NULL AND v.salesperson_id = e.user_id)
    )
  `;
}

export async function getTeamVisitSummary(
  sequelize: any,
  managerUserId: string,
  isSuperAdmin: boolean,
  opts?: { date?: string; month?: string },
): Promise<ManagerVisitSummary> {
  const date = opts?.date || new Date().toISOString().split('T')[0];
  const month = opts?.month || date.slice(0, 7);

  if (!sequelize) {
    return { date, total: 3, planned: 1, checked_in: 0, completed: 2, cancelled: 0, with_photos: 2, team_members_active: 2 };
  }

  try {
    const ctx = await resolveManagerContext(sequelize, managerUserId);
    const tf = buildTeamEmployeeFilter(isSuperAdmin, ctx, managerUserId);
    const dateFilter = opts?.month && !opts?.date
      ? `AND v.visit_date >= :monthStart AND v.visit_date < :monthEnd`
      : `AND v.visit_date = :date`;
    const monthStart = `${month}-01`;
    const nextM = new Date(`${month}-01`);
    nextM.setMonth(nextM.getMonth() + 1);
    const monthEnd = nextM.toISOString().split('T')[0];

    const [rows] = await sequelize.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE v.status = 'planned')::int AS planned,
        COUNT(*) FILTER (WHERE v.status = 'checked_in')::int AS checked_in,
        COUNT(*) FILTER (WHERE v.status = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE v.status = 'cancelled')::int AS cancelled,
        COUNT(*) FILTER (WHERE v.check_in_photo_url IS NOT NULL OR v.check_out_photo_url IS NOT NULL
          OR (v.products_discussed IS NOT NULL AND v.products_discussed::text NOT IN ('[]', 'null')))::int AS with_photos,
        COUNT(DISTINCT e.id)::int AS team_members_active
      FROM sfa_visits v
      ${employeeVisitJoin()}
      WHERE 1=1 ${dateFilter} ${tf.sql}
    `, {
      replacements: { date, monthStart, monthEnd, ...tf.replacements },
    });

    const s = (rows as any[])?.[0] || {};
    return {
      date,
      total: Number(s.total) || 0,
      planned: Number(s.planned) || 0,
      checked_in: Number(s.checked_in) || 0,
      completed: Number(s.completed) || 0,
      cancelled: Number(s.cancelled) || 0,
      with_photos: Number(s.with_photos) || 0,
      team_members_active: Number(s.team_members_active) || 0,
    };
  } catch (err: any) {
    console.warn('getTeamVisitSummary:', err?.message);
    return { date, total: 0, planned: 0, checked_in: 0, completed: 0, cancelled: 0, with_photos: 0, team_members_active: 0 };
  }
}

export async function getTeamMemberVisits(
  sequelize: any,
  managerUserId: string,
  employeeId: string,
  isSuperAdmin: boolean,
  opts?: { month?: string; date?: string; status?: string; limit?: number },
): Promise<{ visits: ManagerVisitListItem[]; summary: ManagerVisitSummary }> {
  const month = opts?.month || new Date().toISOString().slice(0, 7);
  const limit = Math.min(opts?.limit || 50, 100);

  const inTeam = await verifyEmployeeInTeam(sequelize, managerUserId, employeeId, isSuperAdmin);
  if (!inTeam) return { visits: [], summary: { date: month, total: 0, planned: 0, checked_in: 0, completed: 0, cancelled: 0, with_photos: 0, team_members_active: 0 } };

  if (!sequelize) {
    const mock: ManagerVisitListItem = {
      id: 'mock-1', visit_number: 'VIS-001', employee_id: employeeId, employee_name: 'Karyawan',
      employee_code: null, customer_name: 'Toko Maju', customer_address: 'Jl. Contoh',
      visit_type: 'regular', purpose: 'Kunjungan rutin', status: 'completed', visit_date: new Date().toISOString().split('T')[0],
      check_in_time: new Date().toISOString(), check_out_time: null, duration_minutes: 45,
      outcome: 'follow_up', outcome_notes: null, order_taken: false, order_value: 0,
      check_in_geofence_name: 'Toko Maju', check_in_geofence_status: 'inside', check_in_geofence_distance_m: 12,
      check_out_geofence_name: null, check_out_geofence_status: null,
      evidence_count: 1, has_photos: true, thumbnail_url: null,
    };
    return {
      visits: [mock],
      summary: { date: month, total: 1, planned: 0, checked_in: 0, completed: 1, cancelled: 0, with_photos: 1, team_members_active: 1 },
    };
  }

  try {
    const statusClause = opts?.status ? `AND v.status = :status` : '';
    let dateClause = `AND v.visit_date >= :monthStart AND v.visit_date < :monthEnd`;
    const monthStart = `${month}-01`;
    const nextM = new Date(`${month}-01`);
    nextM.setMonth(nextM.getMonth() + 1);
    const monthEnd = nextM.toISOString().split('T')[0];
    if (opts?.date) dateClause = `AND v.visit_date = :visitDate`;

    const [visitRows] = await sequelize.query(`
      SELECT ${VISIT_SELECT}
      FROM sfa_visits v
      ${employeeVisitJoin()}
      WHERE e.id::text = :employeeId ${dateClause} ${statusClause}
      ORDER BY v.visit_date DESC, v.check_in_time DESC NULLS LAST
      LIMIT :limit
    `, {
      replacements: {
        employeeId: String(employeeId),
        monthStart,
        monthEnd,
        visitDate: opts?.date || null,
        status: opts?.status || null,
        limit,
      },
    });

    const visits = (visitRows as any[]).map(mapVisitListRow);
    const summary: ManagerVisitSummary = {
      date: opts?.date || month,
      total: visits.length,
      planned: visits.filter((v) => v.status === 'planned').length,
      checked_in: visits.filter((v) => v.status === 'checked_in').length,
      completed: visits.filter((v) => v.status === 'completed').length,
      cancelled: visits.filter((v) => v.status === 'cancelled').length,
      with_photos: visits.filter((v) => v.has_photos).length,
      team_members_active: visits.length > 0 ? 1 : 0,
    };

    return { visits, summary };
  } catch (err: any) {
    console.warn('getTeamMemberVisits:', err?.message);
    return { visits: [], summary: { date: month, total: 0, planned: 0, checked_in: 0, completed: 0, cancelled: 0, with_photos: 0, team_members_active: 0 } };
  }
}

export async function getTeamVisitsFeed(
  sequelize: any,
  managerUserId: string,
  isSuperAdmin: boolean,
  opts?: { date?: string; month?: string; limit?: number },
): Promise<{ visits: ManagerVisitListItem[]; summary: ManagerVisitSummary }> {
  const date = opts?.date || new Date().toISOString().split('T')[0];
  const month = opts?.month || date.slice(0, 7);
  const limit = Math.min(opts?.limit || 40, 100);

  const summary = await getTeamVisitSummary(sequelize, managerUserId, isSuperAdmin, { date: opts?.date, month: opts?.month });

  if (!sequelize) {
    return { visits: [], summary };
  }

  try {
    const ctx = await resolveManagerContext(sequelize, managerUserId);
    const tf = buildTeamEmployeeFilter(isSuperAdmin, ctx, managerUserId);
    const dateFilter = opts?.month && !opts?.date
      ? `AND v.visit_date >= :monthStart AND v.visit_date < :monthEnd`
      : `AND v.visit_date = :date`;
    const monthStart = `${month}-01`;
    const nextM = new Date(`${month}-01`);
    nextM.setMonth(nextM.getMonth() + 1);
    const monthEnd = nextM.toISOString().split('T')[0];

    const [visitRows] = await sequelize.query(`
      SELECT ${VISIT_SELECT}
      FROM sfa_visits v
      ${employeeVisitJoin()}
      WHERE 1=1 ${dateFilter} ${tf.sql}
      ORDER BY v.check_in_time DESC NULLS LAST, v.visit_date DESC
      LIMIT :limit
    `, {
      replacements: { date, monthStart, monthEnd, limit, ...tf.replacements },
    });

    return { visits: (visitRows as any[]).map(mapVisitListRow), summary };
  } catch (err: any) {
    console.warn('getTeamVisitsFeed:', err?.message);
    return { visits: [], summary };
  }
}

export async function getTeamVisitDetail(
  sequelize: any,
  managerUserId: string,
  visitId: string,
  isSuperAdmin: boolean,
): Promise<{ visit: ManagerVisitDetail } | { error: string; status: number }> {
  if (!visitId) return { error: 'visitId wajib', status: 400 };

  if (!sequelize) {
    return {
      visit: mapVisitDetail({
        id: visitId, visit_number: 'VIS-MOCK', customer_name: 'Toko Demo', status: 'completed',
        visit_date: new Date().toISOString().split('T')[0], duration_minutes: 30,
        owner_employee_id: '1', employee_name: 'Karyawan',
      }),
    };
  }

  try {
    const [rows] = await sequelize.query(`
      SELECT ${VISIT_SELECT}
      FROM sfa_visits v
      ${employeeVisitJoin()}
      WHERE v.id::text = :visitId
      LIMIT 1
    `, { replacements: { visitId: String(visitId) } });

    const row = (rows as any[])?.[0];
    if (!row) return { error: 'Kunjungan tidak ditemukan', status: 404 };

    const employeeId = String(row.owner_employee_id || row.employee_id || '');
    const inTeam = await verifyEmployeeInTeam(sequelize, managerUserId, employeeId, isSuperAdmin);
    if (!inTeam) return { error: 'Akses ditolak — bukan anggota tim Anda', status: 403 };

    return { visit: mapVisitDetail(row) };
  } catch (err: any) {
    console.warn('getTeamVisitDetail:', err?.message);
    return { error: 'Gagal memuat detail kunjungan', status: 500 };
  }
}
