const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UsageMetric = sequelize.define('UsageMetric', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'tenant_id',
      references: { model: 'tenants', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    metricName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'metric_name'
    },
    metricValue: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'metric_value'
    },
    periodStart: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'period_start'
    },
    periodEnd: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'period_end'
    },
    source: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'usage_metrics',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { fields: ['tenant_id'] },
      { fields: ['metric_name'] },
      { fields: ['period_start', 'period_end'] },
      { unique: true, fields: ['tenant_id', 'metric_name', 'period_start'] }
    ]
  });

  UsageMetric.associate = (models) => {
    if (models.Tenant) {
      UsageMetric.belongsTo(models.Tenant, { foreignKey: 'tenantId', as: 'tenant' });
    }
  };

  UsageMetric.recordMetric = async function(tenantId, metricName, value, periodStart, periodEnd, extra = {}) {
    const existing = await this.findOne({ where: { tenantId, metricName, periodStart } });
    if (existing) {
      existing.metricValue = value;
      if (extra.source) existing.source = extra.source;
      if (extra.metadata) existing.metadata = extra.metadata;
      await existing.save();
      return existing;
    }
    return this.create({
      tenantId,
      metricName,
      metricValue: value,
      periodStart,
      periodEnd,
      source: extra.source || null,
      metadata: extra.metadata || null
    });
  };

  return UsageMetric;
};
