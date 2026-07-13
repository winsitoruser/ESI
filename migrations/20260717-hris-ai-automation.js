'use strict';

/** Humanify AI Center — automation rules, logs, copilot history */
module.exports = {
  async up(queryInterface, Sequelize) {
    const createIfMissing = async (table, def) => {
      try { await queryInterface.createTable(table, def); } catch (e) {
        if (!String(e.message).includes('already exists')) throw e;
      }
    };

    await createIfMissing('hris_automation_rules', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: { type: Sequelize.UUID, allowNull: true, field: 'tenant_id' },
      name: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      ruleType: { type: Sequelize.STRING(50), allowNull: false, field: 'rule_type' },
      triggerType: { type: Sequelize.STRING(50), allowNull: false, field: 'trigger_type' },
      triggerConfig: { type: Sequelize.JSONB, allowNull: false, defaultValue: {}, field: 'trigger_config' },
      actionConfig: { type: Sequelize.JSONB, allowNull: false, defaultValue: {}, field: 'action_config' },
      priority: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 50 },
      cooldownMinutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 60, field: 'cooldown_minutes' },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' },
      triggerCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, field: 'trigger_count' },
      successCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, field: 'success_count' },
      lastTriggeredAt: { type: Sequelize.DATE, allowNull: true, field: 'last_triggered_at' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' },
    });

    await createIfMissing('hris_automation_logs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      ruleId: { type: Sequelize.UUID, allowNull: false, field: 'rule_id' },
      tenantId: { type: Sequelize.UUID, allowNull: true, field: 'tenant_id' },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'success' },
      triggerData: { type: Sequelize.JSONB, allowNull: true, field: 'trigger_data' },
      actionResult: { type: Sequelize.JSONB, allowNull: true, field: 'action_result' },
      executionTimeMs: { type: Sequelize.INTEGER, allowNull: true, field: 'execution_time_ms' },
      executedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'executed_at' },
    });

    await createIfMissing('hris_ai_conversations', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: { type: Sequelize.UUID, allowNull: true, field: 'tenant_id' },
      userId: { type: Sequelize.UUID, allowNull: true, field: 'user_id' },
      role: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'user' },
      message: { type: Sequelize.TEXT, allowNull: false },
      contextModule: { type: Sequelize.STRING(50), allowNull: true, field: 'context_module' },
      source: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'rules' },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
    });

    try {
      await queryInterface.addIndex('hris_automation_rules', ['tenant_id', 'rule_type'], { name: 'idx_hris_auto_rule_type' });
      await queryInterface.addIndex('hris_automation_logs', ['rule_id'], { name: 'idx_hris_auto_log_rule' });
      await queryInterface.addIndex('hris_ai_conversations', ['tenant_id', 'user_id'], { name: 'idx_hris_ai_conv_user' });
    } catch { /* indexes may exist */ }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hris_ai_conversations');
    await queryInterface.dropTable('hris_automation_logs');
    await queryInterface.dropTable('hris_automation_rules');
  },
};
