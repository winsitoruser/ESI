'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create employee_branches table for multi-branch employee assignments
    await queryInterface.createTable('employee_branches', {
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
      assignmentType: {
        type: Sequelize.ENUM('primary', 'temporary', 'roaming'),
        allowNull: false,
        defaultValue: 'primary',
        field: 'assignment_type'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active'
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'start_date'
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'end_date'
      },
      position: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      department: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      reportingTo: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'reporting_to',
        references: {
          model: 'employees',
          key: 'id'
        },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL'
      },
      costAllocationPercentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 100,
        field: 'cost_allocation_percentage',
        comment: 'Percentage of salary allocated to this branch'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
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

    // Add is_locked to products table
    await queryInterface.addColumn('products', 'is_locked', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_locked',
      comment: 'If true, product cannot be modified by branch managers'
    });

    // Enhance audit_logs to track HQ actions on branch data
    await queryInterface.addColumn('audit_logs', 'initiated_by', {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'initiated_by',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User who initiated the action (if different from user_id)'
    });

    await queryInterface.addColumn('audit_logs', 'target_branch_id', {
      type: Sequelize.UUID,
      allowNull: true,
      field: 'target_branch_id',
      references: {
        model: 'branches',
        key: 'id'
      },
      comment: 'Target branch when action affects multiple branches'
    });

    await queryInterface.addColumn('audit_logs', 'is_cross_branch', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_cross_branch',
      comment: 'True if action affects multiple branches'
    });

    // Add indexes
    await queryInterface.addIndex('employee_branches', ['employee_id', 'branch_id']);
    await queryInterface.addIndex('employee_branches', ['employee_id', 'assignment_type']);
    await queryInterface.addIndex('employee_branches', ['branch_id', 'assignment_type']);
    await queryInterface.addIndex('employee_branches', ['is_active']);
    await queryInterface.addIndex('employee_branches', ['start_date', 'end_date']);
    await queryInterface.addIndex('employee_branches', ['tenant_id']);

    await queryInterface.addIndex('products', ['is_locked']);

    await queryInterface.addIndex('audit_logs', ['initiated_by']);
    await queryInterface.addIndex('audit_logs', ['target_branch_id']);
    await queryInterface.addIndex('audit_logs', ['is_cross_branch']);

    // Migrate existing employees to have primary branch assignment
    await queryInterface.sequelize.query(`
      INSERT INTO employee_branches (
        id, employee_id, branch_id, assignment_type, is_active,
        start_date, position, department, cost_allocation_percentage,
        tenant_id, created_at, updated_at
      )
      SELECT 
        uuid_generate_v4(),
        e.id,
        e.branch_id,
        'primary',
        true,
        e.created_at,
        e.position,
        e.department,
        100,
        e.tenant_id,
        NOW(),
        NOW()
      FROM employees e
      WHERE NOT EXISTS (
        SELECT 1 FROM employee_branches eb 
        WHERE eb.employee_id = e.id AND eb.assignment_type = 'primary'
      )
    `);

    // Create function to log cross-branch actions
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION log_cross_branch_action()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Check if this is a cross-branch action
        IF TG_OP = 'UPDATE' AND OLD.branch_id != NEW.branch_id THEN
          INSERT INTO audit_logs (
            id, user_id, branch_id, action, entity_type, entity_id,
            entity_name, old_values, new_values, description,
            initiated_by, target_branch_id, is_cross_branch,
            tenant_id, created_at
          ) VALUES (
            uuid_generate_v4(),
            NEW.updated_by,
            OLD.branch_id,
            'cross_branch_update',
            TG_TABLE_NAME,
            NEW.id,
            COALESCE(NEW.name, NEW.id::text),
            row_to_json(OLD),
            row_to_json(NEW),
            format('Data moved from branch %s to %s', 
              (SELECT name FROM branches WHERE id = OLD.branch_id),
              (SELECT name FROM branches WHERE id = NEW.branch_id)
            ),
            NEW.updated_by,
            NEW.branch_id,
            true,
            NEW.tenant_id,
            NOW()
          );
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Apply trigger to relevant tables
    await queryInterface.sequelize.query(`
      CREATE TRIGGER trigger_log_cross_branch_products
        AFTER UPDATE ON products
        FOR EACH ROW
        EXECUTE FUNCTION log_cross_branch_action()
        WHEN (OLD.branch_id IS DISTINCT FROM NEW.branch_id);
    `);

    // Create view for current employee assignments
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW current_employee_assignments AS
      SELECT 
        eb.id,
        eb.employee_id,
        e.name as employee_name,
        e.position as employee_position,
        eb.branch_id,
        b.name as branch_name,
        b.code as branch_code,
        eb.assignment_type,
        eb.is_active,
        eb.start_date,
        eb.end_date,
        eb.position as assigned_position,
        eb.department,
        eb.cost_allocation_percentage,
        eb.notes,
        CASE 
          WHEN eb.assignment_type = 'roaming' AND eb.end_date > CURRENT_DATE THEN 'Currently Roaming'
          WHEN eb.assignment_type = 'temporary' AND eb.end_date > CURRENT_DATE THEN 'Temporarily Assigned'
          WHEN eb.assignment_type = 'primary' THEN 'Primary Assignment'
          ELSE 'Inactive'
        END as status
      FROM employee_branches eb
      JOIN employees e ON eb.employee_id = e.id
      JOIN branches b ON eb.branch_id = b.id
      WHERE eb.is_active = true
      AND (eb.end_date IS NULL OR eb.end_date >= CURRENT_DATE)
      ORDER BY eb.assignment_type, e.name;
    `);

    // Create view for roaming staff schedule
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW roaming_schedule AS
      SELECT 
        eb.employee_id,
        e.name as employee_name,
        e.position,
        eb.from_branch_id,
        fb.name as from_branch_name,
        fb.code as from_branch_code,
        eb.to_branch_id,
        tb.name as to_branch_name,
        tb.code as to_branch_code,
        eb.start_date,
        eb.end_date,
        eb.days_duration,
        eb.status,
        eb.approved_by,
        u.name as approved_by_name
      FROM employee_branches eb
      JOIN employees e ON eb.employee_id = e.id
      JOIN branches fb ON e.branch_id = fb.id
      JOIN branches tb ON eb.branch_id = tb.id
      LEFT JOIN users u ON eb.approved_by = u.id
      WHERE eb.assignment_type = 'roaming'
      AND eb.is_active = true
      ORDER BY eb.start_date DESC;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop views
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS roaming_schedule');
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS current_employee_assignments');

    // Drop triggers
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trigger_log_cross_branch_products');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS log_cross_branch_action()');

    // Remove indexes
    await queryInterface.removeIndex('audit_logs', ['is_cross_branch']);
    await queryInterface.removeIndex('audit_logs', ['target_branch_id']);
    await queryInterface.removeIndex('audit_logs', ['initiated_by']);
    
    await queryInterface.removeIndex('products', ['is_locked']);
    
    await queryInterface.removeIndex('employee_branches', ['tenant_id']);
    await queryInterface.removeIndex('employee_branches', ['start_date', 'end_date']);
    await queryInterface.removeIndex('employee_branches', ['is_active']);
    await queryInterface.removeIndex('employee_branches', ['branch_id', 'assignment_type']);
    await queryInterface.removeIndex('employee_branches', ['employee_id', 'assignment_type']);
    await queryInterface.removeIndex('employee_branches', ['employee_id', 'branch_id']);

    // Remove columns
    await queryInterface.removeColumn('audit_logs', 'is_cross_branch');
    await queryInterface.removeColumn('audit_logs', 'target_branch_id');
    await queryInterface.removeColumn('audit_logs', 'initiated_by');
    
    await queryInterface.removeColumn('products', 'is_locked');

    // Drop table
    await queryInterface.dropTable('employee_branches');
  }
};
