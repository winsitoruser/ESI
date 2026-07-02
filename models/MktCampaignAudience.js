const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MktCampaignAudience = sequelize.define('MktCampaignAudience', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    campaignId: { type: DataTypes.UUID, allowNull: false, field: 'campaign_id' },
    segmentId: { type: DataTypes.UUID, field: 'segment_id' },
    customerId: { type: DataTypes.UUID, field: 'customer_id' },
    status: { type: DataTypes.STRING(20), defaultValue: 'active' },
    sentAt: { type: DataTypes.DATE, field: 'sent_at' },
    openedAt: { type: DataTypes.DATE, field: 'opened_at' },
    clickedAt: { type: DataTypes.DATE, field: 'clicked_at' },
    convertedAt: { type: DataTypes.DATE, field: 'converted_at' }
  }, {
    tableName: 'mkt_campaign_audiences',
    timestamps: true,
    underscored: true
  });

  MktCampaignAudience.associate = (models) => {
    MktCampaignAudience.belongsTo(models.MktCampaign, { foreignKey: 'campaign_id', as: 'campaign' });
    MktCampaignAudience.belongsTo(models.MktSegment, { foreignKey: 'segment_id', as: 'segment' });
  };

  return MktCampaignAudience;
};
