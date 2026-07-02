'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create employee_kpis table
    await queryInterface.createTable('employee_kpis', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      employeeId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'employee_id',
        references: {
          model: 'employees',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'branch_id',
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      period: {
        type: Sequelize.STRING(7),
        allowNull: false
      },
      metricName: {
        type: Sequelize.STRING,
        allowNull: false,
        field: 'metric_name'
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
        field: 'reviewed_by'
      },
      reviewedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'reviewed_at'
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'tenant_id'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'updated_at'
      }
    });

    // Create employee_attendance table
    await queryInterface.createTable('employee_attendance', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      employeeId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'employee_id',
        references: {
          model: 'employees',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'branch_id',
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      clockIn: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'clock_in'
      },
      clockOut: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'clock_out'
      },
      scheduledStart: {
        type: Sequelize.TIME,
        allowNull: true,
        field: 'scheduled_start'
      },
      scheduledEnd: {
        type: Sequelize.TIME,
        allowNull: true,
        field: 'scheduled_end'
      },
      status: {
        type: Sequelize.ENUM('present', 'late', 'absent', 'leave', 'sick', 'holiday', 'work_from_home'),
        allowNull: false,
        defaultValue: 'present'
      },
      lateMinutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        field: 'late_minutes'
      },
      earlyLeaveMinutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        field: 'early_leave_minutes'
      },
      overtimeMinutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        field: 'overtime_minutes'
      },
      workHours: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0,
        field: 'work_hours'
      },
      breakMinutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 60,
        field: 'break_minutes'
      },
      leaveType: {
        type: Sequelize.STRING,
        allowNull: true,
        field: 'leave_type'
      },
      leaveReason: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'leave_reason'
      },
      approvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'approved_by'
      },
      clockInLocation: {
        type: Sequelize.JSONB,
        allowNull: true,
        field: 'clock_in_location'
      },
      clockOutLocation: {
        type: Sequelize.JSONB,
        allowNull: true,
        field: 'clock_out_location'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'tenant_id'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'updated_at'
      }
    });

    // Create performance_reviews table
    await queryInterface.createTable('performance_reviews', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      employeeId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'employee_id',
        references: {
          model: 'employees',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'branch_id',
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      reviewPeriod: {
        type: Sequelize.STRING(10),
        allowNull: false,
        field: 'review_period'
      },
      reviewDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        field: 'review_date'
      },
      reviewerId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'reviewer_id'
      },
      reviewerName: {
        type: Sequelize.STRING,
        allowNull: true,
        field: 'reviewer_name'
      },
      overallRating: {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
        field: 'overall_rating'
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
        field: 'areas_for_improvement'
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
        field: 'development_plan'
      },
      employeeComments: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'employee_comments'
      },
      managerComments: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'manager_comments'
      },
      status: {
        type: Sequelize.ENUM('draft', 'submitted', 'reviewed', 'acknowledged', 'closed'),
        allowNull: false,
        defaultValue: 'draft'
      },
      acknowledgedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'acknowledged_at'
      },
      salaryRecommendation: {
        type: Sequelize.ENUM('no_change', 'increase', 'decrease', 'promotion', 'bonus'),
        allowNull: true,
        field: 'salary_recommendation'
      },
      salaryRecommendationAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        field: 'salary_recommendation_amount'
      },
      promotionRecommendation: {
        type: Sequelize.STRING,
        allowNull: true,
        field: 'promotion_recommendation'
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'tenant_id'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'updated_at'
      }
    });

    // Add indexes
    await queryInterface.addIndex('employee_kpis', ['employee_id']);
    await queryInterface.addIndex('employee_kpis', ['branch_id']);
    await queryInterface.addIndex('employee_kpis', ['period']);
    await queryInterface.addIndex('employee_kpis', ['category']);
    await queryInterface.addIndex('employee_kpis', ['status']);
    await queryInterface.addIndex('employee_kpis', ['tenant_id']);

    await queryInterface.addIndex('employee_attendance', ['employee_id']);
    await queryInterface.addIndex('employee_attendance', ['branch_id']);
    await queryInterface.addIndex('employee_attendance', ['date']);
    await queryInterface.addIndex('employee_attendance', ['status']);
    await queryInterface.addIndex('employee_attendance', ['tenant_id']);

    await queryInterface.addIndex('performance_reviews', ['employee_id']);
    await queryInterface.addIndex('performance_reviews', ['branch_id']);
    await queryInterface.addIndex('performance_reviews', ['reviewer_id']);
    await queryInterface.addIndex('performance_reviews', ['review_period']);
    await queryInterface.addIndex('performance_reviews', ['status']);
    await queryInterface.addIndex('performance_reviews', ['tenant_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('performance_reviews');
    await queryInterface.dropTable('employee_attendance');
    await queryInterface.dropTable('employee_kpis');
  }
};
