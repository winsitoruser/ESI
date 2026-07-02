const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MktPromotionUsage = sequelize.define('MktPromotionUsage', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    promotionId: { type: DataTypes.UUID, allowNull: false, field: 'promotion_id' },
    customerId: { type: DataTypes.UUID, field: 'customer_id' },
    orderId: { type: DataTypes.UUID, field: 'order_id' },
    branchId: { type: DataTypes.UUID, field: 'branch_id' },
    discountApplied: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'discount_applied' },
    orderTotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'order_total' }
  }, {
    tableName: 'mkt_promotion_usage',
    timestamps: true,
    underscored: true
  });

  MktPromotionUsage.associate = (models) => {
    MktPromotionUsage.belongsTo(models.MktPromotion, { foreignKey: 'promotion_id', as: 'promotion' });
  };

  return MktPromotionUsage;
};
