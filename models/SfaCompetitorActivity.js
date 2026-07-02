const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaCompetitorActivity = sequelize.define('SfaCompetitorActivity', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    visitId: { type: DataTypes.UUID, field: 'visit_id' },
    customerId: { type: DataTypes.UUID, field: 'customer_id' },
    customerName: { type: DataTypes.STRING(200), field: 'customer_name' },
    salespersonId: { type: DataTypes.INTEGER, field: 'salesperson_id' },
    territoryId: { type: DataTypes.UUID, field: 'territory_id' },
    reportedDate: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW, field: 'reported_date' },
    competitorName: { type: DataTypes.STRING(200), allowNull: false, field: 'competitor_name' },
    competitorBrand: { type: DataTypes.STRING(200), field: 'competitor_brand' },
    activityType: { type: DataTypes.STRING(30), defaultValue: 'promotion', field: 'activity_type' },
    productCategory: { type: DataTypes.STRING(100), field: 'product_category' },
    description: { type: DataTypes.TEXT },
    competitorPrice: { type: DataTypes.DECIMAL(15, 2), field: 'competitor_price' },
    ourPrice: { type: DataTypes.DECIMAL(15, 2), field: 'our_price' },
    priceDifference: { type: DataTypes.DECIMAL(15, 2), field: 'price_difference' },
    promoType: { type: DataTypes.STRING(50), field: 'promo_type' },
    promoDetail: { type: DataTypes.TEXT, field: 'promo_detail' },
    displayQuality: { type: DataTypes.STRING(20), field: 'display_quality' },
    stockAvailability: { type: DataTypes.STRING(20), field: 'stock_availability' },
    estimatedMarketShare: { type: DataTypes.DECIMAL(5, 2), field: 'estimated_market_share' },
    photoUrl: { type: DataTypes.TEXT, field: 'photo_url' },
    impactLevel: { type: DataTypes.STRING(10), defaultValue: 'medium', field: 'impact_level' },
    actionRequired: { type: DataTypes.TEXT, field: 'action_required' },
    actionTaken: { type: DataTypes.TEXT, field: 'action_taken' },
    resolved: { type: DataTypes.BOOLEAN, defaultValue: false },
    tags: { type: DataTypes.JSONB, defaultValue: [] },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, { tableName: 'sfa_competitor_activities', timestamps: true, underscored: true });

  SfaCompetitorActivity.associate = (models) => {
    SfaCompetitorActivity.belongsTo(models.SfaVisit, { foreignKey: 'visit_id', as: 'visit' });
    SfaCompetitorActivity.belongsTo(models.SfaTerritory, { foreignKey: 'territory_id', as: 'territory' });
  };
  return SfaCompetitorActivity;
};
