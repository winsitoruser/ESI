const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const AttendanceSettings = sequelize.define('AttendanceSettings', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'tenants', key: 'id' },
    field: 'tenant_id'
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'branches', key: 'id' },
    field: 'branch_id',
    comment: 'NULL = tenant-level default, set = branch-specific override'
  },
  // Work schedule
  workStartTime: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: '08:00:00',
    field: 'work_start_time'
  },
  workEndTime: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: '17:00:00',
    field: 'work_end_time'
  },
  breakStartTime: {
    type: DataTypes.TIME,
    allowNull: true,
    defaultValue: '12:00:00',
    field: 'break_start_time'
  },
  breakEndTime: {
    type: DataTypes.TIME,
    allowNull: true,
    defaultValue: '13:00:00',
    field: 'break_end_time'
  },
  breakDurationMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 60,
    field: 'break_duration_minutes'
  },
  workDays: {
    type: DataTypes.JSONB,
    defaultValue: [1, 2, 3, 4, 5],
    field: 'work_days',
    comment: '0=Sun, 1=Mon, ..., 6=Sat'
  },
  // Grace period & penalties
  lateGraceMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 15,
    field: 'late_grace_minutes',
    comment: 'Minutes after work start before marked late'
  },
  earlyLeaveGraceMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 15,
    field: 'early_leave_grace_minutes'
  },
  autoAbsentAfterMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 120,
    field: 'auto_absent_after_minutes',
    comment: 'Auto-mark absent if no clock-in after X minutes'
  },
  // Overtime
  overtimeEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'overtime_enabled'
  },
  overtimeMinMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 30,
    field: 'overtime_min_minutes',
    comment: 'Minimum minutes to count as overtime'
  },
  overtimeRequiresApproval: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'overtime_requires_approval'
  },
  // GPS / Mobile settings
  gpsAttendanceEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'gps_attendance_enabled'
  },
  geoFenceRadius: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
    field: 'geo_fence_radius',
    comment: 'Meters from branch location'
  },
  requireSelfie: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'require_selfie',
    comment: 'Require selfie photo for mobile attendance'
  },
  allowOutsideGeofence: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'allow_outside_geofence',
    comment: 'Allow clock-in outside geofence with flag'
  },
  // Fingerprint device settings
  fingerprintEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'fingerprint_enabled'
  },
  autoProcessDeviceLogs: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'auto_process_device_logs',
    comment: 'Auto-process device logs into attendance records'
  },
  punchTypeDetection: {
    type: DataTypes.STRING(30),
    defaultValue: 'auto',
    field: 'punch_type_detection',
    comment: 'auto (odd=in, even=out), device (from device), time_based'
  },
  // Leave settings
  annualLeaveQuota: {
    type: DataTypes.INTEGER,
    defaultValue: 12,
    field: 'annual_leave_quota'
  },
  sickLeaveQuota: {
    type: DataTypes.INTEGER,
    defaultValue: 14,
    field: 'sick_leave_quota'
  },
  leaveRequiresApproval: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'leave_requires_approval'
  },
  // Notifications
  notifyLateToManager: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'notify_late_to_manager'
  },
  notifyAbsentToManager: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'notify_absent_to_manager'
  },
  notifyOvertimeToHr: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'notify_overtime_to_hr'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'attendance_settings',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['branch_id'] },
    { unique: true, fields: ['tenant_id', 'branch_id'] }
  ]
});

AttendanceSettings.associate = function(models) {
  AttendanceSettings.belongsTo(models.Tenant, {
    foreignKey: 'tenantId',
    as: 'tenant'
  });
  AttendanceSettings.belongsTo(models.Branch, {
    foreignKey: 'branchId',
    as: 'branch'
  });
};

module.exports = AttendanceSettings;
