'use strict';

/**
 * Migration: Create HRIS KPI & Performance Tables
 * 
 * This migration creates the KPI and performance management tables:
 * 
 * 1. employee_kpis        - Individual KPI metrics per employee per period
 * 2. kpi_templates         - Reusable KPI metric definitions
 * 3. kpi_scoring           - Scoring rubrics and rules
 * 4. performance_reviews   - Periodic performance review records
 * 5. leave_requests        - Employee leave/cuti requests
 * 6. hris_webhook_logs     - Webhook event audit trail
 * 
 * Dependencies:
 * - employees table (employee reference)
 * - branches table (branch reference)
 * - users table (reviewer/approver reference)
 * 
 * Standards:
 * - UUID primary keys (UUIDV4)
 * - tenantId for multi-tenant isolation
 * - Named indexes with descriptive prefixes
 * - ENUM types for status and category fields
 * - JSONB for flexible metadata and configuration
 * - Unique constraints on logical combinations
 * 
 * @version 1.0.0
 * @date 2026-02-26
 * @author Bedagang ERP Team
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ──────────────────────────────────────────────────
    // 1. employee_kpis - KPI per karyawan per periode
    // ──────────────────────────────────────────────────
    await queryInterface.createTable('employee_kpis', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      employeeId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'employeeId',
        references: { model: 'employees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'branchId',
        references: { model: 'branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      period: {
        type: Sequelize.STRING(7),
        allowNull: false,
        comment: 'Period in YYYY-MM format'
      },
      metricName: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'metricName'
      },
      category: {
        type: Sequelize.ENUM('sales', 'operations', 'customer', 'financial', 'hr'),
        allowNull: false,
        defaultValue: 'operations'
      },
      target: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      actual: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        defaultValue: 0
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: '%'
      },
      weight: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 100
      },
      status: {
        type: Sequelize.ENUM('pending', 'in_progress', 'achieved', 'exceeded', 'not_achieved'),
        allowNull: false,
        defaultValue: 'pending'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      reviewedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'reviewedBy'
      },
      reviewedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'reviewedAt'
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'tenantId'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addIndex('employee_kpis', ['employeeId'], { name: 'idx_emp_kpis_employee' });
    await queryInterface.addIndex('employee_kpis', ['branchId'], { name: 'idx_emp_kpis_branch' });
    await queryInterface.addIndex('employee_kpis', ['period'], { name: 'idx_emp_kpis_period' });
    await queryInterface.addIndex('employee_kpis', ['category'], { name: 'idx_emp_kpis_category' });
    await queryInterface.addIndex('employee_kpis', ['status'], { name: 'idx_emp_kpis_status' });
    await queryInterface.addIndex('employee_kpis', ['tenantId'], { name: 'idx_emp_kpis_tenant' });
    await queryInterface.addIndex('employee_kpis', ['employeeId', 'metricName', 'period'], { unique: true, name: 'idx_emp_kpis_unique_metric' });

    // ──────────────────────────────────────────────────
    // 2. kpi_templates - Template definisi KPI
    // ──────────────────────────────────────────────────
    await queryInterface.createTable('kpi_templates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      category: {
        type: Sequelize.ENUM('sales', 'operations', 'customer', 'financial', 'hr', 'quality'),
        allowNull: false
      },
      unit: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: '%'
      },
      data_type: {
        type: Sequelize.ENUM('number', 'percentage', 'currency', 'count', 'ratio'),
        allowNull: false,
        defaultValue: 'number'
      },
      formula_type: {
        type: Sequelize.ENUM('simple', 'weighted', 'cumulative', 'average', 'ratio', 'custom'),
        allowNull: false,
        defaultValue: 'simple'
      },
      formula: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      scoring_method: {
        type: Sequelize.ENUM('linear', 'step', 'threshold', 'bell_curve'),
        allowNull: false,
        defaultValue: 'linear'
      },
      scoring_scale: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      default_target: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      default_weight: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 100
      },
      measurement_frequency: {
        type: Sequelize.ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly'),
        allowNull: false,
        defaultValue: 'monthly'
      },
      applicable_to: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: ['all']
      },
      parameters: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addIndex('kpi_templates', ['code'], { unique: true, name: 'idx_kpi_tpl_code_unique' });
    await queryInterface.addIndex('kpi_templates', ['category'], { name: 'idx_kpi_tpl_category' });
    await queryInterface.addIndex('kpi_templates', ['is_active'], { name: 'idx_kpi_tpl_active' });
    await queryInterface.addIndex('kpi_templates', ['tenant_id'], { name: 'idx_kpi_tpl_tenant' });

    // ──────────────────────────────────────────────────
    // 3. kpi_scoring - Rubrik penilaian KPI
    // ──────────────────────────────────────────────────
    await queryInterface.createTable('kpi_scoring', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      scoring_type: {
        type: Sequelize.ENUM('standard', 'custom'),
        allowNull: false,
        defaultValue: 'standard'
      },
      levels: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      },
      weighted_scoring: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      bonus_rules: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      },
      penalty_rules: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addIndex('kpi_scoring', ['scoring_type'], { name: 'idx_kpi_scoring_type' });
    await queryInterface.addIndex('kpi_scoring', ['is_default'], { name: 'idx_kpi_scoring_default' });
    await queryInterface.addIndex('kpi_scoring', ['tenant_id'], { name: 'idx_kpi_scoring_tenant' });

    // ──────────────────────────────────────────────────
    // 4. performance_reviews - Review kinerja berkala
    // ──────────────────────────────────────────────────
    await queryInterface.createTable('performance_reviews', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      employeeId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'employeeId',
        references: { model: 'employees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'branchId',
        references: { model: 'branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      reviewPeriod: {
        type: Sequelize.STRING(10),
        allowNull: false,
        field: 'reviewPeriod'
      },
      reviewDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        field: 'reviewDate'
      },
      reviewerId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'reviewerId',
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      reviewerName: {
        type: Sequelize.STRING,
        allowNull: true,
        field: 'reviewerName'
      },
      overallRating: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
        field: 'overallRating'
      },
      categories: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      },
      strengths: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      },
      areasForImprovement: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
        field: 'areasForImprovement'
      },
      goals: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: []
      },
      achievements: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      developmentPlan: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'developmentPlan'
      },
      employeeComments: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'employeeComments'
      },
      managerComments: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'managerComments'
      },
      status: {
        type: Sequelize.ENUM('draft', 'submitted', 'reviewed', 'acknowledged', 'closed'),
        allowNull: false,
        defaultValue: 'draft'
      },
      acknowledgedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'acknowledgedAt'
      },
      salaryRecommendation: {
        type: Sequelize.ENUM('no_change', 'increase', 'decrease', 'promotion', 'bonus'),
        allowNull: true,
        field: 'salaryRecommendation'
      },
      salaryRecommendationAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        field: 'salaryRecommendationAmount'
      },
      promotionRecommendation: {
        type: Sequelize.STRING,
        allowNull: true,
        field: 'promotionRecommendation'
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'tenantId'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addIndex('performance_reviews', ['employeeId'], { name: 'idx_perf_reviews_employee' });
    await queryInterface.addIndex('performance_reviews', ['branchId'], { name: 'idx_perf_reviews_branch' });
    await queryInterface.addIndex('performance_reviews', ['reviewerId'], { name: 'idx_perf_reviews_reviewer' });
    await queryInterface.addIndex('performance_reviews', ['reviewPeriod'], { name: 'idx_perf_reviews_period' });
    await queryInterface.addIndex('performance_reviews', ['status'], { name: 'idx_perf_reviews_status' });
    await queryInterface.addIndex('performance_reviews', ['tenantId'], { name: 'idx_perf_reviews_tenant' });
    await queryInterface.addIndex('performance_reviews', ['employeeId', 'reviewPeriod'], { unique: true, name: 'idx_perf_reviews_emp_period_unique' });

    // ──────────────────────────────────────────────────
    // 5. leave_requests - Pengajuan cuti karyawan
    // ──────────────────────────────────────────────────
    await queryInterface.createTable('leave_requests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      employeeId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'employeeId',
        references: { model: 'employees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'branchId',
        references: { model: 'branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      leaveType: {
        type: Sequelize.ENUM('annual', 'sick', 'maternity', 'paternity', 'unpaid', 'personal', 'bereavement', 'marriage', 'religious'),
        allowNull: false,
        field: 'leaveType'
      },
      startDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        field: 'startDate'
      },
      endDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        field: 'endDate'
      },
      totalDays: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'totalDays'
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      attachmentUrl: {
        type: Sequelize.STRING,
        allowNull: true,
        field: 'attachmentUrl'
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      approvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'approvedBy',
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'approvedAt'
      },
      rejectionReason: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'rejectionReason'
      },
      delegateTo: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'delegateTo',
        references: { model: 'employees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'tenantId'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addIndex('leave_requests', ['employeeId'], { name: 'idx_leave_req_employee' });
    await queryInterface.addIndex('leave_requests', ['branchId'], { name: 'idx_leave_req_branch' });
    await queryInterface.addIndex('leave_requests', ['leaveType'], { name: 'idx_leave_req_type' });
    await queryInterface.addIndex('leave_requests', ['status'], { name: 'idx_leave_req_status' });
    await queryInterface.addIndex('leave_requests', ['startDate'], { name: 'idx_leave_req_start' });
    await queryInterface.addIndex('leave_requests', ['tenantId'], { name: 'idx_leave_req_tenant' });
    await queryInterface.addIndex('leave_requests', ['approvedBy'], { name: 'idx_leave_req_approver' });

    // ──────────────────────────────────────────────────
    // 6. hris_webhook_logs - Audit trail webhook events
    // ──────────────────────────────────────────────────
    await queryInterface.createTable('hris_webhook_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      eventType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        field: 'eventType'
      },
      employeeId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'employeeId'
      },
      employeeName: {
        type: Sequelize.STRING,
        allowNull: true,
        field: 'employeeName'
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'branchId'
      },
      branchName: {
        type: Sequelize.STRING,
        allowNull: true,
        field: 'branchName'
      },
      data: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {}
      },
      triggeredBy: {
        type: Sequelize.STRING,
        allowNull: true,
        field: 'triggeredBy'
      },
      status: {
        type: Sequelize.ENUM('triggered', 'processed', 'failed'),
        allowNull: false,
        defaultValue: 'triggered'
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'tenantId'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    await queryInterface.addIndex('hris_webhook_logs', ['eventType'], { name: 'idx_webhook_logs_event' });
    await queryInterface.addIndex('hris_webhook_logs', ['employeeId'], { name: 'idx_webhook_logs_employee' });
    await queryInterface.addIndex('hris_webhook_logs', ['branchId'], { name: 'idx_webhook_logs_branch' });
    await queryInterface.addIndex('hris_webhook_logs', ['status'], { name: 'idx_webhook_logs_status' });
    await queryInterface.addIndex('hris_webhook_logs', ['tenantId'], { name: 'idx_webhook_logs_tenant' });
    await queryInterface.addIndex('hris_webhook_logs', ['createdAt'], { name: 'idx_webhook_logs_created' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hris_webhook_logs');
    await queryInterface.dropTable('leave_requests');
    await queryInterface.dropTable('performance_reviews');
    await queryInterface.dropTable('kpi_scoring');
    await queryInterface.dropTable('kpi_templates');
    await queryInterface.dropTable('employee_kpis');
  }
};
