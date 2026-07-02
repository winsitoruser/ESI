import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { withHQAuth } from '../../../../../lib/middleware/withHQAuth';

let AttendanceDevice: any, AttendanceDeviceLog: any, EmployeeAttendance: any, Employee: any, AttendanceSettings: any;
try {
  const models = require('../../../../../models');
  AttendanceDevice = models.AttendanceDevice;
  AttendanceDeviceLog = models.AttendanceDeviceLog;
  EmployeeAttendance = models.EmployeeAttendance;
  Employee = models.Employee;
  AttendanceSettings = models.AttendanceSettings;
} catch (e) {
  console.warn('Models not available for device sync');
}

// Disable body parser for raw webhook payloads if needed
export const config = {
  api: { bodyParser: true }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { deviceId, secretKey, records, format } = req.body;

    if (!deviceId || !records || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        error: 'deviceId and records[] are required'
      });
    }

    // Verify device exists and is active
    if (!AttendanceDevice) {
      return res.status(200).json({
        success: true,
        message: `Mock: processed ${records.length} records`,
        processed: records.length,
        failed: 0
      });
    }

    const device = await AttendanceDevice.findOne({
      where: { id: deviceId, status: 'active' }
    });

    if (!device) {
      return res.status(404).json({ success: false, error: 'Device not found or inactive' });
    }

    // Verify webhook secret if configured
    if (device.webhookSecret && device.webhookSecret !== secretKey) {
      return res.status(403).json({ success: false, error: 'Invalid secret key' });
    }

    const batchId = `SYNC-${Date.now()}-${uuidv4().substring(0, 8)}`;
    let processed = 0;
    let failed = 0;
    let duplicates = 0;
    const errors: any[] = [];

    // Get attendance settings for this branch
    const settings = await AttendanceSettings.findOne({
      where: { tenantId: device.tenantId, branchId: device.branchId }
    }) || await AttendanceSettings.findOne({
      where: { tenantId: device.tenantId, branchId: null }
    });

    for (const record of records) {
      try {
        const punchTime = parsePunchTime(record, format);
        const deviceUserId = record.userId || record.user_id || record.pin || record.enrollNumber;
        const deviceUserName = record.userName || record.user_name || record.name;
        const verifyMode = parseVerifyMode(record.verifyMode || record.verify_mode || record.verifyType);

        if (!deviceUserId || !punchTime) {
          errors.push({ record, error: 'Missing userId or punchTime' });
          failed++;
          continue;
        }

        // Check for duplicate (same device, user, time within 60 seconds)
        const existingLog = await AttendanceDeviceLog.findOne({
          where: {
            deviceId: device.id,
            deviceUserId: String(deviceUserId),
            punchTime: {
              [require('sequelize').Op.between]: [
                new Date(punchTime.getTime() - 60000),
                new Date(punchTime.getTime() + 60000)
              ]
            }
          }
        });

        if (existingLog) {
          duplicates++;
          continue;
        }

        // Find matching employee by device user ID
        const employee = await findEmployeeByDeviceUserId(String(deviceUserId), device.tenantId);

        // Determine punch type (check_in or check_out)
        const punchType = await determinePunchType(
          employee?.id, punchTime, record.punchType || record.punch_type, settings
        );

        // Create device log entry
        const log = await AttendanceDeviceLog.create({
          deviceId: device.id,
          tenantId: device.tenantId,
          employeeId: employee?.id || null,
          deviceUserId: String(deviceUserId),
          deviceUserName: deviceUserName || null,
          punchTime,
          punchType,
          verifyMode,
          verifyStatus: record.verifyStatus || record.verify_status || null,
          processStatus: employee ? 'pending' : 'unmatched',
          rawData: record,
          syncBatchId: batchId
        });

        // Auto-process if employee matched and setting enabled
        if (employee && (!settings || settings.autoProcessDeviceLogs)) {
          await processDeviceLog(log, employee, device, settings);
        }

        processed++;
      } catch (err: any) {
        errors.push({ record, error: err.message });
        failed++;
      }
    }

    // Update device sync status
    await device.update({
      lastSyncAt: new Date(),
      lastSyncStatus: failed === 0 ? 'success' : (processed > 0 ? 'partial' : 'failed'),
      lastSyncMessage: `Batch ${batchId}: ${processed} processed, ${duplicates} duplicates, ${failed} failed`,
      totalSynced: device.totalSynced + processed,
      isOnline: true,
      lastHeartbeatAt: new Date()
    });

    return res.status(200).json({
      success: true,
      batchId,
      processed,
      duplicates,
      failed,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    });

  } catch (error: any) {
    console.error('Device sync error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
  }
}

// Process a device log into an actual attendance record
async function processDeviceLog(log: any, employee: any, device: any, settings: any) {
  try {
    const date = log.punchTime.toISOString().split('T')[0];

    if (log.punchType === 'check_in') {
      // Check if already has attendance for today
      const existing = await EmployeeAttendance.findOne({
        where: { employeeId: employee.id, date }
      });

      if (!existing) {
        // Determine status (on-time, late, etc.)
        const status = calculateAttendanceStatus(log.punchTime, settings);

        await EmployeeAttendance.create({
          employeeId: employee.id,
          branchId: device.branchId,
          date,
          clockIn: log.punchTime,
          status,
          lateMinutes: status === 'late' ? calculateLateMinutes(log.punchTime, settings) : 0,
          source: log.verifyMode || device.deviceType,
          deviceId: device.id,
          tenantId: device.tenantId
        });
      }
    } else if (log.punchType === 'check_out') {
      const existing = await EmployeeAttendance.findOne({
        where: { employeeId: employee.id, date }
      });

      if (existing && !existing.clockOut) {
        const clockIn = new Date(existing.clockIn);
        const clockOut = log.punchTime;
        const workMs = clockOut.getTime() - clockIn.getTime();
        const workHours = Math.round((workMs / 3600000) * 100) / 100;
        const breakMinutes = settings?.breakDurationMinutes || 60;
        const netWorkHours = Math.max(0, workHours - (breakMinutes / 60));

        let overtimeMinutes = 0;
        if (settings?.overtimeEnabled) {
          const scheduledEnd = parseTimeToDate(settings?.workEndTime || '17:00:00', date);
          const overMs = clockOut.getTime() - scheduledEnd.getTime();
          if (overMs > 0) {
            overtimeMinutes = Math.floor(overMs / 60000);
            if (settings?.overtimeMinMinutes && overtimeMinutes < settings.overtimeMinMinutes) {
              overtimeMinutes = 0;
            }
          }
        }

        const earlyLeaveMinutes = calculateEarlyLeave(clockOut, settings, date);

        await existing.update({
          clockOut,
          workHours: netWorkHours,
          overtimeMinutes,
          earlyLeaveMinutes,
          source: log.verifyMode || device.deviceType
        });
      }
    }

    // Mark log as processed
    await log.update({
      processStatus: 'processed',
      processedAt: new Date()
    });
  } catch (err: any) {
    await log.update({
      processStatus: 'failed',
      processError: err.message,
      processedAt: new Date()
    });
  }
}

async function findEmployeeByDeviceUserId(deviceUserId: string, tenantId: string) {
  if (!Employee) return null;
  // Try matching by employeeId field (e.g., EMP001)
  let employee = await Employee.findOne({
    where: { employeeId: deviceUserId, tenantId }
  });
  if (!employee) {
    // Try matching by national ID (KTP)
    employee = await Employee.findOne({
      where: { nationalId: deviceUserId, tenantId }
    });
  }
  return employee;
}

async function determinePunchType(
  employeeId: string | null,
  punchTime: Date,
  explicitType: string | null,
  settings: any
): Promise<string> {
  // If device explicitly sets punch type
  if (explicitType) {
    const typeMap: Record<string, string> = {
      '0': 'check_in', '1': 'check_out', '2': 'break_start', '3': 'break_end',
      'in': 'check_in', 'out': 'check_out',
      'check_in': 'check_in', 'check_out': 'check_out'
    };
    return typeMap[String(explicitType).toLowerCase()] || 'check_in';
  }

  const detection = settings?.punchTypeDetection || 'auto';

  if (detection === 'time_based') {
    // Before midpoint = check_in, after = check_out
    const hour = punchTime.getHours();
    const startHour = settings?.workStartTime ? parseInt(settings.workStartTime) : 8;
    const endHour = settings?.workEndTime ? parseInt(settings.workEndTime) : 17;
    const midpoint = Math.floor((startHour + endHour) / 2);
    return hour < midpoint ? 'check_in' : 'check_out';
  }

  // Auto mode: check if employee already has a check-in today
  if (employeeId && EmployeeAttendance) {
    const date = punchTime.toISOString().split('T')[0];
    const existing = await EmployeeAttendance.findOne({
      where: { employeeId, date }
    });
    if (existing && existing.clockIn && !existing.clockOut) {
      return 'check_out';
    }
  }

  return 'check_in';
}

function calculateAttendanceStatus(clockIn: Date, settings: any): string {
  if (!settings) return 'present';
  const startTime = settings.workStartTime || '08:00:00';
  const graceMinutes = settings.lateGraceMinutes || 15;
  const [h, m] = startTime.split(':').map(Number);
  const scheduledStart = new Date(clockIn);
  scheduledStart.setHours(h, m, 0, 0);
  const graceEnd = new Date(scheduledStart.getTime() + graceMinutes * 60000);
  return clockIn > graceEnd ? 'late' : 'present';
}

function calculateLateMinutes(clockIn: Date, settings: any): number {
  if (!settings) return 0;
  const startTime = settings.workStartTime || '08:00:00';
  const [h, m] = startTime.split(':').map(Number);
  const scheduledStart = new Date(clockIn);
  scheduledStart.setHours(h, m, 0, 0);
  const diff = clockIn.getTime() - scheduledStart.getTime();
  return diff > 0 ? Math.floor(diff / 60000) : 0;
}

function calculateEarlyLeave(clockOut: Date, settings: any, date: string): number {
  if (!settings) return 0;
  const scheduledEnd = parseTimeToDate(settings.workEndTime || '17:00:00', date);
  const diff = scheduledEnd.getTime() - clockOut.getTime();
  const graceMs = (settings.earlyLeaveGraceMinutes || 15) * 60000;
  return diff > graceMs ? Math.floor(diff / 60000) : 0;
}

function parseTimeToDate(time: string, date: string): Date {
  const [h, m, s] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, s || 0, 0);
  return d;
}

function parsePunchTime(record: any, format?: string): Date | null {
  const raw = record.punchTime || record.punch_time || record.timestamp ||
    record.attendTime || record.checkTime || record.time;
  if (!raw) return null;
  if (raw instanceof Date) return raw;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function parseVerifyMode(mode: any): string {
  if (!mode && mode !== 0) return 'unknown';
  const modeMap: Record<string, string> = {
    '0': 'password', '1': 'fingerprint', '2': 'card', '3': 'password',
    '4': 'face', '5': 'fingerprint', '6': 'palm', '7': 'iris',
    '15': 'face', 'fp': 'fingerprint', 'face': 'face', 'card': 'card',
    'pin': 'password', 'finger': 'fingerprint'
  };
  return modeMap[String(mode).toLowerCase()] || String(mode);
}

export default withHQAuth(handler, { module: 'hris' });
