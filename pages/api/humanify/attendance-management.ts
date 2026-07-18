import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { allowHrMockFallback, resolveDataSource } from '@/lib/hris/data-source';
import { tenantIdFromSession, findScopedById, destroyScoped } from '@/lib/saas/tenant-scope';
import { ensureTenantDbContext } from '@/lib/saas/ensure-tenant-db-context';

let sequelize: any, Op: any;
try { sequelize = require('../../../lib/sequelize'); Op = require('sequelize').Op; } catch (e) {}

let WorkShift: any, ShiftSchedule: any, ShiftRotation: any, GeofenceLocation: any, AttendanceSetting: any, EmployeeAttendance: any;
try {
  WorkShift = require('../../../models/WorkShift');
  ShiftSchedule = require('../../../models/ShiftSchedule');
  ShiftRotation = require('../../../models/ShiftRotation');
  GeofenceLocation = require('../../../models/GeofenceLocation');
  AttendanceSetting = require('../../../models/AttendanceSetting');
  EmployeeAttendance = require('../../../models/EmployeeAttendance');
} catch (e) { console.warn('Attendance models not available'); }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    await ensureTenantDbContext(session);

    const { action } = req.query;

    switch (req.method) {
      case 'GET':
        if (!action || action === 'overview') return getOverview(req, res, session);
        if (action === 'shifts') return getWorkShifts(req, res, session);
        if (action === 'schedules') return getSchedules(req, res, session);
        if (action === 'rotations') return getRotations(req, res, session);
        if (action === 'geofences') return getGeofences(req, res, session);
        if (action === 'settings') return getSettings(req, res, session);
        if (action === 'attendance') return getAttendanceRecords(req, res, session);
        if (action === 'today') return getTodayLive(req, res, session);
        return res.status(400).json({ error: 'Unknown GET action' });
      case 'POST':
        if (action === 'shift') return createWorkShift(req, res, session);
        if (action === 'schedule') return createSchedule(req, res, session);
        if (action === 'schedule-bulk') return bulkCreateSchedule(req, res, session);
        if (action === 'rotation') return createRotation(req, res, session);
        if (action === 'geofence') return createGeofence(req, res, session);
        if (action === 'clock-in') return clockIn(req, res, session);
        if (action === 'clock-out') return clockOut(req, res, session);
        if (action === 'generate-rotation') return generateRotationSchedules(req, res, session);
        return res.status(400).json({ error: 'Unknown POST action' });
      case 'PUT':
        if (action === 'shift') return updateWorkShift(req, res, session);
        if (action === 'schedule') return updateSchedule(req, res, session);
        if (action === 'rotation') return updateRotation(req, res, session);
        if (action === 'geofence') return updateGeofence(req, res, session);
        if (action === 'settings') return updateSettings(req, res, session);
        return res.status(400).json({ error: 'Unknown PUT action' });
      case 'DELETE':
        if (action === 'shift') return deleteWorkShift(req, res, session);
        if (action === 'schedule') return deleteSchedule(req, res, session);
        if (action === 'rotation') return deleteRotation(req, res, session);
        if (action === 'geofence') return deleteGeofence(req, res, session);
        return res.status(400).json({ error: 'Unknown DELETE action' });
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.warn('Attendance Management API Error: (table may not exist):', (error as any)?.message || error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

function settingsToMap(settingsList: any[]) {
  return (settingsList || []).reduce((acc: any, s: any) => {
    const key = s.setting_key || s.settingKey;
    const val = s.setting_value ?? s.settingValue;
    if (key) acc[key] = val;
    return acc;
  }, {});
}

async function safeModelFindAll(model: any, options: any, fallback: any[] = []) {
  if (!model) return fallback;
  try {
    const rows = await model.findAll(options);
    return rows.map((r: any) => (r?.toJSON ? r.toJSON() : r));
  } catch {
    return fallback;
  }
}

async function fetchTodayAttendanceLive(tenantId: string | null) {
  const emptyStats = { total: 0, present: 0, late: 0, absent: 0, leave: 0, clockedIn: 0 };
  if (!sequelize || !tenantId) return { records: [], stats: emptyStats };
  try {
    const today = new Date().toISOString().split('T')[0];
    const [records] = await sequelize.query(`
      SELECT ea.id, ea.employee_id, ea.branch_id, ea.date, ea.clock_in, ea.clock_out, ea.status,
             ea.late_minutes, ea.early_leave_minutes, ea.overtime_minutes, ea.work_hours,
             e.name as employee_name, e.employee_code, e.position, e.department,
             COALESCE(b.name, 'HQ') as branch_name
      FROM employee_attendance ea
      INNER JOIN employees e ON ea.employee_id::text = e.id::text AND e.tenant_id = :tenantId
      LEFT JOIN branches b ON ea.branch_id::text = b.id::text
      WHERE ea.date = :today
      ORDER BY ea.clock_in DESC NULLS LAST
    `, { replacements: { today, tenantId } });

    const stats = {
      total: records.length,
      present: records.filter((r: any) => ['present', 'work_from_home'].includes(r.status)).length,
      late: records.filter((r: any) => r.status === 'late').length,
      absent: records.filter((r: any) => r.status === 'absent').length,
      leave: records.filter((r: any) => ['leave', 'sick'].includes(r.status)).length,
      clockedIn: records.filter((r: any) => r.clock_in && !r.clock_out).length,
    };
    return { records, stats };
  } catch (e: any) {
    console.warn('Today attendance query error:', e?.message || e);
    return { records: [], stats: emptyStats };
  }
}

// ================= GET: Overview =================
async function getOverview(req: NextApiRequest, res: NextApiResponse, session: any) {
  const tenantId = tenantIdFromSession(session);
  const mockSettings = allowHrMockFallback() ? getMockSettings() : [];
  const { records: todayRecords, stats: todayStats } = await fetchTodayAttendanceLive(tenantId);
  const mockShifts = allowHrMockFallback() ? getMockShifts() : [];
  const mockRotations = allowHrMockFallback() ? getMockRotations() : [];
  const mockGeofences = allowHrMockFallback() ? getMockGeofences() : [];

  if (!tenantId) {
    return res.json({
      success: true,
      shifts: mockShifts,
      schedules: [],
      rotations: mockRotations,
      geofences: mockGeofences,
      settings: settingsToMap(mockSettings),
      settingsRaw: mockSettings,
      todayStats,
      todayRecords,
      dataSource: resolveDataSource(false, allowHrMockFallback()),
    });
  }

  const tenantWhere = { tenantId };
  const shifts = await safeModelFindAll(
    WorkShift,
    { where: { isActive: true, ...tenantWhere }, order: [['sort_order', 'ASC']] },
    mockShifts
  );
  const schedules = await safeModelFindAll(
    ShiftSchedule,
    { where: tenantWhere, limit: 200, order: [['schedule_date', 'DESC']] },
    []
  );
  const rotations = await safeModelFindAll(
    ShiftRotation,
    { where: tenantWhere, order: [['created_at', 'DESC']] },
    mockRotations
  );
  const geofences = await safeModelFindAll(
    GeofenceLocation,
    { where: tenantWhere, order: [['name', 'ASC']] },
    mockGeofences
  );
  const settingsRaw = await safeModelFindAll(AttendanceSetting, { where: tenantWhere }, mockSettings);

  const isDemoRow = (row: any) => {
    const id = String(row?.id ?? '');
    return /^(sh|g|r)\d+$/i.test(id);
  };
  const hasLive = [shifts, geofences, rotations, todayRecords].some(
    (arr) => Array.isArray(arr) && arr.some((r) => r?.id && !isDemoRow(r))
  );
  const usedMock = allowHrMockFallback() && !hasLive && (
    shifts.length > 0 || geofences.length > 0 || rotations.length > 0 || todayRecords.length > 0
  );

  return res.json({
    success: true,
    shifts,
    schedules,
    rotations,
    geofences,
    settings: settingsToMap(settingsRaw),
    settingsRaw,
    todayStats,
    todayRecords,
    dataSource: resolveDataSource(hasLive, usedMock),
  });
}

// ================= GET: Work Shifts =================
async function getWorkShifts(req: NextApiRequest, res: NextApiResponse, session: any) {
  const mock = allowHrMockFallback() ? getMockShifts() : [];
  if (!WorkShift) return res.json({ success: true, data: mock, dataSource: mock.length ? 'demo' : 'empty' });
  try {
    const data = await WorkShift.findAll({ order: [['sort_order', 'ASC']] });
    return res.json({ success: true, data });
  } catch (e: any) {
    console.warn('[attendance-management shifts]', e?.message);
    return res.json({ success: true, data: mock, meta: { fallback: true }, dataSource: mock.length ? 'demo' : 'empty' });
  }
}

// ================= GET: Schedules =================
async function getSchedules(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!ShiftSchedule) return res.json({ success: true, data: [] });
  const { startDate, endDate, employeeId } = req.query;
  const where: any = {};
  if (startDate && endDate && Op) where.scheduleDate = { [Op.between]: [startDate, endDate] };
  if (employeeId) where.employeeId = employeeId;
  const data = await ShiftSchedule.findAll({ where, order: [['schedule_date', 'ASC']], limit: 500 });
  return res.json({ success: true, data });
}

// ================= GET: Rotations =================
async function getRotations(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!ShiftRotation) {
    const mock = allowHrMockFallback() ? getMockRotations() : [];
    return res.json({ success: true, data: mock, dataSource: mock.length ? 'demo' : 'empty' });
  }
  const data = await ShiftRotation.findAll({ order: [['created_at', 'DESC']] });
  return res.json({ success: true, data });
}

// ================= GET: Geofences =================
async function getGeofences(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!GeofenceLocation) {
    const mock = allowHrMockFallback() ? getMockGeofences() : [];
    return res.json({ success: true, data: mock, dataSource: mock.length ? 'demo' : 'empty' });
  }
  const data = await GeofenceLocation.findAll({ order: [['name', 'ASC']] });
  return res.json({ success: true, data });
}

// ================= GET: Settings =================
async function getSettings(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!AttendanceSetting) {
    const mock = allowHrMockFallback() ? getMockSettings() : [];
    return res.json({ success: true, data: mock, dataSource: mock.length ? 'demo' : 'empty' });
  }
  const data = await AttendanceSetting.findAll();
  return res.json({ success: true, data });
}

// ================= GET: Attendance Records =================
async function getAttendanceRecords(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!EmployeeAttendance || !sequelize) return res.json({ success: true, data: [], summary: {} });
  const tenantId = tenantIdFromSession(session);
  if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });
  const { startDate, endDate, employeeId, branchId, status } = req.query;
  try {
    let sql = `
      SELECT ea.* FROM employee_attendance ea
      INNER JOIN employees e ON ea.employee_id::text = e.id::text AND e.tenant_id = :tenantId
      WHERE 1=1`;
    const replacements: any = { tenantId };
    if (startDate && endDate) {
      sql += ' AND ea.date BETWEEN :startDate AND :endDate';
      replacements.startDate = startDate;
      replacements.endDate = endDate;
    } else {
      const d = new Date(); d.setMonth(d.getMonth() - 1);
      sql += ' AND ea.date >= :startDate';
      replacements.startDate = d.toISOString().split('T')[0];
    }
    if (employeeId) { sql += ' AND ea.employee_id = :employeeId'; replacements.employeeId = employeeId; }
    if (branchId) { sql += ' AND ea.branch_id = :branchId'; replacements.branchId = branchId; }
    if (status && status !== 'all') { sql += ' AND ea.status = :status'; replacements.status = status; }
    sql += ' ORDER BY ea.date DESC LIMIT 1000';
    const [data] = await sequelize.query(sql, { replacements });
    return res.json({ success: true, data });
  } catch (e: any) {
    return res.json({ success: true, data: [], summary: {}, error: e.message });
  }
}

// ================= GET: Today Live =================
async function getTodayLive(req: NextApiRequest, res: NextApiResponse, session: any) {
  const tenantId = tenantIdFromSession(session);
  if (!sequelize || !tenantId) return res.json({ success: true, records: [], totalEmployees: 0 });
  try {
    const today = new Date().toISOString().split('T')[0];
    const [records] = await sequelize.query(`
      SELECT ea.*, e.name as employee_name, e.position, e.department 
      FROM employee_attendance ea 
      INNER JOIN employees e ON ea.employee_id::text = e.id::text AND e.tenant_id = :tenantId
      WHERE ea.date = :today ORDER BY ea.clock_in DESC NULLS LAST
    `, { replacements: { today, tenantId } });

    const [totalEmps] = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM employees WHERE UPPER(status) = 'ACTIVE' AND tenant_id = :tenantId`,
      { replacements: { tenantId } }
    );
    return res.json({ success: true, records, totalEmployees: parseInt(totalEmps[0]?.cnt || '0') });
  } catch (e: any) {
    return res.json({ success: true, records: [], totalEmployees: 0 });
  }
}

// ================= POST: Create Work Shift =================
async function createWorkShift(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!WorkShift) return res.json({ success: true, message: 'Created (mock)' });
  try {
    const body = { ...req.body, tenantId: session.user.tenantId };
    if (!body.code) {
      const base = String(body.name || 'SHIFT').toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 20);
      body.code = `${base}_${Date.now().toString(36).slice(-4)}`.slice(0, 30);
    }
    if (!body.startTime && body.start_time) body.startTime = body.start_time;
    if (!body.endTime && body.end_time) body.endTime = body.end_time;
    if (body.breakMinutes != null && body.breakDurationMinutes == null) {
      body.breakDurationMinutes = body.breakMinutes;
    }
    const data = await WorkShift.create(body);
    return res.status(201).json({ success: true, data });
  } catch (e: any) { return res.status(500).json({ success: false, error: e.message }); }
}

// ================= PUT: Update Work Shift =================
async function updateWorkShift(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, ...data } = req.body;
  if (!id || !WorkShift) return res.json({ success: true, message: 'Updated (mock)' });
  try {
    const tenantId = tenantIdFromSession(session);
    if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });
    const item = await findScopedById(WorkShift, id, tenantId);
    if (!item) return res.status(404).json({ error: 'Not found' });
    delete (data as any).tenantId;
    await item.update(data);
    return res.json({ success: true, data: item });
  } catch (e: any) { return res.status(500).json({ success: false, error: e.message }); }
}

// ================= DELETE: Work Shift =================
async function deleteWorkShift(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id } = req.query;
  if (!id || !WorkShift) return res.json({ success: true });
  try {
    const tenantId = tenantIdFromSession(session);
    if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });
    const n = await destroyScoped(WorkShift, id as string, tenantId);
    if (!n) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true, message: 'Deleted' });
  } catch (e: any) { return res.status(500).json({ success: false, error: e.message }); }
}

// ================= POST: Create Schedule =================
async function createSchedule(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!ShiftSchedule) return res.json({ success: true, message: 'Created (mock)' });
  try {
    const data = await ShiftSchedule.create({ ...req.body, tenantId: session.user.tenantId, assignedBy: session.user.id });
    return res.status(201).json({ success: true, data });
  } catch (e: any) { return res.status(500).json({ success: false, error: e.message }); }
}

// ================= POST: Bulk Create Schedules =================
async function bulkCreateSchedule(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!ShiftSchedule || !sequelize) return res.json({ success: true, message: 'Bulk created (mock)', count: 0 });
  const tenantId = tenantIdFromSession(session);
  if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });
  const { employeeIds, workShiftId, startDate, endDate, days } = req.body;
  if (!employeeIds || !workShiftId || !startDate || !endDate) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  try {
    const [owned] = await sequelize.query(
      `SELECT id::text AS id FROM employees WHERE tenant_id = :tid AND id::text = ANY(:ids)`,
      { replacements: { tid: tenantId, ids: employeeIds.map(String) } },
    );
    const ownedSet = new Set((owned || []).map((r: any) => String(r.id)));
    const validIds = employeeIds.filter((id: string) => ownedSet.has(String(id)));
    if (!validIds.length) return res.status(404).json({ success: false, error: 'No valid employees in tenant' });

    const start = new Date(startDate);
    const end = new Date(endDate);
    const applicableDays = days || [1, 2, 3, 4, 5];
    let count = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (!applicableDays.includes(dayOfWeek)) continue;
      const dateStr = d.toISOString().split('T')[0];
      
      for (const empId of validIds) {
        try {
          await sequelize.query(`
            INSERT INTO shift_schedules (id, tenant_id, employee_id, work_shift_id, schedule_date, status, assigned_by, created_at, updated_at)
            VALUES (uuid_generate_v4(), :tenantId, :empId, :shiftId, :date, 'scheduled', :assignedBy, NOW(), NOW())
            ON CONFLICT (employee_id, schedule_date) DO UPDATE SET work_shift_id = :shiftId, updated_at = NOW()
          `, { replacements: { tenantId, empId, shiftId: workShiftId, date: dateStr, assignedBy: session.user.id } });
          count++;
        } catch (e) {}
      }
    }
    return res.json({ success: true, message: `${count} schedules created/updated`, count });
  } catch (e: any) { return res.status(500).json({ success: false, error: e.message }); }
}

// ================= PUT/DELETE: Schedule =================
async function updateSchedule(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, ...data } = req.body;
  if (!id || !ShiftSchedule) return res.json({ success: true });
  const tenantId = tenantIdFromSession(session);
  if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });
  const item = await findScopedById(ShiftSchedule, id, tenantId);
  if (!item) return res.status(404).json({ error: 'Not found' });
  delete (data as any).tenantId;
  await item.update(data);
  return res.json({ success: true, data: item });
}

async function deleteSchedule(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id } = req.query;
  if (!id || !ShiftSchedule) return res.json({ success: true });
  const tenantId = tenantIdFromSession(session);
  if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });
  const n = await destroyScoped(ShiftSchedule, id as string, tenantId);
  if (!n) return res.status(404).json({ error: 'Not found' });
  return res.json({ success: true });
}

// ================= POST: Create Rotation =================
async function createRotation(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!ShiftRotation) return res.json({ success: true, message: 'Created (mock)' });
  try {
    const data = await ShiftRotation.create({ ...req.body, tenantId: session.user.tenantId, createdBy: session.user.id });
    return res.status(201).json({ success: true, data });
  } catch (e: any) { return res.status(500).json({ success: false, error: e.message }); }
}

async function updateRotation(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, ...data } = req.body;
  if (!id || !ShiftRotation) return res.json({ success: true });
  const tenantId = tenantIdFromSession(session);
  if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });
  const item = await findScopedById(ShiftRotation, id, tenantId);
  if (!item) return res.status(404).json({ error: 'Not found' });
  delete (data as any).tenantId;
  await item.update(data);
  return res.json({ success: true, data: item });
}

async function deleteRotation(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id } = req.query;
  if (!id || !ShiftRotation) return res.json({ success: true });
  const tenantId = tenantIdFromSession(session);
  if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });
  const n = await destroyScoped(ShiftRotation, id as string, tenantId);
  if (!n) return res.status(404).json({ error: 'Not found' });
  return res.json({ success: true });
}

// ================= POST: Generate Rotation Schedules =================
async function generateRotationSchedules(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!ShiftRotation || !sequelize) return res.json({ success: true, message: 'Generated (mock)', count: 0 });
  const { rotationId } = req.body;
  if (!rotationId) return res.status(400).json({ error: 'rotationId required' });

  try {
    const tenantId = tenantIdFromSession(session);
    if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });
    const rotation = await findScopedById(ShiftRotation, rotationId, tenantId);
    if (!rotation) return res.status(404).json({ error: 'Rotation not found' });

    const pattern = rotation.rotationPattern || rotation.rotation_pattern || [];
    const empIds = rotation.employeeIds || rotation.employee_ids || [];
    const weeksAhead = rotation.generateWeeksAhead || rotation.generate_weeks_ahead || 2;

    if (pattern.length === 0) return res.status(400).json({ error: 'No rotation pattern defined' });

    // Get employees if empIds empty, fall back to tenant's active employees
    let employees = empIds;
    if (employees.length === 0) {
      if (!tenantId) {
        return res.json({ success: true, message: 'No tenant employees to schedule', count: 0 });
      }
      const [emps] = await sequelize.query(
        `SELECT id FROM employees WHERE UPPER(status) = 'ACTIVE' AND tenant_id = :tenantId LIMIT 100`,
        { replacements: { tenantId } }
      );
      employees = emps.map((e: any) => e.id);
    }

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + weeksAhead * 7);
    let count = 0;

    for (const empId of employees) {
      let currentDate = new Date(today);
      let weekIndex = 0;

      while (currentDate <= endDate) {
        const patternEntry = pattern[weekIndex % pattern.length];
        const dayOfWeek = currentDate.getDay();

        // Only weekdays (Mon-Fri) by default
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const dateStr = currentDate.toISOString().split('T')[0];
          try {
            await sequelize.query(`
              INSERT INTO shift_schedules (id, tenant_id, employee_id, work_shift_id, schedule_date, status, rotation_id, created_at, updated_at)
              VALUES (uuid_generate_v4(), :tenantId, :empId, :shiftId, :date, 'scheduled', :rotId, NOW(), NOW())
              ON CONFLICT (employee_id, schedule_date) DO UPDATE SET work_shift_id = :shiftId, rotation_id = :rotId, updated_at = NOW()
            `, { replacements: { tenantId: session.user.tenantId, empId, shiftId: patternEntry.shift_id, date: dateStr, rotId: rotationId } });
            count++;
          } catch (e) {}
        }

        // Move to next day, increment weekIndex on Monday
        currentDate.setDate(currentDate.getDate() + 1);
        if (currentDate.getDay() === 1) weekIndex++;
      }
    }

    await rotation.update({ lastGeneratedDate: new Date().toISOString().split('T')[0] });
    return res.json({ success: true, message: `Generated ${count} schedules for ${employees.length} employees`, count });
  } catch (e: any) { return res.status(500).json({ success: false, error: e.message }); }
}

// ================= Geofence CRUD =================
async function createGeofence(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!GeofenceLocation) return res.json({ success: true, message: 'Created (mock)' });
  try {
    const data = await GeofenceLocation.create({ ...req.body, tenantId: session.user.tenantId });
    return res.status(201).json({ success: true, data });
  } catch (e: any) { return res.status(500).json({ success: false, error: e.message }); }
}

async function updateGeofence(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id, ...data } = req.body;
  if (!id || !GeofenceLocation) return res.json({ success: true });
  const tenantId = tenantIdFromSession(session);
  if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });
  const item = await findScopedById(GeofenceLocation, id, tenantId);
  if (!item) return res.status(404).json({ error: 'Not found' });
  delete (data as any).tenantId;
  await item.update(data);
  return res.json({ success: true, data: item });
}

async function deleteGeofence(req: NextApiRequest, res: NextApiResponse, session: any) {
  const { id } = req.query;
  if (!id || !GeofenceLocation) return res.json({ success: true });
  const tenantId = tenantIdFromSession(session);
  if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });
  const n = await destroyScoped(GeofenceLocation, id as string, tenantId);
  if (!n) return res.status(404).json({ error: 'Not found' });
  return res.json({ success: true });
}

// ================= POST: Clock In =================
async function clockIn(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!EmployeeAttendance || !sequelize) return res.json({ success: true, message: 'Clocked in (mock)' });
  const tenantId = tenantIdFromSession(session);
  if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });
  const { employeeId, branchId, method, location, photo, geofenceId, deviceId } = req.body;
  if (!employeeId) return res.status(400).json({ error: 'employeeId required' });

  try {
    const [emp] = await sequelize.query(
      'SELECT id FROM employees WHERE id = :empId AND tenant_id = :tid LIMIT 1',
      { replacements: { empId: employeeId, tid: tenantId } },
    );
    if (!emp?.length) return res.status(404).json({ success: false, error: 'Employee not found' });

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    // Check if already clocked in
    const [existing] = await sequelize.query(
      `SELECT ea.id, ea.clock_in FROM employee_attendance ea
       INNER JOIN employees e ON ea.employee_id::text = e.id::text AND e.tenant_id = :tid
       WHERE ea.employee_id = :empId AND ea.date = :date`,
      { replacements: { empId: employeeId, date: today, tid: tenantId } },
    );
    if (existing.length > 0 && existing[0].clock_in) {
      return res.status(400).json({ success: false, error: 'Sudah clock in hari ini' });
    }

    // Get scheduled shift to determine late status
    let scheduledStart: string | null = null;
    const [schedule] = await sequelize.query(`
      SELECT ss.*, ws.start_time, ws.tolerance_late_minutes 
      FROM shift_schedules ss 
      LEFT JOIN work_shifts ws ON ss.work_shift_id = ws.id 
      WHERE ss.employee_id = :empId AND ss.schedule_date = :date AND ss.tenant_id = :tid
    `, { replacements: { empId: employeeId, date: today, tid: tenantId } });

    let status = 'present';
    let lateMinutes = 0;
    if (schedule.length > 0) {
      scheduledStart = schedule[0].start_time;
      const tolerance = schedule[0].tolerance_late_minutes || 15;
      if (scheduledStart) {
        const [h, m] = scheduledStart.split(':').map(Number);
        const scheduledTime = new Date(now);
        scheduledTime.setHours(h, m, 0, 0);
        const diff = Math.floor((now.getTime() - scheduledTime.getTime()) / 60000);
        if (diff > tolerance) {
          status = 'late';
          lateMinutes = diff;
        }
      }
    }

    // Geofence validation
    let verified = true;
    if (geofenceId && location && GeofenceLocation) {
      try {
        const geo = await findScopedById(GeofenceLocation, geofenceId, tenantId);
        if (geo) {
          const dist = haversineDistance(location.lat, location.lng, parseFloat(geo.latitude), parseFloat(geo.longitude));
          verified = dist <= (geo.radiusMeters || geo.radius_meters || 100);
        }
      } catch (e) {}
    }

    if (existing.length > 0) {
      await sequelize.query(`
        UPDATE employee_attendance SET clock_in = :clockIn, status = :status, late_minutes = :late, 
        clock_in_location = :location, clock_in_method = :method, clock_in_photo = :photo,
        geofence_id = :geoId, clock_in_device_id = :deviceId, clock_in_verified = :verified,
        scheduled_start = :schedStart, work_shift_id = :shiftId, schedule_id = :schedId, updated_at = NOW()
        WHERE id = :id
      `, { replacements: { clockIn: now, status, late: lateMinutes, location: JSON.stringify(location || null), method: method || 'manual', photo: photo || null, geoId: geofenceId || null, deviceId: deviceId || null, verified, schedStart: scheduledStart, shiftId: schedule[0]?.work_shift_id || null, schedId: schedule[0]?.id || null, id: existing[0].id } });
    } else {
      await sequelize.query(`
        INSERT INTO employee_attendance (id, tenant_id, employee_id, branch_id, date, clock_in, status, late_minutes, 
        clock_in_location, clock_in_method, clock_in_photo, geofence_id, clock_in_device_id, clock_in_verified,
        scheduled_start, work_shift_id, schedule_id, created_at, updated_at)
        VALUES (uuid_generate_v4(), :tid, :empId, :branchId, :date, :clockIn, :status, :late,
        :location, :method, :photo, :geoId, :deviceId, :verified, :schedStart, :shiftId, :schedId, NOW(), NOW())
      `, { replacements: { tid: tenantId, empId: employeeId, branchId: branchId || null, date: today, clockIn: now, status, late: lateMinutes, location: JSON.stringify(location || null), method: method || 'manual', photo: photo || null, geoId: geofenceId || null, deviceId: deviceId || null, verified, schedStart: scheduledStart, shiftId: schedule[0]?.work_shift_id || null, schedId: schedule[0]?.id || null } });
    }

    return res.json({ success: true, message: `Clock in berhasil${status === 'late' ? ` (terlambat ${lateMinutes} menit)` : ''}`, status, lateMinutes, verified });
  } catch (e: any) { return res.status(500).json({ success: false, error: e.message }); }
}

// ================= POST: Clock Out =================
async function clockOut(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!sequelize) return res.json({ success: true, message: 'Clocked out (mock)' });
  const tenantId = tenantIdFromSession(session);
  if (!tenantId) return res.status(403).json({ success: false, error: 'NO_TENANT' });
  const { employeeId, method, location, photo, deviceId } = req.body;
  if (!employeeId) return res.status(400).json({ error: 'employeeId required' });

  try {
    const [emp] = await sequelize.query(
      'SELECT id FROM employees WHERE id = :empId AND tenant_id = :tid LIMIT 1',
      { replacements: { empId: employeeId, tid: tenantId } },
    );
    if (!emp?.length) return res.status(404).json({ success: false, error: 'Employee not found' });

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    const [existing] = await sequelize.query(
      `SELECT ea.* FROM employee_attendance ea
       INNER JOIN employees e ON ea.employee_id::text = e.id::text AND e.tenant_id = :tid
       WHERE ea.employee_id = :empId AND ea.date = :date`,
      { replacements: { empId: employeeId, date: today, tid: tenantId } },
    );
    if (existing.length === 0 || !existing[0].clock_in) {
      return res.status(400).json({ success: false, error: 'Belum clock in hari ini' });
    }

    const clockInTime = new Date(existing[0].clock_in);
    const workMinutes = Math.floor((now.getTime() - clockInTime.getTime()) / 60000);
    const breakMin = existing[0].break_minutes || 60;
    const workHours = Math.round((workMinutes - breakMin) / 60 * 100) / 100;

    // Check early leave
    let earlyLeaveMinutes = 0;
    if (existing[0].scheduled_end) {
      const [h, m] = existing[0].scheduled_end.split(':').map(Number);
      const scheduledEnd = new Date(now);
      scheduledEnd.setHours(h, m, 0, 0);
      const diff = Math.floor((scheduledEnd.getTime() - now.getTime()) / 60000);
      if (diff > 15) earlyLeaveMinutes = diff;
    }

    // Overtime detection
    let overtimeMinutes = 0;
    const standardWorkMinutes = 8 * 60;
    if (workMinutes - breakMin > standardWorkMinutes + 30) {
      overtimeMinutes = workMinutes - breakMin - standardWorkMinutes;
    }

    await sequelize.query(`
      UPDATE employee_attendance SET clock_out = :clockOut, work_hours = :workHours,
      early_leave_minutes = :earlyLeave, overtime_minutes = :overtime, is_overtime = :isOT,
      clock_out_location = :location, clock_out_method = :method, clock_out_photo = :photo,
      clock_out_device_id = :deviceId, updated_at = NOW()
      WHERE id = :id
    `, { replacements: { clockOut: now, workHours, earlyLeave: earlyLeaveMinutes, overtime: overtimeMinutes, isOT: overtimeMinutes > 0, location: JSON.stringify(location || null), method: method || 'manual', photo: photo || null, deviceId: deviceId || null, id: existing[0].id } });

    return res.json({ success: true, message: 'Clock out berhasil', workHours, earlyLeaveMinutes, overtimeMinutes });
  } catch (e: any) { return res.status(500).json({ success: false, error: e.message }); }
}

// ================= PUT: Settings =================
async function updateSettings(req: NextApiRequest, res: NextApiResponse, session: any) {
  if (!AttendanceSetting || !sequelize) return res.json({ success: true });
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'key required' });
  try {
    await sequelize.query(`
      INSERT INTO attendance_settings (id, tenant_id, setting_key, setting_value, created_at, updated_at)
      VALUES (uuid_generate_v4(), :tenantId, :key, :value, NOW(), NOW())
      ON CONFLICT (tenant_id, branch_id, setting_key) DO UPDATE SET setting_value = :value, updated_at = NOW()
    `, { replacements: { tenantId: session.user.tenantId || null, key, value: JSON.stringify(value) } });
    return res.json({ success: true, message: 'Setting updated' });
  } catch (e: any) { return res.status(500).json({ success: false, error: e.message }); }
}

// ================= Helpers =================
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ================= Mock Data =================
function getMockShifts() {
  return [
    { id: '1', code: 'PAGI', name: 'Shift Pagi', description: 'Shift pagi standar 07:00-15:00', shift_type: 'regular', start_time: '07:00', end_time: '15:00', break_start: '12:00', break_end: '13:00', break_duration_minutes: 60, is_cross_day: false, work_hours_per_day: 8, color: '#F59E0B', tolerance_late_minutes: 15, applicable_days: [1,2,3,4,5], is_active: true, sort_order: 1 },
    { id: '2', code: 'SIANG', name: 'Shift Siang', description: 'Shift siang 14:00-22:00', shift_type: 'regular', start_time: '14:00', end_time: '22:00', break_start: '18:00', break_end: '19:00', break_duration_minutes: 60, is_cross_day: false, work_hours_per_day: 8, color: '#3B82F6', tolerance_late_minutes: 15, applicable_days: [1,2,3,4,5], is_active: true, sort_order: 2 },
    { id: '3', code: 'MALAM', name: 'Shift Malam', description: 'Shift malam 22:00-06:00', shift_type: 'regular', start_time: '22:00', end_time: '06:00', break_start: '02:00', break_end: '03:00', break_duration_minutes: 60, is_cross_day: true, work_hours_per_day: 8, color: '#8B5CF6', tolerance_late_minutes: 15, applicable_days: [1,2,3,4,5], is_active: true, sort_order: 3 },
    { id: '4', code: 'OFFICE', name: 'Office Hours', description: 'Jam kerja kantor 08:00-17:00', shift_type: 'office', start_time: '08:00', end_time: '17:00', break_start: '12:00', break_end: '13:00', break_duration_minutes: 60, is_cross_day: false, work_hours_per_day: 8, color: '#10B981', tolerance_late_minutes: 15, applicable_days: [1,2,3,4,5], is_active: true, sort_order: 4 },
    { id: '5', code: 'FIELD', name: 'Field/Lapangan', description: 'Untuk karyawan lapangan, GPS-based', shift_type: 'field', start_time: '08:00', end_time: '17:00', break_start: '12:00', break_end: '13:00', break_duration_minutes: 60, is_cross_day: false, work_hours_per_day: 8, color: '#14B8A6', tolerance_late_minutes: 30, applicable_days: [1,2,3,4,5,6], is_active: true, sort_order: 8 },
    { id: '6', code: 'FLEX', name: 'Flexi Time', description: 'Jam fleksibel', shift_type: 'flexible', start_time: '08:00', end_time: '18:00', break_start: '12:00', break_end: '13:00', break_duration_minutes: 60, is_cross_day: false, work_hours_per_day: 8, color: '#06B6D4', tolerance_late_minutes: 30, applicable_days: [1,2,3,4,5], is_active: true, sort_order: 7 },
  ];
}

function getMockRotations() {
  return [
    { id: '1', name: 'Rotasi 3 Shift Mingguan', description: 'Pagi → Siang → Malam setiap minggu', rotation_type: 'weekly', rotation_pattern: [{ week: 1, shift_code: 'PAGI' }, { week: 2, shift_code: 'SIANG' }, { week: 3, shift_code: 'MALAM' }], is_active: true, auto_generate: true, generate_weeks_ahead: 2 },
  ];
}

function getMockGeofences() {
  return [
    { id: '1', name: 'Kantor Pusat Jakarta', description: 'Gedung kantor pusat', location_type: 'office', latitude: -6.2088, longitude: 106.8456, radius_meters: 150, address: 'Jl. Sudirman No. 1, Jakarta', is_active: true },
    { id: '2', name: 'Gudang Pusat', description: 'Gudang distribusi', location_type: 'warehouse', latitude: -6.26, longitude: 106.78, radius_meters: 200, address: 'Kawasan Industri Pulogadung', is_active: true },
    { id: '3', name: 'Cabang Bandung', description: 'Kantor cabang Bandung', location_type: 'branch', latitude: -6.9175, longitude: 107.6191, radius_meters: 100, address: 'Jl. Braga No. 10, Bandung', is_active: true },
  ];
}

function getMockSettings() {
  return [
    { setting_key: 'clock_methods', setting_value: { methods: ['manual','gps','face_recognition','fingerprint','qr_code','nfc'], default_method: 'manual' }, description: 'Metode absensi' },
    { setting_key: 'geofencing', setting_value: { enabled: true, default_radius_meters: 100, allow_outside_geofence: false, require_photo_outside: true }, description: 'Geofencing' },
    { setting_key: 'overtime', setting_value: { auto_detect: true, min_overtime_minutes: 30, max_overtime_hours: 4, requires_approval: true, weekday_multiplier: 1.5, weekend_multiplier: 2.0, holiday_multiplier: 3.0 }, description: 'Lembur' },
    { setting_key: 'late_policy', setting_value: { grace_period_minutes: 15, deduction_per_late: 0, max_late_per_month: 3, escalation_after: 5 }, description: 'Keterlambatan' },
    { setting_key: 'photo_verification', setting_value: { require_clock_in_photo: false, require_clock_out_photo: false, enable_face_matching: false }, description: 'Verifikasi foto' },
    { setting_key: 'auto_absent', setting_value: { enabled: true, mark_absent_after_hours: 4, auto_clock_out_hours: 12 }, description: 'Auto absent' },
    { setting_key: 'work_calendar', setting_value: { weekend_days: [0, 6], national_holidays: [], company_holidays: [] }, description: 'Kalender kerja' },
  ];
}
