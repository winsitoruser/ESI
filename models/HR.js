const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const TeamMember = sequelize.define('TeamMember', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(100) },
  phone: { type: DataTypes.STRING(20) },
  role: { type: DataTypes.ENUM('sales', 'marketing', 'ops', 'finance', 'admin', 'manager', 'executive'), allowNull: false },
  department: { type: DataTypes.STRING(100) },
  status: { type: DataTypes.ENUM('active', 'inactive', 'resigned'), defaultValue: 'active' },
  joinDate: { type: DataTypes.DATEONLY, field: 'join_date' },
  userId: { type: DataTypes.UUID, field: 'user_id' },
  tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
  createdBy: { type: DataTypes.UUID, field: 'created_by' },
}, {
  tableName: 'team_members', timestamps: true, underscored: true,
  indexes: [{ fields: ['role'] }, { fields: ['department'] }, { fields: ['status'] }, { fields: ['tenant_id'] }],
});

const Task = sequelize.define('Task', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT },
  priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'), defaultValue: 'medium' },
  status: { type: DataTypes.ENUM('todo', 'in_progress', 'done', 'cancelled'), defaultValue: 'todo' },
  assigneeId: { type: DataTypes.UUID, field: 'assignee_id' },
  dueDate: { type: DataTypes.DATEONLY, field: 'due_date' },
  completedAt: { type: DataTypes.DATE, field: 'completed_at' },
  relatedTo: { type: DataTypes.STRING(50), field: 'related_to' },
  relatedId: { type: DataTypes.UUID, field: 'related_id' },
  tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
  createdBy: { type: DataTypes.UUID, field: 'created_by' },
  updatedBy: { type: DataTypes.UUID, field: 'updated_by' },
}, {
  tableName: 'tasks', timestamps: true, underscored: true,
  indexes: [{ fields: ['assignee_id'] }, { fields: ['status'] }, { fields: ['priority'] }, { fields: ['due_date'] }, { fields: ['tenant_id'] }],
});

module.exports = { TeamMember, Task };
