'use strict';

/**
 * Migration: HRIS Training - Scoring System & Candidate Portal
 * 
 * 1. hris_training_scoring_configs  - Konfigurasi bobot & skala penilaian per kurikulum
 * 2. hris_training_competencies     - Kompetensi yang dinilai
 * 3. hris_training_participant_scores - Skor detail per peserta per komponen
 * 4. hris_candidate_accounts        - Akun login kandidat/peserta training
 * 5. hris_candidate_activity_logs   - Log aktivitas kandidat di portal
 * 
 * Scoring system supports:
 * - Configurable weight components (exam, attendance, practical, assignment, attitude)
 * - Grade scale (A/B/C/D/E or custom)
 * - Competency-based assessment
 * - Auto final score calculation
 * 
 * @version 1.0.0
 * @date 2026-03-08
 */

module.exports = {
  async up(queryInterface, Sequelize) {

    // ────────────────────────────────────────────────────────────
    // 1. hris_training_scoring_configs - Konfigurasi bobot penilaian
    // ────────────────────────────────────────────────────────────
    await queryInterface.createTable('hris_training_scoring_configs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'tenant_id',
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      curriculumId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'curriculum_id',
        references: { model: 'hris_training_curricula', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Linked curriculum. NULL = default config for tenant'
      },
      configName: {
        type: Sequelize.STRING(200),
        allowNull: false,
        field: 'config_name',
        comment: 'e.g. Default Scoring, Outsourcing Scoring'
      },
      passingScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 70.00,
        field: 'passing_score'
      },
      // Weight components (must sum to 100)
      weightExam: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 40.00,
        field: 'weight_exam',
        comment: 'Weight % for exam/test scores'
      },
      weightAttendance: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 15.00,
        field: 'weight_attendance',
        comment: 'Weight % for attendance'
      },
      weightPractical: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 25.00,
        field: 'weight_practical',
        comment: 'Weight % for practical/hands-on'
      },
      weightAssignment: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 10.00,
        field: 'weight_assignment',
        comment: 'Weight % for assignments/homework'
      },
      weightAttitude: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 10.00,
        field: 'weight_attitude',
        comment: 'Weight % for attitude/behavior/soft skills'
      },
      // Grade scale
      gradeScale: {
        type: Sequelize.JSONB,
        allowNull: false,
        field: 'grade_scale',
        defaultValue: [
          { grade: 'A', label: 'Sangat Baik', min_score: 90, max_score: 100, color: '#16a34a' },
          { grade: 'B', label: 'Baik', min_score: 80, max_score: 89.99, color: '#2563eb' },
          { grade: 'C', label: 'Cukup', min_score: 70, max_score: 79.99, color: '#eab308' },
          { grade: 'D', label: 'Kurang', min_score: 60, max_score: 69.99, color: '#f97316' },
          { grade: 'E', label: 'Tidak Lulus', min_score: 0, max_score: 59.99, color: '#dc2626' }
        ],
        comment: 'Grade scale array [{grade, label, min_score, max_score, color}]'
      },
      // Competency assessment config
      competencyAssessment: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'competency_assessment',
        comment: 'Enable competency-based assessment'
      },
      // Additional scoring rules
      minAttendanceRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 80.00,
        field: 'min_attendance_rate',
        comment: 'Minimum attendance % to be eligible for graduation'
      },
      allowRemedial: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'allow_remedial'
      },
      maxRemedialAttempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 2,
        field: 'max_remedial_attempts'
      },
      remedialPassingScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 70.00,
        field: 'remedial_passing_score'
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_default'
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'active'
      },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdBy: { type: Sequelize.UUID, allowNull: true, field: 'created_by' },
      updatedBy: { type: Sequelize.UUID, allowNull: true, field: 'updated_by' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' }
    });

    await queryInterface.addIndex('hris_training_scoring_configs', ['tenant_id'], { name: 'idx_tscore_cfg_tenant' });
    await queryInterface.addIndex('hris_training_scoring_configs', ['curriculum_id'], { name: 'idx_tscore_cfg_curriculum' });
    await queryInterface.addIndex('hris_training_scoring_configs', ['is_default'], { name: 'idx_tscore_cfg_default' });

    // ────────────────────────────────────────────────────────────
    // 2. hris_training_competencies - Kompetensi yang dinilai
    // ────────────────────────────────────────────────────────────
    await queryInterface.createTable('hris_training_competencies', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'tenant_id',
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      curriculumId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'curriculum_id',
        references: { model: 'hris_training_curricula', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Competency code e.g. COMP-001'
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: { type: Sequelize.TEXT, allowNull: true },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'technical',
        comment: 'technical, soft_skill, knowledge, leadership, safety, attitude'
      },
      weight: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 1.00,
        comment: 'Weight within competency assessment'
      },
      passingLevel: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
        field: 'passing_level',
        comment: 'Min level to pass (1-5 scale)'
      },
      orderIndex: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'order_index'
      },
      status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'active' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' }
    });

    await queryInterface.addIndex('hris_training_competencies', ['tenant_id'], { name: 'idx_tcompetencies_tenant' });
    await queryInterface.addIndex('hris_training_competencies', ['curriculum_id'], { name: 'idx_tcompetencies_curriculum' });

    // ────────────────────────────────────────────────────────────
    // 3. hris_training_participant_scores - Skor detail per peserta
    // ────────────────────────────────────────────────────────────
    await queryInterface.createTable('hris_training_participant_scores', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'tenant_id',
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      graduationId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'graduation_id',
        references: { model: 'hris_training_graduations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      batchId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'batch_id',
        references: { model: 'hris_training_batches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      employeeId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'employee_id'
      },
      scoringConfigId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'scoring_config_id',
        references: { model: 'hris_training_scoring_configs', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      // Component scores (0-100 each)
      examScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        field: 'exam_score'
      },
      attendanceScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        field: 'attendance_score'
      },
      practicalScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        field: 'practical_score'
      },
      assignmentScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        field: 'assignment_score'
      },
      attitudeScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        field: 'attitude_score'
      },
      // Calculated final
      weightedScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        field: 'weighted_score',
        comment: 'Auto-calculated weighted final score'
      },
      grade: {
        type: Sequelize.STRING(5),
        allowNull: true,
        comment: 'A/B/C/D/E based on grade scale'
      },
      gradeLabel: {
        type: Sequelize.STRING(50),
        allowNull: true,
        field: 'grade_label'
      },
      isPassed: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        field: 'is_passed'
      },
      // Competency scores
      competencyScores: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        field: 'competency_scores',
        comment: 'Array of {competencyId, level, score, notes}'
      },
      // Exam detail breakdown
      examDetails: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        field: 'exam_details',
        comment: 'Array of {examId, title, score, isPassed}'
      },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      gradedBy: { type: Sequelize.UUID, allowNull: true, field: 'graded_by' },
      gradedAt: { type: Sequelize.DATE, allowNull: true, field: 'graded_at' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' }
    });

    await queryInterface.addIndex('hris_training_participant_scores', ['tenant_id'], { name: 'idx_tpscores_tenant' });
    await queryInterface.addIndex('hris_training_participant_scores', ['graduation_id'], { name: 'idx_tpscores_graduation' });
    await queryInterface.addIndex('hris_training_participant_scores', ['batch_id'], { name: 'idx_tpscores_batch' });
    await queryInterface.addIndex('hris_training_participant_scores', ['employee_id'], { name: 'idx_tpscores_employee' });
    await queryInterface.addIndex('hris_training_participant_scores', ['is_passed'], { name: 'idx_tpscores_passed' });
    await queryInterface.addIndex('hris_training_participant_scores', ['grade'], { name: 'idx_tpscores_grade' });
    await queryInterface.addIndex('hris_training_participant_scores', ['graduation_id', 'employee_id'], { unique: true, name: 'idx_tpscores_unique' });

    // ────────────────────────────────────────────────────────────
    // 4. hris_candidate_accounts - Akun login kandidat
    // ────────────────────────────────────────────────────────────
    await queryInterface.createTable('hris_candidate_accounts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'tenant_id',
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      employeeId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'employee_id',
        comment: 'Link to hris_employees if already an employee'
      },
      candidateId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'candidate_id',
        comment: 'Link to hris_candidates if from recruitment'
      },
      email: {
        type: Sequelize.STRING(200),
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Bcrypt hashed password'
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      phone: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      photoUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
        field: 'photo_url'
      },
      idNumber: {
        type: Sequelize.STRING(30),
        allowNull: true,
        field: 'id_number',
        comment: 'KTP/ID number'
      },
      dateOfBirth: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        field: 'date_of_birth'
      },
      gender: {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: 'male, female'
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      education: {
        type: Sequelize.STRING(200),
        allowNull: true,
        comment: 'Highest education level'
      },
      experience: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Work experience array'
      },
      skills: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Skills array'
      },
      documents: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Uploaded documents [{name, type, url}]'
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'active',
        comment: 'active, inactive, suspended, graduated'
      },
      lastLoginAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'last_login_at'
      },
      emailVerified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'email_verified'
      },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdBy: { type: Sequelize.UUID, allowNull: true, field: 'created_by' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' }
    });

    await queryInterface.addIndex('hris_candidate_accounts', ['tenant_id'], { name: 'idx_candacct_tenant' });
    await queryInterface.addIndex('hris_candidate_accounts', ['email'], { unique: true, name: 'idx_candacct_email' });
    await queryInterface.addIndex('hris_candidate_accounts', ['employee_id'], { name: 'idx_candacct_employee' });
    await queryInterface.addIndex('hris_candidate_accounts', ['candidate_id'], { name: 'idx_candacct_candidate' });
    await queryInterface.addIndex('hris_candidate_accounts', ['status'], { name: 'idx_candacct_status' });

    // ────────────────────────────────────────────────────────────
    // 5. hris_candidate_activity_logs - Log aktivitas kandidat
    // ────────────────────────────────────────────────────────────
    await queryInterface.createTable('hris_candidate_activity_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      candidateAccountId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'candidate_account_id',
        references: { model: 'hris_candidate_accounts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      activityType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        field: 'activity_type',
        comment: 'login, view_module, start_exam, submit_exam, view_result, update_profile'
      },
      entityType: {
        type: Sequelize.STRING(50),
        allowNull: true,
        field: 'entity_type',
        comment: 'module, exam, schedule, result'
      },
      entityId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'entity_id'
      },
      details: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      },
      ipAddress: {
        type: Sequelize.STRING(50),
        allowNull: true,
        field: 'ip_address'
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'user_agent'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' }
    });

    await queryInterface.addIndex('hris_candidate_activity_logs', ['candidate_account_id'], { name: 'idx_candlog_account' });
    await queryInterface.addIndex('hris_candidate_activity_logs', ['activity_type'], { name: 'idx_candlog_type' });
    await queryInterface.addIndex('hris_candidate_activity_logs', ['created_at'], { name: 'idx_candlog_date' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hris_candidate_activity_logs');
    await queryInterface.dropTable('hris_candidate_accounts');
    await queryInterface.dropTable('hris_training_participant_scores');
    await queryInterface.dropTable('hris_training_competencies');
    await queryInterface.dropTable('hris_training_scoring_configs');
  }
};
