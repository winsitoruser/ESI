const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaCommissionGroup = sequelize.define('SfaCommissionGroup', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    code: { type: DataTypes.STRING(30) },
    name: { type: DataTypes.STRING(200) },
    description: { type: DataTypes.TEXT },
    groupType: { type: DataTypes.STRING(30), defaultValue: 'bundle', field: 'group_type' }, // bundle, cross_sell, upsell, volume_mix
    calculationMethod: { type: DataTypes.STRING(20), defaultValue: 'flat', field: 'calculation_method' }, // flat, percentage, tiered
    bonusAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'bonus_amount' },
    bonusPercentage: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'bonus_percentage' },
    minTotalQuantity: { type: DataTypes.INTEGER, defaultValue: 0, field: 'min_total_quantity' },
    minTotalValue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'min_total_value' },
    periodType: { type: DataTypes.STRING(20), defaultValue: 'monthly', field: 'period_type' },
    effectiveFrom: { type: DataTypes.DATEONLY, field: 'effective_from' },
    effectiveTo: { type: DataTypes.DATEONLY, field: 'effective_to' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    priority: { type: DataTypes.INTEGER, defaultValue: 0 },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, { tableName: 'sfa_commission_groups', timestamps: true, underscored: true });

  return SfaCommissionGroup;
};
