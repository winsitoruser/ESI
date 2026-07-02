import type { NextApiRequest, NextApiResponse } from 'next';
import { successResponse, errorResponse, ErrorCodes, HttpStatus } from '../../../../lib/api/response';
import { getPaginationParams, getPaginationMeta } from '../../../../lib/api/pagination';
import { validateRequiredFields } from '../../../../lib/api/validation';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';

let Op: any;
try { Op = require('sequelize').Op; } catch (e) {}

let Employee: any, User: any, Branch: any, EmployeeKPI: any, EmployeeAttendance: any;
try {
  const models = require('../../../../models');
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
    console.error('HRIS Employees API Error:', error);
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

  const { search, department, status, branchId } = req.query;
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
          { employeeId: { [Op.iLike]: `%${search}%` } }
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

      const includes: any[] = [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'avatar'], required: false }
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
          branchId: emp.branchId || emp.tenantId,
          branchName: emp.branch?.name || emp.workLocation || 'HQ',
          joinDate: emp.joinDate,
          status: emp.status?.toLowerCase() || 'active',
          avatar: emp.user?.avatar || null,
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
    console.error('Error fetching employees:', error);
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

  // Remove tenantId from body if present - user cannot override this
  const { name, email, phone, position, department, workLocation, branchId, branchName } = req.body;

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
    // Generate employee ID - count within THIS tenant only
    const count = await Employee.count({ where: tenantId ? { tenantId } : {} });
    const employeeIdCode = `EMP${String(count + 1).padStart(3, '0')}`;

    const employee = await Employee.create({
      employeeId: employeeIdCode,
      name,
      email,
      phoneNumber: phone,
      position,
      department: department || 'ADMINISTRATION',
      workLocation: workLocation || 'ADMIN_OFFICE',
      role: 'CASHIER',
      status: 'ACTIVE',
      joinDate: new Date(),
      // 🔒 TENANT ISOLATION: Use tenantId from session, not user input
      tenantId
    });

    // Trigger webhook for new employee
    if (triggerHRISWebhook) {
      try {
        await triggerHRISWebhook(
          'employee.created',
          employee.id,
          name,
          { email, phone, position, department, branchId },
          branchId,
          branchName
        );
      } catch (webhookError) {
        console.warn('Webhook trigger failed:', webhookError);
      }
    }

    return res.status(HttpStatus.CREATED).json(
      successResponse(employee, undefined, 'Employee created successfully')
    );
  } catch (error: any) {
    console.error('Error creating employee:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
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

  if (!id) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      errorResponse(ErrorCodes.VALIDATION_ERROR, 'Employee ID is required')
    );
  }

  try {
    const record = await model.findByPk(id);
    
    if (!record) {
      return res.status(HttpStatus.NOT_FOUND).json(
        errorResponse(ErrorCodes.NOT_FOUND, 'Employee not found')
      );
    }

    // Don't allow updating sensitive fields
    delete updateData.password;
    delete updateData.id;
    delete updateData.employeeId;

    await record.update(updateData);

    return res.status(HttpStatus.OK).json(
      successResponse(record, undefined, 'Employee updated successfully')
    );
  } catch (error: any) {
    console.error('Error updating employee:', error);
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

  if (!id) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      errorResponse(ErrorCodes.VALIDATION_ERROR, 'Employee ID is required')
    );
  }

  try {
    const record = await model.findByPk(id);
    
    if (!record) {
      return res.status(HttpStatus.NOT_FOUND).json(
        errorResponse(ErrorCodes.NOT_FOUND, 'Employee not found')
      );
    }

    // Soft delete
    if (Employee) {
      await record.update({ status: 'INACTIVE', endDate: new Date() });
    } else {
      await record.update({ isActive: false });
    }

    return res.status(HttpStatus.OK).json(
      successResponse(null, undefined, 'Employee deactivated successfully')
    );
  } catch (error) {
    console.error('Error deleting employee:', error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
      errorResponse(ErrorCodes.DATABASE_ERROR, 'Failed to delete employee')
    );
  }
}

// Wrap handler with HQ Auth middleware - requires HRIS module
export default withHQAuth(handler, { module: 'hris' });
