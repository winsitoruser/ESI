const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const IntegrationWebhook = sequelize.define('IntegrationWebhook', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    integrationId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'integration_id',
      references: {
        model: 'partner_integrations',
        key: 'id'
      }
    },
    webhookUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'webhook_url'
    },
    webhookSecret: {
      type: DataTypes.STRING,
      field: 'webhook_secret',
      comment: 'Secret for webhook signature verification'
    },
    events: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: 'Array of event types to listen for'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    retryAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      field: 'retry_attempts'
    },
    retryDelay: {
      type: DataTypes.INTEGER,
      defaultValue: 60,
      field: 'retry_delay',
      comment: 'Delay between retries in seconds'
    },
    lastTriggeredAt: {
      type: DataTypes.DATE,
      field: 'last_triggered_at'
    },
    lastStatus: {
      type: DataTypes.ENUM('success', 'failed', 'pending'),
      field: 'last_status'
    },
    failureCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'failure_count'
    },
    createdBy: {
      type: DataTypes.UUID,
      field: 'created_by'
    }
  }, {
    tableName: 'integration_webhooks',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['integration_id']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  IntegrationWebhook.associate = (models) => {
    IntegrationWebhook.belongsTo(models.PartnerIntegration, {
      foreignKey: 'integrationId',
      as: 'integration'
    });
  };

  return IntegrationWebhook;
};
