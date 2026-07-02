const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaStrategyKpi = sequelize.define('SfaStrategyKpi', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    strategyId: { type: DataTypes.UUID, field: 'strategy_id' },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    kpiCode: { type: DataTypes.STRING(30), field: 'kpi_code' },
    kpiName: { type: DataTypes.STRING(200), field: 'kpi_name' },
    description: { type: DataTypes.TEXT },
    kpiType: { type: DataTypes.STRING(30), field: 'kpi_type' }, // revenue, volume, outlet_count, visit_count, new_customer, effective_call, product_mix, collection, noo
    targetValue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'target_value' },
    achievedValue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'achieved_value' },
    achievementPct: { type: DataTypes.DECIMAL(6, 2), defaultValue: 0, field: 'achievement_pct' },
    unit: { type: DataTypes.STRING(30), defaultValue: '' },
    weight: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    scoringMethod: { type: DataTypes.STRING(20), defaultValue: 'linear', field: 'scoring_method' }, // linear, step, threshold
    thresholdBronze: { type: DataTypes.DECIMAL(5, 2), defaultValue: 60, field: 'threshold_bronze' },
    thresholdSilver: { type: DataTypes.DECIMAL(5, 2), defaultValue: 80, field: 'threshold_silver' },
    thresholdGold: { type: DataTypes.DECIMAL(5, 2), defaultValue: 100, field: 'threshold_gold' },
    thresholdPlatinum: { type: DataTypes.DECIMAL(5, 2), defaultValue: 120, field: 'threshold_platinum' },
    multiplierBronze: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0.6, field: 'multiplier_bronze' },
    multiplierSilver: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0.8, field: 'multiplier_silver' },
    multiplierGold: { type: DataTypes.DECIMAL(3, 2), defaultValue: 1.0, field: 'multiplier_gold' },
    multiplierPlatinum: { type: DataTypes.DECIMAL(3, 2), defaultValue: 1.5, field: 'multiplier_platinum' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0, field: 'sort_order' }
  }, { tableName: 'sfa_strategy_kpis', timestamps: true, underscored: true });

  SfaStrategyKpi.associate = (models) => {
    SfaStrategyKpi.belongsTo(models.SfaSalesStrategy, { foreignKey: 'strategy_id', as: 'strategy' });
  };

  return SfaStrategyKpi;
};
