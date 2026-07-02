/**
 * Manufacturing Advanced Module - Database Migration
 * Extends the base manufacturing module with:
 * 
 * 1. WO Timer/Pause tracking (alter mfg_wo_operations)
 * 2. QC Control Points & Certificate of Analysis (CoA)
 * 3. Enhanced Maintenance (calibration, auto-scheduling, predictive)
 * 4. Product Lifecycle Management (PLM)
 * 5. COGM - Cost of Goods Manufactured engine
 * 6. Subcontracting
 * 7. IoT Connector
 * 8. Barcoding/RFID
 */

const sequelize = require('../lib/sequelize');

async function run() {
  try {
    console.log('🏭 Manufacturing Advanced Module - Creating tables...\n');

    // ==========================================
    // 1. ALTER mfg_wo_operations - Add timer/pause tracking
    // ==========================================
    const timerCols = [
      { col: 'timer_status', def: "VARCHAR(20) DEFAULT 'idle' CHECK (timer_status IN ('idle','running','paused','stopped'))" },
      { col: 'timer_started_at', def: 'TIMESTAMP' },
      { col: 'timer_paused_at', def: 'TIMESTAMP' },
      { col: 'total_pause_seconds', def: 'INTEGER DEFAULT 0' },
      { col: 'total_work_seconds', def: 'INTEGER DEFAULT 0' },
      { col: 'pause_count', def: 'INTEGER DEFAULT 0' },
      { col: 'pause_reasons', def: "JSONB DEFAULT '[]'" },
    ];
    for (const c of timerCols) {
      await sequelize.query(`
        DO $$ BEGIN ALTER TABLE mfg_wo_operations ADD COLUMN ${c.col} ${c.def}; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
      `);
    }
    console.log('✅ mfg_wo_operations - timer columns added');

    // Add scrap tracking columns to mfg_wo_operations
    const scrapCols = [
      { col: 'scrap_quantity', def: 'DECIMAL(10,2) DEFAULT 0' },
      { col: 'scrap_reason', def: 'TEXT' },
      { col: 'scrap_type', def: "VARCHAR(30) CHECK (scrap_type IN ('defect','spoilage','overrun','trim','rework','other'))" },
    ];
    for (const c of scrapCols) {
      await sequelize.query(`
        DO $$ BEGIN ALTER TABLE mfg_wo_operations ADD COLUMN ${c.col} ${c.def}; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
      `);
    }
    console.log('✅ mfg_wo_operations - scrap columns added');

    // ==========================================
    // 2. MFG_QC_CONTROL_POINTS - In-process checkpoint triggers
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_qc_control_points (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        name VARCHAR(200) NOT NULL,
        description TEXT,
        trigger_type VARCHAR(50) DEFAULT 'quantity' CHECK (trigger_type IN ('quantity','time','operation','batch','random')),
        trigger_value INTEGER DEFAULT 100,
        trigger_unit VARCHAR(30) DEFAULT 'pcs',
        product_id INTEGER REFERENCES products(id),
        routing_operation_id UUID REFERENCES mfg_routing_operations(id),
        work_center_id UUID REFERENCES mfg_work_centers(id),
        template_id UUID REFERENCES mfg_qc_templates(id),
        is_mandatory BOOLEAN DEFAULT true,
        stop_on_fail BOOLEAN DEFAULT true,
        tolerance_specs JSONB DEFAULT '[]',
        status VARCHAR(20) DEFAULT 'active',
        created_by INTEGER REFERENCES employees(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, name)
      );
    `);
    console.log('✅ mfg_qc_control_points');

    // ==========================================
    // 3. MFG_QC_COA - Certificate of Analysis
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_qc_coa (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        coa_number VARCHAR(50) NOT NULL,
        inspection_id UUID REFERENCES mfg_qc_inspections(id),
        work_order_id UUID REFERENCES mfg_work_orders(id),
        product_id INTEGER REFERENCES products(id),
        batch_number VARCHAR(50),
        lot_number VARCHAR(50),
        manufacturing_date DATE,
        expiry_date DATE,
        test_results JSONB DEFAULT '[]',
        specifications JSONB DEFAULT '[]',
        conclusion VARCHAR(50) DEFAULT 'compliant' CHECK (conclusion IN ('compliant','non_compliant','conditional')),
        remarks TEXT,
        issued_by INTEGER REFERENCES employees(id),
        approved_by INTEGER REFERENCES employees(id),
        issued_at TIMESTAMP DEFAULT NOW(),
        approved_at TIMESTAMP,
        status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft','issued','approved','revoked')),
        pdf_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, coa_number)
      );
    `);
    console.log('✅ mfg_qc_coa');

    // ==========================================
    // 4. MFG_CALIBRATION_RECORDS - Equipment calibration
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_calibration_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        machine_id UUID NOT NULL REFERENCES mfg_machines(id),
        calibration_number VARCHAR(50),
        instrument_name VARCHAR(200),
        calibration_type VARCHAR(50) DEFAULT 'routine' CHECK (calibration_type IN ('routine','initial','after_repair','verification','re_calibration')),
        standard_reference VARCHAR(200),
        scheduled_date DATE,
        performed_date DATE,
        next_due_date DATE,
        performed_by INTEGER REFERENCES employees(id),
        vendor_name VARCHAR(200),
        before_readings JSONB DEFAULT '[]',
        after_readings JSONB DEFAULT '[]',
        tolerance_min DECIMAL(15,4),
        tolerance_max DECIMAL(15,4),
        actual_deviation DECIMAL(15,4),
        result VARCHAR(30) DEFAULT 'pending' CHECK (result IN ('pending','pass','fail','adjusted','out_of_range')),
        certificate_number VARCHAR(100),
        cost DECIMAL(15,2) DEFAULT 0,
        notes TEXT,
        status VARCHAR(30) DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','overdue','cancelled')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ mfg_calibration_records');

    // ==========================================
    // 5. MFG_MAINTENANCE_SCHEDULES - Auto recurring schedules
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_maintenance_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        machine_id UUID NOT NULL REFERENCES mfg_machines(id),
        schedule_name VARCHAR(200) NOT NULL,
        maintenance_type VARCHAR(50) DEFAULT 'preventive',
        description TEXT,
        frequency_type VARCHAR(30) DEFAULT 'interval_hours' CHECK (frequency_type IN ('interval_hours','interval_days','interval_runs','calendar_monthly','calendar_weekly')),
        frequency_value INTEGER NOT NULL,
        last_performed_at TIMESTAMP,
        next_due_at TIMESTAMP,
        auto_generate_wo BOOLEAN DEFAULT false,
        alert_days_before INTEGER DEFAULT 7,
        estimated_duration_hours DECIMAL(5,2) DEFAULT 1,
        estimated_cost DECIMAL(15,2) DEFAULT 0,
        parts_checklist JSONB DEFAULT '[]',
        assigned_to INTEGER REFERENCES employees(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ mfg_maintenance_schedules');

    // Add predictive maintenance columns to mfg_machines
    const predCols = [
      { col: 'total_runs', def: 'INTEGER DEFAULT 0' },
      { col: 'mtbf_hours', def: 'DECIMAL(10,2) DEFAULT 0' },
      { col: 'mttr_hours', def: 'DECIMAL(10,2) DEFAULT 0' },
      { col: 'failure_count', def: 'INTEGER DEFAULT 0' },
      { col: 'health_score', def: 'DECIMAL(5,2) DEFAULT 100' },
      { col: 'sensor_config', def: "JSONB DEFAULT '{}'" },
      { col: 'last_sensor_reading', def: "JSONB DEFAULT '{}'" },
      { col: 'last_sensor_at', def: 'TIMESTAMP' },
    ];
    for (const c of predCols) {
      await sequelize.query(`
        DO $$ BEGIN ALTER TABLE mfg_machines ADD COLUMN ${c.col} ${c.def}; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
      `);
    }
    console.log('✅ mfg_machines - predictive columns added');

    // ==========================================
    // 6. MFG_PLM_PRODUCTS - Product Lifecycle Management
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_plm_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        product_id INTEGER REFERENCES products(id),
        plm_code VARCHAR(50) NOT NULL,
        lifecycle_stage VARCHAR(50) DEFAULT 'concept' CHECK (lifecycle_stage IN ('concept','design','prototype','testing','pre_production','production','maturity','decline','end_of_life')),
        version VARCHAR(20) DEFAULT '1.0',
        revision INTEGER DEFAULT 1,
        design_owner INTEGER REFERENCES employees(id),
        team_members JSONB DEFAULT '[]',
        target_launch_date DATE,
        actual_launch_date DATE,
        description TEXT,
        specifications JSONB DEFAULT '{}',
        compliance_notes TEXT,
        notes TEXT,
        status VARCHAR(30) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, plm_code)
      );
    `);
    console.log('✅ mfg_plm_products');

    // ==========================================
    // 7. MFG_PLM_DESIGN_CHANGES - Engineering Change Orders
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_plm_design_changes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        plm_product_id UUID REFERENCES mfg_plm_products(id),
        eco_number VARCHAR(50) NOT NULL,
        title VARCHAR(300) NOT NULL,
        change_type VARCHAR(50) DEFAULT 'design' CHECK (change_type IN ('design','material','process','specification','packaging','labeling','compliance')),
        priority VARCHAR(20) DEFAULT 'normal',
        reason TEXT,
        description TEXT,
        impact_analysis TEXT,
        affected_boms JSONB DEFAULT '[]',
        affected_routings JSONB DEFAULT '[]',
        before_state JSONB DEFAULT '{}',
        after_state JSONB DEFAULT '{}',
        requested_by INTEGER REFERENCES employees(id),
        approved_by INTEGER REFERENCES employees(id),
        implemented_by INTEGER REFERENCES employees(id),
        requested_at TIMESTAMP DEFAULT NOW(),
        approved_at TIMESTAMP,
        implemented_at TIMESTAMP,
        status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','approved','rejected','implementing','completed','cancelled')),
        cost_impact DECIMAL(15,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, eco_number)
      );
    `);
    console.log('✅ mfg_plm_design_changes');

    // ==========================================
    // 8. MFG_PLM_DOCUMENTS - Technical drawings/docs
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_plm_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plm_product_id UUID REFERENCES mfg_plm_products(id) ON DELETE CASCADE,
        design_change_id UUID REFERENCES mfg_plm_design_changes(id),
        document_type VARCHAR(50) DEFAULT 'drawing' CHECK (document_type IN ('drawing','cad','specification','test_report','certification','manual','photo','video','sop','other')),
        title VARCHAR(300) NOT NULL,
        file_name VARCHAR(300),
        file_url TEXT,
        file_size INTEGER,
        mime_type VARCHAR(100),
        version VARCHAR(20) DEFAULT '1.0',
        revision INTEGER DEFAULT 1,
        uploaded_by INTEGER REFERENCES employees(id),
        description TEXT,
        tags JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ mfg_plm_documents');

    // ==========================================
    // 9. MFG_COGM_PERIODS - COGM calculation periods
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_cogm_periods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        period_code VARCHAR(50) NOT NULL,
        period_name VARCHAR(200),
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft','calculating','completed','locked')),
        total_material_cost DECIMAL(15,2) DEFAULT 0,
        total_labor_cost DECIMAL(15,2) DEFAULT 0,
        total_overhead_cost DECIMAL(15,2) DEFAULT 0,
        total_cogm DECIMAL(15,2) DEFAULT 0,
        total_units_produced DECIMAL(15,2) DEFAULT 0,
        avg_unit_cost DECIMAL(15,2) DEFAULT 0,
        overhead_allocation_method VARCHAR(50) DEFAULT 'machine_hours' CHECK (overhead_allocation_method IN ('machine_hours','labor_hours','direct_material','units_produced','activity_based')),
        calculated_at TIMESTAMP,
        calculated_by INTEGER REFERENCES employees(id),
        locked_at TIMESTAMP,
        locked_by INTEGER REFERENCES employees(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, period_code)
      );
    `);
    console.log('✅ mfg_cogm_periods');

    // ==========================================
    // 10. MFG_COGM_ITEMS - COGM per product breakdown
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_cogm_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cogm_period_id UUID NOT NULL REFERENCES mfg_cogm_periods(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        work_order_count INTEGER DEFAULT 0,
        units_produced DECIMAL(15,2) DEFAULT 0,
        material_cost DECIMAL(15,2) DEFAULT 0,
        labor_cost DECIMAL(15,2) DEFAULT 0,
        labor_hours DECIMAL(10,2) DEFAULT 0,
        overhead_cost DECIMAL(15,2) DEFAULT 0,
        machine_hours DECIMAL(10,2) DEFAULT 0,
        energy_cost DECIMAL(15,2) DEFAULT 0,
        packaging_cost DECIMAL(15,2) DEFAULT 0,
        waste_cost DECIMAL(15,2) DEFAULT 0,
        total_cogm DECIMAL(15,2) DEFAULT 0,
        unit_cogm DECIMAL(15,4) DEFAULT 0,
        selling_price DECIMAL(15,2) DEFAULT 0,
        gross_margin DECIMAL(15,2) DEFAULT 0,
        margin_percentage DECIMAL(5,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ mfg_cogm_items');

    // ==========================================
    // 11. MFG_OVERHEAD_RATES - Overhead cost configuration
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_overhead_rates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        name VARCHAR(200) NOT NULL,
        category VARCHAR(50) DEFAULT 'factory' CHECK (category IN ('factory','utility','depreciation','insurance','rent','indirect_labor','supplies','other')),
        rate_type VARCHAR(30) DEFAULT 'fixed' CHECK (rate_type IN ('fixed','per_hour','per_unit','percentage')),
        rate_value DECIMAL(15,2) NOT NULL,
        period VARCHAR(20) DEFAULT 'monthly' CHECK (period IN ('daily','weekly','monthly','quarterly','yearly')),
        work_center_id UUID REFERENCES mfg_work_centers(id),
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ mfg_overhead_rates');

    // ==========================================
    // 12. MFG_LABOR_RATES - Labor cost configuration
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_labor_rates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        name VARCHAR(200) NOT NULL,
        rate_type VARCHAR(30) DEFAULT 'per_hour' CHECK (rate_type IN ('per_hour','per_day','per_unit','per_shift')),
        rate_value DECIMAL(15,2) NOT NULL,
        overtime_multiplier DECIMAL(3,2) DEFAULT 1.50,
        skill_level VARCHAR(50),
        department VARCHAR(100),
        work_center_id UUID REFERENCES mfg_work_centers(id),
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ mfg_labor_rates');

    // ==========================================
    // 13. MFG_SUBCONTRACTS - Subcontracting/Makloon
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_subcontracts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        subcontract_number VARCHAR(50) NOT NULL,
        work_order_id UUID REFERENCES mfg_work_orders(id),
        vendor_id INTEGER REFERENCES suppliers(id),
        vendor_name VARCHAR(200),
        product_id INTEGER REFERENCES products(id),
        operation_name VARCHAR(200),
        quantity DECIMAL(10,2) NOT NULL,
        uom VARCHAR(20) DEFAULT 'pcs',
        unit_cost DECIMAL(15,2) DEFAULT 0,
        total_cost DECIMAL(15,2) DEFAULT 0,
        materials_sent JSONB DEFAULT '[]',
        materials_sent_date DATE,
        expected_return_date DATE,
        actual_return_date DATE,
        received_quantity DECIMAL(10,2) DEFAULT 0,
        rejected_quantity DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft','sent','in_process','partial_received','received','completed','cancelled')),
        qc_required BOOLEAN DEFAULT true,
        qc_inspection_id UUID REFERENCES mfg_qc_inspections(id),
        notes TEXT,
        created_by INTEGER REFERENCES employees(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, subcontract_number)
      );
    `);
    console.log('✅ mfg_subcontracts');

    // ==========================================
    // 14. MFG_IOT_DEVICES - IoT device registry
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_iot_devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        device_code VARCHAR(50) NOT NULL,
        device_name VARCHAR(200) NOT NULL,
        device_type VARCHAR(50) DEFAULT 'sensor' CHECK (device_type IN ('sensor','counter','plc','scada','camera','weighing','temperature','humidity','pressure','vibration','other')),
        machine_id UUID REFERENCES mfg_machines(id),
        work_center_id UUID REFERENCES mfg_work_centers(id),
        connection_type VARCHAR(30) DEFAULT 'mqtt' CHECK (connection_type IN ('mqtt','http','modbus','opcua','serial','bluetooth','wifi','lora')),
        connection_config JSONB DEFAULT '{}',
        data_mapping JSONB DEFAULT '{}',
        reading_interval_seconds INTEGER DEFAULT 60,
        last_reading JSONB DEFAULT '{}',
        last_reading_at TIMESTAMP,
        is_online BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'active',
        alert_rules JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, device_code)
      );
    `);
    console.log('✅ mfg_iot_devices');

    // ==========================================
    // 15. MFG_IOT_READINGS - IoT sensor data log
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_iot_readings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id UUID NOT NULL REFERENCES mfg_iot_devices(id) ON DELETE CASCADE,
        reading_type VARCHAR(50) NOT NULL,
        reading_value DECIMAL(15,4),
        reading_unit VARCHAR(30),
        reading_data JSONB DEFAULT '{}',
        work_order_id UUID REFERENCES mfg_work_orders(id),
        recorded_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ mfg_iot_readings');

    // ==========================================
    // 16. MFG_BARCODE_SCANS - Barcode/RFID scan log
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_barcode_scans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        barcode_value VARCHAR(200) NOT NULL,
        scan_type VARCHAR(30) DEFAULT 'barcode' CHECK (scan_type IN ('barcode','qrcode','rfid','nfc')),
        scan_purpose VARCHAR(50) DEFAULT 'material_in' CHECK (scan_purpose IN ('material_in','material_out','wip_tracking','finished_goods','qc_sample','maintenance','inventory_count')),
        product_id INTEGER REFERENCES products(id),
        work_order_id UUID REFERENCES mfg_work_orders(id),
        work_center_id UUID REFERENCES mfg_work_centers(id),
        warehouse_id INTEGER REFERENCES warehouses(id),
        quantity DECIMAL(10,2) DEFAULT 1,
        scanned_by INTEGER REFERENCES employees(id),
        device_info VARCHAR(200),
        location VARCHAR(200),
        notes TEXT,
        scanned_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ mfg_barcode_scans');

    // ==========================================
    // INDEXES
    // ==========================================
    console.log('\n📊 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_mfg_qc_cp_tenant ON mfg_qc_control_points(tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_qc_coa_tenant ON mfg_qc_coa(tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_qc_coa_wo ON mfg_qc_coa(work_order_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_calib_machine ON mfg_calibration_records(machine_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_calib_status ON mfg_calibration_records(status)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_maint_sched_machine ON mfg_maintenance_schedules(machine_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_plm_tenant ON mfg_plm_products(tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_plm_product ON mfg_plm_products(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_plm_dc_plm ON mfg_plm_design_changes(plm_product_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_plm_docs_plm ON mfg_plm_documents(plm_product_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_cogm_tenant ON mfg_cogm_periods(tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_cogm_items_period ON mfg_cogm_items(cogm_period_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_subcontract_tenant ON mfg_subcontracts(tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_subcontract_wo ON mfg_subcontracts(work_order_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_iot_tenant ON mfg_iot_devices(tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_iot_machine ON mfg_iot_devices(machine_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_iot_readings_device ON mfg_iot_readings(device_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_iot_readings_at ON mfg_iot_readings(recorded_at)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_barcode_tenant ON mfg_barcode_scans(tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_barcode_wo ON mfg_barcode_scans(work_order_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_barcode_at ON mfg_barcode_scans(scanned_at)',
    ];

    for (const idx of indexes) {
      await sequelize.query(idx);
    }
    console.log('✅ All indexes created');

    // ==========================================
    // SEED DATA
    // ==========================================
    console.log('\n🌱 Seeding default data...');

    // Seed QC Control Points
    const controlPoints = [
      { name: 'Cek Setiap 100 Unit', trigger_type: 'quantity', trigger_value: 100, trigger_unit: 'pcs', mandatory: true, stop_fail: true, tolerance: [{ param: 'Weight', min: 495, max: 505, unit: 'g' }, { param: 'Dimension', min: 9.8, max: 10.2, unit: 'mm' }] },
      { name: 'Cek Setiap 30 Menit', trigger_type: 'time', trigger_value: 30, trigger_unit: 'minutes', mandatory: true, stop_fail: false, tolerance: [{ param: 'Temperature', min: 180, max: 220, unit: '°C' }] },
      { name: 'Cek Per Batch', trigger_type: 'batch', trigger_value: 1, trigger_unit: 'batch', mandatory: true, stop_fail: true, tolerance: [{ param: 'pH Level', min: 6.5, max: 7.5, unit: 'pH' }] },
    ];
    for (const cp of controlPoints) {
      await sequelize.query(`
        INSERT INTO mfg_qc_control_points (tenant_id, name, trigger_type, trigger_value, trigger_unit, is_mandatory, stop_on_fail, tolerance_specs)
        SELECT t.id, :name, :trigger_type, :trigger_value, :trigger_unit, :mandatory, :stop_fail, :tolerance
        FROM tenants t
        ON CONFLICT (tenant_id, name) DO NOTHING
      `, { replacements: { name: cp.name, trigger_type: cp.trigger_type, trigger_value: cp.trigger_value, trigger_unit: cp.trigger_unit, mandatory: cp.mandatory, stop_fail: cp.stop_fail, tolerance: JSON.stringify(cp.tolerance) } });
    }
    console.log('✅ QC control points seeded');

    // Seed overhead rates
    const overheadRates = [
      { name: 'Listrik Pabrik', category: 'utility', rate_type: 'fixed', rate_value: 25000000, period: 'monthly' },
      { name: 'Sewa Gedung', category: 'rent', rate_type: 'fixed', rate_value: 50000000, period: 'monthly' },
      { name: 'Penyusutan Mesin', category: 'depreciation', rate_type: 'per_hour', rate_value: 50000, period: 'monthly' },
      { name: 'Asuransi', category: 'insurance', rate_type: 'fixed', rate_value: 10000000, period: 'monthly' },
      { name: 'Supplies & Consumable', category: 'supplies', rate_type: 'per_unit', rate_value: 500, period: 'monthly' },
    ];
    for (const r of overheadRates) {
      await sequelize.query(`
        INSERT INTO mfg_overhead_rates (tenant_id, name, category, rate_type, rate_value, period)
        SELECT t.id, :name, :category, :rate_type, :rate_value, :period
        FROM tenants t LIMIT 1
      `, { replacements: r });
    }
    console.log('✅ Overhead rates seeded');

    // Seed labor rates
    const laborRates = [
      { name: 'Operator Produksi', rate_type: 'per_hour', rate_value: 25000, overtime: 1.5, skill: 'operator', dept: 'Produksi' },
      { name: 'Operator Senior', rate_type: 'per_hour', rate_value: 35000, overtime: 1.5, skill: 'senior_operator', dept: 'Produksi' },
      { name: 'Teknisi Mesin', rate_type: 'per_hour', rate_value: 40000, overtime: 2.0, skill: 'technician', dept: 'Maintenance' },
      { name: 'QC Inspector', rate_type: 'per_hour', rate_value: 30000, overtime: 1.5, skill: 'inspector', dept: 'Quality' },
    ];
    for (const l of laborRates) {
      await sequelize.query(`
        INSERT INTO mfg_labor_rates (tenant_id, name, rate_type, rate_value, overtime_multiplier, skill_level, department)
        SELECT t.id, :name, :rate_type, :rate_value, :overtime, :skill, :dept
        FROM tenants t LIMIT 1
      `, { replacements: l });
    }
    console.log('✅ Labor rates seeded');

    console.log('\n🎉 Manufacturing Advanced Module migration completed!');
    console.log('   New tables: 12');
    console.log('   Altered tables: 2 (mfg_wo_operations, mfg_machines)');
    console.log('   Indexes: 21');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

run();
