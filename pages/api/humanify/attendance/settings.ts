import type { NextApiRequest, NextApiResponse } from 'next';
import { tenantIdFromSession } from '@/lib/saas/tenant-scope';
import { withHQAuth } from '@/lib/middleware/withHQAuth';
import { markGoLiveFlagSafe } from '@/lib/saas/go-live';
import { normalizeWorkTimePolicy } from '@/lib/hris/work-time-policy';

const POLICY_KEY = 'policy';

function getDefaultSettings() {
  const work = normalizeWorkTimePolicy({});
  return {
    ...work,
    workStartTime: work.workStartTime, workEndTime: work.workEndTime,
    breakStartTime: work.breakStartTime, breakEndTime: work.breakEndTime,
    gpsAttendanceEnabled: true, geoFenceRadius: 100,
    requireSelfie: false, allowOutsideGeofence: false,
    fingerprintEnabled: true, autoProcessDeviceLogs: true, punchTypeDetection: 'auto',
    annualLeaveQuota: 12, sickLeaveQuota: 14, leaveRequiresApproval: true,
    notifyLateToManager: true, notifyAbsentToManager: true, notifyOvertimeToHr: false,
  };
}

function mapLegacyRows(rows: any[]) {
  const defaults = getDefaultSettings();
  const map = (rows || []).reduce((acc: Record<string, any>, row: any) => {
    acc[row.setting_key || row.settingKey] = row.setting_value ?? row.settingValue;
    return acc;
  }, {});

  const policy = map[POLICY_KEY] || {};
  const geofencing = map.geofencing || {};
  const overtime = map.overtime || {};
  const latePolicy = map.late_policy || {};

  return {
    ...defaults,
    ...policy,
    geoFenceRadius: policy.geoFenceRadius ?? geofencing.default_radius_meters ?? defaults.geoFenceRadius,
    allowOutsideGeofence: policy.allowOutsideGeofence ?? geofencing.allow_outside_geofence ?? defaults.allowOutsideGeofence,
    requireSelfie: policy.requireSelfie ?? geofencing.require_photo_outside ?? defaults.requireSelfie,
    gpsAttendanceEnabled: policy.gpsAttendanceEnabled ?? geofencing.enabled ?? defaults.gpsAttendanceEnabled,
    overtimeEnabled: policy.overtimeEnabled ?? overtime.auto_detect ?? defaults.overtimeEnabled,
    overtimeMinMinutes: policy.overtimeMinMinutes ?? overtime.min_overtime_minutes ?? defaults.overtimeMinMinutes,
    overtimeRequiresApproval: policy.overtimeRequiresApproval ?? overtime.requires_approval ?? defaults.overtimeRequiresApproval,
    lateGraceMinutes: policy.lateGraceMinutes ?? latePolicy.grace_minutes ?? defaults.lateGraceMinutes,
  };
}

async function getSequelize() {
  const { sequelize } = await import('@/lib/sequelizeClient');
  return sequelize;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = (req as any).session;
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    switch (req.method) {
      case 'GET': return await getSettings(req, res, session);
      case 'POST':
      case 'PUT': return await upsertSettings(req, res, session);
      default:
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.warn('Attendance Settings API Error:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Internal server error', message: error?.message });
  }
}

async function getSettings(req: NextApiRequest, res: NextApiResponse, session: any) {
  const branchId = (req.query.branchId as string) || null;
  const tenantId = tenantIdFromSession(session);

  try {
    if (!tenantId) {
      return res.status(200).json({
        success: true,
        data: getDefaultSettings(),
        branchOverrides: [],
      });
    }

    const sequelize = await getSequelize();
    const [rows] = await sequelize.query(`
      SELECT setting_key, setting_value, branch_id
      FROM attendance_settings
      WHERE setting_key IN (:policyKey, 'geofencing', 'overtime', 'late_policy', 'clock_methods')
        AND tenant_id = :tenantId
        AND (branch_id = :branchId OR (:branchId IS NULL AND branch_id IS NULL))
      ORDER BY branch_id NULLS LAST
    `, { replacements: { policyKey: POLICY_KEY, tenantId, branchId } });

    const branchOverrides = (rows as any[]).filter((r) => r.branch_id);
    const effective = mapLegacyRows(rows as any[]);
    const work = normalizeWorkTimePolicy(effective);

    return res.status(200).json({
      success: true,
      data: { ...effective, ...work },
      branchOverrides,
    });
  } catch (error: any) {
    if (String(error?.message || '').includes('does not exist')) {
      return res.status(200).json({ success: true, data: getDefaultSettings(), branchOverrides: [] });
    }
    throw error;
  }
}

async function upsertSettings(req: NextApiRequest, res: NextApiResponse, session: any) {
  const tenantId = tenantIdFromSession(session);
  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'Tenant context required' });
  }
  const body = req.body || {};
  const work = normalizeWorkTimePolicy(body);
  const policy = {
    ...work,
    workStartTime: body.workStartTime || work.workStartTime,
    workEndTime: body.workEndTime || work.workEndTime,
    breakStartTime: body.breakStartTime || work.breakStartTime,
    breakEndTime: body.breakEndTime || work.breakEndTime,
    gpsAttendanceEnabled: body.gpsAttendanceEnabled ?? true,
    geoFenceRadius: body.geoFenceRadius ?? 100,
    requireSelfie: body.requireSelfie ?? false,
    allowOutsideGeofence: body.allowOutsideGeofence ?? false,
    fingerprintEnabled: body.fingerprintEnabled ?? true,
    autoProcessDeviceLogs: body.autoProcessDeviceLogs ?? true,
    punchTypeDetection: body.punchTypeDetection || 'auto',
    annualLeaveQuota: body.annualLeaveQuota ?? 12,
    sickLeaveQuota: body.sickLeaveQuota ?? 14,
    leaveRequiresApproval: body.leaveRequiresApproval ?? true,
    notifyLateToManager: body.notifyLateToManager ?? true,
    notifyAbsentToManager: body.notifyAbsentToManager ?? true,
    notifyOvertimeToHr: body.notifyOvertimeToHr ?? false,
  };
  const branchId = body.branchId;

  const sequelize = await getSequelize();
  const branch = branchId || null;
  // UNIQUE(tenant_id, branch_id, setting_key) does not match two NULLs — UPDATE then INSERT.
  const [updated] = await sequelize.query(`
    UPDATE attendance_settings
    SET setting_value = :policy::jsonb, updated_at = NOW(), description = 'Kebijakan absensi terstruktur'
    WHERE tenant_id = :tenantId
      AND setting_key = :policyKey
      AND (
        (:branchId::uuid IS NULL AND branch_id IS NULL)
        OR branch_id = :branchId::uuid
      )
    RETURNING id
  `, { replacements: { tenantId, branchId: branch, policyKey: POLICY_KEY, policy: JSON.stringify(policy) } });
  if (!(updated as any[])?.length) {
    await sequelize.query(`
      INSERT INTO attendance_settings (id, tenant_id, branch_id, setting_key, setting_value, description, created_at, updated_at)
      VALUES (uuid_generate_v4(), :tenantId, :branchId, :policyKey, :policy::jsonb, 'Kebijakan absensi terstruktur', NOW(), NOW())
    `, { replacements: { tenantId, branchId: branch, policyKey: POLICY_KEY, policy: JSON.stringify(policy) } });
  }
  await markGoLiveFlagSafe(tenantId, 'attendanceConfigured');

  return res.status(200).json({
    success: true,
    message: 'Settings updated',
    data: policy,
  });
}

export default withHQAuth(handler, { module: 'hris' });
