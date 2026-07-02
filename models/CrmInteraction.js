const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmInteraction = sequelize.define('CrmInteraction', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    customerId: { type: DataTypes.UUID, field: 'customer_id' },
    contactId: { type: DataTypes.UUID, field: 'contact_id' },
    interactionType: { type: DataTypes.STRING(30), allowNull: false, field: 'interaction_type' },
    direction: { type: DataTypes.STRING(10) },
    subject: { type: DataTypes.STRING(300) },
    description: { type: DataTypes.TEXT },
    outcome: { type: DataTypes.STRING(50) },
    durationMinutes: { type: DataTypes.INTEGER, field: 'duration_minutes' },
    interactionDate: { type: DataTypes.DATE, field: 'interaction_date' },
    leadId: { type: DataTypes.UUID, field: 'lead_id' },
    opportunityId: { type: DataTypes.UUID, field: 'opportunity_id' },
    ticketId: { type: DataTypes.UUID, field: 'ticket_id' },
    sentiment: { type: DataTypes.STRING(20) },
    sentimentScore: { type: DataTypes.DECIMAL(3, 2), field: 'sentiment_score' },
    channel: { type: DataTypes.STRING(30) },
    metadata: { type: DataTypes.JSONB, defaultValue: {} },
    attachments: { type: DataTypes.JSONB, defaultValue: [] },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, {
    tableName: 'crm_interactions',
    timestamps: true,
    underscored: true
  });

  CrmInteraction.associate = (models) => {
    CrmInteraction.belongsTo(models.CrmCustomer, { foreignKey: 'customer_id', as: 'customer' });
    CrmInteraction.belongsTo(models.CrmContact, { foreignKey: 'contact_id', as: 'contact' });
  };

  return CrmInteraction;
};
