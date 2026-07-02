const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaIncentiveCalculation = sequelize.define('SfaIncentiveCalculation', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    schemeId: { type: DataTypes.UUID, field: 'scheme_id' },
    achievementId: { type: DataTypes.UUID, field: 'achievement_id' },
    userId: { type: DataTypes.INTEGER, field: 'user_id' },
    teamId: { type: DataTypes.UUID, field: 'team_id' },
    period: { type: DataTypes.STRING(20), allowNull: false },
    year: { type: DataTypes.INTEGER, allowNull: false },
    achievementPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'achievement_pct' },
    tierName: { type: DataTypes.STRING(50), field: 'tier_name' },
    baseIncentive: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'base_incentive' },
    achievementIncentive: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'achievement_incentive' },
    productIncentive: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'product_incentive' },
    newCustomerBonus: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'new_customer_bonus' },
    visitBonus: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'visit_bonus' },
    collectionBonus: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'collection_bonus' },
    overachievementBonus: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'overachievement_bonus' },
    specialBonus: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'special_bonus' },
    penaltyAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'penalty_amount' },
    grossIncentive: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'gross_incentive' },
    deductions: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    netIncentive: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'net_incentive' },
    status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
    calculatedAt: { type: DataTypes.DATE, field: 'calculated_at' },
    approvedBy: { type: DataTypes.INTEGER, field: 'approved_by' },
    approvedAt: { type: DataTypes.DATE, field: 'approved_at' },
    paidAt: { type: DataTypes.DATE, field: 'paid_at' },
    paymentReference: { type: DataTypes.STRING(100), field: 'payment_reference' },
    calculationDetail: { type: DataTypes.JSONB, defaultValue: {}, field: 'calculation_detail' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, { tableName: 'sfa_incentive_calculations', timestamps: true, underscored: true });

  SfaIncentiveCalculation.associate = (models) => {
    SfaIncentiveCalculation.belongsTo(models.SfaIncentiveScheme, { foreignKey: 'scheme_id', as: 'scheme' });
    SfaIncentiveCalculation.belongsTo(models.SfaAchievement, { foreignKey: 'achievement_id', as: 'achievement' });
    SfaIncentiveCalculation.belongsTo(models.SfaTeam, { foreignKey: 'team_id', as: 'team' });
  };

  return SfaIncentiveCalculation;
};
