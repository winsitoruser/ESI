'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const ct = (name) => tables.includes(name);

    // 1. FINANCE INVOICES
    if (!ct('finance_invoices')) {
      await queryInterface.createTable('finance_invoices', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        branch_id: { type: Sequelize.UUID },
        invoice_number: { type: Sequelize.STRING(50), unique: true, allowNull: false },
        type: { type: Sequelize.STRING(20), defaultValue: 'sales' },
        customer_id: { type: Sequelize.INTEGER },
        supplier_id: { type: Sequelize.INTEGER },
        issue_date: { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.literal('CURRENT_DATE') },
        due_date: { type: Sequelize.DATEONLY },
        subtotal: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        tax_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        discount_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        total_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        paid_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        status: { type: Sequelize.STRING(20), defaultValue: 'draft' },
        notes: { type: Sequelize.TEXT },
        created_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 2. FINANCE INVOICE ITEMS
    if (!ct('finance_invoice_items')) {
      await queryInterface.createTable('finance_invoice_items', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        invoice_id: { type: Sequelize.INTEGER, references: { model: 'finance_invoices', key: 'id' }, onDelete: 'CASCADE' },
        product_id: { type: Sequelize.INTEGER },
        description: { type: Sequelize.STRING(500) },
        quantity: { type: Sequelize.DECIMAL(10, 2), defaultValue: 1 },
        unit_price: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        discount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        tax: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        total: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 3. PURCHASE ORDERS
    if (!ct('purchase_orders')) {
      await queryInterface.createTable('purchase_orders', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        branch_id: { type: Sequelize.UUID },
        po_number: { type: Sequelize.STRING(50), unique: true, allowNull: false },
        supplier_id: { type: Sequelize.INTEGER },
        order_date: { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.literal('CURRENT_DATE') },
        expected_date: { type: Sequelize.DATEONLY },
        received_date: { type: Sequelize.DATEONLY },
        subtotal: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        tax_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        discount_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        shipping_cost: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        total_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        status: { type: Sequelize.STRING(30), defaultValue: 'draft' },
        notes: { type: Sequelize.TEXT },
        created_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
        approved_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 4. PURCHASE ORDER ITEMS
    if (!ct('purchase_order_items')) {
      await queryInterface.createTable('purchase_order_items', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        purchase_order_id: { type: Sequelize.INTEGER, references: { model: 'purchase_orders', key: 'id' }, onDelete: 'CASCADE' },
        product_id: { type: Sequelize.INTEGER },
        quantity: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        received_quantity: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
        unit_price: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
        discount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        tax: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        total: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        notes: { type: Sequelize.TEXT },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 5. GOODS RECEIPTS
    if (!ct('goods_receipts')) {
      await queryInterface.createTable('goods_receipts', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        branch_id: { type: Sequelize.UUID },
        receipt_number: { type: Sequelize.STRING(50), unique: true, allowNull: false },
        purchase_order_id: { type: Sequelize.INTEGER },
        supplier_id: { type: Sequelize.INTEGER },
        received_date: { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.literal('CURRENT_DATE') },
        status: { type: Sequelize.STRING(20), defaultValue: 'draft' },
        notes: { type: Sequelize.TEXT },
        received_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 6. GOODS RECEIPT ITEMS
    if (!ct('goods_receipt_items')) {
      await queryInterface.createTable('goods_receipt_items', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        goods_receipt_id: { type: Sequelize.INTEGER, references: { model: 'goods_receipts', key: 'id' }, onDelete: 'CASCADE' },
        product_id: { type: Sequelize.INTEGER },
        po_item_id: { type: Sequelize.INTEGER },
        quantity_ordered: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
        quantity_received: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        quantity_rejected: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
        unit_price: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        batch_number: { type: Sequelize.STRING(50) },
        expiry_date: { type: Sequelize.DATEONLY },
        notes: { type: Sequelize.TEXT },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 7. STOCK
    if (!ct('stock')) {
      await queryInterface.createTable('stock', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        branch_id: { type: Sequelize.UUID },
        product_id: { type: Sequelize.INTEGER },
        quantity: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        reserved_quantity: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        available_quantity: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        unit_cost: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        total_value: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
        last_restock_date: { type: Sequelize.DATE },
        last_sold_date: { type: Sequelize.DATE },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex('stock', ['branch_id', 'product_id'], { unique: true, name: 'stock_branch_product_unique' }).catch(() => {});
    }

    // 8. INTERNAL REQUISITIONS
    if (!ct('internal_requisitions')) {
      await queryInterface.createTable('internal_requisitions', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tenant_id: { type: Sequelize.UUID, references: { model: 'tenants', key: 'id' }, onDelete: 'SET NULL' },
        requisition_number: { type: Sequelize.STRING(50), unique: true, allowNull: false },
        from_branch_id: { type: Sequelize.UUID },
        to_branch_id: { type: Sequelize.UUID },
        requested_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
        approved_by: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
        request_date: { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.literal('CURRENT_DATE') },
        needed_date: { type: Sequelize.DATEONLY },
        status: { type: Sequelize.STRING(30), defaultValue: 'draft' },
        priority: { type: Sequelize.STRING(20), defaultValue: 'normal' },
        notes: { type: Sequelize.TEXT },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 9. INTERNAL REQUISITION ITEMS
    if (!ct('internal_requisition_items')) {
      await queryInterface.createTable('internal_requisition_items', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        requisition_id: { type: Sequelize.INTEGER, references: { model: 'internal_requisitions', key: 'id' }, onDelete: 'CASCADE' },
        product_id: { type: Sequelize.INTEGER },
        requested_quantity: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
        approved_quantity: { type: Sequelize.DECIMAL(10, 2) },
        fulfilled_quantity: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
        unit: { type: Sequelize.STRING(30) },
        notes: { type: Sequelize.TEXT },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 10. BRANCH MODULES
    if (!ct('branch_modules')) {
      await queryInterface.createTable('branch_modules', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: Sequelize.UUID },
        module_id: { type: Sequelize.UUID },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
      await queryInterface.addIndex('branch_modules', ['branch_id', 'module_id'], { unique: true, name: 'branch_modules_unique' }).catch(() => {});
    }

    // INDEXES
    const addIdx = (t, f, n) => queryInterface.addIndex(t, f, { name: n }).catch(() => {});
    await addIdx('finance_invoices', ['tenant_id'], 'idx_finance_invoices_tenant');
    await addIdx('purchase_orders', ['tenant_id'], 'idx_purchase_orders_tenant');
    await addIdx('purchase_orders', ['supplier_id'], 'idx_purchase_orders_supplier');
    await addIdx('goods_receipts', ['purchase_order_id'], 'idx_goods_receipts_po');
    await addIdx('stock', ['product_id'], 'idx_stock_product');
    await addIdx('stock', ['branch_id'], 'idx_stock_branch');
    await addIdx('internal_requisitions', ['tenant_id'], 'idx_internal_reqs_tenant');

    console.log('✅ Part 2 tables created (finance, purchasing, inventory, stock)');
  },

  down: async (queryInterface) => {
    const drop = (t) => queryInterface.dropTable(t).catch(() => {});
    await drop('branch_modules');
    await drop('internal_requisition_items');
    await drop('internal_requisitions');
    await drop('stock');
    await drop('goods_receipt_items');
    await drop('goods_receipts');
    await drop('purchase_order_items');
    await drop('purchase_orders');
    await drop('finance_invoice_items');
    await drop('finance_invoices');
  }
};
