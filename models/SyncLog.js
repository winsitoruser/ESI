const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const SyncLog = sequelize.define('SyncLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'tenants',
      key: 'id'
    },
    field: 'tenant_id'
  },
  branchId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'branches',
      key: 'id'
    },
    field: 'branch_id'
  },
  syncType: {
    type: DataTypes.ENUM('products', 'prices', 'promotions', 'settings', 'inventory', 'full'),
    allowNull: false,
    field: 'sync_type'
  },
  direction: {
    type: DataTypes.ENUM('hq_to_branch', 'branch_to_hq'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'failed'),
    defaultValue: 'pending'
  },
  itemsSynced: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'items_synced'
  },
  totalItems: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_items'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message'
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'started_at'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  },
  initiatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'initiated_by'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
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
  tableName: 'sync_logs',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

SyncLog.associate = function(models) {
  // SyncLog belongs to Tenant
  SyncLog.belongsTo(models.Tenant, {
    foreignKey: 'tenantId',
    as: 'tenant'
  });

  // SyncLog belongs to Branch
  SyncLog.belongsTo(models.Branch, {
    foreignKey: 'branchId',
    as: 'branch'
  });

  // SyncLog belongs to User (initiator)
  SyncLog.belongsTo(models.User, {
    foreignKey: 'initiatedBy',
    as: 'initiator'
  });
};

// Instance methods
SyncLog.prototype.start = async function() {
  return this.update({
    status: 'in_progress',
    startedAt: new Date()
  });
};

SyncLog.prototype.complete = async function(itemsSynced) {
  return this.update({
    status: 'completed',
    itemsSynced,
    completedAt: new Date()
  });
};

SyncLog.prototype.fail = async function(errorMessage) {
  return this.update({
    status: 'failed',
    errorMessage,
    completedAt: new Date()
  });
};

SyncLog.prototype.getProgress = function() {
  if (this.totalItems === 0) return 0;
  return Math.round((this.itemsSynced / this.totalItems) * 100);
};

SyncLog.prototype.getDuration = function() {
  if (!this.startedAt) return 0;
  const endTime = this.completedAt || new Date();
  return Math.round((endTime - new Date(this.startedAt)) / 1000); // in seconds
};

module.exports = SyncLog;
