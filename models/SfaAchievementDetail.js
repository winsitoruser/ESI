const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaAchievementDetail = sequelize.define('SfaAchievementDetail', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    achievementId: { type: DataTypes.UUID, allowNull: false, field: 'achievement_id' },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    detailType: { type: DataTypes.STRING(30), allowNull: false, field: 'detail_type' },
    referenceId: { type: DataTypes.UUID, field: 'reference_id' },
    referenceType: { type: DataTypes.STRING(30), field: 'reference_type' },
    productId: { type: DataTypes.UUID, field: 'product_id' },
    productName: { type: DataTypes.STRING(200), field: 'product_name' },
    categoryId: { type: DataTypes.UUID, field: 'category_id' },
    categoryName: { type: DataTypes.STRING(100), field: 'category_name' },
    customerId: { type: DataTypes.UUID, field: 'customer_id' },
    customerName: { type: DataTypes.STRING(200), field: 'customer_name' },
    transactionDate: { type: DataTypes.DATEONLY, field: 'transaction_date' },
    revenueAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'revenue_amount' },
    volumeAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'volume_amount' },
    volumeUnit: { type: DataTypes.STRING(20), field: 'volume_unit' },
    description: { type: DataTypes.TEXT },
    metadata: { type: DataTypes.JSONB, defaultValue: {} }
  }, { tableName: 'sfa_achievement_details', timestamps: true, createdAt: 'created_at', updatedAt: false, underscored: true });

  SfaAchievementDetail.associate = (models) => {
    SfaAchievementDetail.belongsTo(models.SfaAchievement, { foreignKey: 'achievement_id', as: 'achievement' });
  };

  return SfaAchievementDetail;
};
