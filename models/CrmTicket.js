const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmTicket = sequelize.define('CrmTicket', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    ticketNumber: { type: DataTypes.STRING(20), unique: true, field: 'ticket_number' },
    customerId: { type: DataTypes.UUID, field: 'customer_id' },
    contactId: { type: DataTypes.UUID, field: 'contact_id' },
    subject: { type: DataTypes.STRING(300), allowNull: false },
    description: { type: DataTypes.TEXT },
    category: { type: DataTypes.STRING(50) },
    subcategory: { type: DataTypes.STRING(50) },
    priority: { type: DataTypes.STRING(10), defaultValue: 'medium' },
    status: { type: DataTypes.STRING(20), defaultValue: 'open' },
    severity: { type: DataTypes.STRING(10) },
    sourceChannel: { type: DataTypes.STRING(20), field: 'source_channel' },
    assignedTo: { type: DataTypes.INTEGER, field: 'assigned_to' },
    assignedTeam: { type: DataTypes.UUID, field: 'assigned_team' },
    escalationLevel: { type: DataTypes.INTEGER, defaultValue: 0, field: 'escalation_level' },
    slaPolicyId: { type: DataTypes.UUID, field: 'sla_policy_id' },
    firstResponseDue: { type: DataTypes.DATE, field: 'first_response_due' },
    firstResponseAt: { type: DataTypes.DATE, field: 'first_response_at' },
    resolutionDue: { type: DataTypes.DATE, field: 'resolution_due' },
    resolvedAt: { type: DataTypes.DATE, field: 'resolved_at' },
    slaBreached: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'sla_breached' },
    resolution: { type: DataTypes.TEXT },
    resolutionType: { type: DataTypes.STRING(30), field: 'resolution_type' },
    satisfactionRating: { type: DataTypes.INTEGER, field: 'satisfaction_rating' },
    satisfactionComment: { type: DataTypes.TEXT, field: 'satisfaction_comment' },
    tags: { type: DataTypes.JSONB, defaultValue: [] },
    attachments: { type: DataTypes.JSONB, defaultValue: [] },
    relatedTicketId: { type: DataTypes.UUID, field: 'related_ticket_id' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    closedBy: { type: DataTypes.INTEGER, field: 'closed_by' }
  }, {
    tableName: 'crm_tickets',
    timestamps: true,
    underscored: true
  });

  CrmTicket.associate = (models) => {
    CrmTicket.belongsTo(models.CrmCustomer, { foreignKey: 'customer_id', as: 'customer' });
    CrmTicket.hasMany(models.CrmTicketComment, { foreignKey: 'ticket_id', as: 'comments' });
    CrmTicket.belongsTo(models.CrmSlaPolicy, { foreignKey: 'sla_policy_id', as: 'slaPolicy' });
  };

  return CrmTicket;
};
