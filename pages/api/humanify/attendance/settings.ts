import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

const POLICY_KEY = 'policy';

function getDefaultSettings() {
  return {
    workStartTime: '08:00:00', workEndTime: '17:00:00',
    breakStartTime: '12:00:00', breakEndTime: '13:00:00',
    breakDurationMinutes: 60, workDays: [1, 2, 3, 4, 5],
    lateGraceMinutes: 15, earlyLeaveGraceMinutes: 15,
    autoAbsentAfterMinutes: 120,
    overtimeEnabled: true, overtimeMinMinutes: 30, overtimeRequiresApproval: true,
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
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
  const tenantId = session.user.tenantId || null;

  try {
    const sequelize = await getSequelize();
    const [rows] = await sequelize.query(`
      SELECT setting_key, setting_value, branch_id
      FROM attendance_settings
      WHERE setting_key IN (:policyKey, 'geofencing', 'overtime', 'late_policy', 'clock_methods')
        AND (tenant_id = :tenantId OR tenant_id IS NULL)
        AND (branch_id = :branchId OR (:branchId IS NULL AND branch_id IS NULL))
      ORDER BY branch_id NULLS LAST
    `, { replacements: { policyKey: POLICY_KEY, tenantId, branchId } });

    const branchOverrides = (rows as any[]).filter((r) => r.branch_id);
    const effective = mapLegacyRows(rows as any[]);

    return res.status(200).json({
      success: true,
      data: effective,
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
  const tenantId = session.user.tenantId || null;
  const {
    branchId, workStartTime, workEndTime, breakStartTime, breakEndTime,
    breakDurationMinutes, workDays, lateGraceMinutes, earlyLeaveGraceMinutes,
    autoAbsentAfterMinutes, overtimeEnabled, overtimeMinMinutes, overtimeRequiresApproval,
    gpsAttendanceEnabled, geoFenceRadius, requireSelfie, allowOutsideGeofence,
    fingerprintEnabled, autoProcessDeviceLogs, punchTypeDetection,
    annualLeaveQuota, sickLeaveQuota, leaveRequiresApproval,
    notifyLateToManager, notifyAbsentToManager, notifyOvertimeToHr,
  } = req.body;

  const policy = {
    workStartTime: workStartTime || '08:00:00',
    workEndTime: workEndTime || '17:00:00',
    breakStartTime: breakStartTime || '12:00:00',
    breakEndTime: breakEndTime || '13:00:00',
    breakDurationMinutes: breakDurationMinutes ?? 60,
    workDays: workDays || [1, 2, 3, 4, 5],
    lateGraceMinutes: lateGraceMinutes ?? 15,
    earlyLeaveGraceMinutes: earlyLeaveGraceMinutes ?? 15,
    autoAbsentAfterMinutes: autoAbsentAfterMinutes ?? 120,
    overtimeEnabled: overtimeEnabled ?? true,
    overtimeMinMinutes: overtimeMinMinutes ?? 30,
    overtimeRequiresApproval: overtimeRequiresApproval ?? true,
    gpsAttendanceEnabled: gpsAttendanceEnabled ?? true,
    geoFenceRadius: geoFenceRadius ?? 100,
    requireSelfie: requireSelfie ?? false,
    allowOutsideGeofence: allowOutsideGeofence ?? false,
    fingerprintEnabled: fingerprintEnabled ?? true,
    autoProcessDeviceLogs: autoProcessDeviceLogs ?? true,
    punchTypeDetection: punchTypeDetection || 'auto',
    annualLeaveQuota: annualLeaveQuota ?? 12,
    sickLeaveQuota: sickLeaveQuota ?? 14,
    leaveRequiresApproval: leaveRequiresApproval ?? true,
    notifyLateToManager: notifyLateToManager ?? true,
    notifyAbsentToManager: notifyAbsentToManager ?? true,
    notifyOvertimeToHr: notifyOvertimeToHr ?? false,
  };

  const sequelize = await getSequelize();
  await sequelize.query(`
    INSERT INTO attendance_settings (id, tenant_id, branch_id, setting_key, setting_value, description, created_at, updated_at)
    VALUES (uuid_generate_v4(), :tenantId, :branchId, :policyKey, :policy::jsonb, 'Kebijakan absensi terstruktur', NOW(), NOW())
    ON CONFLICT (tenant_id, branch_id, setting_key)
    DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
  `, { replacements: { tenantId, branchId: branchId || null, policyKey: POLICY_KEY, policy: JSON.stringify(policy) } });

  return res.status(200).json({
    success: true,
    message: 'Settings updated',
    data: policy,
  });
}
