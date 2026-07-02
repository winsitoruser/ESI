'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create employee_branch_assignments table for many-to-many relationship
    await queryInterface.createTable('employee_branch_assignments', {
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
        allowNull: false,
        field: 'branch_id',
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      isPrimary: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_primary',
        comment: 'Primary branch assignment for the employee'
      },
      canRoam: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'can_roam',
        comment: 'Whether employee can work at other branches'
      },
      role: {
        type: Sequelize.ENUM('cashier', 'waiter', 'kitchen', 'supervisor', 'manager'),
        allowNull: false,
        defaultValue: 'cashier',
        comment: 'Role specific to this branch'
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        field: 'start_date'
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'end_date',
        comment: 'End date of assignment (null for ongoing)'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active'
      },
      assignedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'assigned_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'tenant_id',
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
    await queryInterface.addIndex('employee_branch_assignments', ['employee_id']);
    await queryInterface.addIndex('employee_branch_assignments', ['branch_id']);
    await queryInterface.addIndex('employee_branch_assignments', ['is_primary']);
    await queryInterface.addIndex('employee_branch_assignments', ['can_roam']);
    await queryInterface.addIndex('employee_branch_assignments', ['is_active']);
    await queryInterface.addIndex('employee_branch_assignments', ['tenant_id']);
    await queryInterface.addIndex('employee_branch_assignments', ['employee_id', 'branch_id'], {
      unique: true,
      name: 'employee_branch_assignment_unique'
    });

    // Create roaming_requests table
    await queryInterface.createTable('roaming_requests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      requestNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
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
      fromBranchId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'from_branch_id',
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      toBranchId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'to_branch_id',
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'start_date'
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'end_date'
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Reason for roaming request'
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      approvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'approved_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'approved_at'
      },
      rejectionReason: {
        type: Sequelize.TEXT,
        allowNull: true,
        field: 'rejection_reason'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      requestedBy: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'requested_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'tenant_id',
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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

    // Add indexes for roaming_requests
    await queryInterface.addIndex('roaming_requests', ['request_number'], { unique: true });
    await queryInterface.addIndex('roaming_requests', ['employee_id']);
    await queryInterface.addIndex('roaming_requests', ['from_branch_id']);
    await queryInterface.addIndex('roaming_requests', ['to_branch_id']);
    await queryInterface.addIndex('roaming_requests', ['status']);
    await queryInterface.addIndex('roaming_requests', ['start_date']);
    await queryInterface.addIndex('roaming_requests', ['end_date']);
    await queryInterface.addIndex('roaming_requests', ['tenant_id']);

    // Create roaming_attendance table
    await queryInterface.createTable('roaming_attendance', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      roamingRequestId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'roaming_request_id',
        references: {
          model: 'roaming_requests',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
        allowNull: false,
        field: 'branch_id',
        references: {
          model: 'branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      attendanceDate: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'attendance_date'
      },
      checkIn: {
        type: Sequelize.TIME,
        allowNull: true,
        field: 'check_in'
      },
      checkOut: {
        type: Sequelize.TIME,
        allowNull: true,
        field: 'check_out'
      },
      workHours: {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: true,
        field: 'work_hours',
        comment: 'Total work hours for the day'
      },
      status: {
        type: Sequelize.ENUM('present', 'absent', 'late', 'early_leave'),
        allowNull: false,
        defaultValue: 'present'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      verifiedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'verified_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      verifiedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'verified_at'
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'tenant_id',
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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

    // Add indexes for roaming_attendance
    await queryInterface.addIndex('roaming_attendance', ['roaming_request_id']);
    await queryInterface.addIndex('roaming_attendance', ['employee_id']);
    await queryInterface.addIndex('roaming_attendance', ['branch_id']);
    await queryInterface.addIndex('roaming_attendance', ['attendance_date']);
    await queryInterface.addIndex('roaming_attendance', ['status']);
    await queryInterface.addIndex('roaming_attendance', ['tenant_id']);

    // Update existing employees to have primary branch assignment
    await queryInterface.sequelize.query(`
      INSERT INTO employee_branch_assignments (
        id, employee_id, branch_id, is_primary, can_roam, role,
        start_date, assigned_by, tenant_id, created_at, updated_at
      )
      SELECT 
        UUID(), e.id, e.branch_id, true, false, e.position,
        e.hire_date, :createdBy, e.tenant_id, NOW(), NOW()
      FROM employees e
      WHERE e.branch_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM employee_branch_assignments eba 
        WHERE eba.employee_id = e.id
      )
    `, {
      replacements: { createdBy: 'system' }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('roaming_attendance', ['tenant_id']);
    await queryInterface.removeIndex('roaming_attendance', ['status']);
    await queryInterface.removeIndex('roaming_attendance', ['attendance_date']);
    await queryInterface.removeIndex('roaming_attendance', ['branch_id']);
    await queryInterface.removeIndex('roaming_attendance', ['employee_id']);
    await queryInterface.removeIndex('roaming_attendance', ['roaming_request_id']);
    
    await queryInterface.removeIndex('roaming_requests', ['tenant_id']);
    await queryInterface.removeIndex('roaming_requests', ['end_date']);
    await queryInterface.removeIndex('roaming_requests', ['start_date']);
    await queryInterface.removeIndex('roaming_requests', ['status']);
    await queryInterface.removeIndex('roaming_requests', ['to_branch_id']);
    await queryInterface.removeIndex('roaming_requests', ['from_branch_id']);
    await queryInterface.removeIndex('roaming_requests', ['employee_id']);
    await queryInterface.removeIndex('roaming_requests', ['request_number']);
    
    await queryInterface.removeIndex('employee_branch_assignments', 'employee_branch_assignment_unique');
    await queryInterface.removeIndex('employee_branch_assignments', ['tenant_id']);
    await queryInterface.removeIndex('employee_branch_assignments', ['is_active']);
    await queryInterface.removeIndex('employee_branch_assignments', ['can_roam']);
    await queryInterface.removeIndex('employee_branch_assignments', ['is_primary']);
    await queryInterface.removeIndex('employee_branch_assignments', ['branch_id']);
    await queryInterface.removeIndex('employee_branch_assignments', ['employee_id']);

    // Drop tables
    await queryInterface.dropTable('roaming_attendance');
    await queryInterface.dropTable('roaming_requests');
    await queryInterface.dropTable('employee_branch_assignments');
  }
};
