const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaTargetProduct = sequelize.define('SfaTargetProduct', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    targetAssignmentId: { type: DataTypes.UUID, field: 'target_assignment_id' },
    targetGroupId: { type: DataTypes.UUID, field: 'target_group_id' },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    assignedTo: { type: DataTypes.INTEGER, field: 'assigned_to' },
    productId: { type: DataTypes.UUID, field: 'product_id' },
    productName: { type: DataTypes.STRING(200), field: 'product_name' },
    productSku: { type: DataTypes.STRING(50), field: 'product_sku' },
    categoryId: { type: DataTypes.UUID, field: 'category_id' },
    categoryName: { type: DataTypes.STRING(100), field: 'category_name' },
    targetType: { type: DataTypes.STRING(20), defaultValue: 'product', field: 'target_type' },
    revenueTarget: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'revenue_target' },
    revenueAchieved: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'revenue_achieved' },
    volumeTarget: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'volume_target' },
    volumeAchieved: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'volume_achieved' },
    volumeUnit: { type: DataTypes.STRING(20), defaultValue: 'pcs', field: 'volume_unit' },
    achievementPct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, field: 'achievement_pct' },
    priority: { type: DataTypes.STRING(10), defaultValue: 'medium' },
    notes: { type: DataTypes.TEXT }
  }, { tableName: 'sfa_target_products', timestamps: true, underscored: true });

  SfaTargetProduct.associate = (models) => {
    SfaTargetProduct.belongsTo(models.SfaTargetAssignment, { foreignKey: 'target_assignment_id', as: 'assignment' });
    SfaTargetProduct.belongsTo(models.SfaTargetGroup, { foreignKey: 'target_group_id', as: 'targetGroup' });
  };

  return SfaTargetProduct;
};
