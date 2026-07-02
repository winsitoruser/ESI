const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const IntegrationProvider = sequelize.define('IntegrationProvider', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Unique code for the provider (e.g., midtrans, xendit, whatsapp_meta)'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Display name'
  },
  category: {
    type: DataTypes.ENUM('payment_gateway', 'messaging', 'email', 'delivery', 'accounting', 'marketplace', 'other'),
    allowNull: false,
    comment: 'Category of integration'
  },
  subcategory: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Subcategory (e.g., qris, va, ewallet for payment)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  logo: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL to provider logo'
  },
  website: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  documentationUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'documentation_url'
  },
  apiBaseUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'api_base_url'
  },
  sandboxApiUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'sandbox_api_url'
  },
  requiredCredentials: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    field: 'required_credentials',
    comment: 'Array of required credential fields [{key, label, type, required, encrypted}]'
  },
  configSchema: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'config_schema',
    comment: 'JSON schema for additional configuration'
  },
  webhookSupported: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'webhook_supported'
  },
  webhookEvents: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'webhook_events',
    comment: 'List of webhook events supported'
  },
  features: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'List of features supported by this provider'
  },
  pricing: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Pricing information'
  },
  requiresApproval: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'requires_approval',
    comment: 'Whether this integration requires merchant application/approval'
  },
  applicationFields: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'application_fields',
    comment: 'Fields required for merchant application'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sort_order'
  }
}, {
  tableName: 'integration_providers',
  timestamps: true,
  underscored: true
});

module.exports = IntegrationProvider;
