const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaIncentiveScheme = sequelize.define('SfaIncentiveScheme', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    code: { type: DataTypes.STRING(30), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT },
    schemeType: { type: DataTypes.STRING(30), defaultValue: 'progressive', field: 'scheme_type' },
    calculationBasis: { type: DataTypes.STRING(30), defaultValue: 'achievement_pct', field: 'calculation_basis' },
    applicableRoles: { type: DataTypes.JSONB, defaultValue: ['sales_staff'], field: 'applicable_roles' },
    applicableTeams: { type: DataTypes.JSONB, defaultValue: [], field: 'applicable_teams' },
    applicableTerritories: { type: DataTypes.JSONB, defaultValue: [], field: 'applicable_territories' },
    periodType: { type: DataTypes.STRING(20), defaultValue: 'monthly', field: 'period_type' },
    baseSalaryComponent: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'base_salary_component' },
    baseAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'base_amount' },
    currency: { type: DataTypes.STRING(10), defaultValue: 'IDR' },
    minAchievementPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'min_achievement_pct' },
    maxCap: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'max_cap' },
    overachievementMultiplier: { type: DataTypes.DECIMAL(5, 2), defaultValue: 1.5, field: 'overachievement_multiplier' },
    underachievementPenalty: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'underachievement_penalty' },
    hasProductIncentive: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'has_product_incentive' },
    productIncentiveConfig: { type: DataTypes.JSONB, defaultValue: {}, field: 'product_incentive_config' },
    hasNewCustomerBonus: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'has_new_customer_bonus' },
    newCustomerBonusAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'new_customer_bonus_amount' },
    hasVisitBonus: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'has_visit_bonus' },
    visitBonusAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'visit_bonus_amount' },
    hasCollectionBonus: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'has_collection_bonus' },
    collectionBonusPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'collection_bonus_pct' },
    status: { type: DataTypes.STRING(20), defaultValue: 'active' },
    effectiveFrom: { type: DataTypes.DATEONLY, field: 'effective_from' },
    effectiveTo: { type: DataTypes.DATEONLY, field: 'effective_to' },
    approvedBy: { type: DataTypes.INTEGER, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, field: 'approved_at' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, { tableName: 'sfa_incentive_schemes', timestamps: true, underscored: true });

  SfaIncentiveScheme.associate = (models) => {
    SfaIncentiveScheme.hasMany(models.SfaIncentiveTier, { foreignKey: 'scheme_id', as: 'tiers' });
    SfaIncentiveScheme.hasMany(models.SfaIncentiveCalculation, { foreignKey: 'scheme_id', as: 'calculations' });
  };

  return SfaIncentiveScheme;
};
