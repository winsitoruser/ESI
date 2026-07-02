'use strict';

/**
 * Migration: Create HRIS Core Tables
 * 
 * This migration creates the foundational HRIS tables:
 * 
 * 1. hris_employees          - Master employee data
 * 2. hris_attendance          - Daily attendance records
 * 3. hris_performance_reviews - Performance review records
 * 
 * Dependencies:
 * - tenants table (multi-tenant support)
 * - branches table (branch/location reference)
 * 
 * Standards:
 * - UUID primary keys (UUIDV4)
 * - tenantId for multi-tenant isolation
 * - createdAt/updatedAt timestamps
 * - createdBy/updatedBy audit fields
 * - Proper indexes on FKs and query columns
 * - ENUM types for status fields
 * - JSONB for flexible metadata
 * 
 * @version 1.0.0
 * @date 2026-02-26
 * @author Bedagang ERP Team
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ──────────────────────────────────────────────────
    // 1. hris_employees - Master data karyawan
    // ──────────────────────────────────────────────────
    await queryInterface.createTable('hris_employees', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'branches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      employeeNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      position: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      department: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      managerId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'hris_employees',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      joinDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'on_leave', 'terminated'),
        allowNull: false,
        defaultValue: 'active',
      },
      employmentType: {
        type: Sequelize.ENUM('full_time', 'part_time', 'contract', 'intern'),
        allowNull: false,
        defaultValue: 'full_time',
      },
      salary: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
      },
      bankAccount: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      taxId: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      emergencyContact: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      documents: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('hris_employees', ['tenantId'], { name: 'idx_hris_employees_tenant' });
    await queryInterface.addIndex('hris_employees', ['branchId'], { name: 'idx_hris_employees_branch' });
    await queryInterface.addIndex('hris_employees', ['email'], { name: 'idx_hris_employees_email' });
    await queryInterface.addIndex('hris_employees', ['status'], { name: 'idx_hris_employees_status' });
    await queryInterface.addIndex('hris_employees', ['department'], { name: 'idx_hris_employees_dept' });

    // ──────────────────────────────────────────────────
    // 2. hris_attendance - Rekap kehadiran harian
    // ──────────────────────────────────────────────────
    await queryInterface.createTable('hris_attendance', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      branchId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'branches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      employeeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'hris_employees',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      checkIn: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      checkOut: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      workHours: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      },
      overtimeHours: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM('present', 'absent', 'late', 'half_day', 'leave', 'sick', 'holiday'),
        allowNull: false,
        defaultValue: 'present',
      },
      leaveType: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      location: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('hris_attendance', ['tenantId'], { name: 'idx_hris_attendance_tenant' });
    await queryInterface.addIndex('hris_attendance', ['branchId'], { name: 'idx_hris_attendance_branch' });
    await queryInterface.addIndex('hris_attendance', ['employeeId'], { name: 'idx_hris_attendance_employee' });
    await queryInterface.addIndex('hris_attendance', ['date'], { name: 'idx_hris_attendance_date' });
    await queryInterface.addIndex('hris_attendance', ['status'], { name: 'idx_hris_attendance_status' });
    await queryInterface.addIndex('hris_attendance', ['employeeId', 'date'], { unique: true, name: 'idx_hris_attendance_emp_date_unique' });

    // ──────────────────────────────────────────────────
    // 3. hris_performance_reviews - Evaluasi kinerja
    // ──────────────────────────────────────────────────
    await queryInterface.createTable('hris_performance_reviews', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'tenants',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      employeeId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'hris_employees',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reviewerId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'hris_employees',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      reviewPeriod: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      reviewDate: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      performanceScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
      },
      kpiAchievement: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
      },
      attendanceScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
      },
      rating: {
        type: Sequelize.DECIMAL(3, 1),
        allowNull: false,
      },
      strengths: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      weaknesses: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      goals: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      comments: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('draft', 'submitted', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'draft',
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('hris_performance_reviews', ['tenantId'], { name: 'idx_hris_perf_reviews_tenant' });
    await queryInterface.addIndex('hris_performance_reviews', ['employeeId'], { name: 'idx_hris_perf_reviews_employee' });
    await queryInterface.addIndex('hris_performance_reviews', ['reviewerId'], { name: 'idx_hris_perf_reviews_reviewer' });
    await queryInterface.addIndex('hris_performance_reviews', ['reviewDate'], { name: 'idx_hris_perf_reviews_date' });
    await queryInterface.addIndex('hris_performance_reviews', ['status'], { name: 'idx_hris_perf_reviews_status' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('hris_performance_reviews');
    await queryInterface.dropTable('hris_attendance');
    await queryInterface.dropTable('hris_employees');
  }
};
