const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const PartnerUser = sequelize.define('PartnerUser', {
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
  outletId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'outlet_id'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: [['owner', 'admin', 'manager', 'cashier', 'staff']]
    }
  },
  passwordHash: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'password_hash'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login_at'
  }
}, {
  tableName: 'partner_users',
  timestamps: true,
  underscored: true
});

// Define associations
PartnerUser.associate = function(models) {
  PartnerUser.belongsTo(models.Partner, {
    foreignKey: 'partner_id',
    as: 'partner'
  });
  
  PartnerUser.belongsTo(models.PartnerOutlet, {
    foreignKey: 'outlet_id',
    as: 'outlet'
  });
};

module.exports = PartnerUser;
