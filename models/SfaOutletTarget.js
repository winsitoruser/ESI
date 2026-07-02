const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaOutletTarget = sequelize.define('SfaOutletTarget', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    code: { type: DataTypes.STRING(30) },
    name: { type: DataTypes.STRING(200) },
    productId: { type: DataTypes.INTEGER, field: 'product_id' },
    productName: { type: DataTypes.STRING(200), field: 'product_name' },
    productSku: { type: DataTypes.STRING(50), field: 'product_sku' },
    targetType: { type: DataTypes.STRING(30), defaultValue: 'outlet_count', field: 'target_type' }, // outlet_count, new_outlet, active_outlet, customer_count
    targetValue: { type: DataTypes.INTEGER, defaultValue: 0, field: 'target_value' },
    achievedValue: { type: DataTypes.INTEGER, defaultValue: 0, field: 'achieved_value' },
    achievementPct: { type: DataTypes.DECIMAL(6, 2), defaultValue: 0, field: 'achievement_pct' },
    periodType: { type: DataTypes.STRING(20), defaultValue: 'monthly', field: 'period_type' },
    period: { type: DataTypes.STRING(10) },
    year: { type: DataTypes.INTEGER },
    bronzeThresholdPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 60, field: 'bronze_threshold_pct' },
    silverThresholdPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 80, field: 'silver_threshold_pct' },
    goldThresholdPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 100, field: 'gold_threshold_pct' },
    platinumThresholdPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 120, field: 'platinum_threshold_pct' },
    bronzeBonus: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'bronze_bonus' },
    silverBonus: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'silver_bonus' },
    goldBonus: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'gold_bonus' },
    platinumBonus: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'platinum_bonus' },
    assignedTo: { type: DataTypes.INTEGER, field: 'assigned_to' },
    teamId: { type: DataTypes.UUID, field: 'team_id' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, { tableName: 'sfa_outlet_targets', timestamps: true, underscored: true });

  return SfaOutletTarget;
};
