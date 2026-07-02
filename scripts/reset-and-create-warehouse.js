/**
 * Reset and Create Warehouse & Inventory Management tables
 * Drops any partially created tables and recreates everything cleanly
 */
const sequelize = require('../lib/sequelize');
const TENANT_ID = '2ee8eb7f-22d5-4e51-9910-3e8f7328497d';

async function run() {
  try {
    console.log('🔄 Resetting and creating Warehouse & Inventory tables...\n');

    // Drop in reverse dependency order (if they exist)
    const dropOrder = [
      'inventory_settings', 'stock_alerts',
      'goods_receipt_items', 'goods_receipts',
      'purchase_order_items', 'purchase_orders',
      'stock_opname_items', 'stock_opnames',
      'stock_adjustment_items', 'stock_adjustments',
      'stock_transfer_items', 'stock_transfers',
      'stock_movements', 'inventory_stock',
      'locations', 'warehouse_zones', 'warehouses',
      'product_cost_history', 'product_cost_components',
      'product_prices', 'product_variants', 'products',
      'product_categories', 'suppliers'
    ];

    for (const t of dropOrder) {
      await sequelize.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
    }
    console.log('  ✓ Old tables dropped\n');

    // ===== 1. SUPPLIERS =====
    await sequelize.query(`
      CREATE TABLE suppliers (
        id SERIAL PRIMARY KEY,
        tenant_id UUID,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(200) NOT NULL,
        contact_person VARCHAR(100),
        email VARCHAR(150),
        phone VARCHAR(30),
        address TEXT,
        city VARCHAR(100),
        province VARCHAR(100),
        postal_code VARCHAR(10),
        country VARCHAR(50) DEFAULT 'Indonesia',
        tax_id VARCHAR(50),
        payment_terms VARCHAR(50) DEFAULT 'Net 30',
        bank_name VARCHAR(100),
        bank_account VARCHAR(50),
        bank_holder VARCHAR(100),
        rating DECIMAL(3,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_tenant_code ON suppliers(tenant_id, code)`);
    console.log('  ✓ suppliers');

    // ===== 2. PRODUCT CATEGORIES =====
    await sequelize.query(`
      CREATE TABLE product_categories (
        id SERIAL PRIMARY KEY,
        tenant_id UUID,
        parent_id INTEGER REFERENCES product_categories(id),
        code VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        color VARCHAR(20),
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        product_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_pc_tenant_code ON product_categories(tenant_id, code)`);
    console.log('  ✓ product_categories');

    // ===== 3. PRODUCTS =====
    await sequelize.query(`
      CREATE TABLE products (
        id SERIAL PRIMARY KEY,
        tenant_id UUID,
        category_id INTEGER REFERENCES product_categories(id),
        supplier_id INTEGER REFERENCES suppliers(id),
        name VARCHAR(200) NOT NULL,
        sku VARCHAR(50),
        barcode VARCHAR(50),
        description TEXT,
        unit VARCHAR(30) DEFAULT 'pcs',
        buy_price DECIMAL(15,2) DEFAULT 0,
        sell_price DECIMAL(15,2) DEFAULT 0,
        minimum_stock INTEGER DEFAULT 0,
        maximum_stock INTEGER DEFAULT 0,
        reorder_point INTEGER DEFAULT 0,
        weight DECIMAL(10,3),
        dimensions VARCHAR(50),
        image_url TEXT,
        is_active BOOLEAN DEFAULT true,
        is_trackable BOOLEAN DEFAULT true,
        is_serialized BOOLEAN DEFAULT false,
        is_batch_tracked BOOLEAN DEFAULT false,
        is_perishable BOOLEAN DEFAULT false,
        shelf_life_days INTEGER,
        tax_rate DECIMAL(5,2) DEFAULT 0,
        tags JSONB DEFAULT '[]'::jsonb,
        custom_fields JSONB DEFAULT '{}'::jsonb,
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_prod_tenant ON products(tenant_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_prod_sku ON products(sku)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_prod_barcode ON products(barcode)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_prod_cat ON products(category_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_prod_sup ON products(supplier_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_prod_active ON products(is_active)`);
    console.log('  ✓ products');

    // ===== 4. PRODUCT VARIANTS =====
    await sequelize.query(`
      CREATE TABLE product_variants (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        sku VARCHAR(50),
        barcode VARCHAR(50),
        name VARCHAR(100) NOT NULL,
        attribute_name VARCHAR(50),
        attribute_value VARCHAR(100),
        buy_price DECIMAL(15,2),
        sell_price DECIMAL(15,2),
        weight DECIMAL(10,3),
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('  ✓ product_variants');

    // ===== 5. PRODUCT PRICES =====
    await sequelize.query(`
      CREATE TABLE product_prices (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        variant_id INTEGER REFERENCES product_variants(id),
        price_type VARCHAR(30) DEFAULT 'retail',
        price DECIMAL(15,2) NOT NULL,
        min_qty INTEGER DEFAULT 1,
        max_qty INTEGER,
        branch_id UUID,
        customer_group VARCHAR(50),
        valid_from DATE,
        valid_until DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_pp_product ON product_prices(product_id)`);
    console.log('  ✓ product_prices');

    // ===== 6. PRODUCT COST COMPONENTS =====
    await sequelize.query(`
      CREATE TABLE product_cost_components (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        component_name VARCHAR(100) NOT NULL,
        component_type VARCHAR(30) DEFAULT 'material',
        amount DECIMAL(15,2) DEFAULT 0,
        percentage DECIMAL(5,2),
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('  ✓ product_cost_components');

    // ===== 7. PRODUCT COST HISTORY =====
    await sequelize.query(`
      CREATE TABLE product_cost_history (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        old_buy_price DECIMAL(15,2),
        new_buy_price DECIMAL(15,2),
        old_sell_price DECIMAL(15,2),
        new_sell_price DECIMAL(15,2),
        reason VARCHAR(200),
        changed_by INTEGER,
        changed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('  ✓ product_cost_history');

    // ===== 8. WAREHOUSES =====
    await sequelize.query(`
      CREATE TABLE warehouses (
        id SERIAL PRIMARY KEY,
        tenant_id UUID,
        code VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) DEFAULT 'main',
        address TEXT,
        city VARCHAR(100),
        province VARCHAR(100),
        phone VARCHAR(30),
        manager VARCHAR(100),
        manager_id INTEGER,
        branch_id UUID,
        capacity DECIMAL(10,2),
        capacity_unit VARCHAR(20) DEFAULT 'sqm',
        temperature_min DECIMAL(5,2),
        temperature_max DECIMAL(5,2),
        is_active BOOLEAN DEFAULT true,
        status VARCHAR(20) DEFAULT 'active',
        operating_hours VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_wh_tenant_code ON warehouses(tenant_id, code)`);
    console.log('  ✓ warehouses');

    // ===== 9. WAREHOUSE ZONES =====
    await sequelize.query(`
      CREATE TABLE warehouse_zones (
        id SERIAL PRIMARY KEY,
        warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
        code VARCHAR(30) NOT NULL,
        name VARCHAR(100) NOT NULL,
        zone_type VARCHAR(30) DEFAULT 'general',
        temperature_min DECIMAL(5,2),
        temperature_max DECIMAL(5,2),
        capacity DECIMAL(10,2),
        current_usage DECIMAL(10,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(warehouse_id, code)
      )
    `);
    console.log('  ✓ warehouse_zones');

    // ===== 10. LOCATIONS =====
    await sequelize.query(`
      CREATE TABLE locations (
        id SERIAL PRIMARY KEY,
        warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
        zone_id INTEGER REFERENCES warehouse_zones(id),
        code VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) DEFAULT 'rack',
        aisle VARCHAR(10),
        row VARCHAR(10),
        level VARCHAR(10),
        position VARCHAR(10),
        capacity DECIMAL(10,2),
        current_usage DECIMAL(10,2) DEFAULT 0,
        max_weight DECIMAL(10,2),
        temperature_controlled BOOLEAN DEFAULT false,
        temperature_min DECIMAL(5,2),
        temperature_max DECIMAL(5,2),
        status VARCHAR(20) DEFAULT 'available',
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(warehouse_id, code)
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_loc_wh ON locations(warehouse_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_loc_zone ON locations(zone_id)`);
    console.log('  ✓ locations');

    // ===== 11. INVENTORY STOCK =====
    await sequelize.query(`
      CREATE TABLE inventory_stock (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id),
        variant_id INTEGER REFERENCES product_variants(id),
        warehouse_id INTEGER REFERENCES warehouses(id),
        location_id INTEGER REFERENCES locations(id),
        branch_id UUID,
        quantity DECIMAL(15,2) NOT NULL DEFAULT 0,
        reserved_quantity DECIMAL(15,2) DEFAULT 0,
        available_quantity DECIMAL(15,2) DEFAULT 0,
        batch_number VARCHAR(100),
        serial_number VARCHAR(100),
        expiry_date DATE,
        cost_price DECIMAL(15,2) DEFAULT 0,
        last_stock_take_date TIMESTAMPTZ,
        last_movement_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_is_product ON inventory_stock(product_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_is_wh ON inventory_stock(warehouse_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_is_loc ON inventory_stock(location_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_is_branch ON inventory_stock(branch_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_is_batch ON inventory_stock(batch_number)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_is_expiry ON inventory_stock(expiry_date)`);
    console.log('  ✓ inventory_stock');

    // ===== 12. STOCK MOVEMENTS =====
    await sequelize.query(`
      CREATE TABLE stock_movements (
        id SERIAL PRIMARY KEY,
        tenant_id UUID,
        product_id INTEGER NOT NULL REFERENCES products(id),
        variant_id INTEGER REFERENCES product_variants(id),
        warehouse_id INTEGER REFERENCES warehouses(id),
        location_id INTEGER REFERENCES locations(id),
        branch_id UUID,
        movement_type VARCHAR(20) NOT NULL,
        quantity DECIMAL(15,2) NOT NULL,
        unit_cost DECIMAL(15,2),
        total_cost DECIMAL(15,2),
        balance_before DECIMAL(15,2),
        balance_after DECIMAL(15,2),
        reference_type VARCHAR(30),
        reference_id VARCHAR(100),
        reference_number VARCHAR(100),
        batch_number VARCHAR(100),
        serial_number VARCHAR(100),
        expiry_date DATE,
        from_warehouse_id INTEGER REFERENCES warehouses(id),
        to_warehouse_id INTEGER REFERENCES warehouses(id),
        from_location_id INTEGER REFERENCES locations(id),
        to_location_id INTEGER REFERENCES locations(id),
        notes TEXT,
        performed_by INTEGER,
        performed_by_name VARCHAR(100),
        approved_by INTEGER,
        movement_date TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sm_product ON stock_movements(product_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sm_wh ON stock_movements(warehouse_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sm_branch ON stock_movements(branch_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sm_type ON stock_movements(movement_type)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sm_ref ON stock_movements(reference_type, reference_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sm_date ON stock_movements(movement_date)`);
    console.log('  ✓ stock_movements');

    // ===== 13. STOCK TRANSFERS =====
    await sequelize.query(`
      CREATE TABLE stock_transfers (
        id SERIAL PRIMARY KEY,
        tenant_id UUID,
        transfer_number VARCHAR(50) NOT NULL UNIQUE,
        from_warehouse_id INTEGER REFERENCES warehouses(id),
        to_warehouse_id INTEGER REFERENCES warehouses(id),
        from_branch_id UUID,
        to_branch_id UUID,
        status VARCHAR(20) DEFAULT 'draft',
        transfer_date DATE DEFAULT CURRENT_DATE,
        expected_arrival DATE,
        actual_arrival DATE,
        total_items INTEGER DEFAULT 0,
        total_quantity DECIMAL(15,2) DEFAULT 0,
        total_value DECIMAL(15,2) DEFAULT 0,
        shipping_method VARCHAR(50),
        tracking_number VARCHAR(100),
        notes TEXT,
        requested_by INTEGER,
        requested_by_name VARCHAR(100),
        approved_by INTEGER,
        approved_by_name VARCHAR(100),
        approved_at TIMESTAMPTZ,
        shipped_by INTEGER,
        shipped_at TIMESTAMPTZ,
        received_by INTEGER,
        received_by_name VARCHAR(100),
        received_at TIMESTAMPTZ,
        cancelled_by INTEGER,
        cancelled_at TIMESTAMPTZ,
        cancellation_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_st_status ON stock_transfers(status)`);
    console.log('  ✓ stock_transfers');

    // ===== 14. STOCK TRANSFER ITEMS =====
    await sequelize.query(`
      CREATE TABLE stock_transfer_items (
        id SERIAL PRIMARY KEY,
        transfer_id INTEGER NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        variant_id INTEGER REFERENCES product_variants(id),
        requested_qty DECIMAL(15,2) NOT NULL,
        shipped_qty DECIMAL(15,2) DEFAULT 0,
        received_qty DECIMAL(15,2) DEFAULT 0,
        damaged_qty DECIMAL(15,2) DEFAULT 0,
        unit_cost DECIMAL(15,2) DEFAULT 0,
        batch_number VARCHAR(100),
        expiry_date DATE,
        from_location_id INTEGER REFERENCES locations(id),
        to_location_id INTEGER REFERENCES locations(id),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sti_transfer ON stock_transfer_items(transfer_id)`);
    console.log('  ✓ stock_transfer_items');

    // ===== 15. STOCK ADJUSTMENTS =====
    await sequelize.query(`
      CREATE TABLE stock_adjustments (
        id SERIAL PRIMARY KEY,
        tenant_id UUID,
        adjustment_number VARCHAR(50) NOT NULL UNIQUE,
        warehouse_id INTEGER REFERENCES warehouses(id),
        branch_id UUID,
        adjustment_type VARCHAR(30) DEFAULT 'correction',
        status VARCHAR(20) DEFAULT 'draft',
        adjustment_date DATE DEFAULT CURRENT_DATE,
        reason TEXT,
        total_items INTEGER DEFAULT 0,
        total_variance_qty DECIMAL(15,2) DEFAULT 0,
        total_variance_value DECIMAL(15,2) DEFAULT 0,
        created_by INTEGER,
        created_by_name VARCHAR(100),
        approved_by INTEGER,
        approved_by_name VARCHAR(100),
        approved_at TIMESTAMPTZ,
        posted_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('  ✓ stock_adjustments');

    // ===== 16. STOCK ADJUSTMENT ITEMS =====
    await sequelize.query(`
      CREATE TABLE stock_adjustment_items (
        id SERIAL PRIMARY KEY,
        adjustment_id INTEGER NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        variant_id INTEGER REFERENCES product_variants(id),
        location_id INTEGER REFERENCES locations(id),
        system_qty DECIMAL(15,2) NOT NULL DEFAULT 0,
        physical_qty DECIMAL(15,2) NOT NULL DEFAULT 0,
        unit_cost DECIMAL(15,2) DEFAULT 0,
        batch_number VARCHAR(100),
        expiry_date DATE,
        reason VARCHAR(200),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sai_adj ON stock_adjustment_items(adjustment_id)`);
    console.log('  ✓ stock_adjustment_items');

    // ===== 17. STOCK OPNAMES =====
    await sequelize.query(`
      CREATE TABLE stock_opnames (
        id SERIAL PRIMARY KEY,
        tenant_id UUID,
        opname_number VARCHAR(50) NOT NULL UNIQUE,
        opname_type VARCHAR(20) DEFAULT 'full',
        warehouse_id INTEGER REFERENCES warehouses(id),
        zone_id INTEGER REFERENCES warehouse_zones(id),
        location_id INTEGER REFERENCES locations(id),
        status VARCHAR(20) DEFAULT 'draft',
        scheduled_date DATE,
        start_date TIMESTAMPTZ,
        end_date TIMESTAMPTZ,
        freeze_inventory BOOLEAN DEFAULT false,
        total_items INTEGER DEFAULT 0,
        counted_items INTEGER DEFAULT 0,
        items_with_variance INTEGER DEFAULT 0,
        total_variance_value DECIMAL(15,2) DEFAULT 0,
        performed_by VARCHAR(100),
        performed_by_id INTEGER,
        supervised_by VARCHAR(100),
        approved_by VARCHAR(100),
        approved_by_id INTEGER,
        approved_date TIMESTAMPTZ,
        notes TEXT,
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('  ✓ stock_opnames');

    // ===== 18. STOCK OPNAME ITEMS =====
    await sequelize.query(`
      CREATE TABLE stock_opname_items (
        id SERIAL PRIMARY KEY,
        stock_opname_id INTEGER NOT NULL REFERENCES stock_opnames(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        variant_id INTEGER REFERENCES product_variants(id),
        location_id INTEGER REFERENCES locations(id),
        system_stock DECIMAL(15,2) DEFAULT 0,
        physical_stock DECIMAL(15,2),
        unit_cost DECIMAL(15,2) DEFAULT 0,
        variance_category VARCHAR(10) DEFAULT 'none',
        status VARCHAR(20) DEFAULT 'pending',
        counted_by VARCHAR(100),
        count_date TIMESTAMPTZ,
        recount_required BOOLEAN DEFAULT false,
        recount_value DECIMAL(15,2),
        recount_by VARCHAR(100),
        recount_date TIMESTAMPTZ,
        batch_number VARCHAR(100),
        root_cause TEXT,
        corrective_action TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_soi_opname ON stock_opname_items(stock_opname_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_soi_product ON stock_opname_items(product_id)`);
    console.log('  ✓ stock_opname_items');

    // ===== 19. PURCHASE ORDERS =====
    await sequelize.query(`
      CREATE TABLE purchase_orders (
        id SERIAL PRIMARY KEY,
        tenant_id UUID,
        po_number VARCHAR(50) NOT NULL UNIQUE,
        supplier_id INTEGER REFERENCES suppliers(id),
        warehouse_id INTEGER REFERENCES warehouses(id),
        branch_id UUID,
        status VARCHAR(20) DEFAULT 'draft',
        order_date DATE DEFAULT CURRENT_DATE,
        expected_delivery DATE,
        actual_delivery DATE,
        subtotal DECIMAL(15,2) DEFAULT 0,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        discount_amount DECIMAL(15,2) DEFAULT 0,
        shipping_cost DECIMAL(15,2) DEFAULT 0,
        total_amount DECIMAL(15,2) DEFAULT 0,
        payment_terms VARCHAR(100),
        payment_status VARCHAR(20) DEFAULT 'unpaid',
        currency VARCHAR(5) DEFAULT 'IDR',
        notes TEXT,
        internal_notes TEXT,
        created_by INTEGER,
        created_by_name VARCHAR(100),
        approved_by INTEGER,
        approved_by_name VARCHAR(100),
        approved_at TIMESTAMPTZ,
        cancelled_by INTEGER,
        cancelled_at TIMESTAMPTZ,
        cancellation_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_po_date ON purchase_orders(order_date)`);
    console.log('  ✓ purchase_orders');

    // ===== 20. PURCHASE ORDER ITEMS =====
    await sequelize.query(`
      CREATE TABLE purchase_order_items (
        id SERIAL PRIMARY KEY,
        purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        variant_id INTEGER REFERENCES product_variants(id),
        quantity DECIMAL(15,2) NOT NULL,
        received_qty DECIMAL(15,2) DEFAULT 0,
        unit_price DECIMAL(15,2) NOT NULL,
        discount DECIMAL(15,2) DEFAULT 0,
        tax_rate DECIMAL(5,2) DEFAULT 0,
        subtotal DECIMAL(15,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_poi_po ON purchase_order_items(purchase_order_id)`);
    console.log('  ✓ purchase_order_items');

    // ===== 21. GOODS RECEIPTS =====
    await sequelize.query(`
      CREATE TABLE goods_receipts (
        id SERIAL PRIMARY KEY,
        tenant_id UUID,
        gr_number VARCHAR(50) NOT NULL UNIQUE,
        purchase_order_id INTEGER REFERENCES purchase_orders(id),
        supplier_id INTEGER REFERENCES suppliers(id),
        warehouse_id INTEGER REFERENCES warehouses(id),
        receipt_type VARCHAR(20) DEFAULT 'purchase',
        status VARCHAR(20) DEFAULT 'draft',
        receipt_date DATE DEFAULT CURRENT_DATE,
        invoice_number VARCHAR(100),
        delivery_note VARCHAR(100),
        total_items INTEGER DEFAULT 0,
        total_quantity DECIMAL(15,2) DEFAULT 0,
        total_value DECIMAL(15,2) DEFAULT 0,
        quality_check_required BOOLEAN DEFAULT false,
        quality_check_status VARCHAR(20),
        received_by INTEGER,
        received_by_name VARCHAR(100),
        inspected_by INTEGER,
        inspected_by_name VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_gr_po ON goods_receipts(purchase_order_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_gr_status ON goods_receipts(status)`);
    console.log('  ✓ goods_receipts');

    // ===== 22. GOODS RECEIPT ITEMS =====
    await sequelize.query(`
      CREATE TABLE goods_receipt_items (
        id SERIAL PRIMARY KEY,
        goods_receipt_id INTEGER NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
        purchase_order_item_id INTEGER REFERENCES purchase_order_items(id),
        product_id INTEGER NOT NULL REFERENCES products(id),
        variant_id INTEGER REFERENCES product_variants(id),
        ordered_qty DECIMAL(15,2) DEFAULT 0,
        received_qty DECIMAL(15,2) NOT NULL,
        accepted_qty DECIMAL(15,2),
        rejected_qty DECIMAL(15,2) DEFAULT 0,
        unit_cost DECIMAL(15,2) DEFAULT 0,
        total_cost DECIMAL(15,2) DEFAULT 0,
        batch_number VARCHAR(100),
        serial_number VARCHAR(100),
        expiry_date DATE,
        location_id INTEGER REFERENCES locations(id),
        quality_status VARCHAR(20) DEFAULT 'pending',
        rejection_reason TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_gri_gr ON goods_receipt_items(goods_receipt_id)`);
    console.log('  ✓ goods_receipt_items');

    // ===== 23. STOCK ALERTS =====
    await sequelize.query(`
      CREATE TABLE stock_alerts (
        id SERIAL PRIMARY KEY,
        tenant_id UUID,
        product_id INTEGER REFERENCES products(id),
        warehouse_id INTEGER REFERENCES warehouses(id),
        branch_id UUID,
        alert_type VARCHAR(30) NOT NULL,
        severity VARCHAR(10) DEFAULT 'warning',
        title VARCHAR(200),
        message TEXT,
        current_stock DECIMAL(15,2),
        threshold DECIMAL(15,2),
        is_read BOOLEAN DEFAULT false,
        is_resolved BOOLEAN DEFAULT false,
        resolved_by INTEGER,
        resolved_at TIMESTAMPTZ,
        resolved_action TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sa_product ON stock_alerts(product_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sa_type ON stock_alerts(alert_type)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sa_resolved ON stock_alerts(is_resolved)`);
    console.log('  ✓ stock_alerts');

    // ===== 24. INVENTORY SETTINGS =====
    await sequelize.query(`
      CREATE TABLE inventory_settings (
        id SERIAL PRIMARY KEY,
        tenant_id UUID,
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT,
        value_type VARCHAR(20) DEFAULT 'string',
        category VARCHAR(50),
        label VARCHAR(200),
        description TEXT,
        is_editable BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, setting_key)
      )
    `);
    console.log('  ✓ inventory_settings');

    console.log('\n✅ All 24 tables created!\n');

    // ================================================================
    // SEED DATA
    // ================================================================
    console.log('📦 Seeding data...\n');

    // --- Suppliers ---
    const suppliers = [
      { code: 'SUP-001', name: 'PT Sumber Makmur', contact: 'Budi Hartono', email: 'budi@sumbermakmur.co.id', phone: '021-5551001', city: 'Jakarta', terms: 'Net 30' },
      { code: 'SUP-002', name: 'CV Jaya Abadi', contact: 'Siti Aminah', email: 'siti@jayaabadi.co.id', phone: '022-4201002', city: 'Bandung', terms: 'Net 14' },
      { code: 'SUP-003', name: 'PT Indo Supplier', contact: 'Andi Wijaya', email: 'andi@indosupplier.co.id', phone: '031-5311003', city: 'Surabaya', terms: 'COD' },
      { code: 'SUP-004', name: 'UD Sejahtera', contact: 'Dewi Sari', email: 'dewi@sejahtera.co.id', phone: '061-4521004', city: 'Medan', terms: 'Net 30' },
      { code: 'SUP-005', name: 'PT Global Trade', contact: 'Rudi Santoso', email: 'rudi@globaltrade.co.id', phone: '021-5551005', city: 'Jakarta', terms: 'Net 45' },
    ];
    for (const s of suppliers) {
      await sequelize.query(`INSERT INTO suppliers (tenant_id, code, name, contact_person, email, phone, city, payment_terms, is_active) VALUES (:tid, :code, :name, :contact, :email, :phone, :city, :terms, true)`,
        { replacements: { tid: TENANT_ID, ...s } });
    }
    console.log('  ✓ 5 suppliers');

    // --- Product Categories ---
    const cats = [
      { code: 'CAT-BP', name: 'Bahan Pokok', icon: 'Package', color: '#3B82F6' },
      { code: 'CAT-MN', name: 'Minuman', icon: 'Coffee', color: '#8B5CF6' },
      { code: 'CAT-MK', name: 'Makanan Ringan', icon: 'Cookie', color: '#F59E0B' },
      { code: 'CAT-BB', name: 'Bumbu & Rempah', icon: 'Flame', color: '#EF4444' },
      { code: 'CAT-PH', name: 'Perawatan & Hygiene', icon: 'Sparkles', color: '#10B981' },
      { code: 'CAT-RT', name: 'Peralatan Rumah Tangga', icon: 'Home', color: '#F97316' },
      { code: 'CAT-BY', name: 'Bayi & Anak', icon: 'Baby', color: '#EC4899' },
      { code: 'CAT-EL', name: 'Elektronik Kecil', icon: 'Zap', color: '#6366F1' },
    ];
    for (const c of cats) {
      await sequelize.query(`INSERT INTO product_categories (tenant_id, code, name, icon, color, is_active) VALUES (:tid, :code, :name, :icon, :color, true)`,
        { replacements: { tid: TENANT_ID, ...c } });
    }
    console.log('  ✓ 8 product categories');

    // --- Products ---
    const [catRows] = await sequelize.query("SELECT id, code FROM product_categories ORDER BY id");
    const [supRows] = await sequelize.query("SELECT id, code FROM suppliers ORDER BY id");
    const catMap = {}; catRows.forEach(c => catMap[c.code] = c.id);
    const supMap = {}; supRows.forEach(s => supMap[s.code] = s.id);

    const products = [
      { name: 'Beras Premium 5kg', sku: 'BRS-001', barcode: '8991234567001', cat: 'CAT-BP', sup: 'SUP-001', unit: 'sak', buy: 65000, sell: 75000, min: 100, max: 2000, reorder: 200 },
      { name: 'Beras Medium 5kg', sku: 'BRS-002', barcode: '8991234567002', cat: 'CAT-BP', sup: 'SUP-001', unit: 'sak', buy: 55000, sell: 65000, min: 80, max: 1500, reorder: 150 },
      { name: 'Minyak Goreng 2L', sku: 'MYK-001', barcode: '8991234567003', cat: 'CAT-BP', sup: 'SUP-001', unit: 'botol', buy: 28000, sell: 35000, min: 150, max: 3000, reorder: 300 },
      { name: 'Minyak Goreng 1L', sku: 'MYK-002', barcode: '8991234567004', cat: 'CAT-BP', sup: 'SUP-001', unit: 'botol', buy: 15000, sell: 19000, min: 100, max: 2000, reorder: 200 },
      { name: 'Gula Pasir 1kg', sku: 'GLA-001', barcode: '8991234567005', cat: 'CAT-BP', sup: 'SUP-002', unit: 'pack', buy: 14000, sell: 16000, min: 200, max: 4000, reorder: 400 },
      { name: 'Tepung Terigu 1kg', sku: 'TPG-001', barcode: '8991234567006', cat: 'CAT-BP', sup: 'SUP-002', unit: 'pack', buy: 11000, sell: 14000, min: 100, max: 2000, reorder: 200 },
      { name: 'Telur Ayam 1kg', sku: 'TLR-001', barcode: '8991234567007', cat: 'CAT-BP', sup: 'SUP-003', unit: 'kg', buy: 26000, sell: 30000, min: 50, max: 500, reorder: 100 },
      { name: 'Kopi Arabica 250g', sku: 'KPI-001', barcode: '8991234567008', cat: 'CAT-MN', sup: 'SUP-004', unit: 'pack', buy: 45000, sell: 55000, min: 30, max: 500, reorder: 60 },
      { name: 'Teh Celup 25s', sku: 'TEH-001', barcode: '8991234567009', cat: 'CAT-MN', sup: 'SUP-002', unit: 'box', buy: 8000, sell: 12000, min: 50, max: 1000, reorder: 100 },
      { name: 'Susu UHT 1L', sku: 'SSU-001', barcode: '8991234567010', cat: 'CAT-MN', sup: 'SUP-003', unit: 'pack', buy: 14000, sell: 18000, min: 100, max: 2000, reorder: 200 },
      { name: 'Air Mineral 600ml', sku: 'AIR-001', barcode: '8991234567011', cat: 'CAT-MN', sup: 'SUP-005', unit: 'botol', buy: 2500, sell: 4000, min: 500, max: 10000, reorder: 1000 },
      { name: 'Mie Instan Original', sku: 'MIE-001', barcode: '8991234567012', cat: 'CAT-MK', sup: 'SUP-001', unit: 'pcs', buy: 2800, sell: 3500, min: 300, max: 6000, reorder: 600 },
      { name: 'Mie Instan Goreng', sku: 'MIE-002', barcode: '8991234567013', cat: 'CAT-MK', sup: 'SUP-001', unit: 'pcs', buy: 2800, sell: 3500, min: 300, max: 6000, reorder: 600 },
      { name: 'Keripik Kentang 100g', sku: 'KPK-001', barcode: '8991234567014', cat: 'CAT-MK', sup: 'SUP-004', unit: 'pack', buy: 8000, sell: 12000, min: 50, max: 800, reorder: 100 },
      { name: 'Biskuit Kaleng 350g', sku: 'BSK-001', barcode: '8991234567015', cat: 'CAT-MK', sup: 'SUP-002', unit: 'kaleng', buy: 25000, sell: 35000, min: 30, max: 400, reorder: 60 },
      { name: 'Kecap Manis 600ml', sku: 'KCM-001', barcode: '8991234567016', cat: 'CAT-BB', sup: 'SUP-003', unit: 'botol', buy: 18000, sell: 24000, min: 40, max: 600, reorder: 80 },
      { name: 'Sambal Botol 275ml', sku: 'SBL-001', barcode: '8991234567017', cat: 'CAT-BB', sup: 'SUP-003', unit: 'botol', buy: 12000, sell: 16000, min: 50, max: 800, reorder: 100 },
      { name: 'Garam Dapur 250g', sku: 'GRM-001', barcode: '8991234567018', cat: 'CAT-BB', sup: 'SUP-002', unit: 'pack', buy: 3000, sell: 5000, min: 100, max: 2000, reorder: 200 },
      { name: 'Sabun Mandi 100g', sku: 'SBM-001', barcode: '8991234567019', cat: 'CAT-PH', sup: 'SUP-005', unit: 'pcs', buy: 4000, sell: 6500, min: 80, max: 1200, reorder: 160 },
      { name: 'Shampoo 170ml', sku: 'SHP-001', barcode: '8991234567020', cat: 'CAT-PH', sup: 'SUP-005', unit: 'botol', buy: 15000, sell: 22000, min: 40, max: 600, reorder: 80 },
      { name: 'Pasta Gigi 120g', sku: 'PGG-001', barcode: '8991234567021', cat: 'CAT-PH', sup: 'SUP-005', unit: 'tube', buy: 10000, sell: 15000, min: 50, max: 800, reorder: 100 },
      { name: 'Deterjen 900g', sku: 'DTJ-001', barcode: '8991234567022', cat: 'CAT-PH', sup: 'SUP-005', unit: 'pack', buy: 18000, sell: 25000, min: 40, max: 600, reorder: 80 },
      { name: 'Tissue 250 sheets', sku: 'TSU-001', barcode: '8991234567023', cat: 'CAT-RT', sup: 'SUP-004', unit: 'pack', buy: 12000, sell: 16000, min: 50, max: 800, reorder: 100 },
      { name: 'Kantong Plastik L', sku: 'KTG-001', barcode: '8991234567024', cat: 'CAT-RT', sup: 'SUP-004', unit: 'pack', buy: 5000, sell: 8000, min: 100, max: 2000, reorder: 200 },
      { name: 'Susu Formula 400g', sku: 'SFM-001', barcode: '8991234567025', cat: 'CAT-BY', sup: 'SUP-003', unit: 'kaleng', buy: 85000, sell: 110000, min: 20, max: 200, reorder: 40 },
    ];

    for (const p of products) {
      await sequelize.query(`INSERT INTO products (tenant_id, category_id, supplier_id, name, sku, barcode, unit, buy_price, sell_price, minimum_stock, maximum_stock, reorder_point, is_active, is_trackable) VALUES (:tid, :catId, :supId, :name, :sku, :barcode, :unit, :buy, :sell, :min, :max, :reorder, true, true)`,
        { replacements: { tid: TENANT_ID, catId: catMap[p.cat], supId: supMap[p.sup], name: p.name, sku: p.sku, barcode: p.barcode, unit: p.unit, buy: p.buy, sell: p.sell, min: p.min, max: p.max, reorder: p.reorder } });
    }
    console.log(`  ✓ ${products.length} products`);

    // --- Warehouses ---
    const [branchList] = await sequelize.query("SELECT id, name, code FROM branches ORDER BY code LIMIT 5");
    const mainWHs = [
      { code: 'WH-MAIN', name: 'Gudang Pusat', type: 'main', city: 'Jakarta', cap: 5000 },
      { code: 'WH-PROD', name: 'Gudang Produksi', type: 'production', city: 'Jakarta', cap: 2000 },
      { code: 'WH-TRNS', name: 'Gudang Transit', type: 'transit', city: 'Jakarta', cap: 1000 },
      { code: 'WH-RTN', name: 'Gudang Retur', type: 'returns', city: 'Jakarta', cap: 500 },
    ];
    for (const w of mainWHs) {
      await sequelize.query(`INSERT INTO warehouses (tenant_id, code, name, type, city, capacity, is_active, status) VALUES (:tid, :code, :name, :type, :city, :cap, true, 'active')`,
        { replacements: { tid: TENANT_ID, ...w } });
    }
    for (const b of branchList) {
      const code = 'WH-' + b.code;
      await sequelize.query(`INSERT INTO warehouses (tenant_id, code, name, type, city, branch_id, capacity, is_active, status) VALUES (:tid, :code, :name, 'branch', '', :bid, 1000, true, 'active') ON CONFLICT DO NOTHING`,
        { replacements: { tid: TENANT_ID, code, name: 'Gudang ' + b.name, bid: b.id } });
    }
    console.log(`  ✓ ${mainWHs.length + branchList.length} warehouses`);

    // --- Warehouse Zones ---
    const [mwh] = await sequelize.query("SELECT id FROM warehouses WHERE code='WH-MAIN' LIMIT 1");
    const mainWhId = mwh[0].id;
    const zones = [
      { code: 'RCV', name: 'Receiving Area', type: 'receiving', cap: 500 },
      { code: 'GEN-A', name: 'General Storage A', type: 'general', cap: 1500 },
      { code: 'GEN-B', name: 'General Storage B', type: 'general', cap: 1500 },
      { code: 'COLD', name: 'Cold Storage', type: 'cold_storage', cap: 300 },
      { code: 'PICK', name: 'Picking Area', type: 'picking', cap: 500 },
      { code: 'SHIP', name: 'Shipping Area', type: 'shipping', cap: 300 },
      { code: 'QTN', name: 'Quarantine', type: 'quarantine', cap: 200 },
    ];
    for (const z of zones) {
      await sequelize.query(`INSERT INTO warehouse_zones (warehouse_id, code, name, zone_type, capacity) VALUES (:whId, :code, :name, :type, :cap)`,
        { replacements: { whId: mainWhId, ...z } });
    }
    console.log(`  ✓ ${zones.length} warehouse zones`);

    // --- Locations ---
    const [genZone] = await sequelize.query("SELECT id FROM warehouse_zones WHERE code='GEN-A' LIMIT 1");
    const zoneId = genZone[0]?.id || null;
    let locCount = 0;
    for (const aisle of ['A', 'B', 'C', 'D']) {
      for (let row = 1; row <= 5; row++) {
        for (let lvl = 1; lvl <= 3; lvl++) {
          const code = `${aisle}-${row}-${lvl}`;
          await sequelize.query(`INSERT INTO locations (warehouse_id, zone_id, code, name, type, aisle, row, level, capacity, status) VALUES (:whId, :zoneId, :code, :name, 'rack', :a, :r, :l, 100, 'available')`,
            { replacements: { whId: mainWhId, zoneId, code, name: 'Rak ' + code, a: aisle, r: String(row), l: String(lvl) } });
          locCount++;
        }
      }
    }
    console.log(`  ✓ ${locCount} storage locations`);

    // --- Inventory Stock ---
    const [prods] = await sequelize.query("SELECT id, buy_price FROM products ORDER BY id");
    const [whs] = await sequelize.query("SELECT id, code FROM warehouses WHERE is_active=true ORDER BY id");
    const [locs] = await sequelize.query("SELECT id FROM locations ORDER BY id LIMIT 25");

    let stockCount = 0;
    for (let pi = 0; pi < prods.length; pi++) {
      const p = prods[pi];
      // Main warehouse
      const qty = Math.floor(Math.random() * 500) + 100;
      const locId = locs[pi % locs.length]?.id || null;
      await sequelize.query(`INSERT INTO inventory_stock (product_id, warehouse_id, location_id, quantity, reserved_quantity, available_quantity, cost_price) VALUES (:pid, :whId, :locId, :qty, 0, :qty, :cost)`,
        { replacements: { pid: p.id, whId: mainWhId, locId, qty, cost: p.buy_price } });
      stockCount++;

      // Branch warehouses
      for (let bi = 0; bi < Math.min(branchList.length, 3); bi++) {
        const branchWh = whs.find(w => w.code === ('WH-' + branchList[bi].code));
        const bqty = Math.floor(Math.random() * 200) + 20;
        await sequelize.query(`INSERT INTO inventory_stock (product_id, warehouse_id, branch_id, quantity, reserved_quantity, available_quantity, cost_price) VALUES (:pid, :whId, :branchId, :qty, 0, :qty, :cost)`,
          { replacements: { pid: p.id, whId: branchWh?.id || mainWhId, branchId: branchList[bi].id, qty: bqty, cost: p.buy_price } });
        stockCount++;
      }
    }
    console.log(`  ✓ ${stockCount} inventory stock records`);

    // --- Stock Movements (last 30 days) ---
    const types = ['purchase', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'return_in', 'damage'];
    let smCount = 0;
    for (let d = 0; d < 30; d++) {
      for (let j = 0; j < 3; j++) {
        const prod = prods[(d * 3 + j) % prods.length];
        const mType = types[(d + j) % types.length];
        const qty = ['sale', 'transfer_out', 'damage'].includes(mType) ? -(Math.floor(Math.random() * 50) + 5) : (Math.floor(Math.random() * 100) + 10);
        await sequelize.query(`INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, unit_cost, balance_before, balance_after, reference_type, performed_by_name, movement_date)
          VALUES (:tid, :pid, :whId, :mType, :qty, 10000, 500, :bal, 'manual', 'System', NOW() - interval '1 day' * :day + interval '1 hour' * :hr)`,
          { replacements: { tid: TENANT_ID, pid: prod.id, whId: mainWhId, mType, qty, bal: 500 + qty, day: 30 - d, hr: j * 3 } });
        smCount++;
      }
    }
    console.log(`  ✓ ${smCount} stock movements`);

    // --- Purchase Orders ---
    const statuses = ['draft', 'approved', 'ordered', 'received', 'received'];
    for (let i = 0; i < 5; i++) {
      const poNum = `PO-2026-${String(i + 1).padStart(4, '0')}`;
      const supId = supRows[i % supRows.length].id;
      const status = statuses[i];
      const total = Math.floor(Math.random() * 50000000) + 5000000;

      await sequelize.query(`INSERT INTO purchase_orders (tenant_id, po_number, supplier_id, warehouse_id, status, order_date, subtotal, total_amount, payment_terms, created_by_name) VALUES (:tid, :poNum, :supId, :whId, :status, CURRENT_DATE - interval '1 day' * :days, :total, :total, 'Net 30', 'Admin')`,
        { replacements: { tid: TENANT_ID, poNum, supId, whId: mainWhId, status, total, days: i * 5 } });

      const [poRow] = await sequelize.query("SELECT id FROM purchase_orders WHERE po_number=:poNum", { replacements: { poNum } });
      const poId = poRow[0].id;
      const [prodSample] = await sequelize.query("SELECT id, buy_price FROM products ORDER BY RANDOM() LIMIT 4");
      for (const ps of prodSample) {
        const qty = Math.floor(Math.random() * 100) + 10;
        const rQty = status === 'received' ? qty : 0;
        await sequelize.query(`INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, received_qty, unit_price, subtotal) VALUES (:poId, :prodId, :qty, :rQty, :price, :sub)`,
          { replacements: { poId, prodId: ps.id, qty, rQty, price: ps.buy_price, sub: qty * parseFloat(ps.buy_price) } });
      }
    }
    console.log('  ✓ 5 purchase orders with items');

    // --- Stock Transfers ---
    const [brWhs] = await sequelize.query("SELECT id, code FROM warehouses WHERE type='branch' LIMIT 2");
    for (let i = 0; i < 3; i++) {
      const tfNum = `TF-2026-${String(i + 1).padStart(4, '0')}`;
      const toWh = brWhs[i % brWhs.length]?.id || mainWhId;
      const tfStatus = ['in_transit', 'received', 'draft'][i];
      await sequelize.query(`INSERT INTO stock_transfers (tenant_id, transfer_number, from_warehouse_id, to_warehouse_id, status, transfer_date, total_items, total_quantity, requested_by_name) VALUES (:tid, :num, :from, :to, :status, CURRENT_DATE - interval '1 day' * :days, 3, 150, 'Admin Gudang')`,
        { replacements: { tid: TENANT_ID, num: tfNum, from: mainWhId, to: toWh, status: tfStatus, days: i * 3 } });

      const [tfRow] = await sequelize.query("SELECT id FROM stock_transfers WHERE transfer_number=:num", { replacements: { num: tfNum } });
      const [tfProds] = await sequelize.query("SELECT id FROM products ORDER BY RANDOM() LIMIT 3");
      for (const tp of tfProds) {
        const qty = Math.floor(Math.random() * 50) + 10;
        await sequelize.query(`INSERT INTO stock_transfer_items (transfer_id, product_id, requested_qty, shipped_qty, received_qty, unit_cost) VALUES (:tfId, :prodId, :qty, :qty, :rQty, 10000)`,
          { replacements: { tfId: tfRow[0].id, prodId: tp.id, qty, rQty: tfStatus === 'received' ? qty : 0 } });
      }
    }
    console.log('  ✓ 3 stock transfers with items');

    // --- Inventory Settings ---
    const settings = [
      { key: 'low_stock_threshold_pct', val: '20', type: 'number', cat: 'alerts', label: 'Low Stock Threshold (%)' },
      { key: 'auto_reorder', val: 'false', type: 'boolean', cat: 'automation', label: 'Auto Reorder on Low Stock' },
      { key: 'stock_valuation_method', val: 'weighted_average', type: 'string', cat: 'accounting', label: 'Stock Valuation Method' },
      { key: 'expiry_warning_days', val: '30', type: 'number', cat: 'alerts', label: 'Expiry Warning (days)' },
      { key: 'transfer_approval_required', val: 'true', type: 'boolean', cat: 'workflow', label: 'Transfer Approval Required' },
      { key: 'adjustment_approval_required', val: 'true', type: 'boolean', cat: 'workflow', label: 'Adjustment Approval Required' },
      { key: 'barcode_format', val: 'EAN-13', type: 'string', cat: 'general', label: 'Barcode Format' },
      { key: 'default_unit', val: 'pcs', type: 'string', cat: 'general', label: 'Default Unit' },
      { key: 'fifo_enabled', val: 'true', type: 'boolean', cat: 'accounting', label: 'FIFO Enabled' },
      { key: 'negative_stock_allowed', val: 'false', type: 'boolean', cat: 'general', label: 'Allow Negative Stock' },
    ];
    for (const st of settings) {
      await sequelize.query(`INSERT INTO inventory_settings (tenant_id, setting_key, setting_value, value_type, category, label) VALUES (:tid, :key, :val, :type, :cat, :label)`,
        { replacements: { tid: TENANT_ID, ...st } });
    }
    console.log(`  ✓ ${settings.length} inventory settings`);

    // --- Stock Alerts ---
    const [lowStockProds] = await sequelize.query("SELECT p.id, p.name, p.minimum_stock, COALESCE(SUM(s.quantity),0) as total_stock FROM products p LEFT JOIN inventory_stock s ON s.product_id=p.id GROUP BY p.id, p.name, p.minimum_stock HAVING COALESCE(SUM(s.quantity),0) < p.minimum_stock LIMIT 5");
    for (const lsp of lowStockProds) {
      await sequelize.query(`INSERT INTO stock_alerts (tenant_id, product_id, warehouse_id, alert_type, severity, title, message, current_stock, threshold) VALUES (:tid, :pid, :whId, 'low_stock', 'warning', :title, :msg, :stock, :thresh)`,
        { replacements: { tid: TENANT_ID, pid: lsp.id, whId: mainWhId, title: 'Stok Rendah: ' + lsp.name, msg: 'Stok ' + lsp.name + ' di bawah minimum (' + lsp.total_stock + '/' + lsp.minimum_stock + ')', stock: parseFloat(lsp.total_stock), thresh: lsp.minimum_stock } });
    }
    console.log(`  ✓ ${lowStockProds.length} stock alerts`);

    // ======== FINAL SUMMARY ========
    const tables = ['suppliers', 'product_categories', 'products', 'product_variants', 'product_prices', 'product_cost_components', 'product_cost_history', 'warehouses', 'warehouse_zones', 'locations', 'inventory_stock', 'stock_movements', 'stock_transfers', 'stock_transfer_items', 'stock_adjustments', 'stock_adjustment_items', 'stock_opnames', 'stock_opname_items', 'purchase_orders', 'purchase_order_items', 'goods_receipts', 'goods_receipt_items', 'stock_alerts', 'inventory_settings'];
    console.log('\n✅ COMPLETE! Table counts:');
    for (const t of tables) {
      try {
        const [r] = await sequelize.query(`SELECT COUNT(*)::int as c FROM ${t}`);
        console.log(`   ${t}: ${r[0].c}`);
      } catch { console.log(`   ${t}: 0`); }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.parent) console.error('   SQL:', error.parent.message);
  } finally {
    await sequelize.close();
  }
}

run();
