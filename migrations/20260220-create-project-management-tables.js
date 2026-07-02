'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. pjm_projects
    await queryInterface.createTable('pjm_projects', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true },
      project_code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT },
      category: { type: Sequelize.STRING(50) },
      status: { type: Sequelize.STRING(30), defaultValue: 'planning' },
      priority: { type: Sequelize.STRING(20), defaultValue: 'normal' },
      start_date: { type: Sequelize.DATEONLY },
      end_date: { type: Sequelize.DATEONLY },
      actual_start_date: { type: Sequelize.DATEONLY },
      actual_end_date: { type: Sequelize.DATEONLY },
      progress_percent: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 },
      budget_amount: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      actual_cost: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      currency: { type: Sequelize.STRING(10), defaultValue: 'IDR' },
      manager_id: { type: Sequelize.INTEGER },
      manager_name: { type: Sequelize.STRING(100) },
      department: { type: Sequelize.STRING(100) },
      client_name: { type: Sequelize.STRING(200) },
      tags: { type: Sequelize.JSONB, defaultValue: [] },
      custom_fields: { type: Sequelize.JSONB, defaultValue: {} },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 2. pjm_tasks
    await queryInterface.createTable('pjm_tasks', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      project_id: { type: Sequelize.UUID, references: { model: 'pjm_projects', key: 'id' }, onDelete: 'CASCADE' },
      milestone_id: { type: Sequelize.UUID },
      parent_task_id: { type: Sequelize.UUID },
      task_code: { type: Sequelize.STRING(50), unique: true },
      name: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT },
      status: { type: Sequelize.STRING(30), defaultValue: 'todo' },
      priority: { type: Sequelize.STRING(20), defaultValue: 'normal' },
      task_type: { type: Sequelize.STRING(30), defaultValue: 'task' },
      assignee_id: { type: Sequelize.INTEGER },
      assignee_name: { type: Sequelize.STRING(100) },
      start_date: { type: Sequelize.DATEONLY },
      due_date: { type: Sequelize.DATEONLY },
      completed_date: { type: Sequelize.DATEONLY },
      estimated_hours: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      actual_hours: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      progress_percent: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 },
      dependencies: { type: Sequelize.JSONB, defaultValue: [] },
      tags: { type: Sequelize.JSONB, defaultValue: [] },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 3. pjm_milestones
    await queryInterface.createTable('pjm_milestones', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      project_id: { type: Sequelize.UUID, references: { model: 'pjm_projects', key: 'id' }, onDelete: 'CASCADE' },
      name: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT },
      status: { type: Sequelize.STRING(30), defaultValue: 'pending' },
      due_date: { type: Sequelize.DATEONLY },
      completed_date: { type: Sequelize.DATEONLY },
      deliverables: { type: Sequelize.JSONB, defaultValue: [] },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 4. pjm_timesheets
    await queryInterface.createTable('pjm_timesheets', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      project_id: { type: Sequelize.UUID, references: { model: 'pjm_projects', key: 'id' }, onDelete: 'CASCADE' },
      task_id: { type: Sequelize.UUID },
      employee_id: { type: Sequelize.INTEGER },
      employee_name: { type: Sequelize.STRING(100) },
      work_date: { type: Sequelize.DATEONLY, allowNull: false },
      hours_worked: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
      overtime_hours: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 },
      hourly_rate: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      total_cost: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      description: { type: Sequelize.TEXT },
      status: { type: Sequelize.STRING(20), defaultValue: 'draft' },
      approved_by: { type: Sequelize.INTEGER },
      approved_at: { type: Sequelize.DATE },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 5. pjm_resources
    await queryInterface.createTable('pjm_resources', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      project_id: { type: Sequelize.UUID, references: { model: 'pjm_projects', key: 'id' }, onDelete: 'CASCADE' },
      resource_name: { type: Sequelize.STRING(100), allowNull: false },
      resource_type: { type: Sequelize.STRING(30), defaultValue: 'human' },
      role: { type: Sequelize.STRING(100) },
      employee_id: { type: Sequelize.INTEGER },
      allocation_percent: { type: Sequelize.DECIMAL(5, 2), defaultValue: 100 },
      start_date: { type: Sequelize.DATEONLY },
      end_date: { type: Sequelize.DATEONLY },
      cost_per_hour: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      total_cost: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 6. pjm_risks
    await queryInterface.createTable('pjm_risks', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      project_id: { type: Sequelize.UUID, references: { model: 'pjm_projects', key: 'id' }, onDelete: 'CASCADE' },
      risk_code: { type: Sequelize.STRING(50), unique: true },
      title: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT },
      category: { type: Sequelize.STRING(50) },
      probability: { type: Sequelize.STRING(20), defaultValue: 'medium' },
      impact: { type: Sequelize.STRING(20), defaultValue: 'medium' },
      risk_score: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 },
      status: { type: Sequelize.STRING(30), defaultValue: 'identified' },
      owner_id: { type: Sequelize.INTEGER },
      owner_name: { type: Sequelize.STRING(100) },
      mitigation_plan: { type: Sequelize.TEXT },
      contingency_plan: { type: Sequelize.TEXT },
      identified_date: { type: Sequelize.DATEONLY },
      resolved_date: { type: Sequelize.DATEONLY },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 7. pjm_budgets
    await queryInterface.createTable('pjm_budgets', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      project_id: { type: Sequelize.UUID, references: { model: 'pjm_projects', key: 'id' }, onDelete: 'CASCADE' },
      category: { type: Sequelize.STRING(50), allowNull: false },
      description: { type: Sequelize.TEXT },
      planned_amount: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      actual_amount: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      committed_amount: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 8. pjm_documents
    await queryInterface.createTable('pjm_documents', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      project_id: { type: Sequelize.UUID, references: { model: 'pjm_projects', key: 'id' }, onDelete: 'CASCADE' },
      title: { type: Sequelize.STRING(200), allowNull: false },
      document_type: { type: Sequelize.STRING(50) },
      file_url: { type: Sequelize.TEXT },
      file_name: { type: Sequelize.STRING(200) },
      file_size: { type: Sequelize.INTEGER },
      version: { type: Sequelize.STRING(20), defaultValue: '1.0' },
      uploaded_by: { type: Sequelize.INTEGER },
      uploaded_by_name: { type: Sequelize.STRING(100) },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    // 9. pjm_settings
    await queryInterface.createTable('pjm_settings', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      setting_key: { type: Sequelize.STRING(100), allowNull: false },
      setting_value: { type: Sequelize.JSONB },
      description: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('pjm_settings');
    await queryInterface.dropTable('pjm_documents');
    await queryInterface.dropTable('pjm_budgets');
    await queryInterface.dropTable('pjm_risks');
    await queryInterface.dropTable('pjm_resources');
    await queryInterface.dropTable('pjm_timesheets');
    await queryInterface.dropTable('pjm_milestones');
    await queryInterface.dropTable('pjm_tasks');
    await queryInterface.dropTable('pjm_projects');
  }
};
