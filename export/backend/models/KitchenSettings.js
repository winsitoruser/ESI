const { DataTypes } = require('sequelize');
const { sequelize } = require('../lib/sequelizeClient');

const KitchenSettings = sequelize.define('KitchenSettings', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'tenant_id'
  },
  autoAcceptOrders: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'auto_accept_orders',
    comment: 'Automatically accept orders from POS'
  },
  defaultPrepTime: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 15,
    field: 'default_prep_time',
    comment: 'Default preparation time in minutes'
  },
  enableKDS: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'enable_kds',
    comment: 'Enable Kitchen Display System'
  },
  kdsRefreshInterval: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
    field: 'kds_refresh_interval',
    comment: 'KDS auto-refresh interval in seconds'
  },
  soundNotifications: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'sound_notifications'
  },
  autoDeductInventory: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'auto_deduct_inventory',
    comment: 'Auto deduct inventory when order is completed'
  },
  lowStockAlert: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'low_stock_alert'
  },
  criticalStockAlert: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'critical_stock_alert'
  },
  wasteTracking: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'waste_tracking'
  },
  performanceTracking: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'performance_tracking'
  },
  orderPriorityRules: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'order_priority_rules',
    comment: 'Rules for auto-setting order priority'
  },
  workingHours: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'working_hours',
    comment: 'Kitchen operating hours per day'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'kitchen_settings',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['tenant_id'], unique: true }
  ]
});

module.exports = KitchenSettings;
