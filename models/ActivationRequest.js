const { DataTypes } = require('sequelize');
const sequelize = require('../lib/sequelize');

const ActivationRequest = sequelize.define('ActivationRequest', {
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
  packageId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'package_id'
  },
  businessDocuments: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'business_documents',
    get() {
      const rawValue = this.getDataValue('businessDocuments');
      return rawValue ? rawValue : {};
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'approved', 'rejected', 'under_review']]
    }
  },
  reviewedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'reviewed_by'
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reviewed_at'
  },
  reviewNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'review_notes'
  }
}, {
  tableName: 'activation_requests',
  timestamps: true,
  underscored: true
});

// Define associations
ActivationRequest.associate = function(models) {
  ActivationRequest.belongsTo(models.Partner, {
    foreignKey: 'partner_id',
    as: 'partner'
  });
  
  ActivationRequest.belongsTo(models.SubscriptionPackage, {
    foreignKey: 'package_id',
    as: 'package'
  });
  
  ActivationRequest.belongsTo(models.User, {
    foreignKey: 'reviewed_by',
    as: 'reviewer'
  });
};

module.exports = ActivationRequest;
