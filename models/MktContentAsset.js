const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MktContentAsset = sequelize.define('MktContentAsset', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    campaignId: { type: DataTypes.UUID, field: 'campaign_id' },
    title: { type: DataTypes.STRING(200), allowNull: false },
    assetType: { type: DataTypes.STRING(30), defaultValue: 'image', field: 'asset_type' },
    fileUrl: { type: DataTypes.TEXT, field: 'file_url' },
    fileName: { type: DataTypes.STRING(200), field: 'file_name' },
    fileSize: { type: DataTypes.INTEGER, field: 'file_size' },
    mimeType: { type: DataTypes.STRING(100), field: 'mime_type' },
    description: { type: DataTypes.TEXT },
    tags: { type: DataTypes.JSONB, defaultValue: [] },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, {
    tableName: 'mkt_content_assets',
    timestamps: true,
    underscored: true
  });

  MktContentAsset.associate = (models) => {
    MktContentAsset.belongsTo(models.MktCampaign, { foreignKey: 'campaign_id', as: 'campaign' });
  };

  return MktContentAsset;
};
