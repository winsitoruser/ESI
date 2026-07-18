import type { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../lib/api/response';
import { getPaginationParams, getPaginationMeta } from '../../../lib/api/pagination';
import { validateRequiredFields } from '../../../lib/api/validation';
import { withHQAuth } from '../../../lib/middleware/withHQAuth';
import { withObservability } from '@/lib/observability';

let Op: any;
try { Op = require('sequelize').Op; } catch (e) {}

let Employee: any, User: any, Branch: any, EmployeeKPI: any, EmployeeAttendance: any;
try {
  const models = require('../../../models');
  Employee = models.Employee;
  User = models.User;
  Branch = models.Branch;
  EmployeeKPI = models.EmployeeKPI;
  EmployeeAttendance = models.EmployeeAttendance;
} catch (e) {
  console.warn('HRIS models not available:', e);
  Employee = null;
  User = null;
  Branch = null;
}

let triggerHRISWebhook: any;
try {
  const webhooks = require('./webhooks');
  triggerHRISWebhook = webhooks.triggerHRISWebhook;
} catch (e) {
  console.warn('HRIS webhooks not available:', e);
  triggerHRISWebhook = null;
}

/**
 * Helper to get tenantId from session (injected by withHQAuth)
 * NEVER accept tenantId from request body/query - security vulnerability!
 */
function getTenantId(req: NextApiRequest): string | null {
  const session = (req as any).session;
  return session?.user?.tenantId || null;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const tenantId = getTenantId(req);

    switch (req.method) {
      case 'GET':
        return await getEmployees(req, res);
      case 'POST':
        return await createEmployee(req, res);
      case 'PUT':
        return await updateEmployee(req, res);
      case 'DELETE':
        return await deleteEmployee(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(HttpStatus.METHOD_NOT_ALLOWED).json(
          errorResponse(ErrorCodes.METHOD_NOT_ALLOWED, `Method ${req.method} Not Allowed`)
        );
    }
  } catch (error) {
    console.warn('HRIS Employees API Error: (table may not exist):', (error as any)?.message || error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.INTERNAL_SERVER_ERROR, 'Internal server error')
    );
  }
}

async function getEmployees(req: NextApiRequest, res: NextApiResponse) {
  if (!Employee && !User) {
    return res.status(HttpStatus.SERVICE_UNAVAILABLE).json(
      errorResponse(ErrorCodes.MODEL_NOT_AVAILABLE, 'Employee model not available')
    );
  }

  const { search, department, status, branchId, employmentCategory } = req.query;
  const { limit, offset } = getPaginationParams(req.query);
  const tenantId = getTenantId(req);

  try {
    // Use Employee model if available, fallback to User
    if (Employee) {
      const where: any = {};

      // 🔒 TENANT ISOLATION: Always filter by tenantId from session
      if (tenantId) {
        where.tenantId = tenantId;
      }

      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { employeeId: { [Op.iLike]: `%${search}%` } },
          { position: { [Op.iLike]: `%${search}%` } },
          { department: { [Op.iLike]: `%${search}%` } },
        ];
      }

      if (department && department !== 'all') {
        where.department = department;
      }

      if (status && status !== 'all') {
        where.status = status.toString().toUpperCase();
      }

      if (branchId && branchId !== 'all') {
        where.branchId = branchId;
      }

      if (employmentCategory && employmentCategory !== 'all') {
        where.employmentCategory = employmentCategory;
      }

      const includes: any[] = [
        { model: User, as: 'user', attributes: ['id', 'name', 'email'], required: false }
      ];
      if (Branch) {
        includes.push({ model: Branch, as: 'branch', attributes: ['id', 'code', 'name', 'city'], required: false });
      }

      const { count, rows } = await Employee.findAndCountAll({
        where,
        include: includes,
        order: [['name', 'ASC']],
        limit,
        offset
      });

      // Batch-fetch KPI & attendance data for these employees
      const employeeIds = rows.map((e: any) => e.id);
      const currentPeriod = new Date().toISOString().substring(0, 7);

      let kpiMap: Record<string, any> = {};
      let attendanceMap: Record<string, any> = {};

      if (EmployeeKPI && employeeIds.length > 0) {
        try {
          const kpis = await EmployeeKPI.findAll({
            where: { employeeId: { [Op.in]: employeeIds }, period: currentPeriod }
          });
          kpis.forEach((k: any) => {
            if (!kpiMap[k.employeeId]) kpiMap[k.employeeId] = [];
            kpiMap[k.employeeId].push(k);
          });
        } catch (e) { /* KPI table may not exist yet */ }
      }

      if (EmployeeAttendance && employeeIds.length > 0) {
        try {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const attendances = await EmployeeAttendance.findAll({
            where: {
              employeeId: { [Op.in]: employeeIds },
              date: { [Op.gte]: thirtyDaysAgo.toISOString().split('T')[0] }
            }
          });
          attendances.forEach((a: any) => {
            if (!attendanceMap[a.employeeId]) attendanceMap[a.employeeId] = [];
            attendanceMap[a.employeeId].push(a);
          });
        } catch (e) { /* Attendance table may not exist yet */ }
      }

      const employees = rows.map((emp: any) => {
        const empKpis = kpiMap[emp.id] || [];
        const empAtt = attendanceMap[emp.id] || [];

        const totalTarget = empKpis.reduce((s: number, k: any) => s + (parseFloat(k.target) || 0), 0);
        const totalActual = empKpis.reduce((s: number, k: any) => s + (parseFloat(k.actual) || 0), 0);
        const kpiAchievement = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;

        const totalDays = empAtt.length || 1;
        const presentDays = empAtt.filter((a: any) => ['present', 'late'].includes(a.status)).length;
        const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

        const score = empKpis.length > 0 || empAtt.length > 0
          ? Math.round((kpiAchievement * 0.6) + (attendanceRate * 0.4))
          : 0;

        return {
          id: emp.id,
          employeeId: emp.employeeId,
          name: emp.name,
          email: emp.email,
          phone: emp.phoneNumber,
          position: emp.position,
          department: emp.department,
          workLocation: emp.workLocation,
          branchId: emp.branchId || emp.tenantId,
          branchName: emp.branch?.name || emp.workLocation || 'HQ',
          joinDate: emp.joinDate,
          status: emp.status?.toLowerCase() || 'active',
          avatar: emp.user?.avatar || emp.user?.image || null,
          performance: {
            score: score || null,
            trend: 'stable',
            kpiAchievement: kpiAchievement || null,
            attendance: attendanceRate || null,
            rating: score > 0 ? Math.round((score / 20) * 10) / 10 : null
          },
          manager: null,
          baseSalary: emp.baseSalary,
          salaryGrade: emp.salaryGrade
        };
      });

      return res.status(HttpStatus.OK).json(
        successResponse(employees, getPaginationMeta(count, limit, offset))
      );
    }

    // Fallback: use User model if Employee not available
    const where: any = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (status && status !== 'all') {
      where.isActive = status === 'active';
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['name', 'ASC']],
      limit,
      offset
    });

    const employees = rows.map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      position: user.role || 'Staff',
      department: 'Operations',
      branchId: user.branchId,
      branchName: 'HQ',
      joinDate: user.createdAt,
      status: user.isActive ? 'active' : 'inactive',
      avatar: user.avatar,
      performance: { score: null, trend: 'stable', kpiAchievement: null, attendance: null, rating: null },
      manager: null
    }));

    return res.status(HttpStatus.OK).json(
      successResponse(employees, getPaginationMeta(count, limit, offset))
    );
  } catch (error) {
    console.warn('Error fetching employees: (table may not exist):', (error as any)?.message || error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to fetch employees')
    );
  }
}

async function createEmployee(req: NextApiRequest, res: NextApiResponse) {
  if (!Employee && !User) {
    return res.status(HttpStatus.SERVICE_UNAVAILABLE).json(
      errorResponse(ErrorCodes.MODEL_NOT_AVAILABLE, 'Employee model not available')
    );
  }

  // 🔒 SECURITY: tenantId MUST come from session, NEVER from request body!
  const tenantId = getTenantId(req);
  const role = (req as any).session?.user?.role;

  try {
    const { assertEmployeeSeatAvailable } = await import('@/lib/saas/seat-metering');
    const seat = await assertEmployeeSeatAvailable(tenantId, role);
    if (!seat.ok) return res.status(seat.status).json(seat.body);
  } catch (e) {
    console.warn('[employees] seat check skipped:', (e as Error).message);
  }

  // Remove tenantId from body if present - user cannot override this
  const { name, email, phone, position, department, workLocation, branchId, branchName,
    employmentCategory, contractType } = req.body;

  const validation = validateRequiredFields(req.body, ['name', 'email', 'position', 'department']);
  if (!validation.isValid) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      errorResponse(
        ErrorCodes.MISSING_REQUIRED_FIELDS,
        `Missing required fields: ${validation.missingFields.join(', ')}`
      )
    );
  }

  try {
    // Raw, schema-safe INSERT. The Sequelize Employee model declares more
    // attributes (e.g. dateOfBirth → date_of_birth) than the provisioned
    // `employees` table actually has, so `Employee.create()` would reference
    // non-existent columns. We only ever write columns that exist (mirrors the
    // mass-import path which is already proven in prod).
    const sequelize = Employee.sequelize;
    const crypto = require('crypto');

    const cols = new Set<string>();
    try {
      const [rows] = await sequelize.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'employees'`,
      );
      (rows || []).forEach((r: any) => cols.add(r.column_name));
    } catch { /* fall back to writing all fields */ }

    // employee_code is GLOBALLY unique in DB — namespace per-tenant so a
    // per-tenant sequence never collides across tenants.
    const count = await Employee.count({ where: tenantId ? { tenantId } : {} });
    const tenantToken = tenantId
      ? String(tenantId).replace(/-/g, '').slice(0, 6).toUpperCase()
      : 'GBL';
    const employeeIdCode = `EMP-${tenantToken}-${String(count + 1).padStart(3, '0')}`;

    const now = new Date();
    const newId = crypto.randomUUID();
    const fieldsArr: Array<[string, any]> = [];
    const add = (col: string, val: any) => { if (cols.size === 0 || cols.has(col)) fieldsArr.push([col, val]); };
    add('id', newId);
    add('employee_code', employeeIdCode);
    add('name', name);
    add('email', email);
    add('phone', phone || null);
    add('position', position);
    add('department', department || 'ADMINISTRATION');
    add('work_location', workLocation || 'ADMIN_OFFICE');
    add('work_role', 'staff');
    add('status', 'ACTIVE');
    add('is_active', true);
    add('hire_date', now);
    add('employment_category', employmentCategory || 'permanent');
    add('tenant_id', tenantId || null);
    add('created_at', now);
    add('updated_at', now);

    const colNames = fieldsArr.map((f) => `"${f[0]}"`).join(', ');
    const placeholders = fieldsArr.map((_, i) => `:v${i}`).join(', ');
    const repl: Record<string, any> = {};
    fieldsArr.forEach((f, i) => { repl[`v${i}`] = f[1]; });

    await sequelize.query(
      `INSERT INTO employees (${colNames}) VALUES (${placeholders})`,
      { replacements: repl },
    );

    const employee: any = {
      id: newId,
      employeeId: employeeIdCode,
      name,
      email,
      phoneNumber: phone || null,
      position,
      department: department || 'ADMINISTRATION',
      workLocation: workLocation || 'ADMIN_OFFICE',
      status: 'ACTIVE',
      joinDate: now,
      employmentCategory: employmentCategory || 'permanent',
      tenantId: tenantId || null,
    };

    // Trigger webhook for new employee
    if (triggerHRISWebhook) {
      try {
        await triggerHRISWebhook(
          'employee.created',
          employee.id,
          name,
          { email, phone, position, department, branchId, tenantId },
          branchId,
          branchName
        );
      } catch (webhookError) {
        console.warn('Webhook trigger failed:', webhookError);
      }
    }

    // P4: auto-start onboarding checklist
    try {
      const { startOnboardingForEmployee } = await import('@/lib/hris/lifecycle-automation');
      await startOnboardingForEmployee({
        id: employee.id,
        employeeId: employee.employeeId,
        employeeUid: employee.employeeId,
        name: employee.name,
        email: employee.email,
        position: employee.position,
        department: employee.department,
        branchName: branchName || '',
        workLocation: workLocation || '',
        joinDate: employee.joinDate,
      }, tenantId);
    } catch (autoErr) {
      console.warn('Onboarding automation failed:', (autoErr as Error).message);
    }

    return res.status(HttpStatus.CREATED).json(
      successResponse(employee, undefined, 'Employee created successfully')
    );
  } catch (error: any) {
    console.warn('Error creating employee: (table may not exist):', (error as any)?.message || error);
    const pgCode = error?.parent?.code || error?.original?.code;
    if (error.name === 'SequelizeUniqueConstraintError' || pgCode === '23505') {
      return res.status(HttpStatus.CONFLICT).json(
        errorResponse(ErrorCodes.DUPLICATE_ENTRY, 'Employee ID or email already exists')
      );
    }
    if (error.name === 'SequelizeValidationError') {
      return res.status(HttpStatus.BAD_REQUEST).json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, error.message)
      );
    }
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to create employee')
    );
  }
}

async function updateEmployee(req: NextApiRequest, res: NextApiResponse) {
  const model = Employee || User;
  if (!model) {
    return res.status(HttpStatus.SERVICE_UNAVAILABLE).json(
      errorResponse(ErrorCodes.MODEL_NOT_AVAILABLE, 'Employee model not available')
    );
  }

  const { id } = req.query;
  const updateData = req.body;
  const tenantId = getTenantId(req);

  if (!id) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      errorResponse(ErrorCodes.VALIDATION_ERROR, 'Employee ID is required')
    );
  }

  try {
    // 🔒 TENANT ISOLATION: scope by tenantId so a tenant cannot edit another
    // tenant's employee by guessing its id (platform ops = no tenant → any).
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;
    const record = await model.findOne({ where });

    if (!record) {
      return res.status(HttpStatus.NOT_FOUND).json(
        errorResponse(ErrorCodes.NOT_FOUND, 'Employee not found')
      );
    }

    // Don't allow updating sensitive / ownership fields
    delete updateData.password;
    delete updateData.id;
    delete updateData.employeeId;
    delete updateData.tenantId;

    await record.update(updateData);

    return res.status(HttpStatus.OK).json(
      successResponse(record, undefined, 'Employee updated successfully')
    );
  } catch (error: any) {
    console.warn('Error updating employee: (table may not exist):', (error as any)?.message || error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(HttpStatus.CONFLICT).json(
        errorResponse(ErrorCodes.DUPLICATE_ENTRY, 'Email already exists')
      );
    }
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to update employee')
    );
  }
}

async function deleteEmployee(req: NextApiRequest, res: NextApiResponse) {
  const model = Employee || User;
  if (!model) {
    return res.status(HttpStatus.SERVICE_UNAVAILABLE).json(
      errorResponse(ErrorCodes.MODEL_NOT_AVAILABLE, 'Employee model not available')
    );
  }

  const { id } = req.query;
  const tenantId = getTenantId(req);

  if (!id) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      errorResponse(ErrorCodes.VALIDATION_ERROR, 'Employee ID is required')
    );
  }

  try {
    // 🔒 TENANT ISOLATION: scope by tenantId (platform ops = no tenant → any).
    const where: any = { id };
    if (tenantId) where.tenantId = tenantId;
    const record = await model.findOne({ where });

    if (!record) {
      return res.status(HttpStatus.NOT_FOUND).json(
        errorResponse(ErrorCodes.NOT_FOUND, 'Employee not found')
      );
    }

    // Soft delete via a schema-safe raw UPDATE. `status` drives seat metering;
    // we also flip `is_active` to keep both signals in sync. We only write
    // columns that exist (some deployments lack `end_date`), so the update
    // never references a non-existent column.
    if (Employee) {
      const sequelize = Employee.sequelize;
      const cols = new Set<string>();
      try {
        const [rows] = await sequelize.query(
          `SELECT column_name FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'employees'`,
        );
        (rows || []).forEach((r: any) => cols.add(r.column_name));
      } catch { /* fall back below */ }

      const sets: string[] = [];
      const repl: Record<string, any> = { id: record.id };
      const set = (col: string, expr: string, val?: any) => {
        if (cols.size === 0 || cols.has(col)) {
          sets.push(`"${col}" = ${expr}`);
          if (val !== undefined) repl[col] = val;
        }
      };
      set('status', ':status', 'INACTIVE');
      set('is_active', 'false');
      set('end_date', 'NOW()');
      set('updated_at', 'NOW()');

      if (sets.length) {
        await sequelize.query(
          `UPDATE employees SET ${sets.join(', ')} WHERE id = :id`,
          { replacements: repl },
        );
      } else {
        await record.update({ status: 'INACTIVE' });
      }
    } else {
      await record.update({ isActive: false });
    }

    try {
      const { logAdminAction } = await import('@/lib/saas/admin-audit');
      const row = record.toJSON ? record.toJSON() : record;
      await logAdminAction({
        tenantId: tenantId || null,
        actorEmail: (req as any).user?.email || null,
        action: 'employee.delete',
        resourceType: 'employee',
        resourceId: String(id),
        meta: { name: row.name, email: row.email },
      });
    } catch { /* ignore */ }

    // P4: auto-start offboarding checklist
    try {
      const tenantId = getTenantId(req);
      const { startOffboardingForEmployee } = await import('@/lib/hris/lifecycle-automation');
      const row = record.toJSON ? record.toJSON() : record;
      await startOffboardingForEmployee({
        id: row.id,
        employeeId: row.employeeId,
        employeeUid: row.employeeId,
        name: row.name,
        email: row.email,
        position: row.position,
        department: row.department,
        branchName: row.branchName || '',
        workLocation: row.workLocation || '',
      }, tenantId, { reason: 'Karyawan dinonaktifkan', reasonCategory: 'resignation' });
    } catch (autoErr) {
      console.warn('Offboarding automation failed:', (autoErr as Error).message);
    }

    return res.status(HttpStatus.OK).json(
      successResponse(null, undefined, 'Employee deactivated successfully')
    );
  } catch (error) {
    console.warn('Error deleting employee: (table may not exist):', (error as any)?.message || error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to delete employee')
    );
  }
}

// Wrap handler with HQ Auth middleware - requires HRIS module
export default withObservability(withHQAuth(handler, { module: 'hris' }), 'humanify/employees');
