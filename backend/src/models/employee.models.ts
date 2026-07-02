import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Employee extends Model {}
Employee.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: true },
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  employee_no: { type: DataTypes.STRING(30), allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: true },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  nik: { type: DataTypes.STRING(20), allowNull: true },
  npwp: { type: DataTypes.STRING(30), allowNull: true },
  bpjs_kesehatan: { type: DataTypes.STRING(20), allowNull: true },
  bpjs_ketenagakerjaan: { type: DataTypes.STRING(20), allowNull: true },
  gender: { type: DataTypes.ENUM('male', 'female'), allowNull: true },
  birth_date: { type: DataTypes.DATEONLY, allowNull: true },
  birth_place: { type: DataTypes.STRING(100), allowNull: true },
  marital_status: { type: DataTypes.ENUM('single', 'married', 'divorced', 'widowed'), allowNull: true },
  religion: { type: DataTypes.STRING(30), allowNull: true },
  blood_type: { type: DataTypes.STRING(5), allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  city: { type: DataTypes.STRING(100), allowNull: true },
  province: { type: DataTypes.STRING(100), allowNull: true },
  emergency_contact: { type: DataTypes.STRING(200), allowNull: true },
  emergency_phone: { type: DataTypes.STRING(20), allowNull: true },
  department: { type: DataTypes.STRING(100), allowNull: true },
  position: { type: DataTypes.STRING(100), allowNull: true },
  job_level: { type: DataTypes.STRING(50), allowNull: true },
  employment_type: { type: DataTypes.ENUM('permanent', 'contract', 'probation', 'intern', 'freelance'), defaultValue: 'permanent' },
  employment_status: { type: DataTypes.ENUM('active', 'resigned', 'terminated', 'retired', 'leave'), defaultValue: 'active' },
  join_date: { type: DataTypes.DATEONLY, allowNull: true },
  end_date: { type: DataTypes.DATEONLY, allowNull: true },
  reporting_to: { type: DataTypes.INTEGER, allowNull: true },
  bank_name: { type: DataTypes.STRING(100), allowNull: true },
  bank_account: { type: DataTypes.STRING(50), allowNull: true },
  bank_holder: { type: DataTypes.STRING(200), allowNull: true },
  base_salary: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  photo_url: { type: DataTypes.STRING(500), allowNull: true },
}, {
  sequelize, tableName: 'employees', paranoid: true, underscored: true,
  indexes: [{ unique: true, fields: ['tenant_id', 'employee_no'] }],
});

export class EmployeeSchedule extends Model {}
EmployeeSchedule.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  shift_template_id: { type: DataTypes.INTEGER, allowNull: true },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  start_time: { type: DataTypes.TIME, allowNull: false },
  end_time: { type: DataTypes.TIME, allowNull: false },
  is_overtime: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: { type: DataTypes.ENUM('scheduled', 'confirmed', 'absent', 'completed'), defaultValue: 'scheduled' },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { sequelize, tableName: 'employee_schedules', underscored: true });

export class ShiftTemplate extends Model {}
ShiftTemplate.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  start_time: { type: DataTypes.TIME, allowNull: false },
  end_time: { type: DataTypes.TIME, allowNull: false },
  break_duration: { type: DataTypes.INTEGER, defaultValue: 60 },
  color: { type: DataTypes.STRING(10), allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'shift_templates', underscored: true });
