const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const IntegrationConfig = sequelize.define('IntegrationConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  providerId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'provider_id',
    references: {
      model: 'integration_providers',
      key: 'id'
    }
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'branch_id',
    comment: 'NULL means HQ-level config, otherwise branch-specific'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Config name for identification'
  },
  environment: {
    type: DataTypes.ENUM('sandbox', 'production'),
    defaultValue: 'sandbox'
  },
  credentials: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
    comment: 'Encrypted credentials storage'
  },
  settings: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional provider-specific settings'
  },
  webhookUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'webhook_url'
  },
  webhookSecret: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'webhook_secret'
  },
  merchantId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'merchant_id',
    comment: 'Merchant ID from provider'
  },
  merchantName: {
    type: DataTypes.STRING(200),
    allowNull: true,
    field: 'merchant_name'
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'suspended', 'expired', 'rejected'),
    defaultValue: 'pending'
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_default',
    comment: 'Default config for this provider at branch/HQ level'
  },
  enabledPaymentMethods: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'enabled_payment_methods',
    comment: 'For payment gateways - which methods are enabled'
  },
  feeSettings: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'fee_settings',
    comment: 'Fee configuration (MDR, fixed fees, etc.)'
  },
  limits: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Transaction limits configuration'
  },
  notificationSettings: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'notification_settings'
  },
  lastTestedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_tested_at'
  },
  lastTestResult: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'last_test_result'
  },
  activatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'activated_at'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expires_at'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by'
  },
  updatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'updated_by'
  }
}, {
  tableName: 'integration_configs',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['provider_id', 'branch_id'],
      unique: false
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = IntegrationConfig;
