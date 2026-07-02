const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const Branch = sequelize.define('Branch', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'tenants',
      key: 'id'
    },
    field: 'tenant_id'
  },
  storeId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'stores',
      key: 'id'
    },
    field: 'store_id'
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('main', 'branch', 'warehouse', 'kiosk'),
    defaultValue: 'branch'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  province: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  postalCode: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'postal_code'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  managerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'manager_id'
  },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'tenants',
      key: 'id'
    },
    field: 'tenant_id'
  },
  region: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_sync_at'
  },
  syncStatus: {
    type: DataTypes.ENUM('synced', 'pending', 'failed', 'never'),
    defaultValue: 'never',
    field: 'sync_status'
  },
  operatingHours: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    field: 'operating_hours'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  settings: {
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
  tableName: 'branches',
  timestamps: true,
  underscored: true
});

Branch.associate = function(models) {
  // Branch belongs to Tenant
  Branch.belongsTo(models.Tenant, {
    foreignKey: 'tenantId',
    as: 'tenant'
  });

  // Branch belongs to Store
  Branch.belongsTo(models.Store, {
    foreignKey: 'storeId',
    as: 'store'
  });

  // Branch belongs to User (manager)
  Branch.belongsTo(models.User, {
    foreignKey: 'managerId',
    as: 'manager'
  });

  // Branch has many POS Transactions
  Branch.hasMany(models.PosTransaction, {
    foreignKey: 'branchId',
    as: 'transactions'
  });

  // Branch has many Employee Schedules
  Branch.hasMany(models.EmployeeSchedule, {
    foreignKey: 'branchId',
    as: 'schedules'
  });

  // Branch has many Stock records
  Branch.hasMany(models.Stock, {
    foreignKey: 'branchId',
    as: 'stock'
  });

  // Branch has many Store Settings
  Branch.hasMany(models.StoreSetting, {
    foreignKey: 'branchId',
    as: 'branchSettings'
  });

  // Branch has many Users assigned
  Branch.hasMany(models.User, {
    foreignKey: 'assignedBranchId',
    as: 'assignedUsers'
  });

  // Branch has many Sync Logs
  if (models.SyncLog) {
    Branch.hasMany(models.SyncLog, {
      foreignKey: 'branchId',
      as: 'syncLogs'
    });
  }
};

// Instance methods
Branch.prototype.needsSync = function() {
  if (!this.lastSyncAt) return true;
  const hoursSinceSync = (new Date() - new Date(this.lastSyncAt)) / (1000 * 60 * 60);
  return hoursSinceSync > 24 || this.syncStatus === 'failed';
};

Branch.prototype.markSynced = async function() {
  return this.update({
    lastSyncAt: new Date(),
    syncStatus: 'synced'
  });
};

Branch.prototype.markSyncFailed = async function(error) {
  return this.update({
    syncStatus: 'failed',
    settings: {
      ...this.settings,
      lastSyncError: error
    }
  });
};

module.exports = Branch;
