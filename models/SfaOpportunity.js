const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaOpportunity = sequelize.define('SfaOpportunity', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    leadId: { type: DataTypes.UUID, field: 'lead_id' },
    opportunityNumber: { type: DataTypes.STRING(20), unique: true, field: 'opportunity_number' },
    title: { type: DataTypes.STRING(200), allowNull: false },
    customerName: { type: DataTypes.STRING(200), field: 'customer_name' },
    contactName: { type: DataTypes.STRING(200), field: 'contact_name' },
    contactEmail: { type: DataTypes.STRING(200), field: 'contact_email' },
    contactPhone: { type: DataTypes.STRING(30), field: 'contact_phone' },
    stage: { type: DataTypes.STRING(30), defaultValue: 'qualification' },
    status: { type: DataTypes.STRING(20), defaultValue: 'open' },
    priority: { type: DataTypes.STRING(10), defaultValue: 'medium' },
    probability: { type: DataTypes.INTEGER, defaultValue: 10 },
    expectedValue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'expected_value' },
    actualValue: { type: DataTypes.DECIMAL(15, 2), field: 'actual_value' },
    expectedCloseDate: { type: DataTypes.DATEONLY, field: 'expected_close_date' },
    actualCloseDate: { type: DataTypes.DATEONLY, field: 'actual_close_date' },
    territoryId: { type: DataTypes.UUID, field: 'territory_id' },
    source: { type: DataTypes.STRING(50) },
    productInterest: { type: DataTypes.TEXT, field: 'product_interest' },
    notes: { type: DataTypes.TEXT },
    nextAction: { type: DataTypes.STRING(200), field: 'next_action' },
    nextActionDate: { type: DataTypes.DATEONLY, field: 'next_action_date' },
    lostReason: { type: DataTypes.TEXT, field: 'lost_reason' },
    wonReason: { type: DataTypes.TEXT, field: 'won_reason' },
    lastActivityAt: { type: DataTypes.DATE, field: 'last_activity_at' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, {
    tableName: 'sfa_opportunities',
    timestamps: true,
    underscored: true
  });

  SfaOpportunity.associate = (models) => {
    SfaOpportunity.belongsTo(models.SfaLead, { foreignKey: 'lead_id', as: 'lead' });
    SfaOpportunity.belongsTo(models.SfaTerritory, { foreignKey: 'territory_id', as: 'territory' });
    SfaOpportunity.hasMany(models.SfaActivity, { foreignKey: 'opportunity_id', as: 'activities' });
    SfaOpportunity.hasMany(models.SfaQuotation, { foreignKey: 'opportunity_id', as: 'quotations' });
  };

  return SfaOpportunity;
};
