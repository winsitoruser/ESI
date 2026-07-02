const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaLead = sequelize.define('SfaLead', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    leadNumber: { type: DataTypes.STRING(20), unique: true, field: 'lead_number' },
    companyName: { type: DataTypes.STRING(200), field: 'company_name' },
    contactName: { type: DataTypes.STRING(200), allowNull: false, field: 'contact_name' },
    contactEmail: { type: DataTypes.STRING(200), field: 'contact_email' },
    contactPhone: { type: DataTypes.STRING(30), field: 'contact_phone' },
    contactTitle: { type: DataTypes.STRING(100), field: 'contact_title' },
    industry: { type: DataTypes.STRING(100) },
    companySize: { type: DataTypes.STRING(30), field: 'company_size' },
    source: { type: DataTypes.STRING(50), defaultValue: 'manual' },
    status: { type: DataTypes.STRING(20), defaultValue: 'new' },
    priority: { type: DataTypes.STRING(10), defaultValue: 'medium' },
    score: { type: DataTypes.INTEGER, defaultValue: 0 },
    estimatedValue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'estimated_value' },
    territoryId: { type: DataTypes.UUID, field: 'territory_id' },
    address: { type: DataTypes.TEXT },
    city: { type: DataTypes.STRING(100) },
    province: { type: DataTypes.STRING(100) },
    notes: { type: DataTypes.TEXT },
    tags: { type: DataTypes.JSONB, defaultValue: [] },
    customFields: { type: DataTypes.JSONB, defaultValue: {}, field: 'custom_fields' },
    nextFollowUp: { type: DataTypes.DATE, field: 'next_follow_up' },
    lastActivityAt: { type: DataTypes.DATE, field: 'last_activity_at' },
    convertedAt: { type: DataTypes.DATE, field: 'converted_at' },
    lostReason: { type: DataTypes.TEXT, field: 'lost_reason' },
    campaignId: { type: DataTypes.UUID, field: 'campaign_id' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, {
    tableName: 'sfa_leads',
    timestamps: true,
    underscored: true
  });

  SfaLead.associate = (models) => {
    SfaLead.belongsTo(models.SfaTerritory, { foreignKey: 'territory_id', as: 'territory' });
    SfaLead.hasMany(models.SfaOpportunity, { foreignKey: 'lead_id', as: 'opportunities' });
    SfaLead.hasMany(models.SfaActivity, { foreignKey: 'lead_id', as: 'activities' });
    SfaLead.hasMany(models.SfaVisit, { foreignKey: 'lead_id', as: 'visits' });
    if (models.MktCampaign) {
      SfaLead.belongsTo(models.MktCampaign, { foreignKey: 'campaign_id', as: 'campaign' });
    }
  };

  return SfaLead;
};
