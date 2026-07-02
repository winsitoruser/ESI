'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create global_settings table
    await queryInterface.createTable('global_settings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      key: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      label: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      value: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Setting value (JSON encoded)'
      },
      type: {
        type: Sequelize.ENUM('string', 'number', 'boolean', 'select', 'json'),
        allowNull: false,
        defaultValue: 'string'
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'general'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isRequired: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_required'
      },
      validation: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Validation rules (min, max, options, etc.)'
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
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        field: 'updated_by',
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

    // Create branch_settings table
    await queryInterface.createTable('branch_settings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
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
      key: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      label: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      value: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Setting value (JSON encoded)'
      },
      type: {
        type: Sequelize.ENUM('string', 'number', 'boolean', 'select', 'json'),
        allowNull: false,
        defaultValue: 'string'
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'general'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      isOverridable: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_overridable',
        comment: 'Can this setting be overridden by global settings?'
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

    // Add is_master to products table
    await queryInterface.addColumn('products', 'is_master', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_master',
      comment: 'Master product that syncs to all branches'
    });

    // Add unique constraint for global_settings
    await queryInterface.addIndex('global_settings', {
      unique: true,
      fields: ['tenant_id', 'key'],
      name: 'global_settings_tenant_key_unique'
    });

    // Add indexes
    await queryInterface.addIndex('global_settings', ['category']);
    await queryInterface.addIndex('global_settings', ['type']);

    await queryInterface.addIndex('branch_settings', ['branch_id', 'key']);
    await queryInterface.addIndex('branch_settings', ['category']);
    await queryInterface.addIndex('branch_settings', ['type']);

    await queryInterface.addIndex('products', ['is_master']);

    // Create function to sync global settings to branches
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION sync_global_to_branch_settings()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Sync to all branches if setting is marked as global
        IF NEW.category IN ('tax', 'system') THEN
          INSERT INTO branch_settings (branch_id, key, label, value, type, category, description, tenant_id, created_at, updated_at)
          SELECT 
            id, NEW.key, NEW.label, NEW.value, NEW.type, NEW.category, NEW.description, NEW.tenant_id, NOW(), NOW()
          FROM branches 
          WHERE tenant_id = NEW.tenant_id
          AND is_active = true
          ON CONFLICT (branch_id, key) 
          DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = NOW();
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER trigger_sync_global_settings
        AFTER INSERT OR UPDATE ON global_settings
        FOR EACH ROW
        EXECUTE FUNCTION sync_global_to_branch_settings();
    `);

    // Create view for effective settings (global overrides branch)
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW effective_settings AS
      SELECT 
        b.id as branch_id,
        b.name as branch_name,
        COALESCE(bs.key, gs.key) as key,
        COALESCE(bs.label, gs.label) as label,
        COALESCE(bs.value, gs.value) as value,
        COALESCE(bs.type, gs.type) as type,
        COALESCE(bs.category, gs.category) as category,
        CASE 
          WHEN bs.id IS NOT NULL THEN 'branch'
          WHEN gs.id IS NOT NULL THEN 'global'
          ELSE NULL
        END as source,
        b.tenant_id
      FROM branches b
      LEFT JOIN branch_settings bs ON b.id = bs.branch_id
      LEFT JOIN global_settings gs ON b.tenant_id = gs.tenant_id 
        AND bs.key = gs.key
        AND gs.category IN ('tax', 'system')
      WHERE b.is_active = true
      AND (bs.id IS NOT NULL OR gs.id IS NOT NULL);
    `);

    // Create API aggregator view
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW api_aggregator_reports AS
      SELECT 
        'daily_sales' as report_type,
        t.id as tenant_id,
        DATE(pt.transaction_date) as report_date,
        b.id as branch_id,
        b.name as branch_name,
        COUNT(pt.id) as transaction_count,
        COALESCE(SUM(pt.total), 0) as total_sales,
        COALESCE(SUM(pt.subtotal), 0) as net_sales,
        COALESCE(SUM(pt.discount), 0) as total_discount,
        COALESCE(SUM(pt.tax), 0) as total_tax,
        COUNT(DISTINCT pt.customer_id) as unique_customers,
        CURRENT_TIMESTAMP as generated_at
      FROM tenants t
      JOIN branches b ON t.id = b.tenant_id
      LEFT JOIN pos_transactions pt ON b.id = pt.branch_id
        AND pt.status = 'completed'
        AND DATE(pt.transaction_date) = CURRENT_DATE
      WHERE b.is_active = true
      GROUP BY t.id, b.id, b.name, DATE(pt.transaction_date)
      
      UNION ALL
      
      SELECT 
        'inventory_status' as report_type,
        t.id as tenant_id,
        CURRENT_DATE as report_date,
        b.id as branch_id,
        b.name as branch_name,
        COUNT(p.id) as total_products,
        COUNT(CASE WHEN p.stock <= p.min_stock THEN 1 END) as low_stock_count,
        COUNT(CASE WHEN p.stock = 0 THEN 1 END) as out_of_stock_count,
        COALESCE(SUM(p.stock * p.cost), 0) as inventory_value,
        0 as unique_customers,
        CURRENT_TIMESTAMP as generated_at
      FROM tenants t
      JOIN branches b ON t.id = b.tenant_id
      LEFT JOIN products p ON b.id = p.branch_id
        AND p.is_active = true
      WHERE b.is_active = true
      GROUP BY t.id, b.id, b.name
      
      UNION ALL
      
      SELECT 
        'employee_attendance' as report_type,
        t.id as tenant_id,
        CURRENT_DATE as report_date,
        b.id as branch_id,
        b.name as branch_name,
        COUNT(ea.id) as total_checkins,
        COUNT(CASE WHEN ea.check_out_at IS NOT NULL THEN 1 END) as completed_shifts,
        0 as low_stock_count,
        0 as out_of_stock_count,
        0 as inventory_value,
        COUNT(DISTINCT ea.employee_id) as unique_customers,
        CURRENT_TIMESTAMP as generated_at
      FROM tenants t
      JOIN branches b ON t.id = b.tenant_id
      LEFT JOIN employee_attendances ea ON b.id = ea.branch_id
        AND DATE(ea.check_in_at) = CURRENT_DATE
      WHERE b.is_active = true
      GROUP BY t.id, b.id, b.name;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop views
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS api_aggregator_reports');
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS effective_settings');

    // Drop triggers and functions
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trigger_sync_global_settings');
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS sync_global_to_branch_settings()');

    // Remove indexes
    await queryInterface.removeIndex('products', ['is_master']);
    
    await queryInterface.removeIndex('branch_settings', ['type']);
    await queryInterface.removeIndex('branch_settings', ['category']);
    await queryInterface.removeIndex('branch_settings', ['branch_id', 'key']);
    
    await queryInterface.removeIndex('global_settings', ['type']);
    await queryInterface.removeIndex('global_settings', ['category']);
    await queryInterface.removeIndex('global_settings', 'global_settings_tenant_key_unique');

    // Drop tables
    await queryInterface.dropTable('branch_settings');
    await queryInterface.dropTable('global_settings');

    // Remove column
    await queryInterface.removeColumn('products', 'is_master');
  }
};
