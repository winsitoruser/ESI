const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmCommCampaign = sequelize.define('CrmCommCampaign', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    name: { type: DataTypes.STRING(200), allowNull: false },
    campaignType: { type: DataTypes.STRING(30), field: 'campaign_type' },
    status: { type: DataTypes.STRING(20), defaultValue: 'draft' },
    templateId: { type: DataTypes.UUID, field: 'template_id' },
    segmentId: { type: DataTypes.UUID, field: 'segment_id' },
    scheduledStart: { type: DataTypes.DATE, field: 'scheduled_start' },
    scheduledEnd: { type: DataTypes.DATE, field: 'scheduled_end' },
    totalRecipients: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_recipients' },
    totalSent: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_sent' },
    totalOpened: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_opened' },
    totalClicked: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_clicked' },
    totalReplied: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_replied' },
    totalBounced: { type: DataTypes.INTEGER, defaultValue: 0, field: 'total_bounced' },
    settings: { type: DataTypes.JSONB, defaultValue: {} },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, {
    tableName: 'crm_comm_campaigns',
    timestamps: true,
    underscored: true
  });

  return CrmCommCampaign;
};
