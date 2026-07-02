const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CrmAutomationLog = sequelize.define('CrmAutomationLog', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ruleId: { type: DataTypes.UUID, field: 'rule_id' },
    triggerEvent: { type: DataTypes.STRING(50), field: 'trigger_event' },
    entityType: { type: DataTypes.STRING(30), field: 'entity_type' },
    entityId: { type: DataTypes.UUID, field: 'entity_id' },
    status: { type: DataTypes.STRING(20) },
    actionsExecuted: { type: DataTypes.JSONB, defaultValue: [], field: 'actions_executed' },
    errorMessage: { type: DataTypes.TEXT, field: 'error_message' },
    executionTimeMs: { type: DataTypes.INTEGER, field: 'execution_time_ms' }
  }, {
    tableName: 'crm_automation_logs',
    timestamps: true,
    underscored: true,
    updatedAt: false
  });

  CrmAutomationLog.associate = (models) => {
    CrmAutomationLog.belongsTo(models.CrmAutomationRule, { foreignKey: 'rule_id', as: 'rule' });
  };

  return CrmAutomationLog;
};
