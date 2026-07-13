'use strict';

/** Phase C: academy branding, external learners, ecosystem integrations */
module.exports = {
  async up(queryInterface, Sequelize) {
    const addCol = async (table, col, spec) => {
      try { await queryInterface.addColumn(table, col, spec); } catch (e) {
        if (!String(e.message).includes('already exists')) throw e;
      }
    };

    await queryInterface.createTable('hris_lms_academy_settings', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: { type: Sequelize.UUID, allowNull: false, unique: true, field: 'tenant_id' },
      slug: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      academyName: { type: Sequelize.STRING(200), allowNull: false, defaultValue: 'Humanify Academy', field: 'academy_name' },
      logoUrl: { type: Sequelize.STRING(500), allowNull: true, field: 'logo_url' },
      primaryColor: { type: Sequelize.STRING(20), allowNull: false, defaultValue: '#4f46e5', field: 'primary_color' },
      welcomeMessage: { type: Sequelize.TEXT, allowNull: true, field: 'welcome_message' },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'active' },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' },
    });

    await queryInterface.createTable('hris_lms_external_learners', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: { type: Sequelize.UUID, allowNull: false, field: 'tenant_id' },
      email: { type: Sequelize.STRING(200), allowNull: false },
      fullName: { type: Sequelize.STRING(200), allowNull: false, field: 'full_name' },
      learnerType: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'external',
        field: 'learner_type',
        comment: 'external, candidate, partner, franchisee',
      },
      curriculumId: { type: Sequelize.UUID, allowNull: true, field: 'curriculum_id' },
      examId: { type: Sequelize.UUID, allowNull: true, field: 'exam_id' },
      candidateId: { type: Sequelize.UUID, allowNull: true, field: 'candidate_id' },
      employeeId: { type: Sequelize.UUID, allowNull: true, field: 'employee_id' },
      accessToken: { type: Sequelize.STRING(64), allowNull: false, unique: true, field: 'access_token' },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'invited' },
      invitedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'invited_at' },
      accessedAt: { type: Sequelize.DATE, allowNull: true, field: 'accessed_at' },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' },
    });
    await queryInterface.addIndex('hris_lms_external_learners', ['tenant_id', 'email'], { name: 'idx_lms_ext_learner_email' });

    await queryInterface.createTable('hris_lms_integration_rules', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: { type: Sequelize.UUID, allowNull: false, field: 'tenant_id' },
      ruleType: { type: Sequelize.STRING(50), allowNull: false, field: 'rule_type' },
      enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      config: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' },
    });
    await queryInterface.addIndex('hris_lms_integration_rules', ['tenant_id', 'rule_type'], {
      unique: true,
      name: 'idx_lms_integration_rule_unique',
    });

    await queryInterface.createTable('hris_lms_notification_log', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: { type: Sequelize.UUID, allowNull: true, field: 'tenant_id' },
      employeeId: { type: Sequelize.UUID, allowNull: true, field: 'employee_id' },
      eventType: { type: Sequelize.STRING(50), allowNull: false, field: 'event_type' },
      sourceId: { type: Sequelize.STRING(100), allowNull: true, field: 'source_id' },
      channel: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'in_app' },
      sentAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'sent_at' },
    });

    await addCol('hris_training_curricula', 'onboarding_default', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Auto-enroll new hires',
    });
    await addCol('hris_training_curricula', 'training_allowance_amount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      comment: 'Payroll training allowance on completion',
    });
  },

  async down(queryInterface) {
    const dropCol = async (table, col) => {
      try { await queryInterface.removeColumn(table, col); } catch { /* ignore */ }
    };
    await dropCol('hris_training_curricula', 'onboarding_default');
    await dropCol('hris_training_curricula', 'training_allowance_amount');
    for (const t of [
      'hris_lms_notification_log',
      'hris_lms_integration_rules',
      'hris_lms_external_learners',
      'hris_lms_academy_settings',
    ]) {
      try { await queryInterface.dropTable(t); } catch { /* ignore */ }
    }
  },
};
