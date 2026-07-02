const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const AttendanceDeviceLog = sequelize.define('AttendanceDeviceLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  deviceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'attendance_devices', key: 'id' },
    field: 'device_id'
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'tenant_id'
  },
  employeeId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'employee_id',
    comment: 'Matched employee after processing, null if unmatched'
  },
  deviceUserId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'device_user_id',
    comment: 'User ID as stored on the device'
  },
  deviceUserName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'device_user_name',
    comment: 'Name as stored on the device'
  },
  punchTime: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'punch_time',
    comment: 'Timestamp from the device'
  },
  punchType: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'punch_type',
    comment: 'check_in, check_out, break_start, break_end, overtime_start, overtime_end'
  },
  verifyMode: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'verify_mode',
    comment: 'fingerprint, face, card, password, manual'
  },
  verifyStatus: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'verify_status',
    comment: 'Device-specific verify status code'
  },
  processStatus: {
    type: DataTypes.STRING(30),
    defaultValue: 'pending',
    field: 'process_status',
    comment: 'pending, processed, failed, duplicate, unmatched'
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'processed_at'
  },
  processError: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'process_error'
  },
  attendanceId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'attendance_id',
    comment: 'Linked EmployeeAttendance record after processing'
  },
  rawData: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'raw_data',
    comment: 'Raw data from device for debugging'
  },
  syncBatchId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'sync_batch_id',
    comment: 'Batch ID for grouping sync records'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'attendance_device_logs',
  timestamps: false,
  underscored: true,
  indexes: [
    { fields: ['device_id'] },
    { fields: ['tenant_id'] },
    { fields: ['employee_id'] },
    { fields: ['punch_time'] },
    { fields: ['process_status'] },
    { fields: ['device_user_id', 'punch_time'] },
    { fields: ['sync_batch_id'] }
  ]
});

AttendanceDeviceLog.associate = function(models) {
  AttendanceDeviceLog.belongsTo(models.AttendanceDevice, {
    foreignKey: 'deviceId',
    as: 'device'
  });
  if (models.Employee) {
    AttendanceDeviceLog.belongsTo(models.Employee, {
      foreignKey: 'employeeId',
      as: 'employee',
      constraints: false
    });
  }
};

module.exports = AttendanceDeviceLog;
