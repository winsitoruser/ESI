'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const ct = (name) => tables.includes(name);

    // 1. PROMOS
    if (!ct('promos')) {
      await queryInterface.createTable('promos', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        branch_id: { type: Sequelize.UUID },
        name: { type: Sequelize.STRING(255), allowNull: false },
        code: { type: Sequelize.STRING(50), unique: true },
        type: { type: Sequelize.STRING(30), defaultValue: 'discount' },
        discount_type: { type: Sequelize.STRING(20), defaultValue: 'percentage' },
        discount_value: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        min_purchase: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        max_discount: { type: Sequelize.DECIMAL(15, 2) },
        start_date: { type: Sequelize.DATEONLY },
        end_date: { type: Sequelize.DATEONLY },
        usage_limit: { type: Sequelize.INTEGER },
        used_count: { type: Sequelize.INTEGER, defaultValue: 0 },
        applicable_products: { type: Sequelize.JSONB, defaultValue: [] },
        applicable_categories: { type: Sequelize.JSONB, defaultValue: [] },
        status: { type: Sequelize.STRING(20), defaultValue: 'active' },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 2. VOUCHERS
    if (!ct('vouchers')) {
      await queryInterface.createTable('vouchers', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        code: { type: Sequelize.STRING(50), unique: true, allowNull: false },
        promo_id: { type: Sequelize.INTEGER },
        customer_id: { type: Sequelize.INTEGER },
        discount_type: { type: Sequelize.STRING(20), defaultValue: 'percentage' },
        discount_value: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        min_purchase: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        max_discount: { type: Sequelize.DECIMAL(15, 2) },
        valid_from: { type: Sequelize.DATEONLY },
        valid_until: { type: Sequelize.DATEONLY },
        is_used: { type: Sequelize.BOOLEAN, defaultValue: false },
        used_at: { type: Sequelize.DATE },
        used_in_transaction: { type: Sequelize.STRING(255) },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 3. CUSTOMER LOYALTY
    if (!ct('customer_loyalty')) {
      await queryInterface.createTable('customer_loyalty', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        customer_id: { type: Sequelize.INTEGER },
        points_balance: { type: Sequelize.INTEGER, defaultValue: 0 },
        total_points_earned: { type: Sequelize.INTEGER, defaultValue: 0 },
        total_points_redeemed: { type: Sequelize.INTEGER, defaultValue: 0 },
        tier: { type: Sequelize.STRING(30), defaultValue: 'bronze' },
        tier_expiry: { type: Sequelize.DATEONLY },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex('customer_loyalty', ['tenant_id', 'customer_id'], { unique: true, name: 'customer_loyalty_unique' }).catch(() => {});
    }

    // 4. LOYALTY PROGRAMS
    if (!ct('loyalty_programs')) {
      await queryInterface.createTable('loyalty_programs', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        name: { type: Sequelize.STRING(255), allowNull: false },
        points_per_amount: { type: Sequelize.DECIMAL(10, 2), defaultValue: 1 },
        amount_per_point: { type: Sequelize.DECIMAL(10, 2), defaultValue: 1000 },
        redemption_rate: { type: Sequelize.DECIMAL(10, 2), defaultValue: 100 },
        min_redeem_points: { type: Sequelize.INTEGER, defaultValue: 100 },
        tiers: { type: Sequelize.JSONB, defaultValue: [] },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 5. KITCHEN RECIPES
    if (!ct('kitchen_recipes')) {
      await queryInterface.createTable('kitchen_recipes', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        product_id: { type: Sequelize.INTEGER },
        name: { type: Sequelize.STRING(255), allowNull: false },
        description: { type: Sequelize.TEXT },
        prep_time: { type: Sequelize.INTEGER, defaultValue: 0 },
        cook_time: { type: Sequelize.INTEGER, defaultValue: 0 },
        servings: { type: Sequelize.INTEGER, defaultValue: 1 },
        difficulty: { type: Sequelize.STRING(20), defaultValue: 'easy' },
        instructions: { type: Sequelize.TEXT },
        cost_per_serving: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 6. KITCHEN RECIPE INGREDIENTS
    if (!ct('kitchen_recipe_ingredients')) {
      await queryInterface.createTable('kitchen_recipe_ingredients', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        recipe_id: { type: Sequelize.INTEGER, references: { model: 'kitchen_recipes', key: 'id' }, onDelete: 'CASCADE' },
        ingredient_id: { type: Sequelize.INTEGER },
        ingredient_name: { type: Sequelize.STRING(255), allowNull: false },
        quantity: { type: Sequelize.DECIMAL(10, 3), allowNull: false },
        unit: { type: Sequelize.STRING(30) },
        unit_cost: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        is_optional: { type: Sequelize.BOOLEAN, defaultValue: false },
        notes: { type: Sequelize.TEXT },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 7. PRODUCTION ORDERS
    if (!ct('production_orders')) {
      await queryInterface.createTable('production_orders', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        branch_id: { type: Sequelize.UUID },
        order_number: { type: Sequelize.STRING(50), unique: true, allowNull: false },
        recipe_id: { type: Sequelize.INTEGER },
        product_id: { type: Sequelize.INTEGER },
        quantity: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        produced_quantity: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
        status: { type: Sequelize.STRING(30), defaultValue: 'planned' },
        scheduled_date: { type: Sequelize.DATEONLY },
        completed_date: { type: Sequelize.DATEONLY },
        notes: { type: Sequelize.TEXT },
        created_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 8. PRODUCTION ORDER ITEMS
    if (!ct('production_order_items')) {
      await queryInterface.createTable('production_order_items', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        production_order_id: { type: Sequelize.INTEGER, references: { model: 'production_orders', key: 'id' }, onDelete: 'CASCADE' },
        ingredient_id: { type: Sequelize.INTEGER },
        ingredient_name: { type: Sequelize.STRING(255) },
        required_quantity: { type: Sequelize.DECIMAL(10, 3), allowNull: false },
        used_quantity: { type: Sequelize.DECIMAL(10, 3), defaultValue: 0 },
        unit: { type: Sequelize.STRING(30) },
        unit_cost: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 9. INCIDENT REPORTS
    if (!ct('incident_reports')) {
      await queryInterface.createTable('incident_reports', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        branch_id: { type: Sequelize.UUID },
        report_number: { type: Sequelize.STRING(50), unique: true },
        title: { type: Sequelize.STRING(255), allowNull: false },
        description: { type: Sequelize.TEXT },
        category: { type: Sequelize.STRING(50) },
        severity: { type: Sequelize.STRING(20), defaultValue: 'low' },
        status: { type: Sequelize.STRING(20), defaultValue: 'open' },
        reported_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
        assigned_to: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
        resolved_at: { type: Sequelize.DATE },
        resolution: { type: Sequelize.TEXT },
        attachments: { type: Sequelize.JSONB, defaultValue: [] },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 10. KPI TEMPLATES
    if (!ct('kpi_templates')) {
      await queryInterface.createTable('kpi_templates', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        name: { type: Sequelize.STRING(255), allowNull: false },
        description: { type: Sequelize.TEXT },
        category: { type: Sequelize.STRING(50) },
        metrics: { type: Sequelize.JSONB, defaultValue: [] },
        weight: { type: Sequelize.DECIMAL(5, 2), defaultValue: 100 },
        target_value: { type: Sequelize.DECIMAL(15, 2) },
        unit: { type: Sequelize.STRING(30) },
        period: { type: Sequelize.STRING(20), defaultValue: 'monthly' },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 11. KPI SCORINGS
    if (!ct('kpi_scorings')) {
      await queryInterface.createTable('kpi_scorings', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        template_id: { type: Sequelize.INTEGER },
        employee_id: { type: Sequelize.INTEGER },
        period_start: { type: Sequelize.DATEONLY },
        period_end: { type: Sequelize.DATEONLY },
        target_value: { type: Sequelize.DECIMAL(15, 2) },
        actual_value: { type: Sequelize.DECIMAL(15, 2) },
        score: { type: Sequelize.DECIMAL(5, 2) },
        weight: { type: Sequelize.DECIMAL(5, 2) },
        notes: { type: Sequelize.TEXT },
        scored_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 12. PARTNERS
    if (!ct('partners')) {
      await queryInterface.createTable('partners', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        business_name: { type: Sequelize.STRING(255), allowNull: false },
        owner_name: { type: Sequelize.STRING(255) },
        email: { type: Sequelize.STRING(255), unique: true },
        phone: { type: Sequelize.STRING(50) },
        address: { type: Sequelize.TEXT },
        city: { type: Sequelize.STRING(100) },
        province: { type: Sequelize.STRING(100) },
        status: { type: Sequelize.STRING(30), defaultValue: 'pending' },
        activation_status: { type: Sequelize.STRING(30), defaultValue: 'inactive' },
        activated_at: { type: Sequelize.DATE },
        notes: { type: Sequelize.TEXT },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 13-14. PARTNER OUTLETS & USERS
    if (!ct('partner_outlets')) {
      await queryInterface.createTable('partner_outlets', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        partner_id: { type: Sequelize.INTEGER, references: { model: 'partners', key: 'id' }, onDelete: 'CASCADE' },
        name: { type: Sequelize.STRING(255), allowNull: false },
        address: { type: Sequelize.TEXT },
        city: { type: Sequelize.STRING(100) },
        phone: { type: Sequelize.STRING(50) },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    if (!ct('partner_users')) {
      await queryInterface.createTable('partner_users', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        partner_id: { type: Sequelize.INTEGER, references: { model: 'partners', key: 'id' }, onDelete: 'CASCADE' },
        user_id: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
        name: { type: Sequelize.STRING(255), allowNull: false },
        email: { type: Sequelize.STRING(255) },
        role: { type: Sequelize.STRING(50), defaultValue: 'admin' },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 15. SUBSCRIPTION PACKAGES
    if (!ct('subscription_packages')) {
      await queryInterface.createTable('subscription_packages', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: Sequelize.STRING(255), allowNull: false },
        code: { type: Sequelize.STRING(50), unique: true },
        description: { type: Sequelize.TEXT },
        price: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        billing_cycle: { type: Sequelize.STRING(20), defaultValue: 'monthly' },
        features: { type: Sequelize.JSONB, defaultValue: [] },
        max_branches: { type: Sequelize.INTEGER, defaultValue: 1 },
        max_users: { type: Sequelize.INTEGER, defaultValue: 5 },
        max_products: { type: Sequelize.INTEGER, defaultValue: 100 },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 16. PARTNER SUBSCRIPTIONS
    if (!ct('partner_subscriptions')) {
      await queryInterface.createTable('partner_subscriptions', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        partner_id: { type: Sequelize.INTEGER, references: { model: 'partners', key: 'id' }, onDelete: 'CASCADE' },
        package_id: { type: Sequelize.INTEGER },
        start_date: { type: Sequelize.DATEONLY },
        end_date: { type: Sequelize.DATEONLY },
        status: { type: Sequelize.STRING(20), defaultValue: 'active' },
        auto_renew: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 17. ACTIVATION REQUESTS
    if (!ct('activation_requests')) {
      await queryInterface.createTable('activation_requests', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        partner_id: { type: Sequelize.INTEGER, references: { model: 'partners', key: 'id' }, onDelete: 'CASCADE' },
        package_id: { type: Sequelize.INTEGER },
        business_documents: { type: Sequelize.JSONB, defaultValue: {} },
        notes: { type: Sequelize.TEXT },
        status: { type: Sequelize.STRING(30), defaultValue: 'pending' },
        reviewed_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
        reviewed_at: { type: Sequelize.DATE },
        review_notes: { type: Sequelize.TEXT },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 18. BILLING CYCLES
    if (!ct('billing_cycles')) {
      await queryInterface.createTable('billing_cycles', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        partner_id: { type: Sequelize.INTEGER },
        subscription_id: { type: Sequelize.INTEGER },
        period_start: { type: Sequelize.DATEONLY, allowNull: false },
        period_end: { type: Sequelize.DATEONLY, allowNull: false },
        amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
        tax: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        total: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
        status: { type: Sequelize.STRING(20), defaultValue: 'pending' },
        paid_at: { type: Sequelize.DATE },
        invoice_number: { type: Sequelize.STRING(50) },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // INDEXES
    const addIdx = (t, f, n) => queryInterface.addIndex(t, f, { name: n }).catch(() => {});
    await addIdx('promos', ['tenant_id'], 'idx_promos_tenant');
    await addIdx('vouchers', ['code'], 'idx_vouchers_code');
    await addIdx('customer_loyalty', ['customer_id'], 'idx_customer_loyalty_customer');
    await addIdx('kitchen_recipes', ['product_id'], 'idx_kitchen_recipes_product');
    await addIdx('production_orders', ['tenant_id'], 'idx_production_orders_tenant');
    await addIdx('incident_reports', ['tenant_id'], 'idx_incident_reports_tenant');
    await addIdx('kpi_scorings', ['employee_id'], 'idx_kpi_scorings_employee');
    await addIdx('partners', ['status'], 'idx_partners_status');
    await addIdx('billing_cycles', ['tenant_id'], 'idx_billing_cycles_tenant');

    console.log('✅ Part 3 tables created (promo, loyalty, kitchen, partners, KPI, billing)');
  },

  down: async (queryInterface) => {
    const drop = (t) => queryInterface.dropTable(t).catch(() => {});
    await drop('billing_cycles');
    await drop('activation_requests');
    await drop('partner_subscriptions');
    await drop('subscription_packages');
    await drop('partner_users');
    await drop('partner_outlets');
    await drop('partners');
    await drop('kpi_scorings');
    await drop('kpi_templates');
    await drop('incident_reports');
    await drop('production_order_items');
    await drop('production_orders');
    await drop('kitchen_recipe_ingredients');
    await drop('kitchen_recipes');
    await drop('loyalty_programs');
    await drop('customer_loyalty');
    await drop('vouchers');
    await drop('promos');
  }
};
