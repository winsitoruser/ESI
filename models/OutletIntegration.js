const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OutletIntegration = sequelize.define('OutletIntegration', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    outletId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'outlet_id',
      references: {
        model: 'partner_outlets',
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
    usePartnerConfig: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'use_partner_config',
      comment: 'If true, inherit from partner integration'
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
    tableName: 'outlet_integrations',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['outlet_id']
      },
      {
        fields: ['integration_type']
      },
      {
        fields: ['outlet_id', 'integration_type', 'provider'],
        unique: true
      }
    ]
  });

  OutletIntegration.associate = (models) => {
    OutletIntegration.belongsTo(models.PartnerOutlet, {
      foreignKey: 'outletId',
      as: 'outlet'
    });
  };

  return OutletIntegration;
};
