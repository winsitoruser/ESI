const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const Partner = sequelize.define('Partner', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  businessName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'business_name'
  },
  businessType: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'business_type'
  },
  ownerName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'owner_name'
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
  postalCode: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'postal_code'
  },
  taxId: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'tax_id'
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'active', 'inactive', 'suspended']]
    }
  },
  activationStatus: {
    type: DataTypes.STRING(50),
    defaultValue: 'pending',
    field: 'activation_status',
    validate: {
      isIn: [['pending', 'approved', 'rejected']]
    }
  },
  activationRequestedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'activation_requested_at'
  },
  activationApprovedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'activation_approved_at'
  },
  activationApprovedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'activation_approved_by'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'rejection_reason'
  },
  logoUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'logo_url'
  },
  website: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'partners',
  timestamps: true,
  underscored: true
});

// Define associations
Partner.associate = function(models) {
  Partner.hasMany(models.PartnerOutlet, {
    foreignKey: 'partner_id',
    as: 'outlets'
  });
  
  Partner.hasMany(models.PartnerUser, {
    foreignKey: 'partner_id',
    as: 'users'
  });
  
  Partner.hasMany(models.PartnerSubscription, {
    foreignKey: 'partner_id',
    as: 'subscriptions'
  });
  
  Partner.hasMany(models.ActivationRequest, {
    foreignKey: 'partner_id',
    as: 'activationRequests'
  });
};

module.exports = Partner;
