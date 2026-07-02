'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create payroll_allocations table
    await queryInterface.createTable('payroll_allocations', {
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
      period: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Payroll period (usually month)'
      },
      allocationType: {
        type: Sequelize.ENUM('roaming', 'transfer', 'temporary_assignment', 'training'),
        allowNull: false,
        defaultValue: 'roaming',
        field: 'allocation_type'
      },
      allocatedAmount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        field: 'allocated_amount'
      },
      allocationPercentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 50,
        field: 'allocation_percentage',
        comment: 'Percentage charged to branch (rest charged to company)'
      },
      companyPortion: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        field: 'company_portion'
      },
      branchPortion: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        field: 'branch_portion'
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'processed', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
      },
      reason: {
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
      processedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'processed_at'
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

    // Add base_salary to employees table
    await queryInterface.addColumn('employees', 'base_salary', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      field: 'base_salary',
      comment: 'Base monthly salary'
    });

    // Create finance_journal_entries table if not exists
    await queryInterface.createTable('finance_journal_entries', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      entryNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        field: 'entry_number'
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
      entryDate: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'entry_date'
      },
      entryType: {
        type: Sequelize.ENUM('journal', 'payroll_allocation', 'inter_branch_settlement', 'adjustment'),
        allowNull: false,
        defaultValue: 'journal',
        field: 'entry_type'
      },
      referenceType: {
        type: Sequelize.STRING(50),
        allowNull: true,
        field: 'reference_type'
      },
      referenceId: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'reference_id'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      totalDebit: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'total_debit'
      },
      totalCredit: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'total_credit'
      },
      status: {
        type: Sequelize.ENUM('draft', 'posted', 'reversed'),
        allowNull: false,
        defaultValue: 'draft'
      },
      postedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'posted_by',
        references: {
          model: 'users',
          key: 'id'
        }
      },
      postedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'posted_at'
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'created_by',
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

    // Create finance_journal_entry_lines table
    await queryInterface.createTable('finance_journal_entry_lines', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      journalEntryId: {
        type: Sequelize.UUID,
        allowNull: false,
        field: 'journal_entry_id',
        references: {
          model: 'finance_journal_entries',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      accountCode: {
        type: Sequelize.STRING(20),
        allowNull: false,
        field: 'account_code'
      },
      accountName: {
        type: Sequelize.STRING(100),
        allowNull: false,
        field: 'account_name'
      },
      debitAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'debit_amount'
      },
      creditAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'credit_amount'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
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
    await queryInterface.addIndex('payroll_allocations', ['employee_id', 'period']);
    await queryInterface.addIndex('payroll_allocations', ['branch_id']);
    await queryInterface.addIndex('payroll_allocations', ['status']);
    await queryInterface.addIndex('payroll_allocations', ['allocation_type']);
    await queryInterface.addIndex('payroll_allocations', ['tenant_id']);

    await queryInterface.addIndex('finance_journal_entries', ['entry_number'], { unique: true });
    await queryInterface.addIndex('finance_journal_entries', ['branch_id']);
    await queryInterface.addIndex('finance_journal_entries', ['entry_date']);
    await queryInterface.addIndex('finance_journal_entries', ['entry_type']);
    await queryInterface.addIndex('finance_journal_entries', ['reference_type', 'reference_id']);
    await queryInterface.addIndex('finance_journal_entries', ['status']);
    await queryInterface.addIndex('finance_journal_entries', ['tenant_id']);

    await queryInterface.addIndex('finance_journal_entry_lines', ['journal_entry_id']);
    await queryInterface.addIndex('finance_journal_entry_lines', ['account_code']);

    // Create trigger to update journal entry totals
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION update_journal_entry_totals()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE finance_journal_entries SET
          total_debit = (
            SELECT COALESCE(SUM(debit_amount), 0)
            FROM finance_journal_entry_lines
            WHERE journal_entry_id = NEW.journal_entry_id
          ),
          total_credit = (
            SELECT COALESCE(SUM(credit_amount), 0)
            FROM finance_journal_entry_lines
            WHERE journal_entry_id = NEW.journal_entry_id
          ),
          updated_at = NOW()
        WHERE id = NEW.journal_entry_id;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER trigger_update_journal_entry_totals
        AFTER INSERT OR UPDATE ON finance_journal_entry_lines
        FOR EACH ROW
        EXECUTE FUNCTION update_journal_entry_totals();
    `);

    // Insert default chart of accounts if not exists
    await queryInterface.sequelize.query(`
      INSERT INTO chart_of_accounts (id, code, name, type, parent_id, level, is_active, tenant_id, created_at, updated_at)
      SELECT 
        uuid_generate_v4(),
        '1',
        'Assets',
        'group',
        NULL,
        1,
        true,
        t.id,
        NOW(),
        NOW()
      FROM tenants t
      WHERE NOT EXISTS (
        SELECT 1 FROM chart_of_accounts WHERE code = '1' AND tenant_id = t.id
      )
      UNION ALL
      SELECT 
        uuid_generate_v4(),
        '2',
        'Liabilities',
        'group',
        NULL,
        1,
        true,
        t.id,
        NOW(),
        NOW()
      FROM tenants t
      WHERE NOT EXISTS (
        SELECT 1 FROM chart_of_accounts WHERE code = '2' AND tenant_id = t.id
      )
      UNION ALL
      SELECT 
        uuid_generate_v4(),
        '3',
        'Equity',
        'group',
        NULL,
        1,
        true,
        t.id,
        NOW(),
        NOW()
      FROM tenants t
      WHERE NOT EXISTS (
        SELECT 1 FROM chart_of_accounts WHERE code = '3' AND tenant_id = t.id
      )
      UNION ALL
      SELECT 
        uuid_generate_v4(),
        '4',
        'Revenue',
        'group',
        NULL,
        1,
        true,
        t.id,
        NOW(),
        NOW()
      FROM tenants t
      WHERE NOT EXISTS (
        SELECT 1 FROM chart_of_accounts WHERE code = '4' AND tenant_id = t.id
      )
      UNION ALL
      SELECT 
        uuid_generate_v4(),
        '5',
        'Expenses',
        'group',
        NULL,
        1,
        true,
        t.id,
        NOW(),
        NOW()
      FROM tenants t
      WHERE NOT EXISTS (
        SELECT 1 FROM chart_of_accounts WHERE code = '5' AND tenant_id = t.id
      )
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop triggers
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trigger_update_journal_entry_totals');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS update_journal_entry_totals()');

    // Remove indexes
    await queryInterface.removeIndex('finance_journal_entry_lines', ['account_code']);
    await queryInterface.removeIndex('finance_journal_entry_lines', ['journal_entry_id']);
    
    await queryInterface.removeIndex('finance_journal_entries', ['tenant_id']);
    await queryInterface.removeIndex('finance_journal_entries', ['status']);
    await queryInterface.removeIndex('finance_journal_entries', ['reference_type', 'reference_id']);
    await queryInterface.removeIndex('finance_journal_entries', ['entry_type']);
    await queryInterface.removeIndex('finance_journal_entries', ['entry_date']);
    await queryInterface.removeIndex('finance_journal_entries', ['branch_id']);
    await queryInterface.removeIndex('finance_journal_entries', ['entry_number']);
    
    await queryInterface.removeIndex('payroll_allocations', ['tenant_id']);
    await queryInterface.removeIndex('payroll_allocations', ['allocation_type']);
    await queryInterface.removeIndex('payroll_allocations', ['status']);
    await queryInterface.removeIndex('payroll_allocations', ['branch_id']);
    await queryInterface.removeIndex('payroll_allocations', ['employee_id', 'period']);

    // Drop tables
    await queryInterface.dropTable('finance_journal_entry_lines');
    await queryInterface.dropTable('finance_journal_entries');
    await queryInterface.dropTable('payroll_allocations');

    // Remove column
    await queryInterface.removeColumn('employees', 'base_salary');
  }
};
