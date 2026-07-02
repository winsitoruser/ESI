const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmTaskTemplate = sequelize.define('CrmTaskTemplate', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    taskType: { type: DataTypes.STRING(30), field: 'task_type' },
    defaultPriority: { type: DataTypes.STRING(10), defaultValue: 'medium', field: 'default_priority' },
    dueDaysOffset: { type: DataTypes.INTEGER, defaultValue: 1, field: 'due_days_offset' },
    checklistTemplate: { type: DataTypes.JSONB, defaultValue: [], field: 'checklist_template' },
    autoAssignRole: { type: DataTypes.STRING(50), field: 'auto_assign_role' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    usageCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'usage_count' }
  }, {
    tableName: 'crm_task_templates',
    timestamps: true,
    underscored: true
  });

  return CrmTaskTemplate;
};
