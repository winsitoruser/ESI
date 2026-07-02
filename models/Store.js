const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const Store = sequelize.define('Store', {
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
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  province: {
    type: DataTypes.STRING,
    allowNull: true
  },
  postalCode: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'owner_id'
  },
  businessType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'business_type'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  settings: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'stores',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

Store.associate = function(models) {
  // Store belongs to Tenant
  Store.belongsTo(models.Tenant, {
    foreignKey: 'tenantId',
    as: 'tenant'
  });

  // Store belongs to User (owner)
  Store.belongsTo(models.User, {
    foreignKey: 'ownerId',
    as: 'owner'
  });

  // Store has many Branches
  Store.hasMany(models.Branch, {
    foreignKey: 'storeId',
    as: 'branches'
  });

  // Store has many Store Settings
  if (models.StoreSetting) {
    Store.hasMany(models.StoreSetting, {
      foreignKey: 'storeId',
      as: 'storeSettings'
    });
  }
};

module.exports = Store;
