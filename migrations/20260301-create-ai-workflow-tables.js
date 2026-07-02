'use strict';

/**
 * Migration: Create AI Workflow Tables for CRM/SFA
 * 
 * Tables:
 * 1. ai_models - Available AI model configurations
 * 2. ai_workflows - Workflow definitions (lead scoring, forecasting, etc.)
 * 3. ai_executions - Execution history and results
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const ct = async (t) => {
      const tables = await queryInterface.showAllTables();
      return tables.includes(t);
    };

    // 1. AI Models - configurable model providers
    if (!(await ct('ai_models'))) {
      await queryInterface.createTable('ai_models', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
        code: { type: Sequelize.STRING(50), allowNull: false },
        name: { type: Sequelize.STRING(100), allowNull: false },
        provider: { type: Sequelize.STRING(50), allowNull: false }, // openai, anthropic, google, local
        model_id: { type: Sequelize.STRING(100), allowNull: false }, // gpt-4o, claude-3.5-sonnet, gemini-pro
        description: { type: Sequelize.TEXT },
        capabilities: { type: Sequelize.JSONB, defaultValue: '[]' }, // ['text', 'vision', 'function_calling']
        config: { type: Sequelize.JSONB, defaultValue: '{}' }, // temperature, max_tokens, etc.
        api_key_ref: { type: Sequelize.STRING(200) }, // encrypted key reference or env var name
        is_default: { type: Sequelize.BOOLEAN, defaultValue: false },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        cost_per_1k_input: { type: Sequelize.DECIMAL(10, 6), defaultValue: 0 },
        cost_per_1k_output: { type: Sequelize.DECIMAL(10, 6), defaultValue: 0 },
        max_context_tokens: { type: Sequelize.INTEGER, defaultValue: 128000 },
        metadata: { type: Sequelize.JSONB, defaultValue: '{}' },
        created_by: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('ai_models', ['tenant_id'], { name: 'idx_ai_models_tenant' });
      await queryInterface.addIndex('ai_models', ['provider'], { name: 'idx_ai_models_provider' });
    }

    // 2. AI Workflows - workflow definitions
    if (!(await ct('ai_workflows'))) {
      await queryInterface.createTable('ai_workflows', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
        code: { type: Sequelize.STRING(50), allowNull: false },
        name: { type: Sequelize.STRING(150), allowNull: false },
        description: { type: Sequelize.TEXT },
        category: { type: Sequelize.STRING(50), defaultValue: 'general' }, // lead_scoring, forecasting, segmentation, recommendation, analysis
        module: { type: Sequelize.STRING(20), defaultValue: 'crm' }, // crm, sfa, both
        ai_model_id: { type: Sequelize.UUID, references: { model: 'ai_models', key: 'id' }, onDelete: 'SET NULL' },
        system_prompt: { type: Sequelize.TEXT },
        user_prompt_template: { type: Sequelize.TEXT }, // template with {{variables}}
        input_schema: { type: Sequelize.JSONB, defaultValue: '{}' }, // expected input fields
        output_schema: { type: Sequelize.JSONB, defaultValue: '{}' }, // expected output format
        tools: { type: Sequelize.JSONB, defaultValue: '[]' }, // function calling tools
        trigger_type: { type: Sequelize.STRING(30), defaultValue: 'manual' }, // manual, scheduled, event
        trigger_config: { type: Sequelize.JSONB, defaultValue: '{}' }, // cron, event name, etc.
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        sort_order: { type: Sequelize.INTEGER, defaultValue: 0 },
        execution_count: { type: Sequelize.INTEGER, defaultValue: 0 },
        avg_execution_time_ms: { type: Sequelize.INTEGER, defaultValue: 0 },
        metadata: { type: Sequelize.JSONB, defaultValue: '{}' },
        created_by: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('ai_workflows', ['tenant_id'], { name: 'idx_ai_workflows_tenant' });
      await queryInterface.addIndex('ai_workflows', ['category'], { name: 'idx_ai_workflows_category' });
      await queryInterface.addIndex('ai_workflows', ['module'], { name: 'idx_ai_workflows_module' });
    }

    // 3. AI Executions - execution log
    if (!(await ct('ai_executions'))) {
      await queryInterface.createTable('ai_executions', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'CASCADE' },
        workflow_id: { type: Sequelize.UUID, references: { model: 'ai_workflows', key: 'id' }, onDelete: 'CASCADE' },
        ai_model_id: { type: Sequelize.UUID, references: { model: 'ai_models', key: 'id' }, onDelete: 'SET NULL' },
        triggered_by: { type: Sequelize.INTEGER }, // user id
        trigger_type: { type: Sequelize.STRING(30) }, // manual, scheduled, event
        status: { type: Sequelize.STRING(20), defaultValue: 'pending' }, // pending, running, completed, failed
        input_data: { type: Sequelize.JSONB },
        output_data: { type: Sequelize.JSONB },
        error_message: { type: Sequelize.TEXT },
        input_tokens: { type: Sequelize.INTEGER, defaultValue: 0 },
        output_tokens: { type: Sequelize.INTEGER, defaultValue: 0 },
        total_cost: { type: Sequelize.DECIMAL(10, 6), defaultValue: 0 },
        execution_time_ms: { type: Sequelize.INTEGER, defaultValue: 0 },
        entity_type: { type: Sequelize.STRING(50) }, // which entity was processed
        entity_id: { type: Sequelize.STRING(255) },
        metadata: { type: Sequelize.JSONB, defaultValue: '{}' },
        started_at: { type: Sequelize.DATE },
        completed_at: { type: Sequelize.DATE },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('ai_executions', ['tenant_id'], { name: 'idx_ai_executions_tenant' });
      await queryInterface.addIndex('ai_executions', ['workflow_id'], { name: 'idx_ai_executions_workflow' });
      await queryInterface.addIndex('ai_executions', ['status'], { name: 'idx_ai_executions_status' });
      await queryInterface.addIndex('ai_executions', ['created_at'], { name: 'idx_ai_executions_created' });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ai_executions').catch(() => {});
    await queryInterface.dropTable('ai_workflows').catch(() => {});
    await queryInterface.dropTable('ai_models').catch(() => {});
  }
};
