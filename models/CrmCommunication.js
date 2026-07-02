const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmCommunication = sequelize.define('CrmCommunication', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    commNumber: { type: DataTypes.STRING(30), field: 'comm_number' },
    customerId: { type: DataTypes.UUID, field: 'customer_id' },
    contactId: { type: DataTypes.UUID, field: 'contact_id' },
    commType: { type: DataTypes.STRING(20), allowNull: false, field: 'comm_type' },
    direction: { type: DataTypes.STRING(10) },
    status: { type: DataTypes.STRING(20), defaultValue: 'completed' },
    subject: { type: DataTypes.STRING(300) },
    body: { type: DataTypes.TEXT },
    callDuration: { type: DataTypes.INTEGER, field: 'call_duration' },
    callRecordingUrl: { type: DataTypes.STRING(500), field: 'call_recording_url' },
    emailFrom: { type: DataTypes.STRING(200), field: 'email_from' },
    emailTo: { type: DataTypes.JSONB, defaultValue: [], field: 'email_to' },
    emailCc: { type: DataTypes.JSONB, defaultValue: [], field: 'email_cc' },
    emailOpened: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'email_opened' },
    emailClicked: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'email_clicked' },
    meetingLocation: { type: DataTypes.STRING(300), field: 'meeting_location' },
    meetingStart: { type: DataTypes.DATE, field: 'meeting_start' },
    meetingEnd: { type: DataTypes.DATE, field: 'meeting_end' },
    meetingAttendees: { type: DataTypes.JSONB, defaultValue: [], field: 'meeting_attendees' },
    leadId: { type: DataTypes.UUID, field: 'lead_id' },
    opportunityId: { type: DataTypes.UUID, field: 'opportunity_id' },
    campaignId: { type: DataTypes.UUID, field: 'campaign_id' },
    templateId: { type: DataTypes.UUID, field: 'template_id' },
    outcome: { type: DataTypes.STRING(50) },
    nextAction: { type: DataTypes.STRING(200), field: 'next_action' },
    attachments: { type: DataTypes.JSONB, defaultValue: [] },
    metadata: { type: DataTypes.JSONB, defaultValue: {} },
    scheduledAt: { type: DataTypes.DATE, field: 'scheduled_at' },
    completedAt: { type: DataTypes.DATE, field: 'completed_at' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, {
    tableName: 'crm_communications',
    timestamps: true,
    underscored: true
  });

  CrmCommunication.associate = (models) => {
    CrmCommunication.belongsTo(models.CrmCustomer, { foreignKey: 'customer_id', as: 'customer' });
    CrmCommunication.belongsTo(models.CrmContact, { foreignKey: 'contact_id', as: 'contact' });
  };

  return CrmCommunication;
};
