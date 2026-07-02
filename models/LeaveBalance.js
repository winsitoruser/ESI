'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const LeaveBalance = sequelize.define('LeaveBalance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'tenant_id'
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'employee_id'
  },
  leaveTypeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'leave_type_id'
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  entitledDays: {
    type: DataTypes.DECIMAL(5, 1),
    defaultValue: 0,
    field: 'entitled_days'
  },
  usedDays: {
    type: DataTypes.DECIMAL(5, 1),
    defaultValue: 0,
    field: 'used_days'
  },
  pendingDays: {
    type: DataTypes.DECIMAL(5, 1),
    defaultValue: 0,
    field: 'pending_days'
  },
  carriedForwardDays: {
    type: DataTypes.DECIMAL(5, 1),
    defaultValue: 0,
    field: 'carried_forward_days'
  },
  adjustmentDays: {
    type: DataTypes.DECIMAL(5, 1),
    defaultValue: 0,
    field: 'adjustment_days'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  remaining: {
    type: DataTypes.VIRTUAL,
    get() {
      return parseFloat(this.entitledDays || 0) + parseFloat(this.carriedForwardDays || 0) +
        parseFloat(this.adjustmentDays || 0) - parseFloat(this.usedDays || 0) - parseFloat(this.pendingDays || 0);
    }
  }
}, {
  tableName: 'leave_balances',
  timestamps: true,
  underscored: true
});

module.exports = LeaveBalance;
