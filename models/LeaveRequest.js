'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const LeaveRequest = sequelize.define('LeaveRequest', {
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
  leaveType: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  totalDays: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Number of leave days (excluding weekends/holidays)'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'pending'
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'leave_requests',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['employee_id'] },
    { fields: ['branch_id'] },
    { fields: ['leave_type'] },
    { fields: ['status'] },
    { fields: ['start_date'] },
    { fields: ['tenant_id'] },
    { fields: ['approved_by'] }
  ]
});

module.exports = LeaveRequest;
