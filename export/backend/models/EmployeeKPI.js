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
    references: {
      model: 'employees',
      key: 'id'
    }
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'branches',
      key: 'id'
    }
  },
  period: {
    type: DataTypes.STRING(7),
    allowNull: false,
    comment: 'Period in YYYY-MM format'
  },
  metricName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('sales', 'operations', 'customer', 'financial', 'hr'),
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
    type: DataTypes.ENUM('pending', 'in_progress', 'achieved', 'exceeded', 'not_achieved'),
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
    references: {
      model: 'users',
      key: 'id'
    }
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'employee_kpis',
  timestamps: true,
  indexes: [
    { fields: ['employeeId'] },
    { fields: ['branchId'] },
    { fields: ['period'] },
    { fields: ['category'] },
    { fields: ['status'] },
    { fields: ['tenantId'] },
    { unique: true, fields: ['employeeId', 'metricName', 'period'] }
  ]
});

module.exports = EmployeeKPI;
