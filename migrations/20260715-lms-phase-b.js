'use strict';

/** Phase B: blueprints, psychometric reports, proctoring */
module.exports = {
  async up(queryInterface, Sequelize) {
    const addCol = async (table, col, spec) => {
      try { await queryInterface.addColumn(table, col, spec); } catch (e) {
        if (!String(e.message).includes('already exists')) throw e;
      }
    };

    await queryInterface.createTable('hris_lms_exam_blueprints', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: { type: Sequelize.UUID, allowNull: false, field: 'tenant_id' },
      examId: { type: Sequelize.UUID, allowNull: true, field: 'exam_id' },
      title: { type: Sequelize.STRING(300), allowNull: false },
      psychometricType: { type: Sequelize.STRING(50), allowNull: true, field: 'psychometric_type' },
      totalQuestions: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 20, field: 'total_questions' },
      sections: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: '[{category, count, difficulty, psychometric_type}]',
      },
      passingScore: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 70, field: 'passing_score' },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'active' },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdBy: { type: Sequelize.UUID, allowNull: true, field: 'created_by' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' },
    });
    await queryInterface.addIndex('hris_lms_exam_blueprints', ['tenant_id'], { name: 'idx_lms_bp_tenant' });

    await queryInterface.createTable('hris_lms_psychometric_reports', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: { type: Sequelize.UUID, allowNull: false, field: 'tenant_id' },
      resultId: { type: Sequelize.UUID, allowNull: false, field: 'result_id' },
      examId: { type: Sequelize.UUID, allowNull: false, field: 'exam_id' },
      employeeId: { type: Sequelize.UUID, allowNull: false, field: 'employee_id' },
      employeeName: { type: Sequelize.STRING(200), allowNull: true, field: 'employee_name' },
      psychometricType: { type: Sequelize.STRING(50), allowNull: false, field: 'psychometric_type' },
      overallScore: { type: Sequelize.DECIMAL(5, 2), allowNull: true, field: 'overall_score' },
      dimensions: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      interpretation: { type: Sequelize.TEXT, allowNull: true },
      recommendations: { type: Sequelize.JSONB, allowNull: true, defaultValue: [] },
      riskLevel: { type: Sequelize.STRING(20), allowNull: true, field: 'risk_level' },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
    });
    await queryInterface.addIndex('hris_lms_psychometric_reports', ['employee_id'], { name: 'idx_lms_psycho_emp' });
    await queryInterface.addIndex('hris_lms_psychometric_reports', ['result_id'], { name: 'idx_lms_psycho_result' });

    await queryInterface.createTable('hris_lms_proctor_snapshots', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenantId: { type: Sequelize.UUID, allowNull: false, field: 'tenant_id' },
      sessionId: { type: Sequelize.UUID, allowNull: true, field: 'session_id' },
      resultId: { type: Sequelize.UUID, allowNull: false, field: 'result_id' },
      examId: { type: Sequelize.UUID, allowNull: false, field: 'exam_id' },
      employeeId: { type: Sequelize.UUID, allowNull: false, field: 'employee_id' },
      snapshotType: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'periodic',
        field: 'snapshot_type',
        comment: 'start, periodic, submit',
      },
      imageData: { type: Sequelize.TEXT, allowNull: true, field: 'image_data' },
      capturedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'captured_at' },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
    });
    await queryInterface.addIndex('hris_lms_proctor_snapshots', ['result_id'], { name: 'idx_lms_proctor_result' });

    await addCol('hris_lms_exam_sessions', 'device_fingerprint', { type: Sequelize.STRING(128), allowNull: true });
    await addCol('hris_lms_exam_sessions', 'proctor_enabled', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await addCol('hris_training_exams', 'blueprint_id', { type: Sequelize.UUID, allowNull: true });
    await addCol('hris_training_exams', 'proctor_enabled', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hris_lms_proctor_snapshots');
    await queryInterface.dropTable('hris_lms_psychometric_reports');
    await queryInterface.dropTable('hris_lms_exam_blueprints');
    const cols = [
      ['hris_lms_exam_sessions', 'device_fingerprint'],
      ['hris_lms_exam_sessions', 'proctor_enabled'],
      ['hris_training_exams', 'blueprint_id'],
      ['hris_training_exams', 'proctor_enabled'],
    ];
    for (const [t, c] of cols) {
      try { await queryInterface.removeColumn(t, c); } catch { /* ignore */ }
    }
  },
};
