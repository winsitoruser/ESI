import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';

let EmployeeAttendance: any, Employee: any, Branch: any, AttendanceSettings: any;
try {
  const models = require('../../../../models');
  EmployeeAttendance = models.EmployeeAttendance;
  Employee = models.Employee;
  Branch = models.Branch;
  AttendanceSettings = models.AttendanceSettings;
} catch (e) {
  console.warn('Models not available for mobile attendance');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    switch (req.method) {
      case 'POST': return await clockInOut(req, res, session);
      case 'GET': return await getMyAttendance(req, res, session);
      default:
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error: any) {
    console.error('Mobile Attendance API Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
}

async function clockInOut(req: NextApiRequest, res: NextApiResponse, session: any) {
  const {
    action, // 'clock_in' or 'clock_out'
    latitude, longitude, accuracy,
    selfieBase64, // Base64 encoded selfie image
    notes,
    branchId
  } = req.body;

  if (!action || !['clock_in', 'clock_out'].includes(action)) {
    return res.status(400).json({ success: false, error: 'action must be clock_in or clock_out' });
  }

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ success: false, error: 'GPS coordinates (latitude, longitude) required' });
  }

  const tenantId = session.user.tenantId;
  const userId = session.user.id;

  if (!EmployeeAttendance || !Employee) {
    return res.status(200).json({
      success: true,
      message: `Mobile ${action} recorded (mock)`,
      data: {
        action,
        time: new Date().toISOString(),
        location: { latitude, longitude, accuracy },
        isWithinGeofence: true,
        distance: 25
      }
    });
  }

  // Find employee linked to this user
  const employee = await Employee.findOne({
    where: { userId, tenantId }
  });

  if (!employee) {
    return res.status(404).json({ success: false, error: 'Employee profile not found for this user' });
  }

  const targetBranchId = branchId || employee.branchId;

  // Get branch location for geofence check
  const branch = await Branch.findByPk(targetBranchId);
  if (!branch) {
    return res.status(404).json({ success: false, error: 'Branch not found' });
  }

  // Get attendance settings
  const settings = await getSettings(tenantId, targetBranchId);

  // Check if GPS attendance is enabled
  if (settings && !settings.gpsAttendanceEnabled) {
    return res.status(400).json({ success: false, error: 'GPS/mobile attendance is not enabled for this branch' });
  }

  // Check selfie requirement
  if (settings?.requireSelfie && !selfieBase64) {
    return res.status(400).json({ success: false, error: 'Selfie photo is required for mobile attendance' });
  }

  // Calculate distance from branch
  const distance = calculateDistance(
    latitude, longitude,
    branch.latitude || 0, branch.longitude || 0
  );

  const geoFenceRadius = settings?.geoFenceRadius || 100;
  const isWithinGeofence = distance <= geoFenceRadius;

  // Check if outside geofence is allowed
  if (!isWithinGeofence && settings && !settings.allowOutsideGeofence) {
    return res.status(400).json({
      success: false,
      error: `Anda berada di luar area kantor (${Math.round(distance)}m dari lokasi, max ${geoFenceRadius}m)`,
      data: { distance: Math.round(distance), maxRadius: geoFenceRadius }
    });
  }

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();

  // Save selfie if provided
  let selfieUrl: string | null = null;
  if (selfieBase64) {
    // In production, upload to cloud storage. For now, save reference.
    selfieUrl = `attendance/selfie/${employee.id}/${today}_${action}.jpg`;
  }

  if (action === 'clock_in') {
    // Check if already clocked in today
    const existing = await EmployeeAttendance.findOne({
      where: { employeeId: employee.id, date: today }
    });

    if (existing && existing.clockIn) {
      return res.status(400).json({
        success: false,
        error: 'Anda sudah clock-in hari ini',
        data: { clockIn: existing.clockIn }
      });
    }

    // Calculate status
    const status = calculateStatus(now, settings);
    const lateMinutes = status === 'late' ? calculateLateMinutes(now, settings) : 0;

    const attendance = await EmployeeAttendance.create({
      employeeId: employee.id,
      branchId: targetBranchId,
      date: today,
      clockIn: now,
      scheduledStart: settings?.workStartTime || '08:00:00',
      scheduledEnd: settings?.workEndTime || '17:00:00',
      status,
      lateMinutes,
      clockInLocation: { latitude, longitude, accuracy },
      source: 'gps_mobile',
      selfieUrl,
      isOutsideGeofence: !isWithinGeofence,
      distanceFromBranch: Math.round(distance),
      notes,
      tenantId
    });

    return res.status(200).json({
      success: true,
      message: status === 'late'
        ? `Clock-in berhasil (terlambat ${lateMinutes} menit)`
        : 'Clock-in berhasil',
      data: {
        id: attendance.id,
        action: 'clock_in',
        time: now.toISOString(),
        status,
        lateMinutes,
        location: { latitude, longitude, accuracy },
        isWithinGeofence,
        distance: Math.round(distance),
        selfieUrl
      }
    });

  } else {
    // clock_out
    const existing = await EmployeeAttendance.findOne({
      where: { employeeId: employee.id, date: today }
    });

    if (!existing || !existing.clockIn) {
      return res.status(400).json({ success: false, error: 'Belum ada clock-in hari ini' });
    }

    if (existing.clockOut) {
      return res.status(400).json({
        success: false,
        error: 'Anda sudah clock-out hari ini',
        data: { clockOut: existing.clockOut }
      });
    }

    const clockIn = new Date(existing.clockIn);
    const workMs = now.getTime() - clockIn.getTime();
    const totalHours = workMs / 3600000;
    const breakMinutes = settings?.breakDurationMinutes || 60;
    const workHours = Math.round((totalHours - breakMinutes / 60) * 100) / 100;

    let overtimeMinutes = 0;
    if (settings?.overtimeEnabled) {
      const endTime = settings?.workEndTime || '17:00:00';
      const [h, m] = endTime.split(':').map(Number);
      const scheduledEnd = new Date(today);
      scheduledEnd.setHours(h, m, 0, 0);
      const overMs = now.getTime() - scheduledEnd.getTime();
      if (overMs > 0) {
        overtimeMinutes = Math.floor(overMs / 60000);
        if (settings?.overtimeMinMinutes && overtimeMinutes < settings.overtimeMinMinutes) {
          overtimeMinutes = 0;
        }
      }
    }

    const earlyLeaveMinutes = calculateEarlyLeave(now, settings, today);

    await existing.update({
      clockOut: now,
      clockOutLocation: { latitude, longitude, accuracy },
      workHours: Math.max(0, workHours),
      overtimeMinutes,
      earlyLeaveMinutes,
      source: 'gps_mobile',
      selfieUrl: selfieUrl || existing.selfieUrl,
      notes: notes ? `${existing.notes || ''}\nClock-out: ${notes}`.trim() : existing.notes
    });

    return res.status(200).json({
      success: true,
      message: overtimeMinutes > 0
        ? `Clock-out berhasil (lembur ${overtimeMinutes} menit)`
        : 'Clock-out berhasil',
      data: {
        id: existing.id,
        action: 'clock_out',
        time: now.toISOString(),
        workHours: Math.max(0, workHours),
        overtimeMinutes,
        earlyLeaveMinutes,
        location: { latitude, longitude, accuracy },
        isWithinGeofence,
        distance: Math.round(distance)
      }
    });
  }
}

async function getMyAttendance(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { period = 'month', startDate, endDate } = req.query;
  const tenantId = session.user.tenantId;
  const userId = session.user.id;

  if (!EmployeeAttendance || !Employee) {
    return res.status(200).json({ success: true, data: [], summary: {} });
  }

  const employee = await Employee.findOne({ where: { userId, tenantId } });
  if (!employee) {
    return res.status(404).json({ success: false, error: 'Employee not found' });
  }

  const { Op } = require('sequelize');
  const now = new Date();
  let dateStart = new Date();

  if (startDate) {
    dateStart = new Date(startDate as string);
  } else {
    switch (period) {
      case 'week': dateStart.setDate(now.getDate() - 7); break;
      case 'month': dateStart.setMonth(now.getMonth() - 1); break;
      default: dateStart.setMonth(now.getMonth() - 1);
    }
  }

  const where: any = {
    employeeId: employee.id,
    date: {
      [Op.between]: [
        dateStart.toISOString().split('T')[0],
        (endDate ? new Date(endDate as string) : now).toISOString().split('T')[0]
      ]
    }
  };

  const records = await EmployeeAttendance.findAll({
    where,
    order: [['date', 'DESC']]
  });

  const summary = {
    present: records.filter((r: any) => r.status === 'present').length,
    late: records.filter((r: any) => r.status === 'late').length,
    absent: records.filter((r: any) => r.status === 'absent').length,
    leave: records.filter((r: any) => ['leave', 'sick'].includes(r.status)).length,
    totalDays: records.length,
    totalWorkHours: records.reduce((sum: number, r: any) => sum + (parseFloat(r.workHours) || 0), 0),
    totalOvertimeMinutes: records.reduce((sum: number, r: any) => sum + (r.overtimeMinutes || 0), 0),
    totalLateMinutes: records.reduce((sum: number, r: any) => sum + (r.lateMinutes || 0), 0)
  };

  return res.status(200).json({ success: true, data: records, summary });
}

async function getSettings(tenantId: string, branchId: string) {
  if (!AttendanceSettings) return null;
  let settings = await AttendanceSettings.findOne({
    where: { tenantId, branchId, isActive: true }
  });
  if (!settings) {
    settings = await AttendanceSettings.findOne({
      where: { tenantId, branchId: null, isActive: true }
    });
  }
  return settings;
}

function calculateStatus(clockIn: Date, settings: any): string {
  if (!settings) return 'present';
  const startTime = settings.workStartTime || '08:00:00';
  const graceMinutes = settings.lateGraceMinutes || 15;
  const [h, m] = startTime.split(':').map(Number);
  const scheduled = new Date(clockIn);
  scheduled.setHours(h, m, 0, 0);
  const graceEnd = new Date(scheduled.getTime() + graceMinutes * 60000);
  return clockIn > graceEnd ? 'late' : 'present';
}

function calculateLateMinutes(clockIn: Date, settings: any): number {
  if (!settings) return 0;
  const [h, m] = (settings.workStartTime || '08:00:00').split(':').map(Number);
  const scheduled = new Date(clockIn);
  scheduled.setHours(h, m, 0, 0);
  const diff = clockIn.getTime() - scheduled.getTime();
  return diff > 0 ? Math.floor(diff / 60000) : 0;
}

function calculateEarlyLeave(clockOut: Date, settings: any, date: string): number {
  if (!settings) return 0;
  const [h, m] = (settings.workEndTime || '17:00:00').split(':').map(Number);
  const scheduledEnd = new Date(date);
  scheduledEnd.setHours(h, m, 0, 0);
  const diff = scheduledEnd.getTime() - clockOut.getTime();
  const grace = (settings.earlyLeaveGraceMinutes || 15) * 60000;
  return diff > grace ? Math.floor(diff / 60000) : 0;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
