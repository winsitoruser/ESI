'use strict';

/**
 * Migration: HRIS Training & Development Module
 * 
 * Extends the existing training system with:
 * 
 * 1. hris_training_curricula     - Kurikulum/silabus pelatihan
 * 2. hris_training_modules       - Modul pembelajaran per kurikulum
 * 3. hris_training_batches       - Batch/angkatan pelatihan (outsourcing support)
 * 4. hris_training_schedules     - Jadwal detail per sesi/modul
 * 5. hris_training_exams         - Ujian/assessment
 * 6. hris_training_exam_questions - Bank soal
 * 7. hris_training_exam_results  - Hasil ujian peserta
 * 8. hris_training_graduations   - Status kelulusan & sertifikasi
 * 9. hris_training_placements    - Penempatan pasca pelatihan (outsourcing: penyaluran)
 * 
 * Supports:
 * - General industry training & development
 * - Outsourcing: recruitment → training → deployment pipeline
 * - Multi-batch management for large-scale onboarding
 * 
 * @version 1.0.0
 * @date 2026-03-07
 */

module.exports = {
  async up(queryInterface, Sequelize) {

    // ────────────────────────────────────────────────────────────
    // 1. hris_training_curricula - Kurikulum pelatihan
    // ────────────────────────────────────────────────────────────
    await queryInterface.createTable('hris_training_curricula', {
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
      programId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'program_id',
        references: { model: 'hris_training_programs', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Linked training program (optional)'
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Curriculum code e.g. CUR-2026-001'
      },
      title: {
        type: Sequelize.STRING(300),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: 'general',
        comment: 'Category: onboarding, technical, soft_skill, compliance, outsourcing_induction, etc.'
      },
      targetAudience: {
        type: Sequelize.STRING(200),
        allowNull: true,
        field: 'target_audience',
        comment: 'Target: new_hire, outsourcing_candidate, existing_employee, promotion_candidate'
      },
      totalHours: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'total_hours'
      },
      totalModules: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'total_modules'
      },
      passingScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 70.00,
        field: 'passing_score',
        comment: 'Minimum score to pass (0-100)'
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'draft',
        comment: 'draft, active, archived'
      },
      version: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: '1.0'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      },
      createdBy: { type: Sequelize.UUID, allowNull: true, field: 'created_by' },
      updatedBy: { type: Sequelize.UUID, allowNull: true, field: 'updated_by' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' }
    });

    await queryInterface.addIndex('hris_training_curricula', ['tenant_id'], { name: 'idx_curricula_tenant' });
    await queryInterface.addIndex('hris_training_curricula', ['program_id'], { name: 'idx_curricula_program' });
    await queryInterface.addIndex('hris_training_curricula', ['status'], { name: 'idx_curricula_status' });
    await queryInterface.addIndex('hris_training_curricula', ['category'], { name: 'idx_curricula_category' });
    await queryInterface.addIndex('hris_training_curricula', ['tenant_id', 'code'], { unique: true, name: 'idx_curricula_code_unique' });

    // ────────────────────────────────────────────────────────────
    // 2. hris_training_modules - Modul pembelajaran
    // ────────────────────────────────────────────────────────────
    await queryInterface.createTable('hris_training_modules', {
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
        allowNull: false,
        field: 'curriculum_id',
        references: { model: 'hris_training_curricula', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(300),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      orderIndex: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'order_index',
        comment: 'Sequence order within curriculum'
      },
      durationHours: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: 'duration_hours'
      },
      moduleType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'lesson',
        field: 'module_type',
        comment: 'lesson, practical, assessment, workshop, field_work, simulation'
      },
      deliveryMethod: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'classroom',
        field: 'delivery_method',
        comment: 'classroom, online, hybrid, on_the_job, self_paced'
      },
      materials: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of {name, type, url} learning materials'
      },
      objectives: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Learning objectives array'
      },
      prerequisites: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of prerequisite module IDs'
      },
      hasExam: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'has_exam'
      },
      passingScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        field: 'passing_score'
      },
      isMandatory: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_mandatory'
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'active',
        comment: 'active, inactive, draft'
      },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdBy: { type: Sequelize.UUID, allowNull: true, field: 'created_by' },
      updatedBy: { type: Sequelize.UUID, allowNull: true, field: 'updated_by' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' }
    });

    await queryInterface.addIndex('hris_training_modules', ['tenant_id'], { name: 'idx_tmodules_tenant' });
    await queryInterface.addIndex('hris_training_modules', ['curriculum_id'], { name: 'idx_tmodules_curriculum' });
    await queryInterface.addIndex('hris_training_modules', ['order_index'], { name: 'idx_tmodules_order' });
    await queryInterface.addIndex('hris_training_modules', ['module_type'], { name: 'idx_tmodules_type' });
    await queryInterface.addIndex('hris_training_modules', ['status'], { name: 'idx_tmodules_status' });

    // ────────────────────────────────────────────────────────────
    // 3. hris_training_batches - Batch/angkatan pelatihan
    // ────────────────────────────────────────────────────────────
    await queryInterface.createTable('hris_training_batches', {
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
        allowNull: false,
        field: 'curriculum_id',
        references: { model: 'hris_training_curricula', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      programId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'program_id',
        references: { model: 'hris_training_programs', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      batchCode: {
        type: Sequelize.STRING(50),
        allowNull: false,
        field: 'batch_code',
        comment: 'Batch identifier e.g. BATCH-2026-001'
      },
      batchName: {
        type: Sequelize.STRING(200),
        allowNull: false,
        field: 'batch_name'
      },
      batchType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'regular',
        field: 'batch_type',
        comment: 'regular, outsourcing, onboarding, upskilling, reskilling'
      },
      startDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        field: 'start_date'
      },
      endDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        field: 'end_date'
      },
      maxParticipants: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30,
        field: 'max_participants'
      },
      currentParticipants: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'current_participants'
      },
      instructor: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      location: {
        type: Sequelize.STRING(300),
        allowNull: true
      },
      clientCompany: {
        type: Sequelize.STRING(200),
        allowNull: true,
        field: 'client_company',
        comment: 'For outsourcing: client company name'
      },
      contractId: {
        type: Sequelize.STRING(100),
        allowNull: true,
        field: 'contract_id',
        comment: 'For outsourcing: contract/PO reference'
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'planned',
        comment: 'planned, registration, in_progress, exam_phase, completed, cancelled'
      },
      graduationRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        field: 'graduation_rate'
      },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdBy: { type: Sequelize.UUID, allowNull: true, field: 'created_by' },
      updatedBy: { type: Sequelize.UUID, allowNull: true, field: 'updated_by' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' }
    });

    await queryInterface.addIndex('hris_training_batches', ['tenant_id'], { name: 'idx_tbatches_tenant' });
    await queryInterface.addIndex('hris_training_batches', ['curriculum_id'], { name: 'idx_tbatches_curriculum' });
    await queryInterface.addIndex('hris_training_batches', ['program_id'], { name: 'idx_tbatches_program' });
    await queryInterface.addIndex('hris_training_batches', ['status'], { name: 'idx_tbatches_status' });
    await queryInterface.addIndex('hris_training_batches', ['batch_type'], { name: 'idx_tbatches_type' });
    await queryInterface.addIndex('hris_training_batches', ['start_date'], { name: 'idx_tbatches_start' });
    await queryInterface.addIndex('hris_training_batches', ['tenant_id', 'batch_code'], { unique: true, name: 'idx_tbatches_code_unique' });

    // ────────────────────────────────────────────────────────────
    // 4. hris_training_schedules - Jadwal detail per sesi
    // ────────────────────────────────────────────────────────────
    await queryInterface.createTable('hris_training_schedules', {
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
      batchId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'batch_id',
        references: { model: 'hris_training_batches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      moduleId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'module_id',
        references: { model: 'hris_training_modules', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      sessionTitle: {
        type: Sequelize.STRING(300),
        allowNull: false,
        field: 'session_title'
      },
      sessionDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        field: 'session_date'
      },
      startTime: {
        type: Sequelize.TIME,
        allowNull: false,
        field: 'start_time'
      },
      endTime: {
        type: Sequelize.TIME,
        allowNull: false,
        field: 'end_time'
      },
      instructor: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      location: {
        type: Sequelize.STRING(300),
        allowNull: true
      },
      sessionType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'class',
        field: 'session_type',
        comment: 'class, lab, exam, review, field_visit, presentation'
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'scheduled',
        comment: 'scheduled, in_progress, completed, cancelled, rescheduled'
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' }
    });

    await queryInterface.addIndex('hris_training_schedules', ['tenant_id'], { name: 'idx_tschedules_tenant' });
    await queryInterface.addIndex('hris_training_schedules', ['batch_id'], { name: 'idx_tschedules_batch' });
    await queryInterface.addIndex('hris_training_schedules', ['module_id'], { name: 'idx_tschedules_module' });
    await queryInterface.addIndex('hris_training_schedules', ['session_date'], { name: 'idx_tschedules_date' });
    await queryInterface.addIndex('hris_training_schedules', ['status'], { name: 'idx_tschedules_status' });

    // ────────────────────────────────────────────────────────────
    // 5. hris_training_exams - Ujian/assessment
    // ────────────────────────────────────────────────────────────
    await queryInterface.createTable('hris_training_exams', {
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
      moduleId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'module_id',
        references: { model: 'hris_training_modules', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      batchId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'batch_id',
        references: { model: 'hris_training_batches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      title: {
        type: Sequelize.STRING(300),
        allowNull: false
      },
      description: { type: Sequelize.TEXT, allowNull: true },
      examType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'written',
        field: 'exam_type',
        comment: 'written, practical, oral, online, mixed'
      },
      examScope: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'module',
        field: 'exam_scope',
        comment: 'module (per modul), midterm, final, competency, certification'
      },
      totalQuestions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'total_questions'
      },
      totalScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 100,
        field: 'total_score'
      },
      passingScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 70,
        field: 'passing_score'
      },
      durationMinutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 60,
        field: 'duration_minutes'
      },
      examDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        field: 'exam_date'
      },
      startTime: {
        type: Sequelize.TIME,
        allowNull: true,
        field: 'start_time'
      },
      maxAttempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: 'max_attempts'
      },
      shuffleQuestions: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'shuffle_questions'
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'draft',
        comment: 'draft, scheduled, open, in_progress, closed, graded'
      },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdBy: { type: Sequelize.UUID, allowNull: true, field: 'created_by' },
      updatedBy: { type: Sequelize.UUID, allowNull: true, field: 'updated_by' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' }
    });

    await queryInterface.addIndex('hris_training_exams', ['tenant_id'], { name: 'idx_texams_tenant' });
    await queryInterface.addIndex('hris_training_exams', ['curriculum_id'], { name: 'idx_texams_curriculum' });
    await queryInterface.addIndex('hris_training_exams', ['module_id'], { name: 'idx_texams_module' });
    await queryInterface.addIndex('hris_training_exams', ['batch_id'], { name: 'idx_texams_batch' });
    await queryInterface.addIndex('hris_training_exams', ['exam_date'], { name: 'idx_texams_date' });
    await queryInterface.addIndex('hris_training_exams', ['status'], { name: 'idx_texams_status' });

    // ────────────────────────────────────────────────────────────
    // 6. hris_training_exam_questions - Bank soal
    // ────────────────────────────────────────────────────────────
    await queryInterface.createTable('hris_training_exam_questions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      examId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'exam_id',
        references: { model: 'hris_training_exams', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      questionNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'question_number'
      },
      questionText: {
        type: Sequelize.TEXT,
        allowNull: false,
        field: 'question_text'
      },
      questionType: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'multiple_choice',
        field: 'question_type',
        comment: 'multiple_choice, true_false, essay, short_answer, practical'
      },
      options: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of {label, text, isCorrect} for MC/TF'
      },
      correctAnswer: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'correct_answer',
        comment: 'Correct answer key or text'
      },
      score: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 1,
        comment: 'Points for this question'
      },
      explanation: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Answer explanation'
      },
      difficulty: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'medium',
        comment: 'easy, medium, hard'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' }
    });

    await queryInterface.addIndex('hris_training_exam_questions', ['exam_id'], { name: 'idx_tquestions_exam' });
    await queryInterface.addIndex('hris_training_exam_questions', ['question_number'], { name: 'idx_tquestions_number' });

    // ────────────────────────────────────────────────────────────
    // 7. hris_training_exam_results - Hasil ujian peserta
    // ────────────────────────────────────────────────────────────
    await queryInterface.createTable('hris_training_exam_results', {
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
      examId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'exam_id',
        references: { model: 'hris_training_exams', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      employeeId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'employee_id'
      },
      employeeName: {
        type: Sequelize.STRING(200),
        allowNull: true,
        field: 'employee_name'
      },
      batchId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'batch_id',
        references: { model: 'hris_training_batches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      attemptNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        field: 'attempt_number'
      },
      score: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Achieved score'
      },
      totalCorrect: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'total_correct'
      },
      totalAnswered: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'total_answered'
      },
      isPassed: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        field: 'is_passed'
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'started_at'
      },
      submittedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'submitted_at'
      },
      gradedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'graded_at'
      },
      gradedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'graded_by'
      },
      answers: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of {questionId, answer, score, isCorrect}'
      },
      feedback: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'pending, in_progress, submitted, graded, invalidated'
      },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' }
    });

    await queryInterface.addIndex('hris_training_exam_results', ['tenant_id'], { name: 'idx_tresults_tenant' });
    await queryInterface.addIndex('hris_training_exam_results', ['exam_id'], { name: 'idx_tresults_exam' });
    await queryInterface.addIndex('hris_training_exam_results', ['employee_id'], { name: 'idx_tresults_employee' });
    await queryInterface.addIndex('hris_training_exam_results', ['batch_id'], { name: 'idx_tresults_batch' });
    await queryInterface.addIndex('hris_training_exam_results', ['is_passed'], { name: 'idx_tresults_passed' });
    await queryInterface.addIndex('hris_training_exam_results', ['status'], { name: 'idx_tresults_status' });

    // ────────────────────────────────────────────────────────────
    // 8. hris_training_graduations - Status kelulusan
    // ────────────────────────────────────────────────────────────
    await queryInterface.createTable('hris_training_graduations', {
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
      employeeName: {
        type: Sequelize.STRING(200),
        allowNull: true,
        field: 'employee_name'
      },
      curriculumId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'curriculum_id',
        references: { model: 'hris_training_curricula', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      finalScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        field: 'final_score'
      },
      examScoreAvg: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        field: 'exam_score_avg'
      },
      attendanceRate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        field: 'attendance_rate'
      },
      practicalScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        field: 'practical_score'
      },
      graduationStatus: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'in_progress',
        field: 'graduation_status',
        comment: 'in_progress, passed, failed, conditional, remedial, withdrawn'
      },
      rank: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Ranking within batch'
      },
      graduationDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        field: 'graduation_date'
      },
      certificateNumber: {
        type: Sequelize.STRING(100),
        allowNull: true,
        field: 'certificate_number'
      },
      certificateUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
        field: 'certificate_url'
      },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      readyForPlacement: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'ready_for_placement',
        comment: 'Flag: ready to be placed/deployed'
      },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdBy: { type: Sequelize.UUID, allowNull: true, field: 'created_by' },
      updatedBy: { type: Sequelize.UUID, allowNull: true, field: 'updated_by' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' }
    });

    await queryInterface.addIndex('hris_training_graduations', ['tenant_id'], { name: 'idx_tgraduations_tenant' });
    await queryInterface.addIndex('hris_training_graduations', ['batch_id'], { name: 'idx_tgraduations_batch' });
    await queryInterface.addIndex('hris_training_graduations', ['employee_id'], { name: 'idx_tgraduations_employee' });
    await queryInterface.addIndex('hris_training_graduations', ['graduation_status'], { name: 'idx_tgraduations_status' });
    await queryInterface.addIndex('hris_training_graduations', ['ready_for_placement'], { name: 'idx_tgraduations_placement' });
    await queryInterface.addIndex('hris_training_graduations', ['batch_id', 'employee_id'], { unique: true, name: 'idx_tgraduations_unique' });

    // ────────────────────────────────────────────────────────────
    // 9. hris_training_placements - Penempatan/penyaluran
    // ────────────────────────────────────────────────────────────
    await queryInterface.createTable('hris_training_placements', {
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
        allowNull: true,
        field: 'graduation_id',
        references: { model: 'hris_training_graduations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      employeeId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'employee_id'
      },
      employeeName: {
        type: Sequelize.STRING(200),
        allowNull: true,
        field: 'employee_name'
      },
      batchId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'batch_id',
        references: { model: 'hris_training_batches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      placementType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'internal',
        field: 'placement_type',
        comment: 'internal, outsourcing_deployment, client_site, branch_transfer, project_based'
      },
      targetBranchId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'target_branch_id',
        references: { model: 'branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      targetBranchName: {
        type: Sequelize.STRING(200),
        allowNull: true,
        field: 'target_branch_name'
      },
      clientCompany: {
        type: Sequelize.STRING(200),
        allowNull: true,
        field: 'client_company',
        comment: 'For outsourcing: client company'
      },
      clientSite: {
        type: Sequelize.STRING(300),
        allowNull: true,
        field: 'client_site',
        comment: 'Specific work location/site'
      },
      position: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Assigned position/role'
      },
      department: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      startDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        field: 'start_date'
      },
      endDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        field: 'end_date',
        comment: 'For contract/outsourcing: contract end date'
      },
      contractValue: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        field: 'contract_value',
        comment: 'Monthly billing/salary for placement'
      },
      status: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'pending, confirmed, active, completed, cancelled, recalled'
      },
      performanceRating: {
        type: Sequelize.DECIMAL(3, 1),
        allowNull: true,
        field: 'performance_rating',
        comment: 'Post-placement performance (0-5)'
      },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      createdBy: { type: Sequelize.UUID, allowNull: true, field: 'created_by' },
      updatedBy: { type: Sequelize.UUID, allowNull: true, field: 'updated_by' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'created_at' },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW'), field: 'updated_at' }
    });

    await queryInterface.addIndex('hris_training_placements', ['tenant_id'], { name: 'idx_tplacements_tenant' });
    await queryInterface.addIndex('hris_training_placements', ['graduation_id'], { name: 'idx_tplacements_graduation' });
    await queryInterface.addIndex('hris_training_placements', ['employee_id'], { name: 'idx_tplacements_employee' });
    await queryInterface.addIndex('hris_training_placements', ['batch_id'], { name: 'idx_tplacements_batch' });
    await queryInterface.addIndex('hris_training_placements', ['status'], { name: 'idx_tplacements_status' });
    await queryInterface.addIndex('hris_training_placements', ['placement_type'], { name: 'idx_tplacements_type' });
    await queryInterface.addIndex('hris_training_placements', ['target_branch_id'], { name: 'idx_tplacements_branch' });
    await queryInterface.addIndex('hris_training_placements', ['client_company'], { name: 'idx_tplacements_client' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hris_training_placements');
    await queryInterface.dropTable('hris_training_graduations');
    await queryInterface.dropTable('hris_training_exam_results');
    await queryInterface.dropTable('hris_training_exam_questions');
    await queryInterface.dropTable('hris_training_exams');
    await queryInterface.dropTable('hris_training_schedules');
    await queryInterface.dropTable('hris_training_batches');
    await queryInterface.dropTable('hris_training_modules');
    await queryInterface.dropTable('hris_training_curricula');
  }
};
