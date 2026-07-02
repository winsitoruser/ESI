const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmFollowUp = sequelize.define('CrmFollowUp', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    customerId: { type: DataTypes.UUID, field: 'customer_id' },
    contactId: { type: DataTypes.UUID, field: 'contact_id' },
    title: { type: DataTypes.STRING(300), allowNull: false },
    description: { type: DataTypes.TEXT },
    followUpType: { type: DataTypes.STRING(30), field: 'follow_up_type' },
    priority: { type: DataTypes.STRING(10), defaultValue: 'medium' },
    status: { type: DataTypes.STRING(20), defaultValue: 'pending' },
    dueDate: { type: DataTypes.DATE, allowNull: false, field: 'due_date' },
    completedDate: { type: DataTypes.DATE, field: 'completed_date' },
    leadId: { type: DataTypes.UUID, field: 'lead_id' },
    opportunityId: { type: DataTypes.UUID, field: 'opportunity_id' },
    communicationId: { type: DataTypes.UUID, field: 'communication_id' },
    assignedTo: { type: DataTypes.INTEGER, field: 'assigned_to' },
    reminderSent: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'reminder_sent' },
    reminderMinutesBefore: { type: DataTypes.INTEGER, defaultValue: 30, field: 'reminder_minutes_before' },
    notes: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, {
    tableName: 'crm_follow_ups',
    timestamps: true,
    underscored: true
  });

  CrmFollowUp.associate = (models) => {
    CrmFollowUp.belongsTo(models.CrmCustomer, { foreignKey: 'customer_id', as: 'customer' });
  };

  return CrmFollowUp;
};
