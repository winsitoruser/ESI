const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmForecast = sequelize.define('CrmForecast', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    name: { type: DataTypes.STRING(200), allowNull: false },
    forecastPeriod: { type: DataTypes.STRING(20), field: 'forecast_period' },
    periodStart: { type: DataTypes.DATEONLY, allowNull: false, field: 'period_start' },
    periodEnd: { type: DataTypes.DATEONLY, allowNull: false, field: 'period_end' },
    status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
    targetRevenue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'target_revenue' },
    targetDeals: { type: DataTypes.INTEGER, defaultValue: 0, field: 'target_deals' },
    targetNewCustomers: { type: DataTypes.INTEGER, defaultValue: 0, field: 'target_new_customers' },
    actualRevenue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'actual_revenue' },
    actualDeals: { type: DataTypes.INTEGER, defaultValue: 0, field: 'actual_deals' },
    actualNewCustomers: { type: DataTypes.INTEGER, defaultValue: 0, field: 'actual_new_customers' },
    bestCase: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'best_case' },
    mostLikely: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'most_likely' },
    worstCase: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'worst_case' },
    accuracyScore: { type: DataTypes.DECIMAL(5, 2), field: 'accuracy_score' },
    ownerId: { type: DataTypes.INTEGER, field: 'owner_id' },
    teamId: { type: DataTypes.UUID, field: 'team_id' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, {
    tableName: 'crm_forecasts',
    timestamps: true,
    underscored: true
  });

  CrmForecast.associate = (models) => {
    CrmForecast.hasMany(models.CrmForecastItem, { foreignKey: 'forecast_id', as: 'items' });
  };

  return CrmForecast;
};
