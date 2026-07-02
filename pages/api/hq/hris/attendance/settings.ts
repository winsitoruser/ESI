import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';

let AttendanceSettings: any, Branch: any;
try {
  const models = require('../../../../../models');
  AttendanceSettings = models.AttendanceSettings;
  Branch = models.Branch;
} catch (e) {
  console.warn('Models not available for attendance settings');
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
    console.error('Attendance Settings API Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

async function getSettings(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { branchId } = req.query;
  const tenantId = session.user.tenantId;

  if (!AttendanceSettings) {
    return res.status(200).json({ success: true, data: getDefaultSettings() });
  }

  // Get branch-specific settings, fallback to tenant-level
  let settings = null;
  if (branchId) {
    settings = await AttendanceSettings.findOne({
      where: { tenantId, branchId, isActive: true },
      include: [{ model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }]
    });
  }

  if (!settings) {
    settings = await AttendanceSettings.findOne({
      where: { tenantId, branchId: null, isActive: true }
    });
  }

  // Also get all branch-level overrides
  const branchOverrides = await AttendanceSettings.findAll({
    where: { tenantId, isActive: true },
    include: [{ model: Branch, as: 'branch', attributes: ['id', 'name', 'code'] }],
    order: [['createdAt', 'ASC']]
  });

  return res.status(200).json({
    success: true,
    data: settings || getDefaultSettings(),
    branchOverrides
  });
}

async function upsertSettings(req: NextApiRequest, res: NextApiResponse, session: any) {
  const tenantId = session.user.tenantId;
  const {
    branchId, workStartTime, workEndTime, breakStartTime, breakEndTime,
    breakDurationMinutes, workDays, lateGraceMinutes, earlyLeaveGraceMinutes,
    autoAbsentAfterMinutes, overtimeEnabled, overtimeMinMinutes, overtimeRequiresApproval,
    gpsAttendanceEnabled, geoFenceRadius, requireSelfie, allowOutsideGeofence,
    fingerprintEnabled, autoProcessDeviceLogs, punchTypeDetection,
    annualLeaveQuota, sickLeaveQuota, leaveRequiresApproval,
    notifyLateToManager, notifyAbsentToManager, notifyOvertimeToHr
  } = req.body;

  if (!AttendanceSettings) {
    return res.status(200).json({ success: true, message: 'Settings saved (mock)' });
  }

  const where: any = { tenantId, branchId: branchId || null };

  const [settings, created] = await AttendanceSettings.findOrCreate({
    where,
    defaults: {
      tenantId,
      branchId: branchId || null,
      workStartTime: workStartTime || '08:00:00',
      workEndTime: workEndTime || '17:00:00',
      breakStartTime, breakEndTime,
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
      isActive: true
    }
  });

  if (!created) {
    const updateData: any = {};
    const fields = [
      'workStartTime', 'workEndTime', 'breakStartTime', 'breakEndTime',
      'breakDurationMinutes', 'workDays', 'lateGraceMinutes', 'earlyLeaveGraceMinutes',
      'autoAbsentAfterMinutes', 'overtimeEnabled', 'overtimeMinMinutes', 'overtimeRequiresApproval',
      'gpsAttendanceEnabled', 'geoFenceRadius', 'requireSelfie', 'allowOutsideGeofence',
      'fingerprintEnabled', 'autoProcessDeviceLogs', 'punchTypeDetection',
      'annualLeaveQuota', 'sickLeaveQuota', 'leaveRequiresApproval',
      'notifyLateToManager', 'notifyAbsentToManager', 'notifyOvertimeToHr'
    ];
    const values: any = {
      workStartTime, workEndTime, breakStartTime, breakEndTime,
      breakDurationMinutes, workDays, lateGraceMinutes, earlyLeaveGraceMinutes,
      autoAbsentAfterMinutes, overtimeEnabled, overtimeMinMinutes, overtimeRequiresApproval,
      gpsAttendanceEnabled, geoFenceRadius, requireSelfie, allowOutsideGeofence,
      fingerprintEnabled, autoProcessDeviceLogs, punchTypeDetection,
      annualLeaveQuota, sickLeaveQuota, leaveRequiresApproval,
      notifyLateToManager, notifyAbsentToManager, notifyOvertimeToHr
    };
    fields.forEach(f => { if (values[f] !== undefined) updateData[f] = values[f]; });
    await settings.update(updateData);
  }

  return res.status(200).json({
    success: true,
    message: created ? 'Settings created' : 'Settings updated',
    data: settings
  });
}

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
    notifyLateToManager: true, notifyAbsentToManager: true, notifyOvertimeToHr: false
  };
}
