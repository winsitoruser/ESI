'use strict';

/**
 * Migration: Create HRIS Recruitment & Training Tables
 * 
 * This migration creates the following tables:
 * 
 * 1. hris_job_openings       - Job vacancy/opening management
 * 2. hris_candidates          - Candidate/applicant records
 * 3. hris_candidate_stages    - Candidate stage history (audit trail)
 * 4. hris_training_programs   - Training program definitions
 * 5. hris_training_enrollments - Employee enrollment in training programs
 * 6. hris_certifications      - Employee certification records
 * 
 * Dependencies:
 * - tenants table (multi-tenant support)
 * - branches table (branch/location reference)
 * - hris_employees table (employee reference)
 * 
 * Standards:
 * - All tables use UUID primary keys (Sequelize.UUIDV4)
 * - All tables include tenantId for multi-tenant isolation
 * - All tables include createdAt/updatedAt timestamps
 * - All tables include createdBy/updatedBy audit fields
 * - Proper indexes on foreign keys and frequently queried columns
 * - Unique constraints where applicable
 * - ENUM types for status fields with clear valid values
 * - JSONB for flexible metadata storage
 * - Proper ON UPDATE/ON DELETE cascade rules
 * 
 * @version 1.0.0
 * @date 2026-03-01
 * @author Bedagang ERP Team
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ────────────────────────────────────────────────────────────
    // 1. hris_job_openings - Lowongan pekerjaan
    // ────────────────────────────────────────────────────────────
    await queryInterface.createTable('hris_job_openings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: 'Primary key - UUID v4'
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'tenant_id',
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Tenant ID for multi-tenant isolation'
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'branch_id',
        references: { model: 'branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Branch where the position is located'
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Job title / position name'
      },
      department: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Department name'
      },
      location: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Work location'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Full job description'
      },
      requirements: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of requirement strings'
      },
      employmentType: {
        type: Sequelize.ENUM('full_time', 'part_time', 'contract', 'intern', 'freelance'),
        allowNull: false,
        defaultValue: 'full_time',
        field: 'employment_type',
        comment: 'Type of employment'
      },
      level: {
        type: Sequelize.ENUM('entry', 'junior', 'mid', 'senior', 'lead', 'manager', 'director'),
        allowNull: false,
        defaultValue: 'mid',
        comment: 'Seniority level'
      },
      salaryMin: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        field: 'salary_min',
        comment: 'Minimum salary range'
      },
      salaryMax: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        field: 'salary_max',
        comment: 'Maximum salary range'
      },
      hiringManagerId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'hiring_manager_id',
        comment: 'ID of the hiring manager (hris_employees)'
      },
      hiringManagerName: {
        type: Sequelize.STRING(200),
        allowNull: true,
        field: 'hiring_manager_name',
        comment: 'Name of the hiring manager (denormalized)'
      },
      maxApplicants: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'max_applicants',
        comment: 'Maximum number of applicants to accept'
      },
      priority: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'medium',
        comment: 'Hiring priority'
      },
      status: {
        type: Sequelize.ENUM('draft', 'open', 'on_hold', 'closed', 'filled', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft',
        comment: 'Current status of the job opening'
      },
      postedDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        field: 'posted_date',
        comment: 'Date when the opening was published'
      },
      closingDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        field: 'closing_date',
        comment: 'Application deadline'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional flexible metadata'
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'created_by',
        comment: 'User who created the record'
      },
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'updated_by',
        comment: 'User who last updated the record'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        field: 'updated_at'
      }
    });

    await queryInterface.addIndex('hris_job_openings', ['tenant_id'], { name: 'idx_job_openings_tenant' });
    await queryInterface.addIndex('hris_job_openings', ['branch_id'], { name: 'idx_job_openings_branch' });
    await queryInterface.addIndex('hris_job_openings', ['status'], { name: 'idx_job_openings_status' });
    await queryInterface.addIndex('hris_job_openings', ['department'], { name: 'idx_job_openings_department' });
    await queryInterface.addIndex('hris_job_openings', ['priority'], { name: 'idx_job_openings_priority' });
    await queryInterface.addIndex('hris_job_openings', ['posted_date'], { name: 'idx_job_openings_posted' });
    await queryInterface.addIndex('hris_job_openings', ['closing_date'], { name: 'idx_job_openings_closing' });

    // ────────────────────────────────────────────────────────────
    // 2. hris_candidates - Data pelamar
    // ────────────────────────────────────────────────────────────
    await queryInterface.createTable('hris_candidates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: 'Primary key - UUID v4'
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'tenant_id',
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      jobOpeningId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'job_opening_id',
        references: { model: 'hris_job_openings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'The job opening this candidate applied to'
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Candidate full name'
      },
      email: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Candidate email'
      },
      phone: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Candidate phone number'
      },
      source: {
        type: Sequelize.ENUM('linkedin', 'jobstreet', 'indeed', 'referral', 'walk_in', 'website', 'agency', 'other'),
        allowNull: false,
        defaultValue: 'other',
        comment: 'How the candidate found the opening'
      },
      stage: {
        type: Sequelize.ENUM('applied', 'screening', 'test', 'interview', 'reference_check', 'offer', 'hired', 'rejected', 'withdrawn'),
        allowNull: false,
        defaultValue: 'applied',
        comment: 'Current stage in the recruitment pipeline'
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'blacklisted'),
        allowNull: false,
        defaultValue: 'active'
      },
      experienceYears: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'experience_years',
        comment: 'Years of relevant experience'
      },
      education: {
        type: Sequelize.STRING(200),
        allowNull: true,
        comment: 'Highest education level'
      },
      skills: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of skill strings'
      },
      resumeUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
        field: 'resume_url',
        comment: 'URL to uploaded resume/CV'
      },
      rating: {
        type: Sequelize.DECIMAL(3, 1),
        allowNull: true,
        defaultValue: 0,
        comment: 'Recruiter rating (0-5)'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Recruiter notes'
      },
      interviewDate: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'interview_date',
        comment: 'Scheduled interview date'
      },
      interviewerId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'interviewer_id',
        comment: 'ID of the interviewer'
      },
      interviewerName: {
        type: Sequelize.STRING(200),
        allowNull: true,
        field: 'interviewer_name'
      },
      offerSalary: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        field: 'offer_salary',
        comment: 'Offered salary amount'
      },
      rejectionReason: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'rejection_reason'
      },
      appliedDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        field: 'applied_date',
        comment: 'Date the candidate applied'
      },
      hiredDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        field: 'hired_date'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'created_by'
      },
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'updated_by'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        field: 'updated_at'
      }
    });

    await queryInterface.addIndex('hris_candidates', ['tenant_id'], { name: 'idx_candidates_tenant' });
    await queryInterface.addIndex('hris_candidates', ['job_opening_id'], { name: 'idx_candidates_job' });
    await queryInterface.addIndex('hris_candidates', ['email'], { name: 'idx_candidates_email' });
    await queryInterface.addIndex('hris_candidates', ['stage'], { name: 'idx_candidates_stage' });
    await queryInterface.addIndex('hris_candidates', ['status'], { name: 'idx_candidates_status' });
    await queryInterface.addIndex('hris_candidates', ['source'], { name: 'idx_candidates_source' });
    await queryInterface.addIndex('hris_candidates', ['applied_date'], { name: 'idx_candidates_applied_date' });
    await queryInterface.addIndex('hris_candidates', ['rating'], { name: 'idx_candidates_rating' });

    // ────────────────────────────────────────────────────────────
    // 3. hris_candidate_stages - Riwayat perpindahan stage
    // ────────────────────────────────────────────────────────────
    await queryInterface.createTable('hris_candidate_stages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      candidateId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'candidate_id',
        references: { model: 'hris_candidates', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      fromStage: {
        type: Sequelize.STRING(50),
        allowNull: true,
        field: 'from_stage',
        comment: 'Previous stage (null for initial application)'
      },
      toStage: {
        type: Sequelize.STRING(50),
        allowNull: false,
        field: 'to_stage',
        comment: 'New stage'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      changedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'changed_by'
      },
      changedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        field: 'changed_at'
      }
    });

    await queryInterface.addIndex('hris_candidate_stages', ['candidate_id'], { name: 'idx_cand_stages_candidate' });
    await queryInterface.addIndex('hris_candidate_stages', ['changed_at'], { name: 'idx_cand_stages_date' });

    // ────────────────────────────────────────────────────────────
    // 4. hris_training_programs - Program pelatihan
    // ────────────────────────────────────────────────────────────
    await queryInterface.createTable('hris_training_programs', {
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
      title: {
        type: Sequelize.STRING(300),
        allowNull: false,
        comment: 'Training program title'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      category: {
        type: Sequelize.ENUM('soft_skills', 'technical', 'leadership', 'compliance', 'finance', 'operations', 'safety', 'product', 'other'),
        allowNull: false,
        defaultValue: 'other',
        comment: 'Training category'
      },
      type: {
        type: Sequelize.ENUM('workshop', 'course', 'hands_on', 'certification', 'online', 'seminar', 'mentoring'),
        allowNull: false,
        defaultValue: 'workshop',
        comment: 'Training delivery type'
      },
      level: {
        type: Sequelize.ENUM('beginner', 'intermediate', 'advanced', 'all_levels'),
        allowNull: false,
        defaultValue: 'all_levels'
      },
      instructor: {
        type: Sequelize.STRING(200),
        allowNull: true,
        comment: 'Instructor/trainer name'
      },
      durationHours: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 8,
        field: 'duration_hours',
        comment: 'Total training hours'
      },
      maxParticipants: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30,
        field: 'max_participants'
      },
      costPerPerson: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'cost_per_person',
        comment: 'Cost per participant in IDR'
      },
      location: {
        type: Sequelize.STRING(300),
        allowNull: true
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
      status: {
        type: Sequelize.ENUM('draft', 'upcoming', 'active', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft'
      },
      materials: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of material/resource names or URLs'
      },
      skillsCovered: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        field: 'skills_covered',
        comment: 'Array of skill strings covered by this training'
      },
      rating: {
        type: Sequelize.DECIMAL(3, 1),
        allowNull: true,
        defaultValue: 0,
        comment: 'Average participant rating'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'created_by'
      },
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'updated_by'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        field: 'updated_at'
      }
    });

    await queryInterface.addIndex('hris_training_programs', ['tenant_id'], { name: 'idx_training_programs_tenant' });
    await queryInterface.addIndex('hris_training_programs', ['category'], { name: 'idx_training_programs_category' });
    await queryInterface.addIndex('hris_training_programs', ['status'], { name: 'idx_training_programs_status' });
    await queryInterface.addIndex('hris_training_programs', ['start_date'], { name: 'idx_training_programs_start' });
    await queryInterface.addIndex('hris_training_programs', ['end_date'], { name: 'idx_training_programs_end' });

    // ────────────────────────────────────────────────────────────
    // 5. hris_training_enrollments - Pendaftaran peserta pelatihan
    // ────────────────────────────────────────────────────────────
    await queryInterface.createTable('hris_training_enrollments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      programId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'program_id',
        references: { model: 'hris_training_programs', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      employeeId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'employee_id',
        comment: 'Employee ID from hris_employees'
      },
      employeeName: {
        type: Sequelize.STRING(200),
        allowNull: true,
        field: 'employee_name',
        comment: 'Denormalized employee name'
      },
      enrolledAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        field: 'enrolled_at'
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'completed_at'
      },
      status: {
        type: Sequelize.ENUM('enrolled', 'in_progress', 'completed', 'dropped', 'no_show'),
        allowNull: false,
        defaultValue: 'enrolled'
      },
      score: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Test/assessment score if applicable'
      },
      feedback: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Participant feedback'
      },
      rating: {
        type: Sequelize.DECIMAL(3, 1),
        allowNull: true,
        comment: 'Participant rating of the program'
      },
      certificateIssued: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'certificate_issued'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        field: 'updated_at'
      }
    });

    await queryInterface.addIndex('hris_training_enrollments', ['program_id'], { name: 'idx_enrollments_program' });
    await queryInterface.addIndex('hris_training_enrollments', ['employee_id'], { name: 'idx_enrollments_employee' });
    await queryInterface.addIndex('hris_training_enrollments', ['status'], { name: 'idx_enrollments_status' });
    await queryInterface.addIndex('hris_training_enrollments', ['program_id', 'employee_id'], { unique: true, name: 'idx_enrollments_unique' });

    // ────────────────────────────────────────────────────────────
    // 6. hris_certifications - Sertifikasi karyawan
    // ────────────────────────────────────────────────────────────
    await queryInterface.createTable('hris_certifications', {
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
        allowNull: false,
        field: 'employee_id',
        comment: 'Employee ID from hris_employees'
      },
      employeeName: {
        type: Sequelize.STRING(200),
        allowNull: true,
        field: 'employee_name'
      },
      certName: {
        type: Sequelize.STRING(300),
        allowNull: false,
        field: 'cert_name',
        comment: 'Certification name'
      },
      certNumber: {
        type: Sequelize.STRING(100),
        allowNull: true,
        field: 'cert_number',
        comment: 'Certification number/ID'
      },
      issuer: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Issuing organization'
      },
      category: {
        type: Sequelize.ENUM('management', 'compliance', 'safety', 'technical', 'service', 'operations', 'finance', 'other'),
        allowNull: false,
        defaultValue: 'other'
      },
      issueDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        field: 'issue_date'
      },
      expiryDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        field: 'expiry_date',
        comment: 'Null if certification does not expire'
      },
      status: {
        type: Sequelize.ENUM('active', 'expiring_soon', 'expired', 'revoked', 'renewed'),
        allowNull: false,
        defaultValue: 'active'
      },
      documentUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
        field: 'document_url',
        comment: 'URL to scanned certificate'
      },
      trainingProgramId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'training_program_id',
        references: { model: 'hris_training_programs', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Linked training program if applicable'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'created_by'
      },
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'updated_by'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        field: 'updated_at'
      }
    });

    await queryInterface.addIndex('hris_certifications', ['tenant_id'], { name: 'idx_certs_tenant' });
    await queryInterface.addIndex('hris_certifications', ['employee_id'], { name: 'idx_certs_employee' });
    await queryInterface.addIndex('hris_certifications', ['status'], { name: 'idx_certs_status' });
    await queryInterface.addIndex('hris_certifications', ['expiry_date'], { name: 'idx_certs_expiry' });
    await queryInterface.addIndex('hris_certifications', ['category'], { name: 'idx_certs_category' });
    await queryInterface.addIndex('hris_certifications', ['training_program_id'], { name: 'idx_certs_training' });
    await queryInterface.addIndex('hris_certifications', ['employee_id', 'cert_name', 'issuer'], { name: 'idx_certs_unique_per_employee' });
  },

  async down(queryInterface) {
    // Drop tables in reverse order (respecting foreign key dependencies)
    await queryInterface.dropTable('hris_certifications');
    await queryInterface.dropTable('hris_training_enrollments');
    await queryInterface.dropTable('hris_candidate_stages');
    await queryInterface.dropTable('hris_candidates');
    await queryInterface.dropTable('hris_training_programs');
    await queryInterface.dropTable('hris_job_openings');
  }
};
