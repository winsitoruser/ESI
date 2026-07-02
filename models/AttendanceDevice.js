const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const AttendanceDevice = sequelize.define('AttendanceDevice', {
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
    allowNull: false,
    references: { model: 'branches', key: 'id' },
    field: 'branch_id'
  },
  deviceName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'device_name'
  },
  deviceType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'device_type',
    comment: 'fingerprint, face_recognition, card, mobile_app, manual'
  },
  deviceBrand: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'device_brand',
    comment: 'ZKTeco, Hikvision, Solution, Revo, etc.'
  },
  deviceModel: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'device_model'
  },
  serialNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    field: 'serial_number'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address'
  },
  port: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 4370,
    comment: 'Default ZKTeco port'
  },
  communicationKey: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'communication_key',
    comment: 'Device communication password/key'
  },
  connectionType: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'tcp',
    field: 'connection_type',
    comment: 'tcp, udp, http, usb'
  },
  apiEndpoint: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'api_endpoint',
    comment: 'For cloud/HTTP based devices'
  },
  apiKey: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'api_key',
    comment: 'API key for cloud devices'
  },
  webhookSecret: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'webhook_secret',
    comment: 'Secret for verifying webhook payloads'
  },
  syncMode: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'push',
    field: 'sync_mode',
    comment: 'push (device sends data), pull (server fetches), manual'
  },
  syncInterval: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 5,
    field: 'sync_interval',
    comment: 'Minutes between pull syncs'
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_sync_at'
  },
  lastSyncStatus: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'last_sync_status',
    comment: 'success, failed, timeout, partial'
  },
  lastSyncMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'last_sync_message'
  },
  totalSynced: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_synced',
    comment: 'Total records synced from this device'
  },
  registeredUsers: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'registered_users',
    comment: 'Number of fingerprints/faces enrolled'
  },
  maxCapacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'max_capacity',
    comment: 'Max fingerprint/face capacity'
  },
  firmwareVersion: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'firmware_version'
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Physical location description e.g. Entrance, Back door'
  },
  status: {
    type: DataTypes.STRING(30),
    defaultValue: 'active',
    comment: 'active, inactive, maintenance, offline, error'
  },
  isOnline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_online'
  },
  lastHeartbeatAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_heartbeat_at'
  },
  settings: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
    comment: 'Device-specific settings (timezone, language, etc.)'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: 'attendance_devices',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['tenant_id'] },
    { fields: ['branch_id'] },
    { fields: ['status'] },
    { fields: ['device_type'] },
    { unique: true, fields: ['serial_number'], where: { serial_number: { [require('sequelize').Op.ne]: null } } }
  ]
});

AttendanceDevice.associate = function(models) {
  AttendanceDevice.belongsTo(models.Tenant, {
    foreignKey: 'tenantId',
    as: 'tenant'
  });
  AttendanceDevice.belongsTo(models.Branch, {
    foreignKey: 'branchId',
    as: 'branch'
  });
  AttendanceDevice.hasMany(models.AttendanceDeviceLog, {
    foreignKey: 'deviceId',
    as: 'logs'
  });
};

module.exports = AttendanceDevice;
