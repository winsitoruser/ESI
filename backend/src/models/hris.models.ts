import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class EmployeeAttendance extends Model {}
EmployeeAttendance.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: true },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  clock_in: { type: DataTypes.DATE, allowNull: true },
  clock_out: { type: DataTypes.DATE, allowNull: true },
  clock_in_lat: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  clock_in_lng: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  clock_out_lat: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  clock_out_lng: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  clock_in_photo: { type: DataTypes.STRING(500), allowNull: true },
  clock_out_photo: { type: DataTypes.STRING(500), allowNull: true },
  status: { type: DataTypes.ENUM('present', 'late', 'absent', 'leave', 'holiday', 'half_day'), defaultValue: 'present' },
  work_hours: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  overtime_hours: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  device_id: { type: DataTypes.INTEGER, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { sequelize, tableName: 'employee_attendances', underscored: true });

export class AttendanceDevice extends Model {}
AttendanceDevice.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  serial_number: { type: DataTypes.STRING(100), allowNull: true },
  type: { type: DataTypes.ENUM('fingerprint', 'face', 'card', 'mobile', 'qr'), defaultValue: 'fingerprint' },
  ip_address: { type: DataTypes.STRING(50), allowNull: true },
  location: { type: DataTypes.STRING(200), allowNull: true },
  latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  radius_meters: { type: DataTypes.INTEGER, defaultValue: 100 },
  status: { type: DataTypes.ENUM('active', 'inactive', 'maintenance'), defaultValue: 'active' },
  last_sync: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'attendance_devices', underscored: true });

export class LeaveType extends Model {}
LeaveType.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  code: { type: DataTypes.STRING(20), allowNull: false },
  default_days: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_paid: { type: DataTypes.BOOLEAN, defaultValue: true },
  requires_approval: { type: DataTypes.BOOLEAN, defaultValue: true },
  max_consecutive_days: { type: DataTypes.INTEGER, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'leave_types', underscored: true });

export class LeaveRequest extends Model {}
LeaveRequest.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  leave_type_id: { type: DataTypes.INTEGER, allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY, allowNull: false },
  days: { type: DataTypes.DECIMAL(5, 1), allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: true },
  attachment_url: { type: DataTypes.STRING(500), allowNull: true },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'), defaultValue: 'pending' },
  approved_by: { type: DataTypes.INTEGER, allowNull: true },
  approved_at: { type: DataTypes.DATE, allowNull: true },
  rejection_reason: { type: DataTypes.TEXT, allowNull: true },
}, { sequelize, tableName: 'leave_requests', underscored: true });

export class LeaveBalance extends Model {}
LeaveBalance.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  leave_type_id: { type: DataTypes.INTEGER, allowNull: false },
  year: { type: DataTypes.INTEGER, allowNull: false },
  total_days: { type: DataTypes.DECIMAL(5, 1), defaultValue: 0 },
  used_days: { type: DataTypes.DECIMAL(5, 1), defaultValue: 0 },
  remaining_days: { type: DataTypes.DECIMAL(5, 1), defaultValue: 0 },
  carried_over: { type: DataTypes.DECIMAL(5, 1), defaultValue: 0 },
}, { sequelize, tableName: 'leave_balances', underscored: true });

export class PayrollRun extends Model {}
PayrollRun.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: true },
  period_month: { type: DataTypes.INTEGER, allowNull: false },
  period_year: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM('draft', 'calculating', 'review', 'approved', 'paid', 'cancelled'), defaultValue: 'draft' },
  total_employees: { type: DataTypes.INTEGER, defaultValue: 0 },
  total_gross: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total_deductions: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total_net: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  approved_by: { type: DataTypes.INTEGER, allowNull: true },
  paid_at: { type: DataTypes.DATE, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'payroll_runs', underscored: true });

export class EmployeeSalary extends Model {}
EmployeeSalary.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  payroll_run_id: { type: DataTypes.INTEGER, allowNull: false },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  basic_salary: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  allowances: { type: DataTypes.JSONB, defaultValue: {} },
  deductions: { type: DataTypes.JSONB, defaultValue: {} },
  overtime_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  bonus: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  gross_salary: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  bpjs_tk: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  bpjs_kes: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total_deductions: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  net_salary: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
}, { sequelize, tableName: 'employee_salaries', underscored: true });

export class KPITemplate extends Model {}
KPITemplate.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  department: { type: DataTypes.STRING(100), allowNull: true },
  position: { type: DataTypes.STRING(100), allowNull: true },
  indicators: { type: DataTypes.JSONB, defaultValue: [] },
  weight_total: { type: DataTypes.DECIMAL(5, 2), defaultValue: 100 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'kpi_templates', underscored: true });

export class PerformanceReview extends Model {}
PerformanceReview.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  reviewer_id: { type: DataTypes.INTEGER, allowNull: false },
  kpi_template_id: { type: DataTypes.INTEGER, allowNull: true },
  period_start: { type: DataTypes.DATEONLY, allowNull: false },
  period_end: { type: DataTypes.DATEONLY, allowNull: false },
  scores: { type: DataTypes.JSONB, defaultValue: [] },
  final_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  rating: { type: DataTypes.ENUM('excellent', 'good', 'average', 'below_average', 'poor'), allowNull: true },
  self_assessment: { type: DataTypes.TEXT, allowNull: true },
  reviewer_comment: { type: DataTypes.TEXT, allowNull: true },
  goals: { type: DataTypes.JSONB, defaultValue: [] },
  status: { type: DataTypes.ENUM('draft', 'self_review', 'manager_review', 'completed'), defaultValue: 'draft' },
}, { sequelize, tableName: 'performance_reviews', underscored: true });
