const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const IntegrationLog = sequelize.define('IntegrationLog', {
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
    action: {
      type: DataTypes.ENUM('test', 'webhook', 'transaction', 'error', 'config_change'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('success', 'failed', 'pending'),
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT
    },
    requestData: {
      type: DataTypes.JSONB,
      field: 'request_data'
    },
    responseData: {
      type: DataTypes.JSONB,
      field: 'response_data'
    },
    errorDetails: {
      type: DataTypes.JSONB,
      field: 'error_details'
    },
    duration: {
      type: DataTypes.INTEGER,
      comment: 'Duration in milliseconds'
    },
    ipAddress: {
      type: DataTypes.STRING,
      field: 'ip_address'
    },
    userAgent: {
      type: DataTypes.TEXT,
      field: 'user_agent'
    },
    userId: {
      type: DataTypes.UUID,
      field: 'user_id'
    }
  }, {
    tableName: 'integration_logs',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['integration_id']
      },
      {
        fields: ['action']
      },
      {
        fields: ['status']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  IntegrationLog.associate = (models) => {
    IntegrationLog.belongsTo(models.PartnerIntegration, {
      foreignKey: 'integrationId',
      as: 'integration'
    });
  };

  return IntegrationLog;
};
