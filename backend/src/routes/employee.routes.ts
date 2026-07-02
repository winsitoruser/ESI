import { Router, Response } from 'express';
import { AuthRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';
import { sendSuccess, sendError, parsePagination, sendPaginated } from '../utils/helpers';
import { Employee, EmployeeSchedule, ShiftTemplate, EmployeeAttendance, AttendanceDevice, LeaveType, LeaveRequest, LeaveBalance, PayrollRun, EmployeeSalary, KPITemplate, PerformanceReview } from '../models';
import { CrudController } from '../utils/crud';
import { Op } from 'sequelize';

const router = Router();

// ==================== EMPLOYEES ====================
const empCtrl = new CrudController(Employee, 'Employee', ['name', 'employee_no', 'email', 'phone']);
router.get('/', authenticate, empCtrl.list);
router.get('/:id', authenticate, empCtrl.getById);
router.post('/', authenticate, authorize('admin', 'manager'), empCtrl.create);
router.put('/:id', authenticate, authorize('admin', 'manager'), empCtrl.update);
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), empCtrl.delete);

// ==================== SCHEDULES ====================
const schCtrl = new CrudController(EmployeeSchedule, 'Schedule', []);
router.get('/schedules/list', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const where: any = { tenant_id: req.tenantId };
    if (req.branchId) where.branch_id = req.branchId;
    if (req.query.employee_id) where.employee_id = req.query.employee_id;
    if (req.query.date_from && req.query.date_to) {
      where.date = { [Op.between]: [req.query.date_from, req.query.date_to] };
    }
    const schedules = await EmployeeSchedule.findAll({
      where, include: [{ model: Employee, attributes: ['id', 'name', 'employee_no'] }],
      order: [['date', 'ASC'], ['start_time', 'ASC']],
    });
    sendSuccess(res, schedules);
  } catch (error) { sendError(res, 'Failed to get schedules', 500); }
});
router.post('/schedules', authenticate, authorize('admin', 'manager'), schCtrl.create);
router.put('/schedules/:id', authenticate, authorize('admin', 'manager'), schCtrl.update);
router.delete('/schedules/:id', authenticate, authorize('admin', 'manager'), schCtrl.delete);

// Shift Templates
const stCtrl = new CrudController(ShiftTemplate, 'ShiftTemplate', ['name']);
router.get('/shift-templates', authenticate, stCtrl.list);
router.post('/shift-templates', authenticate, authorize('admin', 'manager'), stCtrl.create);
router.put('/shift-templates/:id', authenticate, authorize('admin', 'manager'), stCtrl.update);

// ==================== ATTENDANCE ====================
router.get('/attendance', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pagination = parsePagination(req.query);
    const where: any = { tenant_id: req.tenantId };
    if (req.query.employee_id) where.employee_id = req.query.employee_id;
    if (req.query.date_from && req.query.date_to) {
      where.date = { [Op.between]: [req.query.date_from, req.query.date_to] };
    }
    if (req.query.status) where.status = req.query.status;

    const { count, rows } = await EmployeeAttendance.findAndCountAll({
      where, include: [{ model: Employee, attributes: ['id', 'name', 'employee_no'] }],
      order: [['date', 'DESC']],
      limit: pagination.limit,
      offset: ((pagination.page || 1) - 1) * (pagination.limit || 20),
    });
    sendPaginated(res, rows, count, pagination);
  } catch (error) { sendError(res, 'Failed to get attendance', 500); }
});

router.post('/attendance/clock-in', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const employee = await Employee.findOne({ where: { user_id: req.user!.id, tenant_id: req.tenantId } });
    if (!employee) { sendError(res, 'Employee profile not found', 404); return; }

    const today = new Date().toISOString().split('T')[0];
    const existing = await EmployeeAttendance.findOne({
      where: { employee_id: (employee as any).id, date: today },
    });
    if (existing) { sendError(res, 'Already clocked in today', 400); return; }

    const att = await EmployeeAttendance.create({
      tenant_id: req.tenantId, employee_id: (employee as any).id,
      branch_id: req.branchId, date: today, clock_in: new Date(),
      clock_in_lat: req.body.latitude, clock_in_lng: req.body.longitude,
      clock_in_photo: req.body.photo_url, status: 'present',
    });
    sendSuccess(res, att, 'Clocked in', 201);
  } catch (error) { sendError(res, 'Failed to clock in', 500); }
});

router.post('/attendance/clock-out', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const employee = await Employee.findOne({ where: { user_id: req.user!.id, tenant_id: req.tenantId } });
    if (!employee) { sendError(res, 'Employee profile not found', 404); return; }

    const today = new Date().toISOString().split('T')[0];
    const att = await EmployeeAttendance.findOne({
      where: { employee_id: (employee as any).id, date: today, clock_out: null },
    });
    if (!att) { sendError(res, 'No active clock-in found', 400); return; }

    await att.update({
      clock_out: new Date(),
      clock_out_lat: req.body.latitude, clock_out_lng: req.body.longitude,
      clock_out_photo: req.body.photo_url,
    });
    sendSuccess(res, att, 'Clocked out');
  } catch (error) { sendError(res, 'Failed to clock out', 500); }
});

// Attendance Devices
const devCtrl = new CrudController(AttendanceDevice, 'AttendanceDevice', ['name', 'serial_number']);
router.get('/attendance/devices', authenticate, authorize('admin'), devCtrl.list);
router.post('/attendance/devices', authenticate, authorize('admin'), devCtrl.create);
router.put('/attendance/devices/:id', authenticate, authorize('admin'), devCtrl.update);

// ==================== LEAVE ====================
const ltCtrl = new CrudController(LeaveType, 'LeaveType', ['name']);
router.get('/leave/types', authenticate, ltCtrl.list);
router.post('/leave/types', authenticate, authorize('admin'), ltCtrl.create);
router.put('/leave/types/:id', authenticate, authorize('admin'), ltCtrl.update);

const lrCtrl = new CrudController(LeaveRequest, 'LeaveRequest', []);
router.get('/leave/requests', authenticate, lrCtrl.list);
router.get('/leave/requests/:id', authenticate, lrCtrl.getById);
router.post('/leave/requests', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const employee = await Employee.findOne({ where: { user_id: req.user!.id, tenant_id: req.tenantId } });
    if (!employee) { sendError(res, 'Employee not found', 404); return; }
    const lr = await LeaveRequest.create({
      ...req.body, tenant_id: req.tenantId, employee_id: (employee as any).id,
    });
    sendSuccess(res, lr, 'Leave request submitted', 201);
  } catch (error) { sendError(res, 'Failed to submit leave request', 500); }
});
router.put('/leave/requests/:id/approve', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const lr = await LeaveRequest.findOne({ where: { id: req.params.id, tenant_id: req.tenantId, status: 'pending' } });
    if (!lr) { sendError(res, 'Leave request not found', 404); return; }
    await lr.update({ status: 'approved', approved_by: req.user!.id, approved_at: new Date() });
    sendSuccess(res, lr, 'Leave approved');
  } catch (error) { sendError(res, 'Failed to approve leave', 500); }
});
router.put('/leave/requests/:id/reject', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const lr = await LeaveRequest.findOne({ where: { id: req.params.id, tenant_id: req.tenantId, status: 'pending' } });
    if (!lr) { sendError(res, 'Leave request not found', 404); return; }
    await lr.update({ status: 'rejected', rejection_reason: req.body.reason });
    sendSuccess(res, lr, 'Leave rejected');
  } catch (error) { sendError(res, 'Failed to reject leave', 500); }
});

router.get('/leave/balances', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const where: any = { tenant_id: req.tenantId };
    if (req.query.employee_id) where.employee_id = req.query.employee_id;
    if (req.query.year) where.year = req.query.year;
    const balances = await LeaveBalance.findAll({ where });
    sendSuccess(res, balances);
  } catch (error) { sendError(res, 'Failed to get balances', 500); }
});

// ==================== PAYROLL ====================
const prCtrl = new CrudController(PayrollRun, 'PayrollRun', []);
router.get('/payroll/runs', authenticate, authorize('admin', 'manager'), prCtrl.list);
router.get('/payroll/runs/:id', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const run = await PayrollRun.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId },
      include: [{ model: EmployeeSalary, as: 'salaries', include: [{ model: Employee, attributes: ['id', 'name', 'employee_no'] }] }],
    });
    if (!run) { sendError(res, 'Payroll run not found', 404); return; }
    sendSuccess(res, run);
  } catch (error) { sendError(res, 'Failed to get payroll run', 500); }
});
router.post('/payroll/runs', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const run = await PayrollRun.create({ ...req.body, tenant_id: req.tenantId, created_by: req.user!.id });
    sendSuccess(res, run, 'Payroll run created', 201);
  } catch (error) { sendError(res, 'Failed to create payroll run', 500); }
});
router.put('/payroll/runs/:id', authenticate, authorize('admin'), prCtrl.update);

// ==================== KPI & PERFORMANCE ====================
const kpiCtrl = new CrudController(KPITemplate, 'KPITemplate', ['name']);
router.get('/kpi/templates', authenticate, kpiCtrl.list);
router.post('/kpi/templates', authenticate, authorize('admin', 'manager'), kpiCtrl.create);
router.put('/kpi/templates/:id', authenticate, authorize('admin', 'manager'), kpiCtrl.update);

const perfCtrl = new CrudController(PerformanceReview, 'PerformanceReview', []);
router.get('/performance/reviews', authenticate, perfCtrl.list);
router.get('/performance/reviews/:id', authenticate, perfCtrl.getById);
router.post('/performance/reviews', authenticate, authorize('admin', 'manager'), perfCtrl.create);
router.put('/performance/reviews/:id', authenticate, authorize('admin', 'manager'), perfCtrl.update);

export default router;
