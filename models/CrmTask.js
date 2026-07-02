const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmTask = sequelize.define('CrmTask', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    taskNumber: { type: DataTypes.STRING(20), field: 'task_number' },
    title: { type: DataTypes.STRING(300), allowNull: false },
    description: { type: DataTypes.TEXT },
    taskType: { type: DataTypes.STRING(30), field: 'task_type' },
    priority: { type: DataTypes.STRING(10), defaultValue: 'medium' },
    status: { type: DataTypes.STRING(20), defaultValue: 'open' },
    dueDate: { type: DataTypes.DATE, field: 'due_date' },
    startDate: { type: DataTypes.DATE, field: 'start_date' },
    completedDate: { type: DataTypes.DATE, field: 'completed_date' },
    customerId: { type: DataTypes.UUID, field: 'customer_id' },
    contactId: { type: DataTypes.UUID, field: 'contact_id' },
    leadId: { type: DataTypes.UUID, field: 'lead_id' },
    opportunityId: { type: DataTypes.UUID, field: 'opportunity_id' },
    ticketId: { type: DataTypes.UUID, field: 'ticket_id' },
    assignedTo: { type: DataTypes.INTEGER, field: 'assigned_to' },
    assignedTeam: { type: DataTypes.UUID, field: 'assigned_team' },
    isRecurring: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_recurring' },
    recurrencePattern: { type: DataTypes.JSONB, field: 'recurrence_pattern' },
    parentTaskId: { type: DataTypes.UUID, field: 'parent_task_id' },
    estimatedHours: { type: DataTypes.DECIMAL(5, 2), field: 'estimated_hours' },
    actualHours: { type: DataTypes.DECIMAL(5, 2), field: 'actual_hours' },
    tags: { type: DataTypes.JSONB, defaultValue: [] },
    checklist: { type: DataTypes.JSONB, defaultValue: [] },
    result: { type: DataTypes.TEXT },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, {
    tableName: 'crm_tasks',
    timestamps: true,
    underscored: true
  });

  CrmTask.associate = (models) => {
    CrmTask.belongsTo(models.CrmCustomer, { foreignKey: 'customer_id', as: 'customer' });
    CrmTask.belongsTo(models.CrmContact, { foreignKey: 'contact_id', as: 'contact' });
  };

  return CrmTask;
};
