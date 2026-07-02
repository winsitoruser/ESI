'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const EmployeeKPI = sequelize.define('EmployeeKPI', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'employee_id'
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'branch_id'
  },
  period: {
    type: DataTypes.STRING(7),
    allowNull: false,
    comment: 'Period in YYYY-MM format'
  },
  metricName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'metric_name'
  },
  category: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'operations'
  },
  target: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  actual: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0
  },
  unit: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: '%'
  },
  weight: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
    comment: 'Weight percentage for this KPI metric'
  },
  achievement: {
    type: DataTypes.VIRTUAL,
    get() {
      const target = parseFloat(this.getDataValue('target')) || 0;
      const actual = parseFloat(this.getDataValue('actual')) || 0;
      return target > 0 ? Math.round((actual / target) * 100) : 0;
    }
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pending'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  reviewedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'reviewed_by'
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reviewed_at'
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'tenant_id'
  },
  templateId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'template_id'
  }
}, {
  tableName: 'employee_kpis',
  underscored: true,
  timestamps: true
});

module.exports = EmployeeKPI;
