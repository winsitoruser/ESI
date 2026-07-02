const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MktCampaign = sequelize.define('MktCampaign', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    campaignNumber: { type: DataTypes.STRING(30), unique: true, field: 'campaign_number' },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    objective: { type: DataTypes.STRING(50), defaultValue: 'brand_awareness' },
    campaignType: { type: DataTypes.STRING(30), defaultValue: 'multi_channel', field: 'campaign_type' },
    status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
    priority: { type: DataTypes.STRING(10), defaultValue: 'medium' },
    startDate: { type: DataTypes.DATEONLY, field: 'start_date' },
    endDate: { type: DataTypes.DATEONLY, field: 'end_date' },
    budget: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    spent: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    targetAudience: { type: DataTypes.TEXT, field: 'target_audience' },
    targetReach: { type: DataTypes.INTEGER, defaultValue: 0, field: 'target_reach' },
    actualReach: { type: DataTypes.INTEGER, defaultValue: 0, field: 'actual_reach' },
    targetConversions: { type: DataTypes.INTEGER, defaultValue: 0, field: 'target_conversions' },
    actualConversions: { type: DataTypes.INTEGER, defaultValue: 0, field: 'actual_conversions' },
    targetRevenue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'target_revenue' },
    actualRevenue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'actual_revenue' },
    roi: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    tags: { type: DataTypes.JSONB, defaultValue: [] },
    branchIds: { type: DataTypes.JSONB, defaultValue: [], field: 'branch_ids' },
    territoryIds: { type: DataTypes.JSONB, defaultValue: [], field: 'territory_ids' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, {
    tableName: 'mkt_campaigns',
    timestamps: true,
    underscored: true
  });

  MktCampaign.associate = (models) => {
    MktCampaign.hasMany(models.MktCampaignChannel, { foreignKey: 'campaign_id', as: 'channels' });
    MktCampaign.hasMany(models.MktPromotion, { foreignKey: 'campaign_id', as: 'promotions' });
    MktCampaign.hasMany(models.MktContentAsset, { foreignKey: 'campaign_id', as: 'contentAssets' });
    MktCampaign.hasMany(models.MktCampaignAudience, { foreignKey: 'campaign_id', as: 'audiences' });
    if (models.SfaLead) {
      MktCampaign.hasMany(models.SfaLead, { foreignKey: 'campaign_id', as: 'leads' });
    }
  };

  return MktCampaign;
};
