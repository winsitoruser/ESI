const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PartnerIntegration = sequelize.define('PartnerIntegration', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    partnerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'partner_id',
      references: {
        model: 'partners',
        key: 'id'
      }
    },
    integrationType: {
      type: DataTypes.ENUM('payment_gateway', 'whatsapp', 'email_smtp'),
      allowNull: false,
      field: 'integration_type'
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'e.g., midtrans, xendit, stripe, twilio, mailgun, smtp'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    configuration: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Encrypted configuration data'
    },
    testMode: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'test_mode'
    },
    lastTestedAt: {
      type: DataTypes.DATE,
      field: 'last_tested_at'
    },
    lastTestStatus: {
      type: DataTypes.ENUM('success', 'failed', 'pending'),
      field: 'last_test_status'
    },
    lastTestMessage: {
      type: DataTypes.TEXT,
      field: 'last_test_message'
    },
    createdBy: {
      type: DataTypes.UUID,
      field: 'created_by'
    },
    updatedBy: {
      type: DataTypes.UUID,
      field: 'updated_by'
    }
  }, {
    tableName: 'partner_integrations',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['partner_id']
      },
      {
        fields: ['integration_type']
      },
      {
        fields: ['partner_id', 'integration_type', 'provider'],
        unique: true
      }
    ]
  });

  PartnerIntegration.associate = (models) => {
    PartnerIntegration.belongsTo(models.Partner, {
      foreignKey: 'partnerId',
      as: 'partner'
    });
  };

  return PartnerIntegration;
};
