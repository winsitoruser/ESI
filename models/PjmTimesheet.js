'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PjmTimesheet = sequelize.define('PjmTimesheet', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false, field: 'tenant_id' },
    projectId: { type: DataTypes.UUID, allowNull: false, field: 'project_id' },
    taskId: { type: DataTypes.UUID, field: 'task_id' },
    employeeId: { type: DataTypes.INTEGER, allowNull: false, field: 'employee_id' },
    employeeName: { type: DataTypes.STRING(100), field: 'employee_name' },
    workDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'work_date' },
    hoursWorked: { type: DataTypes.DECIMAL(6, 2), allowNull: false, field: 'hours_worked' },
    overtimeHours: { type: DataTypes.DECIMAL(6, 2), defaultValue: 0, field: 'overtime_hours' },
    hourlyRate: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'hourly_rate' },
    totalCost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'total_cost' },
    description: { type: DataTypes.TEXT },
    status: { type: DataTypes.STRING(20), defaultValue: 'draft' }, // draft, submitted, approved, rejected
    approvedBy: { type: DataTypes.INTEGER, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, field: 'approved_at' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'pjm_timesheets', underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

  PjmTimesheet.associate = (models) => {
    PjmTimesheet.belongsTo(models.PjmProject, { foreignKey: 'projectId', as: 'project' });
    PjmTimesheet.belongsTo(models.PjmTask, { foreignKey: 'taskId', as: 'task' });
  };

  return PjmTimesheet;
};
