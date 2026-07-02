import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class PjmProject extends Model {}
PjmProject.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(300), allowNull: false },
  code: { type: DataTypes.STRING(20), allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  client_name: { type: DataTypes.STRING(200), allowNull: true },
  manager_id: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.ENUM('planning', 'active', 'on_hold', 'completed', 'cancelled'), defaultValue: 'planning' },
  priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
  start_date: { type: DataTypes.DATEONLY, allowNull: true },
  end_date: { type: DataTypes.DATEONLY, allowNull: true },
  actual_start: { type: DataTypes.DATEONLY, allowNull: true },
  actual_end: { type: DataTypes.DATEONLY, allowNull: true },
  budget: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  actual_cost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  progress_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  tags: { type: DataTypes.JSONB, defaultValue: [] },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'pjm_projects', paranoid: true, underscored: true });

export class PjmTask extends Model {}
PjmTask.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  project_id: { type: DataTypes.INTEGER, allowNull: false },
  parent_id: { type: DataTypes.INTEGER, allowNull: true },
  title: { type: DataTypes.STRING(300), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  assigned_to: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.ENUM('todo', 'in_progress', 'review', 'done', 'blocked'), defaultValue: 'todo' },
  priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'), defaultValue: 'medium' },
  start_date: { type: DataTypes.DATEONLY, allowNull: true },
  due_date: { type: DataTypes.DATEONLY, allowNull: true },
  completed_at: { type: DataTypes.DATE, allowNull: true },
  estimated_hours: { type: DataTypes.DECIMAL(8, 2), defaultValue: 0 },
  actual_hours: { type: DataTypes.DECIMAL(8, 2), defaultValue: 0 },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { sequelize, tableName: 'pjm_tasks', paranoid: true, underscored: true });

export class PjmMilestone extends Model {}
PjmMilestone.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  project_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  due_date: { type: DataTypes.DATEONLY, allowNull: false },
  completed_at: { type: DataTypes.DATE, allowNull: true },
  status: { type: DataTypes.ENUM('pending', 'completed', 'overdue'), defaultValue: 'pending' },
}, { sequelize, tableName: 'pjm_milestones', underscored: true });

export class PjmTimesheet extends Model {}
PjmTimesheet.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  project_id: { type: DataTypes.INTEGER, allowNull: false },
  task_id: { type: DataTypes.INTEGER, allowNull: true },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  hours: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  billable: { type: DataTypes.BOOLEAN, defaultValue: true },
  rate: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('draft', 'submitted', 'approved', 'rejected'), defaultValue: 'draft' },
}, { sequelize, tableName: 'pjm_timesheets', underscored: true });

export class PjmRisk extends Model {}
PjmRisk.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  project_id: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING(300), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  probability: { type: DataTypes.ENUM('low', 'medium', 'high'), defaultValue: 'medium' },
  impact: { type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
  mitigation: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('identified', 'mitigating', 'resolved', 'occurred'), defaultValue: 'identified' },
  owner_id: { type: DataTypes.INTEGER, allowNull: true },
}, { sequelize, tableName: 'pjm_risks', underscored: true });
