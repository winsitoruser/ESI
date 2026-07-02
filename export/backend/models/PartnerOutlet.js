const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const PartnerOutlet = sequelize.define('PartnerOutlet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  partnerId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'partner_id'
  },
  outletName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'outlet_name'
  },
  outletCode: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'outlet_code'
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  province: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  managerName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'manager_name'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  posDeviceId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'pos_device_id'
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_sync_at'
  }
}, {
  tableName: 'partner_outlets',
  timestamps: true,
  underscored: true
});

// Define associations
PartnerOutlet.associate = function(models) {
  PartnerOutlet.belongsTo(models.Partner, {
    foreignKey: 'partner_id',
    as: 'partner'
  });
  
  PartnerOutlet.hasMany(models.PartnerUser, {
    foreignKey: 'outlet_id',
    as: 'users'
  });
};

module.exports = PartnerOutlet;
