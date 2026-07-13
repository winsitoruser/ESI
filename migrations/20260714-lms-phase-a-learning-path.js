'use strict';

/** Phase A: enrollments, certificate verification, learning path fields */
module.exports = {
  async up(queryInterface, Sequelize) {
    const addCol = async (table, col, spec) => {
      try { await queryInterface.addColumn(table, col, spec); } catch (e) {
        if (!String(e.message).includes('already exists')) throw e;
      }
    };

    await queryInterface.createTable('hris_lms_enrollments', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: { type: Sequelize.UUID, allowNull: false, field: 'tenant_id' },
      curriculumId: { type: Sequelize.UUID, allowNull: false, field: 'curriculum_id' },
      employeeId: { type: Sequelize.UUID, allowNull: false, field: 'employee_id' },
      employeeName: { type: Sequelize.STRING(200), allowNull: true, field: 'employee_name' },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'enrolled',
        comment: 'enrolled, in_progress, completed, dropped',
      },
      progressPct: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0, field: 'progress_pct' },
      enrolledAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'enrolled_at' },
      completedAt: { type: Sequelize.DATE, allowNull: true, field: 'completed_at' },
      dueDate: { type: Sequelize.DATEONLY, allowNull: true, field: 'due_date' },
      mandatory: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' },
    });
    await queryInterface.addIndex('hris_lms_enrollments', ['tenant_id', 'curriculum_id', 'employee_id'], {
      unique: true,
      name: 'idx_lms_enroll_unique',
    });

    await addCol('hris_training_curricula', 'certificate_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    await addCol('hris_training_curricula', 'certificate_validity_months', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'null = no expiry',
    });
    await addCol('hris_training_curricula', 'learning_path', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Ordered steps: module_id, type, exam_id',
    });

    await addCol('hris_certificates', 'verify_token', {
      type: Sequelize.STRING(64),
      allowNull: true,
      unique: true,
    });
    await addCol('hris_certificates', 'curriculum_id', {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await addCol('hris_lms_course_progress', 'lesson_id', {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await addCol('hris_lms_course_progress', 'time_spent_seconds', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hris_lms_enrollments');
    const cols = [
      ['hris_training_curricula', 'certificate_enabled'],
      ['hris_training_curricula', 'certificate_validity_months'],
      ['hris_training_curricula', 'learning_path'],
      ['hris_certificates', 'verify_token'],
      ['hris_certificates', 'curriculum_id'],
      ['hris_lms_course_progress', 'lesson_id'],
      ['hris_lms_course_progress', 'time_spent_seconds'],
    ];
    for (const [t, c] of cols) {
      try { await queryInterface.removeColumn(t, c); } catch { /* ignore */ }
    }
  },
};
