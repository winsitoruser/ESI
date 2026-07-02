/**
 * Warehouse & Inventory Management - Comprehensive DB Migration & Seed
 * Creates 24 tables + indexes + seed data for the merged module
 */
const sequelize = require('../lib/sequelize');

const TENANT_ID = '2ee8eb7f-22d5-4e51-9910-3e8f7328497d';

async function run() {
  try {
    console.log('🏭 Creating Warehouse & Inventory Management tables...\n');

    // ===== 1. SUPPLIERS =====
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        tenant_id UUID REFERENCES tenants(id),
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
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, code)
      )
    `);
    console.log('  ✓ suppliers');

    // ===== 2. PRODUCT CATEGORIES =====
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS product_categories (
        id SERIAL PRIMARY KEY,
        tenant_id UUID REFERENCES tenants(id),
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
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, code)
      )
    `);
    console.log('  ✓ product_categories');

    // ===== 3. PRODUCTS =====
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        tenant_id UUID REFERENCES tenants(id),
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
        tags JSONB DEFAULT '[]',
        custom_fields JSONB DEFAULT '{}',
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)`);
    console.log('  ✓ products');

    // ===== 4. PRODUCT VARIANTS =====
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
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

    // ===== 5. PRODUCT PRICES (multi-tier pricing) =====
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS product_prices (
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
      CREATE TABLE IF NOT EXISTS product_cost_components (
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
      CREATE TABLE IF NOT EXISTS product_cost_history (
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
      CREATE TABLE IF NOT EXISTS warehouses (
        id SERIAL PRIMARY KEY,
        tenant_id UUID REFERENCES tenants(id),
        code VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) DEFAULT 'main' CHECK(type IN ('main','branch','storage','production','transit','returns')),
        address TEXT,
        city VARCHAR(100),
        province VARCHAR(100),
        phone VARCHAR(30),
        manager VARCHAR(100),
        manager_id INTEGER,
        branch_id UUID REFERENCES branches(id),
        capacity DECIMAL(10,2),
        capacity_unit VARCHAR(20) DEFAULT 'sqm',
        temperature_min DECIMAL(5,2),
        temperature_max DECIMAL(5,2),
        is_active BOOLEAN DEFAULT true,
        status VARCHAR(20) DEFAULT 'active' CHECK(status IN ('active','inactive','maintenance')),
        operating_hours VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, code)
      )
    `);
    console.log('  ✓ warehouses');

    // ===== 9. WAREHOUSE ZONES =====
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS warehouse_zones (
        id SERIAL PRIMARY KEY,
        warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
        code VARCHAR(30) NOT NULL,
        name VARCHAR(100) NOT NULL,
        zone_type VARCHAR(30) DEFAULT 'general' CHECK(zone_type IN ('general','receiving','shipping','quarantine','cold_storage','frozen','bulk','picking','packing','returns')),
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

    // ===== 10. LOCATIONS (bins/racks/shelves) =====
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
        zone_id INTEGER REFERENCES warehouse_zones(id),
        code VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) DEFAULT 'rack' CHECK(type IN ('rack','shelf','bin','pallet','floor','chiller','freezer','display')),
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
        status VARCHAR(20) DEFAULT 'available' CHECK(status IN ('available','occupied','reserved','maintenance','blocked')),
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(warehouse_id, code)
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_loc_warehouse ON locations(warehouse_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_loc_zone ON locations(zone_id)`);
    console.log('  ✓ locations');

    // ===== 11. INVENTORY STOCK (current stock per product/location) =====
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS inventory_stock (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id),
        variant_id INTEGER REFERENCES product_variants(id),
        warehouse_id INTEGER REFERENCES warehouses(id),
        location_id INTEGER REFERENCES locations(id),
        branch_id UUID REFERENCES branches(id),
        quantity DECIMAL(15,2) NOT NULL DEFAULT 0,
        reserved_quantity DECIMAL(15,2) DEFAULT 0,
        available_quantity DECIMAL(15,2) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
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
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_is_warehouse ON inventory_stock(warehouse_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_is_location ON inventory_stock(location_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_is_branch ON inventory_stock(branch_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_is_batch ON inventory_stock(batch_number)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_is_expiry ON inventory_stock(expiry_date)`);
    console.log('  ✓ inventory_stock');

    // ===== 12. STOCK MOVEMENTS (ledger of all movements) =====
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id SERIAL PRIMARY KEY,
        tenant_id UUID REFERENCES tenants(id),
        product_id INTEGER NOT NULL REFERENCES products(id),
        variant_id INTEGER REFERENCES product_variants(id),
        warehouse_id INTEGER REFERENCES warehouses(id),
        location_id INTEGER REFERENCES locations(id),
        branch_id UUID REFERENCES branches(id),
        movement_type VARCHAR(20) NOT NULL CHECK(movement_type IN ('in','out','transfer_in','transfer_out','adjustment','return_in','return_out','damage','expired','sale','purchase','production_in','production_out','opname')),
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
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sm_warehouse ON stock_movements(warehouse_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sm_branch ON stock_movements(branch_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sm_type ON stock_movements(movement_type)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sm_ref ON stock_movements(reference_type, reference_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sm_date ON stock_movements(movement_date)`);
    console.log('  ✓ stock_movements');

    // ===== 13. STOCK TRANSFERS =====
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS stock_transfers (
        id SERIAL PRIMARY KEY,
        tenant_id UUID REFERENCES tenants(id),
        transfer_number VARCHAR(50) NOT NULL UNIQUE,
        from_warehouse_id INTEGER REFERENCES warehouses(id),
        to_warehouse_id INTEGER REFERENCES warehouses(id),
        from_branch_id UUID REFERENCES branches(id),
        to_branch_id UUID REFERENCES branches(id),
        status VARCHAR(20) DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','in_transit','partial_received','received','cancelled')),
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
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_st_from ON stock_transfers(from_warehouse_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_st_to ON stock_transfers(to_warehouse_id)`);
    console.log('  ✓ stock_transfers');

    // ===== 14. STOCK TRANSFER ITEMS =====
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS stock_transfer_items (
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
      CREATE TABLE IF NOT EXISTS stock_adjustments (
        id SERIAL PRIMARY KEY,
        tenant_id UUID REFERENCES tenants(id),
        adjustment_number VARCHAR(50) NOT NULL UNIQUE,
        warehouse_id INTEGER REFERENCES warehouses(id),
        branch_id UUID REFERENCES branches(id),
        adjustment_type VARCHAR(30) DEFAULT 'correction' CHECK(adjustment_type IN ('correction','damage','expired','lost','found','return','write_off','recount','opening_balance')),
        status VARCHAR(20) DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','posted','rejected','cancelled')),
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
      CREATE TABLE IF NOT EXISTS stock_adjustment_items (
        id SERIAL PRIMARY KEY,
        adjustment_id INTEGER NOT NULL REFERENCES stock_adjustments(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        variant_id INTEGER REFERENCES product_variants(id),
        location_id INTEGER REFERENCES locations(id),
        system_qty DECIMAL(15,2) NOT NULL DEFAULT 0,
        physical_qty DECIMAL(15,2) NOT NULL DEFAULT 0,
        variance_qty DECIMAL(15,2) GENERATED ALWAYS AS (physical_qty - system_qty) STORED,
        unit_cost DECIMAL(15,2) DEFAULT 0,
        variance_value DECIMAL(15,2) GENERATED ALWAYS AS ((physical_qty - system_qty) * unit_cost) STORED,
        batch_number VARCHAR(100),
        expiry_date DATE,
        reason VARCHAR(200),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_sai_adj ON stock_adjustment_items(adjustment_id)`);
    console.log('  ✓ stock_adjustment_items');

    // ===== 17. STOCK OPNAMES (Physical Count) =====
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS stock_opnames (
        id SERIAL PRIMARY KEY,
        tenant_id UUID REFERENCES tenants(id),
        opname_number VARCHAR(50) NOT NULL UNIQUE,
        opname_type VARCHAR(20) DEFAULT 'full' CHECK(opname_type IN ('full','cycle','spot','blind')),
        warehouse_id INTEGER REFERENCES warehouses(id),
        zone_id INTEGER REFERENCES warehouse_zones(id),
        location_id INTEGER REFERENCES locations(id),
        status VARCHAR(20) DEFAULT 'draft' CHECK(status IN ('draft','in_progress','counting','completed','approved','posted','cancelled')),
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
      CREATE TABLE IF NOT EXISTS stock_opname_items (
        id SERIAL PRIMARY KEY,
        stock_opname_id INTEGER NOT NULL REFERENCES stock_opnames(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        variant_id INTEGER REFERENCES product_variants(id),
        location_id INTEGER REFERENCES locations(id),
        system_stock DECIMAL(15,2) DEFAULT 0,
        physical_stock DECIMAL(15,2),
        difference DECIMAL(15,2) GENERATED ALWAYS AS (COALESCE(physical_stock, 0) - system_stock) STORED,
        unit_cost DECIMAL(15,2) DEFAULT 0,
        variance_value DECIMAL(15,2) GENERATED ALWAYS AS ((COALESCE(physical_stock, 0) - system_stock) * unit_cost) STORED,
        variance_category VARCHAR(10) DEFAULT 'none' CHECK(variance_category IN ('none','minor','moderate','major')),
        status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending','counted','verified','investigated','approved')),
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
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        tenant_id UUID REFERENCES tenants(id),
        po_number VARCHAR(50) NOT NULL UNIQUE,
        supplier_id INTEGER REFERENCES suppliers(id),
        warehouse_id INTEGER REFERENCES warehouses(id),
        branch_id UUID REFERENCES branches(id),
        status VARCHAR(20) DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','ordered','partial','received','cancelled','closed')),
        order_date DATE DEFAULT CURRENT_DATE,
        expected_delivery DATE,
        actual_delivery DATE,
        subtotal DECIMAL(15,2) DEFAULT 0,
        tax_amount DECIMAL(15,2) DEFAULT 0,
        discount_amount DECIMAL(15,2) DEFAULT 0,
        shipping_cost DECIMAL(15,2) DEFAULT 0,
        total_amount DECIMAL(15,2) DEFAULT 0,
        payment_terms VARCHAR(100),
        payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid','partial','paid')),
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
      CREATE TABLE IF NOT EXISTS purchase_order_items (
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
      CREATE TABLE IF NOT EXISTS goods_receipts (
        id SERIAL PRIMARY KEY,
        tenant_id UUID REFERENCES tenants(id),
        gr_number VARCHAR(50) NOT NULL UNIQUE,
        purchase_order_id INTEGER REFERENCES purchase_orders(id),
        supplier_id INTEGER REFERENCES suppliers(id),
        warehouse_id INTEGER REFERENCES warehouses(id),
        receipt_type VARCHAR(20) DEFAULT 'purchase' CHECK(receipt_type IN ('purchase','return','transfer','production','other')),
        status VARCHAR(20) DEFAULT 'draft' CHECK(status IN ('draft','inspecting','partial','completed','cancelled')),
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
      CREATE TABLE IF NOT EXISTS goods_receipt_items (
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
        quality_status VARCHAR(20) DEFAULT 'pending' CHECK(quality_status IN ('pending','passed','failed','conditional')),
        rejection_reason TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_gri_gr ON goods_receipt_items(goods_receipt_id)`);
    console.log('  ✓ goods_receipt_items');

    // ===== 23. STOCK ALERTS =====
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS stock_alerts (
        id SERIAL PRIMARY KEY,
        tenant_id UUID REFERENCES tenants(id),
        product_id INTEGER REFERENCES products(id),
        warehouse_id INTEGER REFERENCES warehouses(id),
        branch_id UUID REFERENCES branches(id),
        alert_type VARCHAR(30) NOT NULL CHECK(alert_type IN ('low_stock','out_of_stock','overstock','expiring','expired','reorder_point','slow_moving','no_movement')),
        severity VARCHAR(10) DEFAULT 'warning' CHECK(severity IN ('info','warning','critical')),
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
      CREATE TABLE IF NOT EXISTS inventory_settings (
        id SERIAL PRIMARY KEY,
        tenant_id UUID REFERENCES tenants(id),
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
    const [suppCheck] = await sequelize.query("SELECT COUNT(*)::int as c FROM suppliers");
    if (parseInt(suppCheck[0].c) === 0) {
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
      console.log('  ✓ 5 suppliers seeded');
    }

    // --- Product Categories ---
    const [catCheck] = await sequelize.query("SELECT COUNT(*)::int as c FROM product_categories");
    if (parseInt(catCheck[0].c) === 0) {
      const cats = [
        { code: 'CAT-BP', name: 'Bahan Pokok', icon: 'Package', color: '#3B82F6' },
        { code: 'CAT-MN', name: 'Minuman', icon: 'Coffee', color: '#8B5CF6' },
        { code: 'CAT-MK', name: 'Makanan Ringan', icon: 'Cookie', color: '#F59E0B' },
        { code: 'CAT-BB', name: 'Bumbu & Rempah', icon: 'Flame', color: '#EF4444' },
        { code: 'CAT-PH', name: 'Perawatan & Hygiene', icon: 'Sparkles', color: '#10B981' },
        { code: 'CAT-RK', name: 'Rokok & Tembakau', icon: 'Wind', color: '#6B7280' },
        { code: 'CAT-ES', name: 'Es Krim & Frozen', icon: 'Snowflake', color: '#06B6D4' },
        { code: 'CAT-AL', name: 'Alat Tulis', icon: 'Pencil', color: '#D946EF' },
        { code: 'CAT-RT', name: 'Peralatan Rumah Tangga', icon: 'Home', color: '#F97316' },
        { code: 'CAT-BY', name: 'Bayi & Anak', icon: 'Baby', color: '#EC4899' },
      ];
      for (const c of cats) {
        await sequelize.query(`INSERT INTO product_categories (tenant_id, code, name, icon, color, is_active) VALUES (:tid, :code, :name, :icon, :color, true)`,
          { replacements: { tid: TENANT_ID, ...c } });
      }
      console.log('  ✓ 10 product categories seeded');
    }

    // --- Products ---
    const [prodCheck] = await sequelize.query("SELECT COUNT(*)::int as c FROM products");
    if (parseInt(prodCheck[0].c) === 0) {
      const [cats] = await sequelize.query("SELECT id, code FROM product_categories ORDER BY id");
      const [supps] = await sequelize.query("SELECT id, code FROM suppliers ORDER BY id");
      const catMap = {};
      cats.forEach(c => catMap[c.code] = c.id);
      const suppMap = {};
      supps.forEach(s => suppMap[s.code] = s.id);

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
        await sequelize.query(`
          INSERT INTO products (tenant_id, category_id, supplier_id, name, sku, barcode, unit, buy_price, sell_price, minimum_stock, maximum_stock, reorder_point, is_active, is_trackable)
          VALUES (:tid, :catId, :supId, :name, :sku, :barcode, :unit, :buy, :sell, :min, :max, :reorder, true, true)
        `, { replacements: { tid: TENANT_ID, catId: catMap[p.cat] || null, supId: suppMap[p.sup] || null, name: p.name, sku: p.sku, barcode: p.barcode, unit: p.unit, buy: p.buy, sell: p.sell, min: p.min, max: p.max, reorder: p.reorder } });
      }
      console.log(`  ✓ ${products.length} products seeded`);
    }

    // --- Warehouses ---
    const [whCheck] = await sequelize.query("SELECT COUNT(*)::int as c FROM warehouses");
    if (parseInt(whCheck[0].c) === 0) {
      const [branchList] = await sequelize.query("SELECT id, name, code FROM branches ORDER BY code LIMIT 5");
      const warehouses = [
        { code: 'WH-MAIN', name: 'Gudang Pusat', type: 'main', city: 'Jakarta', cap: 5000 },
        { code: 'WH-PROD', name: 'Gudang Produksi', type: 'production', city: 'Jakarta', cap: 2000 },
        { code: 'WH-TRNS', name: 'Gudang Transit', type: 'transit', city: 'Jakarta', cap: 1000 },
        { code: 'WH-RTN', name: 'Gudang Retur', type: 'returns', city: 'Jakarta', cap: 500 },
      ];
      for (const w of warehouses) {
        await sequelize.query(`INSERT INTO warehouses (tenant_id, code, name, type, city, capacity, is_active, status) VALUES (:tid, :code, :name, :type, :city, :cap, true, 'active')`,
          { replacements: { tid: TENANT_ID, ...w } });
      }
      // Create warehouses for each branch
      for (const b of branchList) {
        const code = `WH-${b.code}`;
        await sequelize.query(`INSERT INTO warehouses (tenant_id, code, name, type, city, branch_id, capacity, is_active, status) VALUES (:tid, :code, :name, 'branch', '', :branchId, 1000, true, 'active') ON CONFLICT (tenant_id, code) DO NOTHING`,
          { replacements: { tid: TENANT_ID, code, name: `Gudang ${b.name}`, branchId: b.id } });
      }
      console.log(`  ✓ ${warehouses.length + branchList.length} warehouses seeded`);
    }

    // --- Warehouse Zones ---
    const [zoneCheck] = await sequelize.query("SELECT COUNT(*)::int as c FROM warehouse_zones");
    if (parseInt(zoneCheck[0].c) === 0) {
      const [mainWH] = await sequelize.query("SELECT id FROM warehouses WHERE code='WH-MAIN' LIMIT 1");
      if (mainWH.length > 0) {
        const whId = mainWH[0].id;
        const zones = [
          { code: 'RCV', name: 'Receiving Area', type: 'receiving', cap: 500 },
          { code: 'GEN-A', name: 'General Storage A', type: 'general', cap: 1500 },
          { code: 'GEN-B', name: 'General Storage B', type: 'general', cap: 1500 },
          { code: 'COLD', name: 'Cold Storage', type: 'cold_storage', cap: 300, tmin: 2, tmax: 8 },
          { code: 'FRZ', name: 'Frozen Storage', type: 'frozen', cap: 200, tmin: -18, tmax: -5 },
          { code: 'PICK', name: 'Picking Area', type: 'picking', cap: 500 },
          { code: 'SHIP', name: 'Shipping Area', type: 'shipping', cap: 300 },
          { code: 'QTN', name: 'Quarantine', type: 'quarantine', cap: 200 },
        ];
        for (const z of zones) {
          await sequelize.query(`INSERT INTO warehouse_zones (warehouse_id, code, name, zone_type, capacity, temperature_min, temperature_max) VALUES (:whId, :code, :name, :type, :cap, :tmin, :tmax)`,
            { replacements: { whId, code: z.code, name: z.name, type: z.type, cap: z.cap, tmin: z.tmin || null, tmax: z.tmax || null } });
        }
        console.log(`  ✓ ${zones.length} warehouse zones seeded`);
      }
    }

    // --- Locations ---
    const [locCheck] = await sequelize.query("SELECT COUNT(*)::int as c FROM locations");
    if (parseInt(locCheck[0].c) === 0) {
      const [mainWH] = await sequelize.query("SELECT id FROM warehouses WHERE code='WH-MAIN' LIMIT 1");
      const [genZone] = await sequelize.query("SELECT id FROM warehouse_zones WHERE code='GEN-A' LIMIT 1");
      if (mainWH.length > 0) {
        const whId = mainWH[0].id;
        const zoneId = genZone[0]?.id || null;
        const aisles = ['A', 'B', 'C', 'D'];
        let count = 0;
        for (const aisle of aisles) {
          for (let row = 1; row <= 5; row++) {
            for (let level = 1; level <= 3; level++) {
              const code = `${aisle}-${row}-${level}`;
              await sequelize.query(`INSERT INTO locations (warehouse_id, zone_id, code, name, type, aisle, row, level, capacity, status) VALUES (:whId, :zoneId, :code, :name, 'rack', :aisle, :row, :level, 100, 'available')`,
                { replacements: { whId, zoneId, code, name: `Rak ${code}`, aisle, row: String(row), level: String(level) } });
              count++;
            }
          }
        }
        console.log(`  ✓ ${count} storage locations seeded`);
      }
    }

    // --- Inventory Stock ---
    const [stockCheck] = await sequelize.query("SELECT COUNT(*)::int as c FROM inventory_stock");
    if (parseInt(stockCheck[0].c) === 0) {
      const [prods] = await sequelize.query("SELECT id, buy_price FROM products ORDER BY id");
      const [whs] = await sequelize.query("SELECT id, code FROM warehouses WHERE is_active=true ORDER BY id");
      const [locs] = await sequelize.query("SELECT id FROM locations ORDER BY id LIMIT 25");
      const [brList] = await sequelize.query("SELECT id FROM branches ORDER BY id LIMIT 5");

      let stockCount = 0;
      for (let pi = 0; pi < prods.length; pi++) {
        const p = prods[pi];
        // Main warehouse stock
        const mainWh = whs.find(w => w.code === 'WH-MAIN');
        if (mainWh) {
          const qty = Math.floor(Math.random() * 500) + 100;
          const locId = locs[pi % locs.length]?.id || null;
          await sequelize.query(`INSERT INTO inventory_stock (product_id, warehouse_id, location_id, quantity, reserved_quantity, cost_price) VALUES (:pid, :whId, :locId, :qty, 0, :cost)`,
            { replacements: { pid: p.id, whId: mainWh.id, locId, qty, cost: p.buy_price } });
          stockCount++;
        }
        // Branch stocks
        for (let bi = 0; bi < Math.min(brList.length, 3); bi++) {
          const branchWh = whs.find(w => w.code?.includes(bi === 0 ? 'HQ' : 'BR'));
          const qty = Math.floor(Math.random() * 200) + 20;
          await sequelize.query(`INSERT INTO inventory_stock (product_id, warehouse_id, branch_id, quantity, reserved_quantity, cost_price) VALUES (:pid, :whId, :branchId, :qty, 0, :cost)`,
            { replacements: { pid: p.id, whId: branchWh?.id || mainWh?.id, branchId: brList[bi].id, qty, cost: p.buy_price } });
          stockCount++;
        }
      }
      console.log(`  ✓ ${stockCount} inventory stock records seeded`);
    }

    // --- Purchase Orders ---
    const [poCheck] = await sequelize.query("SELECT COUNT(*)::int as c FROM purchase_orders");
    if (parseInt(poCheck[0].c) === 0) {
      const [supList] = await sequelize.query("SELECT id FROM suppliers ORDER BY id LIMIT 3");
      const [whList] = await sequelize.query("SELECT id FROM warehouses WHERE code='WH-MAIN' LIMIT 1");
      const statuses = ['draft', 'approved', 'ordered', 'received', 'received'];
      
      for (let i = 0; i < 5; i++) {
        const poNum = `PO-2026-${String(i + 1).padStart(4, '0')}`;
        const supId = supList[i % supList.length].id;
        const whId = whList[0]?.id;
        const status = statuses[i];
        const total = Math.floor(Math.random() * 50000000) + 5000000;

        await sequelize.query(`
          INSERT INTO purchase_orders (tenant_id, po_number, supplier_id, warehouse_id, status, order_date, subtotal, total_amount, payment_terms, created_by_name)
          VALUES (:tid, :poNum, :supId, :whId, :status, CURRENT_DATE - ((:idx * 5) || ' days')::interval, :total, :total, 'Net 30', 'Admin')
        `, { replacements: { tid: TENANT_ID, poNum, supId, whId, status, total, idx: i } });

        // Add PO items
        const [poRow] = await sequelize.query("SELECT id FROM purchase_orders WHERE po_number=:poNum", { replacements: { poNum } });
        if (poRow.length > 0) {
          const [prodSample] = await sequelize.query("SELECT id, buy_price FROM products ORDER BY RANDOM() LIMIT 4");
          for (const prod of prodSample) {
            const qty = Math.floor(Math.random() * 100) + 10;
            const receivedQty = status === 'received' ? qty : (status === 'partial' ? Math.floor(qty / 2) : 0);
            await sequelize.query(`INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, received_qty, unit_price, subtotal) VALUES (:poId, :prodId, :qty, :rQty, :price, :sub)`,
              { replacements: { poId: poRow[0].id, prodId: prod.id, qty, rQty: receivedQty, price: prod.buy_price, sub: qty * parseFloat(prod.buy_price) } });
          }
        }
      }
      console.log('  ✓ 5 purchase orders seeded');
    }

    // --- Stock Movements ---
    const [smCheck] = await sequelize.query("SELECT COUNT(*)::int as c FROM stock_movements");
    if (parseInt(smCheck[0].c) === 0) {
      const [prodSample] = await sequelize.query("SELECT id FROM products ORDER BY id LIMIT 10");
      const [mainWh] = await sequelize.query("SELECT id FROM warehouses WHERE code='WH-MAIN' LIMIT 1");
      const types = ['purchase', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'return_in', 'damage'];
      let smCount = 0;
      for (let d = 0; d < 30; d++) {
        for (let j = 0; j < 3; j++) {
          const prod = prodSample[(d * 3 + j) % prodSample.length];
          const mType = types[(d + j) % types.length];
          const qty = mType === 'sale' || mType === 'transfer_out' || mType === 'damage' ? -(Math.floor(Math.random() * 50) + 5) : (Math.floor(Math.random() * 100) + 10);
          await sequelize.query(`
            INSERT INTO stock_movements (tenant_id, product_id, warehouse_id, movement_type, quantity, unit_cost, balance_before, balance_after, reference_type, performed_by_name, movement_date)
            VALUES (:tid, :pid, :whId, :mType, :qty, 10000, 500, :balAfter, 'manual', 'System', NOW() - ((:day || ' days')::interval) + ((:hr || ' hours')::interval))
          `, { replacements: { tid: TENANT_ID, pid: prod.id, whId: mainWh[0]?.id, mType, qty, balAfter: 500 + qty, day: 30 - d, hr: j * 3 } });
          smCount++;
        }
      }
      console.log(`  ✓ ${smCount} stock movements seeded`);
    }

    // --- Inventory Settings ---
    const [setCheck] = await sequelize.query("SELECT COUNT(*)::int as c FROM inventory_settings");
    if (parseInt(setCheck[0].c) === 0) {
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
      for (const s of settings) {
        await sequelize.query(`INSERT INTO inventory_settings (tenant_id, setting_key, setting_value, value_type, category, label) VALUES (:tid, :key, :val, :type, :cat, :label) ON CONFLICT (tenant_id, setting_key) DO NOTHING`,
          { replacements: { tid: TENANT_ID, ...s } });
      }
      console.log(`  ✓ ${settings.length} inventory settings seeded`);
    }

    // ======== FINAL SUMMARY ========
    const counts = {};
    const tables = ['suppliers', 'product_categories', 'products', 'warehouses', 'warehouse_zones', 'locations', 'inventory_stock', 'stock_movements', 'purchase_orders', 'purchase_order_items', 'stock_transfers', 'stock_adjustments', 'stock_opnames', 'goods_receipts', 'stock_alerts', 'inventory_settings'];
    for (const t of tables) {
      try {
        const [r] = await sequelize.query(`SELECT COUNT(*)::int as c FROM ${t}`);
        counts[t] = r[0].c;
      } catch { counts[t] = 'N/A'; }
    }
    console.log('\n✅ Warehouse & Inventory Management setup complete!');
    console.log('\n📊 Table Counts:');
    for (const [t, c] of Object.entries(counts)) {
      console.log(`   ${t}: ${c}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.parent) console.error('   SQL:', error.parent.message);
  } finally {
    await sequelize.close();
  }
}

run();
