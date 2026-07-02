const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MktCampaignChannel = sequelize.define('MktCampaignChannel', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    campaignId: { type: DataTypes.UUID, allowNull: false, field: 'campaign_id' },
    channelType: { type: DataTypes.STRING(30), allowNull: false, field: 'channel_type' },
    channelName: { type: DataTypes.STRING(100), field: 'channel_name' },
    status: { type: DataTypes.STRING(20), defaultValue: 'active' },
    budgetAllocated: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'budget_allocated' },
    spent: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    impressions: { type: DataTypes.INTEGER, defaultValue: 0 },
    clicks: { type: DataTypes.INTEGER, defaultValue: 0 },
    conversions: { type: DataTypes.INTEGER, defaultValue: 0 },
    revenueGenerated: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'revenue_generated' },
    ctr: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
    cpc: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    cpa: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    content: { type: DataTypes.TEXT },
    contentUrl: { type: DataTypes.TEXT, field: 'content_url' },
    schedule: { type: DataTypes.JSONB, defaultValue: {} },
    metadata: { type: DataTypes.JSONB, defaultValue: {} }
  }, {
    tableName: 'mkt_campaign_channels',
    timestamps: true,
    underscored: true
  });

  MktCampaignChannel.associate = (models) => {
    MktCampaignChannel.belongsTo(models.MktCampaign, { foreignKey: 'campaign_id', as: 'campaign' });
  };

  return MktCampaignChannel;
};
