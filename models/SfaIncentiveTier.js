const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaIncentiveTier = sequelize.define('SfaIncentiveTier', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    schemeId: { type: DataTypes.UUID, allowNull: false, field: 'scheme_id' },
    tierName: { type: DataTypes.STRING(50), field: 'tier_name' },
    minAchievement: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'min_achievement' },
    maxAchievement: { type: DataTypes.DECIMAL(5, 2), defaultValue: 999, field: 'max_achievement' },
    incentiveType: { type: DataTypes.STRING(20), defaultValue: 'percentage', field: 'incentive_type' },
    incentiveValue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'incentive_value' },
    flatAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'flat_amount' },
    multiplier: { type: DataTypes.DECIMAL(5, 2), defaultValue: 1 },
    bonusAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'bonus_amount' },
    bonusDescription: { type: DataTypes.STRING(200), field: 'bonus_description' },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0, field: 'sort_order' }
  }, { tableName: 'sfa_incentive_tiers', timestamps: true, underscored: true });

  SfaIncentiveTier.associate = (models) => {
    SfaIncentiveTier.belongsTo(models.SfaIncentiveScheme, { foreignKey: 'scheme_id', as: 'scheme' });
  };

  return SfaIncentiveTier;
};
