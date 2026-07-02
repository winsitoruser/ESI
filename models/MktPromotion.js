const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MktPromotion = sequelize.define('MktPromotion', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    campaignId: { type: DataTypes.UUID, field: 'campaign_id' },
    promoCode: { type: DataTypes.STRING(30), field: 'promo_code' },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    promoType: { type: DataTypes.STRING(30), allowNull: false, field: 'promo_type' },
    discountType: { type: DataTypes.STRING(20), defaultValue: 'percentage', field: 'discount_type' },
    discountValue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'discount_value' },
    minPurchase: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'min_purchase' },
    maxDiscount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'max_discount' },
    buyQuantity: { type: DataTypes.INTEGER, defaultValue: 0, field: 'buy_quantity' },
    getQuantity: { type: DataTypes.INTEGER, defaultValue: 0, field: 'get_quantity' },
    status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
    startDate: { type: DataTypes.DATE, field: 'start_date' },
    endDate: { type: DataTypes.DATE, field: 'end_date' },
    usageLimit: { type: DataTypes.INTEGER, defaultValue: 0, field: 'usage_limit' },
    usageCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'usage_count' },
    perCustomerLimit: { type: DataTypes.INTEGER, defaultValue: 0, field: 'per_customer_limit' },
    applicableBranches: { type: DataTypes.JSONB, defaultValue: [], field: 'applicable_branches' },
    applicableSegments: { type: DataTypes.JSONB, defaultValue: [], field: 'applicable_segments' },
    applicableProducts: { type: DataTypes.JSONB, defaultValue: [], field: 'applicable_products' },
    applicableCategories: { type: DataTypes.JSONB, defaultValue: [], field: 'applicable_categories' },
    excludeProducts: { type: DataTypes.JSONB, defaultValue: [], field: 'exclude_products' },
    terms: { type: DataTypes.TEXT },
    isStackable: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_stackable' },
    priority: { type: DataTypes.INTEGER, defaultValue: 0 },
    autoApply: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'auto_apply' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, {
    tableName: 'mkt_promotions',
    timestamps: true,
    underscored: true
  });

  MktPromotion.associate = (models) => {
    MktPromotion.belongsTo(models.MktCampaign, { foreignKey: 'campaign_id', as: 'campaign' });
    MktPromotion.hasMany(models.MktPromotionUsage, { foreignKey: 'promotion_id', as: 'usages' });
  };

  return MktPromotion;
};
