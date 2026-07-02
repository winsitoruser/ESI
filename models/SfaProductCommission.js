const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaProductCommission = sequelize.define('SfaProductCommission', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    productId: { type: DataTypes.UUID, field: 'product_id' },
    productName: { type: DataTypes.STRING(200), field: 'product_name' },
    productSku: { type: DataTypes.STRING(50), field: 'product_sku' },
    categoryId: { type: DataTypes.UUID, field: 'category_id' },
    categoryName: { type: DataTypes.STRING(100), field: 'category_name' },
    commissionType: { type: DataTypes.STRING(20), defaultValue: 'percentage', field: 'commission_type' },
    commissionRate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'commission_rate' },
    flatAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'flat_amount' },
    minQuantity: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, field: 'min_quantity' },
    bonusRate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'bonus_rate' },
    bonusThreshold: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, field: 'bonus_threshold' },
    applicableTeams: { type: DataTypes.JSONB, defaultValue: [], field: 'applicable_teams' },
    applicableRoles: { type: DataTypes.JSONB, defaultValue: [], field: 'applicable_roles' },
    effectiveFrom: { type: DataTypes.DATEONLY, field: 'effective_from' },
    effectiveTo: { type: DataTypes.DATEONLY, field: 'effective_to' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    priority: { type: DataTypes.INTEGER, defaultValue: 0 },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, { tableName: 'sfa_product_commissions', timestamps: true, underscored: true });

  return SfaProductCommission;
};
