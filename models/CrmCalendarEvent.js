const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmCalendarEvent = sequelize.define('CrmCalendarEvent', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    title: { type: DataTypes.STRING(300), allowNull: false },
    description: { type: DataTypes.TEXT },
    eventType: { type: DataTypes.STRING(30), field: 'event_type' },
    status: { type: DataTypes.STRING(20), defaultValue: 'scheduled' },
    startTime: { type: DataTypes.DATE, allowNull: false, field: 'start_time' },
    endTime: { type: DataTypes.DATE, allowNull: false, field: 'end_time' },
    allDay: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'all_day' },
    timezone: { type: DataTypes.STRING(50), defaultValue: 'Asia/Jakarta' },
    location: { type: DataTypes.STRING(300) },
    isVirtual: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_virtual' },
    meetingUrl: { type: DataTypes.STRING(500), field: 'meeting_url' },
    customerId: { type: DataTypes.UUID, field: 'customer_id' },
    contactId: { type: DataTypes.UUID, field: 'contact_id' },
    opportunityId: { type: DataTypes.UUID, field: 'opportunity_id' },
    taskId: { type: DataTypes.UUID, field: 'task_id' },
    organizerId: { type: DataTypes.INTEGER, field: 'organizer_id' },
    attendees: { type: DataTypes.JSONB, defaultValue: [] },
    isRecurring: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_recurring' },
    recurrenceRule: { type: DataTypes.JSONB, field: 'recurrence_rule' },
    reminders: { type: DataTypes.JSONB, defaultValue: [{ minutes: 15 }] },
    outcome: { type: DataTypes.TEXT },
    color: { type: DataTypes.STRING(10) },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, {
    tableName: 'crm_calendar_events',
    timestamps: true,
    underscored: true
  });

  CrmCalendarEvent.associate = (models) => {
    CrmCalendarEvent.belongsTo(models.CrmCustomer, { foreignKey: 'customer_id', as: 'customer' });
  };

  return CrmCalendarEvent;
};
