const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const IntegrationRequest = sequelize.define('IntegrationRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  requestNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'request_number',
    comment: 'Auto-generated request number (e.g., INT-REQ-2026-0001)'
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
    comment: 'Branch requesting the integration (NULL for HQ)'
  },
  requestType: {
    type: DataTypes.ENUM('new_merchant', 'upgrade', 'additional_service', 'renewal', 'change_config'),
    allowNull: false,
    field: 'request_type'
  },
  businessInfo: {
    type: DataTypes.JSON,
    allowNull: false,
    field: 'business_info',
    comment: 'Business information for merchant application'
  },
  ownerInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'owner_info',
    comment: 'Owner/director information'
  },
  bankInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'bank_info',
    comment: 'Bank account for settlement'
  },
  documents: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Uploaded documents (KTP, NPWP, SIUP, etc.)'
  },
  requestedServices: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'requested_services',
    comment: 'Services being requested (QRIS, VA, E-Wallet, etc.)'
  },
  additionalInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'additional_info'
  },
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'under_review', 'pending_documents', 'approved', 'rejected', 'cancelled'),
    defaultValue: 'draft'
  },
  providerStatus: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'provider_status',
    comment: 'Status from the provider side'
  },
  providerReferenceId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'provider_reference_id',
    comment: 'Reference ID from provider'
  },
  reviewNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'review_notes'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'rejection_reason'
  },
  approvedCredentials: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'approved_credentials',
    comment: 'Credentials received after approval'
  },
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'submitted_at'
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reviewed_at'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at'
  },
  configId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'config_id',
    comment: 'Created config after approval'
  },
  requestedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'requested_by'
  },
  reviewedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'reviewed_by'
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'approved_by'
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    defaultValue: 'normal'
  },
  estimatedCompletionDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'estimated_completion_date'
  }
}, {
  tableName: 'integration_requests',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['provider_id']
    },
    {
      fields: ['branch_id']
    },
    {
      fields: ['request_number'],
      unique: true
    }
  ]
});

module.exports = IntegrationRequest;
