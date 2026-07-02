const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SfaActivity = sequelize.define('SfaActivity', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    leadId: { type: DataTypes.UUID, field: 'lead_id' },
    opportunityId: { type: DataTypes.UUID, field: 'opportunity_id' },
    activityType: { type: DataTypes.STRING(30), allowNull: false, field: 'activity_type' },
    subject: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    status: { type: DataTypes.STRING(20), defaultValue: 'planned' },
    priority: { type: DataTypes.STRING(10), defaultValue: 'medium' },
    activityDate: { type: DataTypes.DATE, field: 'activity_date' },
    durationMinutes: { type: DataTypes.INTEGER, field: 'duration_minutes' },
    location: { type: DataTypes.STRING(300) },
    contactName: { type: DataTypes.STRING(200), field: 'contact_name' },
    contactPhone: { type: DataTypes.STRING(30), field: 'contact_phone' },
    outcome: { type: DataTypes.STRING(30) },
    outcomeNotes: { type: DataTypes.TEXT, field: 'outcome_notes' },
    assignedTo: { type: DataTypes.INTEGER, field: 'assigned_to' },
    completedAt: { type: DataTypes.DATE, field: 'completed_at' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, field: 'updated_by' }
  }, {
    tableName: 'sfa_activities',
    timestamps: true,
    underscored: true
  });

  SfaActivity.associate = (models) => {
    SfaActivity.belongsTo(models.SfaLead, { foreignKey: 'lead_id', as: 'lead' });
    SfaActivity.belongsTo(models.SfaOpportunity, { foreignKey: 'opportunity_id', as: 'opportunity' });
  };

  return SfaActivity;
};
