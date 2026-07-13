'use strict';

/**
 * Migration: Humanify LMS Module
 * - Standalone question bank
 * - Test schedules
 * - Exam sessions (anti-cheating)
 * - Competency history
 * - Course progress tracking
 * - Psychometric exam extensions
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const addCol = async (table, col, spec) => {
      try {
        await queryInterface.addColumn(table, col, spec);
      } catch (e) {
        if (!String(e.message).includes('already exists')) throw e;
      }
    };

    // Extend exams for psychometric & anti-cheat
    await addCol('hris_training_exams', 'psychometric_type', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'cognitive, personality, integrity, null=general',
    });
    await addCol('hris_training_exams', 'shuffle_options', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await addCol('hris_training_exams', 'anti_cheat_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    await addCol('hris_training_exams', 'fullscreen_required', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await addCol('hris_training_exams', 'manual_grading_required', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // ── Question Bank ──
    await queryInterface.createTable('hris_lms_question_bank', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: { type: Sequelize.UUID, allowNull: false, field: 'tenant_id' },
      code: { type: Sequelize.STRING(50), allowNull: false },
      category: { type: Sequelize.STRING(100), allowNull: false, defaultValue: 'general' },
      psychometricType: {
        type: Sequelize.STRING(50),
        allowNull: true,
        field: 'psychometric_type',
        comment: 'cognitive, personality, integrity',
      },
      questionType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'multiple_choice',
        field: 'question_type',
        comment: 'multiple_choice, true_false, essay, likert, situational',
      },
      questionText: { type: Sequelize.TEXT, allowNull: false, field: 'question_text' },
      options: { type: Sequelize.JSONB, allowNull: true, defaultValue: [] },
      correctAnswer: { type: Sequelize.TEXT, allowNull: true, field: 'correct_answer' },
      score: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 1 },
      difficulty: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'medium' },
      tags: { type: Sequelize.JSONB, allowNull: true, defaultValue: [] },
      explanation: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'active' },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdBy: { type: Sequelize.UUID, allowNull: true, field: 'created_by' },
      updatedBy: { type: Sequelize.UUID, allowNull: true, field: 'updated_by' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' },
    });
    await queryInterface.addIndex('hris_lms_question_bank', ['tenant_id'], { name: 'idx_lms_qb_tenant' });
    await queryInterface.addIndex('hris_lms_question_bank', ['psychometric_type'], { name: 'idx_lms_qb_psycho' });
    await queryInterface.addIndex('hris_lms_question_bank', ['category'], { name: 'idx_lms_qb_category' });

    // ── Test Schedules ──
    await queryInterface.createTable('hris_lms_test_schedules', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: { type: Sequelize.UUID, allowNull: false, field: 'tenant_id' },
      examId: { type: Sequelize.UUID, allowNull: false, field: 'exam_id' },
      title: { type: Sequelize.STRING(300), allowNull: false },
      scheduledStart: { type: Sequelize.DATE, allowNull: false, field: 'scheduled_start' },
      scheduledEnd: { type: Sequelize.DATE, allowNull: false, field: 'scheduled_end' },
      targetType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'all',
        field: 'target_type',
        comment: 'all, department, role, employees, batch',
      },
      targetIds: { type: Sequelize.JSONB, allowNull: true, defaultValue: [], field: 'target_ids' },
      location: { type: Sequelize.STRING(300), allowNull: true },
      proctorId: { type: Sequelize.UUID, allowNull: true, field: 'proctor_id' },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'scheduled',
        comment: 'scheduled, open, closed, cancelled',
      },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdBy: { type: Sequelize.UUID, allowNull: true, field: 'created_by' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' },
    });
    await queryInterface.addIndex('hris_lms_test_schedules', ['tenant_id'], { name: 'idx_lms_sched_tenant' });
    await queryInterface.addIndex('hris_lms_test_schedules', ['exam_id'], { name: 'idx_lms_sched_exam' });
    await queryInterface.addIndex('hris_lms_test_schedules', ['scheduled_start'], { name: 'idx_lms_sched_start' });

    // ── Exam Sessions (anti-cheating) ──
    await queryInterface.createTable('hris_lms_exam_sessions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: { type: Sequelize.UUID, allowNull: false, field: 'tenant_id' },
      resultId: { type: Sequelize.UUID, allowNull: false, field: 'result_id' },
      examId: { type: Sequelize.UUID, allowNull: false, field: 'exam_id' },
      employeeId: { type: Sequelize.UUID, allowNull: false, field: 'employee_id' },
      startedAt: { type: Sequelize.DATE, allowNull: false, field: 'started_at' },
      endedAt: { type: Sequelize.DATE, allowNull: true, field: 'ended_at' },
      tabSwitchCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, field: 'tab_switch_count' },
      fullscreenExitCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, field: 'fullscreen_exit_count' },
      copyPasteCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, field: 'copy_paste_count' },
      idleWarnings: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0, field: 'idle_warnings' },
      ipAddress: { type: Sequelize.STRING(45), allowNull: true, field: 'ip_address' },
      userAgent: { type: Sequelize.TEXT, allowNull: true, field: 'user_agent' },
      integrityScore: { type: Sequelize.DECIMAL(5, 2), allowNull: true, field: 'integrity_score' },
      flags: { type: Sequelize.JSONB, allowNull: true, defaultValue: [] },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'active',
        comment: 'active, submitted, flagged, invalidated',
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' },
    });
    await queryInterface.addIndex('hris_lms_exam_sessions', ['result_id'], { name: 'idx_lms_session_result' });
    await queryInterface.addIndex('hris_lms_exam_sessions', ['exam_id', 'employee_id'], { name: 'idx_lms_session_exam_emp' });

    // ── Competency History ──
    await queryInterface.createTable('hris_lms_competency_history', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: { type: Sequelize.UUID, allowNull: false, field: 'tenant_id' },
      employeeId: { type: Sequelize.UUID, allowNull: false, field: 'employee_id' },
      employeeName: { type: Sequelize.STRING(200), allowNull: true, field: 'employee_name' },
      competencyCode: { type: Sequelize.STRING(100), allowNull: false, field: 'competency_code' },
      competencyName: { type: Sequelize.STRING(300), allowNull: false, field: 'competency_name' },
      level: { type: Sequelize.STRING(50), allowNull: true, comment: 'beginner, intermediate, advanced, expert' },
      score: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      sourceType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'exam',
        field: 'source_type',
        comment: 'exam, training, manual, psychometric, certificate',
      },
      sourceId: { type: Sequelize.UUID, allowNull: true, field: 'source_id' },
      certifiedAt: { type: Sequelize.DATE, allowNull: true, field: 'certified_at' },
      expiresAt: { type: Sequelize.DATE, allowNull: true, field: 'expires_at' },
      certificateId: { type: Sequelize.UUID, allowNull: true, field: 'certificate_id' },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' },
    });
    await queryInterface.addIndex('hris_lms_competency_history', ['tenant_id', 'employee_id'], { name: 'idx_lms_comp_emp' });
    await queryInterface.addIndex('hris_lms_competency_history', ['competency_code'], { name: 'idx_lms_comp_code' });

    // ── Course Progress ──
    await queryInterface.createTable('hris_lms_course_progress', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: { type: Sequelize.UUID, allowNull: false, field: 'tenant_id' },
      employeeId: { type: Sequelize.UUID, allowNull: false, field: 'employee_id' },
      curriculumId: { type: Sequelize.UUID, allowNull: true, field: 'curriculum_id' },
      moduleId: { type: Sequelize.UUID, allowNull: true, field: 'module_id' },
      batchId: { type: Sequelize.UUID, allowNull: true, field: 'batch_id' },
      progressPct: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0, field: 'progress_pct' },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'not_started',
        comment: 'not_started, in_progress, completed',
      },
      completedAt: { type: Sequelize.DATE, allowNull: true, field: 'completed_at' },
      lastAccessedAt: { type: Sequelize.DATE, allowNull: true, field: 'last_accessed_at' },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' },
    });
    await queryInterface.addIndex('hris_lms_course_progress', ['tenant_id', 'employee_id'], { name: 'idx_lms_prog_emp' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hris_lms_course_progress');
    await queryInterface.dropTable('hris_lms_competency_history');
    await queryInterface.dropTable('hris_lms_exam_sessions');
    await queryInterface.dropTable('hris_lms_test_schedules');
    await queryInterface.dropTable('hris_lms_question_bank');
    const cols = ['psychometric_type', 'shuffle_options', 'anti_cheat_enabled', 'fullscreen_required', 'manual_grading_required'];
    for (const col of cols) {
      try { await queryInterface.removeColumn('hris_training_exams', col); } catch { /* ignore */ }
    }
  },
};
