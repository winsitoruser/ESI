const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmCustomerSegment = sequelize.define('CrmCustomerSegment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    name: { type: DataTypes.STRING(100), allowNull: false },
    code: { type: DataTypes.STRING(30) },
    description: { type: DataTypes.TEXT },
    segmentType: { type: DataTypes.STRING(30), defaultValue: 'static', field: 'segment_type' },
    rules: { type: DataTypes.JSONB, defaultValue: {} },
    rfmRecencyWeight: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0.33, field: 'rfm_recency_weight' },
    rfmFrequencyWeight: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0.33, field: 'rfm_frequency_weight' },
    rfmMonetaryWeight: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0.34, field: 'rfm_monetary_weight' },
    customerCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'customer_count' },
    totalRevenue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'total_revenue' },
    avgHealthScore: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'avg_health_score' },
    color: { type: DataTypes.STRING(10) },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    lastRefreshedAt: { type: DataTypes.DATE, field: 'last_refreshed_at' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, {
    tableName: 'crm_customer_segments',
    timestamps: true,
    underscored: true
  });

  return CrmCustomerSegment;
};
