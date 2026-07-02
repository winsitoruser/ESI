const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmForecastItem = sequelize.define('CrmForecastItem', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    forecastId: { type: DataTypes.UUID, field: 'forecast_id' },
    opportunityId: { type: DataTypes.UUID, field: 'opportunity_id' },
    customerId: { type: DataTypes.UUID, field: 'customer_id' },
    description: { type: DataTypes.STRING(300) },
    forecastCategory: { type: DataTypes.STRING(30), field: 'forecast_category' },
    amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    probability: { type: DataTypes.INTEGER, defaultValue: 50 },
    weightedAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'weighted_amount' },
    expectedCloseDate: { type: DataTypes.DATEONLY, field: 'expected_close_date' },
    stage: { type: DataTypes.STRING(30) },
    notes: { type: DataTypes.TEXT }
  }, {
    tableName: 'crm_forecast_items',
    timestamps: true,
    underscored: true
  });

  CrmForecastItem.associate = (models) => {
    CrmForecastItem.belongsTo(models.CrmForecast, { foreignKey: 'forecast_id', as: 'forecast' });
  };

  return CrmForecastItem;
};
