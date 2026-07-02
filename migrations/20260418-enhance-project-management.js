'use strict';

/**
 * Enhancement: Comprehensive Project Management Integration
 *
 * 1) Extend existing PJM tables with integration FK columns:
 *    - branch_id, customer_id, manager_user_id, assignee_user_id
 *    - hris_employee_id links for HRIS integration
 *    - PO / asset / fleet / sprint reference columns
 *    - EVM / status / RAG fields
 *
 * 2) Add 7 new tables for advanced PM features:
 *    - pjm_sprints          (agile sprints / iterations)
 *    - pjm_comments         (threaded comments on project/task)
 *    - pjm_activity_log     (audit trail, who did what)
 *    - pjm_attachments      (file uploads on task/project)
 *    - pjm_approvals        (approvals workflow)
 *    - pjm_dependencies     (task / milestone dependencies, FS/SS/FF/SF)
 *    - pjm_watchers         (watchers / subscribers for notifications)
 *    - pjm_baselines        (EVM baselines for PV/EV tracking)
 *
 * @date 2026-04-18
 */

const safeAddColumn = async (queryInterface, Sequelize, table, col, def) => {
  try {
    const desc = await queryInterface.describeTable(table);
    if (!desc[col]) await queryInterface.addColumn(table, col, def);
  } catch (e) {
    console.warn(`[PJM] skip addColumn ${table}.${col}:`, e.message);
  }
};

const safeAddIndex = async (queryInterface, table, fields, name) => {
  try { await queryInterface.addIndex(table, fields, { name }); } catch (_) {}
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const allTables = await queryInterface.showAllTables();
    if (!allTables.includes('pjm_projects')) {
      console.warn('[PJM] Base table pjm_projects not found. Skipping enhancement migration. Please run 20260220-create-project-management-tables.js first.');
      return;
    }

    // ── 1) Extend pjm_projects ───────────────────────────────────
    const projCols = {
      branch_id: { type: Sequelize.UUID, allowNull: true },
      customer_id: { type: Sequelize.UUID, allowNull: true },
      manager_user_id: { type: Sequelize.INTEGER, allowNull: true },
      manager_employee_id: { type: Sequelize.UUID, allowNull: true },
      project_type: { type: Sequelize.STRING(30), defaultValue: 'internal' },
      client_contact: { type: Sequelize.STRING(200), allowNull: true },
      rag_status: { type: Sequelize.STRING(10), defaultValue: 'green' },
      health_score: { type: Sequelize.DECIMAL(5, 2), defaultValue: 100 },
      planned_value: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      earned_value: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      actual_value: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
      total_tasks: { type: Sequelize.INTEGER, defaultValue: 0 },
      completed_tasks: { type: Sequelize.INTEGER, defaultValue: 0 },
      total_hours: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      visibility: { type: Sequelize.STRING(20), defaultValue: 'team' },
      archived_at: { type: Sequelize.DATE, allowNull: true },
    };
    for (const [c, d] of Object.entries(projCols)) await safeAddColumn(queryInterface, Sequelize, 'pjm_projects', c, d);

    // ── 2) Extend pjm_tasks ──────────────────────────────────────
    const taskCols = {
      sprint_id: { type: Sequelize.UUID, allowNull: true },
      assignee_user_id: { type: Sequelize.INTEGER, allowNull: true },
      assignee_employee_id: { type: Sequelize.UUID, allowNull: true },
      reporter_user_id: { type: Sequelize.INTEGER, allowNull: true },
      labels: { type: Sequelize.JSONB, defaultValue: [] },
      story_points: { type: Sequelize.INTEGER, defaultValue: 0 },
      sort_order: { type: Sequelize.INTEGER, defaultValue: 0 },
      comment_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      attachment_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      checklist: { type: Sequelize.JSONB, defaultValue: [] },
      blocked_reason: { type: Sequelize.TEXT, allowNull: true },
    };
    for (const [c, d] of Object.entries(taskCols)) await safeAddColumn(queryInterface, Sequelize, 'pjm_tasks', c, d);

    // ── 3) Extend pjm_milestones ─────────────────────────────────
    await safeAddColumn(queryInterface, Sequelize, 'pjm_milestones', 'sort_order', { type: Sequelize.INTEGER, defaultValue: 0 });
    await safeAddColumn(queryInterface, Sequelize, 'pjm_milestones', 'budget_amount', { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 });

    // ── 4) Extend pjm_timesheets ─────────────────────────────────
    const tsCols = {
      hris_employee_id: { type: Sequelize.UUID, allowNull: true },
      approved_by_user_id: { type: Sequelize.INTEGER, allowNull: true },
      rejection_reason: { type: Sequelize.TEXT, allowNull: true },
      billable: { type: Sequelize.BOOLEAN, defaultValue: true },
      submitted_at: { type: Sequelize.DATE, allowNull: true },
      synced_to_payroll: { type: Sequelize.BOOLEAN, defaultValue: false },
      synced_to_payroll_at: { type: Sequelize.DATE, allowNull: true },
    };
    for (const [c, d] of Object.entries(tsCols)) await safeAddColumn(queryInterface, Sequelize, 'pjm_timesheets', c, d);

    // ── 5) Extend pjm_resources ──────────────────────────────────
    const resCols = {
      hris_employee_id: { type: Sequelize.UUID, allowNull: true },
      fleet_vehicle_id: { type: Sequelize.UUID, allowNull: true },
      inventory_item_id: { type: Sequelize.UUID, allowNull: true },
      status: { type: Sequelize.STRING(30), defaultValue: 'active' },
      quantity: { type: Sequelize.DECIMAL(12, 2), defaultValue: 1 },
      unit: { type: Sequelize.STRING(20), defaultValue: 'unit' },
    };
    for (const [c, d] of Object.entries(resCols)) await safeAddColumn(queryInterface, Sequelize, 'pjm_resources', c, d);

    // ── 6) Extend pjm_risks ──────────────────────────────────────
    const riskCols = {
      owner_user_id: { type: Sequelize.INTEGER, allowNull: true },
      owner_employee_id: { type: Sequelize.UUID, allowNull: true },
      escalated_at: { type: Sequelize.DATE, allowNull: true },
    };
    for (const [c, d] of Object.entries(riskCols)) await safeAddColumn(queryInterface, Sequelize, 'pjm_risks', c, d);

    // ── 7) Extend pjm_budgets ────────────────────────────────────
    const budgetCols = {
      period: { type: Sequelize.STRING(20), allowNull: true },
      period_date: { type: Sequelize.DATEONLY, allowNull: true },
      purchase_order_id: { type: Sequelize.UUID, allowNull: true },
      expense_id: { type: Sequelize.UUID, allowNull: true },
    };
    for (const [c, d] of Object.entries(budgetCols)) await safeAddColumn(queryInterface, Sequelize, 'pjm_budgets', c, d);

    // ── 8) Extend pjm_documents ──────────────────────────────────
    const docCols = {
      description: { type: Sequelize.TEXT, allowNull: true },
      task_id: { type: Sequelize.UUID, allowNull: true },
      access_level: { type: Sequelize.STRING(20), defaultValue: 'team' },
      external_link: { type: Sequelize.TEXT, allowNull: true },
    };
    for (const [c, d] of Object.entries(docCols)) await safeAddColumn(queryInterface, Sequelize, 'pjm_documents', c, d);

    // ──────────────────────────────────────────────────────────────
    // NEW TABLES
    // ──────────────────────────────────────────────────────────────
    const tables = await queryInterface.showAllTables();

    // pjm_sprints
    if (!tables.includes('pjm_sprints')) {
      await queryInterface.createTable('pjm_sprints', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        project_id: { type: Sequelize.UUID, references: { model: 'pjm_projects', key: 'id' }, onDelete: 'CASCADE' },
        name: { type: Sequelize.STRING(100), allowNull: false },
        goal: { type: Sequelize.TEXT },
        status: { type: Sequelize.STRING(20), defaultValue: 'planned' },
        start_date: { type: Sequelize.DATEONLY },
        end_date: { type: Sequelize.DATEONLY },
        planned_points: { type: Sequelize.INTEGER, defaultValue: 0 },
        completed_points: { type: Sequelize.INTEGER, defaultValue: 0 },
        velocity: { type: Sequelize.DECIMAL(8, 2), defaultValue: 0 },
        retrospective_notes: { type: Sequelize.TEXT },
        created_by: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      });
      await safeAddIndex(queryInterface, 'pjm_sprints', ['project_id'], 'idx_pjm_sprints_project');
      await safeAddIndex(queryInterface, 'pjm_sprints', ['status'], 'idx_pjm_sprints_status');
    }

    // pjm_comments
    if (!tables.includes('pjm_comments')) {
      await queryInterface.createTable('pjm_comments', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        project_id: { type: Sequelize.UUID, references: { model: 'pjm_projects', key: 'id' }, onDelete: 'CASCADE' },
        task_id: { type: Sequelize.UUID, allowNull: true },
        parent_comment_id: { type: Sequelize.UUID, allowNull: true },
        author_user_id: { type: Sequelize.INTEGER },
        author_name: { type: Sequelize.STRING(100) },
        author_employee_id: { type: Sequelize.UUID, allowNull: true },
        body: { type: Sequelize.TEXT, allowNull: false },
        mentions: { type: Sequelize.JSONB, defaultValue: [] },
        attachments: { type: Sequelize.JSONB, defaultValue: [] },
        is_edited: { type: Sequelize.BOOLEAN, defaultValue: false },
        is_pinned: { type: Sequelize.BOOLEAN, defaultValue: false },
        reactions: { type: Sequelize.JSONB, defaultValue: {} },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      });
      await safeAddIndex(queryInterface, 'pjm_comments', ['project_id'], 'idx_pjm_comments_project');
      await safeAddIndex(queryInterface, 'pjm_comments', ['task_id'], 'idx_pjm_comments_task');
    }

    // pjm_activity_log
    if (!tables.includes('pjm_activity_log')) {
      await queryInterface.createTable('pjm_activity_log', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        project_id: { type: Sequelize.UUID, references: { model: 'pjm_projects', key: 'id' }, onDelete: 'CASCADE' },
        entity_type: { type: Sequelize.STRING(30), allowNull: false },
        entity_id: { type: Sequelize.STRING(100) },
        action: { type: Sequelize.STRING(50), allowNull: false },
        actor_user_id: { type: Sequelize.INTEGER },
        actor_name: { type: Sequelize.STRING(100) },
        description: { type: Sequelize.TEXT },
        old_value: { type: Sequelize.JSONB },
        new_value: { type: Sequelize.JSONB },
        metadata: { type: Sequelize.JSONB, defaultValue: {} },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      });
      await safeAddIndex(queryInterface, 'pjm_activity_log', ['project_id'], 'idx_pjm_activity_project');
      await safeAddIndex(queryInterface, 'pjm_activity_log', ['entity_type', 'entity_id'], 'idx_pjm_activity_entity');
      await safeAddIndex(queryInterface, 'pjm_activity_log', ['created_at'], 'idx_pjm_activity_created');
    }

    // pjm_attachments
    if (!tables.includes('pjm_attachments')) {
      await queryInterface.createTable('pjm_attachments', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        project_id: { type: Sequelize.UUID, references: { model: 'pjm_projects', key: 'id' }, onDelete: 'CASCADE' },
        task_id: { type: Sequelize.UUID, allowNull: true },
        comment_id: { type: Sequelize.UUID, allowNull: true },
        file_name: { type: Sequelize.STRING(255), allowNull: false },
        file_url: { type: Sequelize.TEXT, allowNull: false },
        file_size: { type: Sequelize.INTEGER, defaultValue: 0 },
        mime_type: { type: Sequelize.STRING(100) },
        uploaded_by: { type: Sequelize.INTEGER },
        uploaded_by_name: { type: Sequelize.STRING(100) },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      });
      await safeAddIndex(queryInterface, 'pjm_attachments', ['task_id'], 'idx_pjm_attach_task');
    }

    // pjm_approvals
    if (!tables.includes('pjm_approvals')) {
      await queryInterface.createTable('pjm_approvals', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        project_id: { type: Sequelize.UUID, references: { model: 'pjm_projects', key: 'id' }, onDelete: 'CASCADE' },
        entity_type: { type: Sequelize.STRING(30), allowNull: false },
        entity_id: { type: Sequelize.STRING(100), allowNull: false },
        approval_type: { type: Sequelize.STRING(30), allowNull: false },
        status: { type: Sequelize.STRING(20), defaultValue: 'pending' },
        requested_by: { type: Sequelize.INTEGER },
        requested_by_name: { type: Sequelize.STRING(100) },
        approver_user_id: { type: Sequelize.INTEGER },
        approver_name: { type: Sequelize.STRING(100) },
        approved_at: { type: Sequelize.DATE },
        rejected_at: { type: Sequelize.DATE },
        reason: { type: Sequelize.TEXT },
        payload: { type: Sequelize.JSONB, defaultValue: {} },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      });
      await safeAddIndex(queryInterface, 'pjm_approvals', ['status'], 'idx_pjm_appr_status');
      await safeAddIndex(queryInterface, 'pjm_approvals', ['entity_type', 'entity_id'], 'idx_pjm_appr_entity');
    }

    // pjm_dependencies
    if (!tables.includes('pjm_dependencies')) {
      await queryInterface.createTable('pjm_dependencies', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        project_id: { type: Sequelize.UUID, references: { model: 'pjm_projects', key: 'id' }, onDelete: 'CASCADE' },
        predecessor_task_id: { type: Sequelize.UUID, allowNull: false },
        successor_task_id: { type: Sequelize.UUID, allowNull: false },
        dependency_type: { type: Sequelize.STRING(10), defaultValue: 'FS' },
        lag_days: { type: Sequelize.INTEGER, defaultValue: 0 },
        created_by: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      });
      await safeAddIndex(queryInterface, 'pjm_dependencies', ['predecessor_task_id'], 'idx_pjm_dep_pred');
      await safeAddIndex(queryInterface, 'pjm_dependencies', ['successor_task_id'], 'idx_pjm_dep_succ');
    }

    // pjm_watchers
    if (!tables.includes('pjm_watchers')) {
      await queryInterface.createTable('pjm_watchers', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        project_id: { type: Sequelize.UUID, references: { model: 'pjm_projects', key: 'id' }, onDelete: 'CASCADE' },
        task_id: { type: Sequelize.UUID, allowNull: true },
        user_id: { type: Sequelize.INTEGER, allowNull: false },
        user_name: { type: Sequelize.STRING(100) },
        notify_email: { type: Sequelize.BOOLEAN, defaultValue: true },
        notify_in_app: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      });
      await safeAddIndex(queryInterface, 'pjm_watchers', ['project_id', 'user_id'], 'idx_pjm_watch_project_user');
    }

    // pjm_baselines (EVM snapshots)
    if (!tables.includes('pjm_baselines')) {
      await queryInterface.createTable('pjm_baselines', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        tenant_id: { type: Sequelize.UUID },
        project_id: { type: Sequelize.UUID, references: { model: 'pjm_projects', key: 'id' }, onDelete: 'CASCADE' },
        snapshot_date: { type: Sequelize.DATEONLY, allowNull: false },
        bac: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
        pv: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
        ev: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
        ac: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
        spi: { type: Sequelize.DECIMAL(8, 4), defaultValue: 1 },
        cpi: { type: Sequelize.DECIMAL(8, 4), defaultValue: 1 },
        eac: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
        etc: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
        variance_schedule: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
        variance_cost: { type: Sequelize.DECIMAL(19, 4), defaultValue: 0 },
        notes: { type: Sequelize.TEXT },
        created_by: { type: Sequelize.INTEGER },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      });
      await safeAddIndex(queryInterface, 'pjm_baselines', ['project_id', 'snapshot_date'], 'idx_pjm_baseline_project_date');
    }

    // Indexes on extended columns
    await safeAddIndex(queryInterface, 'pjm_projects', ['branch_id'], 'idx_pjm_projects_branch');
    await safeAddIndex(queryInterface, 'pjm_projects', ['customer_id'], 'idx_pjm_projects_customer');
    await safeAddIndex(queryInterface, 'pjm_projects', ['manager_user_id'], 'idx_pjm_projects_manager');
    await safeAddIndex(queryInterface, 'pjm_projects', ['status'], 'idx_pjm_projects_status');
    await safeAddIndex(queryInterface, 'pjm_tasks', ['sprint_id'], 'idx_pjm_tasks_sprint');
    await safeAddIndex(queryInterface, 'pjm_tasks', ['assignee_user_id'], 'idx_pjm_tasks_assignee');
    await safeAddIndex(queryInterface, 'pjm_tasks', ['due_date'], 'idx_pjm_tasks_due');
    await safeAddIndex(queryInterface, 'pjm_timesheets', ['hris_employee_id'], 'idx_pjm_ts_employee');
    await safeAddIndex(queryInterface, 'pjm_timesheets', ['work_date'], 'idx_pjm_ts_date');
  },

  down: async (queryInterface) => {
    const drop = (t) => queryInterface.dropTable(t).catch(() => {});
    await drop('pjm_baselines');
    await drop('pjm_watchers');
    await drop('pjm_dependencies');
    await drop('pjm_approvals');
    await drop('pjm_attachments');
    await drop('pjm_activity_log');
    await drop('pjm_comments');
    await drop('pjm_sprints');
    // Leave extended columns in place (non-destructive)
  },
};
