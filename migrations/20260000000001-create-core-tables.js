'use strict';

/**
 * BASE MIGRATION: Creates all core tables that are referenced by earlier migrations.
 * 
 * This migration runs FIRST (timestamp 20260000000001) to ensure that when
 * migrations from 20260115 onwards run, all referenced tables already exist.
 * 
 * All createTable calls are guarded with IF NOT EXISTS checks so they are
 * safe to run even if the tables already exist.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const exists = (name) => tables.includes(name);

    // ============================================================
    // 1. TENANTS (UUID PK)
    // Originally created in: 20260224-create-tenants-table.js
    // Referenced by: 40+ migrations starting from 20260213
    // ============================================================
    if (!exists('tenants')) {
      await queryInterface.createTable('tenants', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true
        },
        business_type: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM('active', 'inactive', 'suspended', 'trial'),
          defaultValue: 'trial'
        },
        subscription_plan: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        subscription_start: {
          type: Sequelize.DATE,
          allowNull: true
        },
        subscription_end: {
          type: Sequelize.DATE,
          allowNull: true
        },
        max_users: {
          type: Sequelize.INTEGER,
          defaultValue: 5
        },
        max_branches: {
          type: Sequelize.INTEGER,
          defaultValue: 1
        },
        settings: {
          type: Sequelize.JSON,
          allowNull: true,
          defaultValue: {}
        },
        contact_name: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        contact_email: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        contact_phone: {
          type: Sequelize.STRING(20),
          allowNull: true
        },
        address: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        city: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        province: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        postal_code: {
          type: Sequelize.STRING(10),
          allowNull: true
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      });

      await queryInterface.addIndex('tenants', ['code'], {
        name: 'tenants_code_idx',
        unique: true
      }).catch(() => {});
      await queryInterface.addIndex('tenants', ['status'], {
        name: 'tenants_status_idx'
      }).catch(() => {});
      await queryInterface.addIndex('tenants', ['is_active'], {
        name: 'tenants_is_active_idx'
      }).catch(() => {});
    }

    // ============================================================
    // 2. USERS (INTEGER PK)
    // Originally created in: 20260118-create-users-table.js
    // Referenced by: Many migrations (manager_id, created_by, etc.)
    // Note: Uses INTEGER PK to match the original migration & models
    // ============================================================
    if (!exists('users')) {
      await queryInterface.createTable('users', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        email: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        phone: {
          type: Sequelize.STRING,
          allowNull: true
        },
        businessName: {
          type: Sequelize.STRING,
          allowNull: true
        },
        password: {
          type: Sequelize.STRING,
          allowNull: false
        },
        role: {
          type: Sequelize.ENUM('owner', 'admin', 'manager', 'cashier', 'staff'),
          defaultValue: 'owner'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        lastLogin: {
          type: Sequelize.DATE,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      });

      await queryInterface.addIndex('users', ['email'], {
        unique: true,
        name: 'users_email_unique'
      }).catch(() => {});
    }

    // ============================================================
    // 3. BRANCHES (UUID PK)
    // Originally created in: 20260223-enhance-kyb-provisioning.js,
    //   20260224-create-branches-table.js, 20260228000002-create-branches-table.js
    // Referenced by: 20+ migrations starting from 20260118
    // ============================================================
    if (!exists('branches')) {
      await queryInterface.createTable('branches', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true
        },
        tenant_id: {
          type: Sequelize.UUID,
          references: { model: 'tenants', key: 'id' },
          onDelete: 'SET NULL'
        },
        store_id: {
          type: Sequelize.UUID,
          allowNull: true
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        type: {
          type: Sequelize.STRING(20),
          defaultValue: 'branch',
          comment: 'main, branch, warehouse, kiosk'
        },
        address: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        city: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        province: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        postal_code: {
          type: Sequelize.STRING(10),
          allowNull: true
        },
        phone: {
          type: Sequelize.STRING(20),
          allowNull: true
        },
        email: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        manager_id: {
          type: Sequelize.INTEGER,
          references: { model: 'users', key: 'id' },
          onDelete: 'SET NULL'
        },
        operating_hours: {
          type: Sequelize.JSONB,
          defaultValue: []
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        settings: {
          type: Sequelize.JSONB,
          defaultValue: {}
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });

      await queryInterface.addIndex('branches', ['tenant_id'], {
        name: 'idx_branches_tenant_id'
      }).catch(() => {});
      await queryInterface.addIndex('branches', ['code'], {
        name: 'idx_branches_code'
      }).catch(() => {});
    }

    // ============================================================
    // 4. EMPLOYEES (UUID PK)
    // Originally created in: 20260223-create-missing-tables-part1.js
    // Referenced by: Many migrations (createdBy, processedBy, etc.)
    // Note: Uses UUID PK to match the Employee model AND referencing migrations
    // ============================================================
    if (!exists('employees')) {
      await queryInterface.createTable('employees', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true
        },
        tenant_id: {
          type: Sequelize.UUID,
          references: { model: 'tenants', key: 'id' },
          onDelete: 'SET NULL'
        },
        branch_id: {
          type: Sequelize.UUID
        },
        user_id: {
          type: Sequelize.INTEGER,
          references: { model: 'users', key: 'id' },
          onDelete: 'SET NULL'
        },
        employee_code: {
          type: Sequelize.STRING(30),
          unique: true
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        email: {
          type: Sequelize.STRING(255)
        },
        phone: {
          type: Sequelize.STRING(50)
        },
        position: {
          type: Sequelize.STRING(100)
        },
        department: {
          type: Sequelize.STRING(100)
        },
        hire_date: {
          type: Sequelize.DATEONLY
        },
        salary: {
          type: Sequelize.DECIMAL(15, 2),
          defaultValue: 0
        },
        salary_type: {
          type: Sequelize.STRING(20),
          defaultValue: 'monthly'
        },
        bank_name: {
          type: Sequelize.STRING(100)
        },
        bank_account: {
          type: Sequelize.STRING(50)
        },
        address: {
          type: Sequelize.TEXT
        },
        emergency_contact: {
          type: Sequelize.STRING(255)
        },
        emergency_phone: {
          type: Sequelize.STRING(50)
        },
        photo_url: {
          type: Sequelize.TEXT
        },
        status: {
          type: Sequelize.STRING(20),
          defaultValue: 'active'
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });

      await queryInterface.addIndex('employees', ['tenant_id'], {
        name: 'idx_employees_tenant'
      }).catch(() => {});
    }

    // ============================================================
    // 5. CUSTOMERS (UUID PK)
    // Originally created in: 20260204-update-customers-table.js,
    //   20260223-create-missing-tables-part1.js
    // Referenced by: 20260118-create-inventory-tables.js, finance tables, etc.
    // ============================================================
    if (!exists('customers')) {
      await queryInterface.createTable('customers', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true
        },
        tenant_id: {
          type: Sequelize.UUID,
          references: { model: 'tenants', key: 'id' },
          onDelete: 'SET NULL'
        },
        branch_id: {
          type: Sequelize.UUID
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        email: {
          type: Sequelize.STRING(255)
        },
        phone: {
          type: Sequelize.STRING(50)
        },
        address: {
          type: Sequelize.TEXT
        },
        city: {
          type: Sequelize.STRING(100)
        },
        province: {
          type: Sequelize.STRING(100)
        },
        postal_code: {
          type: Sequelize.STRING(10)
        },
        gender: {
          type: Sequelize.STRING(10)
        },
        date_of_birth: {
          type: Sequelize.DATEONLY
        },
        customer_type: {
          type: Sequelize.STRING(30),
          defaultValue: 'regular'
        },
        notes: {
          type: Sequelize.TEXT
        },
        total_transactions: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        total_spent: {
          type: Sequelize.DECIMAL(15, 2),
          defaultValue: 0
        },
        last_visit: {
          type: Sequelize.DATE
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });

      await queryInterface.addIndex('customers', ['tenant_id'], {
        name: 'idx_customers_tenant'
      }).catch(() => {});
    }

    // ============================================================
    // 6. PRODUCTS (INTEGER PK)
    // Originally created in: 20260115-create-products-table.js,
    //   20260116-create-products-table.js, 20260127000002-create-inventory-system.js
    // Referenced by: Many migrations (productId FK)
    // Note: Uses INTEGER PK to match the original migrations & models.
    //   The referencing migrations (20260118, etc.) use INTEGER for productId.
    // ============================================================
    if (!exists('products')) {
      await queryInterface.createTable('products', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        sku: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true
        },
        category: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        unit: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: 'pcs'
        },
        price: {
          type: Sequelize.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0
        },
        cost: {
          type: Sequelize.DECIMAL(15, 2),
          allowNull: true
        },
        stock: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        },
        min_stock: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        },
        max_stock: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        },
        barcode: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        image_url: {
          type: Sequelize.STRING(500),
          allowNull: true
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });

      await queryInterface.addIndex('products', ['sku']).catch(() => {});
      await queryInterface.addIndex('products', ['category']).catch(() => {});
      await queryInterface.addIndex('products', ['is_active']).catch(() => {});
    }

    // ============================================================
    // 7. CATEGORIES (INTEGER PK)
    // Originally created in: 20260127000002-create-inventory-system.js
    // Referenced by: Later migrations (FK category_id)
    // ============================================================
    if (!exists('categories')) {
      await queryInterface.createTable('categories', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        parent_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'categories', key: 'id' },
          onDelete: 'SET NULL'
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
    }

    // ============================================================
    // 8. SUPPLIERS (INTEGER PK)
    // Originally created in: 20260125-create-suppliers-table.js,
    //   20260127000002-create-inventory-system.js
    // Referenced by: 20260118-create-inventory-tables.js, purchase tables, etc.
    // Note: Uses INTEGER PK to match the original migrations & models.
    // ============================================================
    if (!exists('suppliers')) {
      await queryInterface.createTable('suppliers', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true
        },
        company_name: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        supplier_type: {
          type: Sequelize.ENUM('manufacturer', 'distributor', 'wholesaler', 'retailer', 'other'),
          defaultValue: 'distributor'
        },
        contact_person: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        phone: {
          type: Sequelize.STRING(20),
          allowNull: true
        },
        email: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        address: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        city: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        province: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        postal_code: {
          type: Sequelize.STRING(10),
          allowNull: true
        },
        country: {
          type: Sequelize.STRING(100),
          defaultValue: 'Indonesia'
        },
        tax_id: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        payment_terms: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
    }

    // ============================================================
    // 9. WAREHOUSES (INTEGER PK)
    // Originally created in: 20260124-create-warehouse-location-tables.js
    // Referenced by: 20260124-create-stock-opname-tables.js (same day)
    // ============================================================
    if (!exists('warehouses')) {
      await queryInterface.createTable('warehouses', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        type: {
          type: Sequelize.ENUM('main', 'branch', 'storage', 'production'),
          defaultValue: 'main'
        },
        address: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        city: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        phone: {
          type: Sequelize.STRING(20),
          allowNull: true
        },
        manager: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        capacity: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM('active', 'inactive', 'maintenance'),
          defaultValue: 'active'
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
    }

    // ============================================================
    // 10. LOCATIONS (INTEGER PK)
    // Originally created in: 20260124-create-warehouse-location-tables.js,
    //   20260127000002-create-inventory-system.js
    // Referenced by: 20260124-create-stock-opname-tables.js (same day)
    // ============================================================
    if (!exists('locations')) {
      await queryInterface.createTable('locations', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        warehouse_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'warehouses', key: 'id' },
          onDelete: 'CASCADE'
        },
        name: {
          type: Sequelize.STRING(200),
          allowNull: false
        },
        code: {
          type: Sequelize.STRING(50),
          unique: true,
          allowNull: true
        },
        type: {
          type: Sequelize.STRING(50),
          allowNull: true,
          defaultValue: 'rack',
          comment: 'rack, shelf, bin, area'
        },
        aisle: {
          type: Sequelize.STRING(10),
          allowNull: true
        },
        row: {
          type: Sequelize.STRING(10),
          allowNull: true
        },
        level: {
          type: Sequelize.STRING(10),
          allowNull: true
        },
        current_usage: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0
        },
        status: {
          type: Sequelize.STRING(20),
          allowNull: true,
          defaultValue: 'available'
        },
        temperature_controlled: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        temperature_min: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true
        },
        temperature_max: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true
        },
        capacity: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
    }

    // ============================================================
    // 11. RECIPES (INTEGER PK)
    // Originally created in: 20260125-create-recipes-table.js
    // Referenced by: 20260125-create-recipe-history.js (same day)
    // ============================================================
    if (!exists('recipes')) {
      await queryInterface.createTable('recipes', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        product_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        batch_size: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 1
        },
        batch_unit: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'pcs'
        },
        estimated_yield: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        },
        yield_percentage: {
          type: Sequelize.DECIMAL(5, 2),
          defaultValue: 100
        },
        preparation_time_minutes: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
    }

    console.log('✅ Core tables created (tenants, users, branches, employees, customers, products, categories, suppliers, warehouses, locations, recipes)');
  },

  down: async (queryInterface) => {
    // Drop core tables in reverse dependency order
    const tables = ['recipes', 'locations', 'warehouses', 'suppliers', 'categories', 'products', 'customers', 'employees', 'branches', 'users', 'tenants'];
    for (const t of tables) {
      await queryInterface.dropTable(t).catch(() => {});
    }
  }
};
