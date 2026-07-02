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
    type: DataTypes.ENUM('annual', 'sick', 'maternity', 'paternity', 'unpaid', 'personal', 'bereavement', 'marriage', 'religious'),
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
  attachmentUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL to supporting document (e.g. medical certificate)'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
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
  delegateTo: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'employees',
      key: 'id'
    },
    comment: 'Employee who covers during leave'
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'leave_requests',
  timestamps: true,
  indexes: [
    { fields: ['employeeId'] },
    { fields: ['branchId'] },
    { fields: ['leaveType'] },
    { fields: ['status'] },
    { fields: ['startDate'] },
    { fields: ['tenantId'] },
    { fields: ['approvedBy'] }
  ]
});

module.exports = LeaveRequest;
