'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const EmployeeAttendance = sequelize.define('EmployeeAttendance', {
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
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  clockIn: {
    type: DataTypes.DATE,
    allowNull: true
  },
  clockOut: {
    type: DataTypes.DATE,
    allowNull: true
  },
  scheduledStart: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: 'Scheduled work start time'
  },
  scheduledEnd: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: 'Scheduled work end time'
  },
  status: {
    type: DataTypes.ENUM('present', 'late', 'absent', 'leave', 'sick', 'holiday', 'work_from_home'),
    allowNull: false,
    defaultValue: 'present'
  },
  lateMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  earlyLeaveMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  overtimeMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  workHours: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0
  },
  breakMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 60
  },
  leaveType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Type of leave if status is leave'
  },
  leaveReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  clockInLocation: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'GPS coordinates for clock in'
  },
  clockOutLocation: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'GPS coordinates for clock out'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'employee_attendance',
  timestamps: true,
  indexes: [
    { fields: ['employeeId'] },
    { fields: ['branchId'] },
    { fields: ['date'] },
    { fields: ['status'] },
    { fields: ['tenantId'] },
    { unique: true, fields: ['employeeId', 'date'] }
  ]
});

module.exports = EmployeeAttendance;
