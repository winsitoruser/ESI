const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmAutomationRule = sequelize.define('CrmAutomationRule', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tenantId: { type: DataTypes.UUID, field: 'tenant_id' },
    name: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT },
    ruleType: { type: DataTypes.STRING(30), field: 'rule_type' },
    triggerEvent: { type: DataTypes.STRING(50), field: 'trigger_event' },
    triggerEntity: { type: DataTypes.STRING(30), field: 'trigger_entity' },
    triggerConditions: { type: DataTypes.JSONB, defaultValue: [], field: 'trigger_conditions' },
    actions: { type: DataTypes.JSONB, defaultValue: [] },
    scheduleCron: { type: DataTypes.STRING(50), field: 'schedule_cron' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
    executionCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'execution_count' },
    lastExecutedAt: { type: DataTypes.DATE, field: 'last_executed_at' },
    errorCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'error_count' },
    priority: { type: DataTypes.INTEGER, defaultValue: 0 },
    stopOnMatch: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'stop_on_match' },
    createdBy: { type: DataTypes.INTEGER, field: 'created_by' }
  }, {
    tableName: 'crm_automation_rules',
    timestamps: true,
    underscored: true
  });

  CrmAutomationRule.associate = (models) => {
    CrmAutomationRule.hasMany(models.CrmAutomationLog, { foreignKey: 'rule_id', as: 'logs' });
  };

  return CrmAutomationRule;
};
