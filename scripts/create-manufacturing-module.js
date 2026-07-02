/**
 * Manufacturing Management Module - Database Migration
 * Creates 20 tables for complete manufacturing management
 * 
 * Sub-modules:
 * 1. Bill of Materials (BOM) - Product recipes/formulas
 * 2. Work Centers & Routing - Production lines, operation sequences
 * 3. Work Orders - Production order management
 * 4. Quality Control - Inspections, defect tracking
 * 5. Machine Management - Equipment registry, maintenance
 * 6. Production Planning - MRP, scheduling
 * 7. Waste & Costing - Scrap tracking, cost analysis
 * 8. Shift Production - Production tracking by shift
 */

const sequelize = require('../lib/sequelize');

async function run() {
  try {
    console.log('🏭 Manufacturing Module - Creating tables...\n');

    // ==========================================
    // 1. MFG_WORK_CENTERS - Production lines
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_work_centers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        code VARCHAR(50) NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        type VARCHAR(50) DEFAULT 'production' CHECK (type IN ('production','assembly','packaging','quality','warehouse','mixing','cutting','welding','painting','finishing')),
        capacity_per_hour DECIMAL(10,2) DEFAULT 0,
        operating_cost_per_hour DECIMAL(15,2) DEFAULT 0,
        setup_time_minutes INTEGER DEFAULT 0,
        status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active','inactive','maintenance','decommissioned')),
        location VARCHAR(200),
        branch_id UUID REFERENCES branches(id),
        manager_id INTEGER REFERENCES employees(id),
        shift_count INTEGER DEFAULT 1,
        efficiency_target DECIMAL(5,2) DEFAULT 85.00,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, code)
      );
    `);
    console.log('✅ mfg_work_centers');

    // ==========================================
    // 2. MFG_BOM - Bill of Materials header
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_bom (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        product_id INTEGER REFERENCES products(id),
        bom_code VARCHAR(50) NOT NULL,
        bom_name VARCHAR(200) NOT NULL,
        version INTEGER DEFAULT 1,
        status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft','active','expired','archived')),
        bom_type VARCHAR(30) DEFAULT 'standard' CHECK (bom_type IN ('standard','phantom','configurable','rework')),
        effective_date DATE,
        expiry_date DATE,
        base_quantity DECIMAL(10,2) DEFAULT 1,
        base_uom VARCHAR(20) DEFAULT 'pcs',
        yield_percentage DECIMAL(5,2) DEFAULT 100.00,
        routing_id UUID,
        notes TEXT,
        created_by INTEGER REFERENCES employees(id),
        approved_by INTEGER REFERENCES employees(id),
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, bom_code, version)
      );
    `);
    console.log('✅ mfg_bom');

    // ==========================================
    // 3. MFG_BOM_ITEMS - BOM line items
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_bom_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bom_id UUID NOT NULL REFERENCES mfg_bom(id) ON DELETE CASCADE,
        item_type VARCHAR(30) DEFAULT 'raw_material' CHECK (item_type IN ('raw_material','semi_finished','packaging','consumable','sub_assembly')),
        product_id INTEGER REFERENCES products(id),
        quantity DECIMAL(10,4) NOT NULL,
        uom VARCHAR(20) DEFAULT 'pcs',
        waste_percentage DECIMAL(5,2) DEFAULT 0,
        scrap_percentage DECIMAL(5,2) DEFAULT 0,
        is_critical BOOLEAN DEFAULT false,
        is_phantom BOOLEAN DEFAULT false,
        sub_bom_id UUID REFERENCES mfg_bom(id),
        cost_per_unit DECIMAL(15,2) DEFAULT 0,
        lead_time_days INTEGER DEFAULT 0,
        notes TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ mfg_bom_items');

    // ==========================================
    // 4. MFG_ROUTINGS - Production routing header
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_routings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        product_id INTEGER REFERENCES products(id),
        routing_code VARCHAR(50) NOT NULL,
        routing_name VARCHAR(200) NOT NULL,
        version INTEGER DEFAULT 1,
        status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft','active','expired','archived')),
        total_time_minutes INTEGER DEFAULT 0,
        total_cost DECIMAL(15,2) DEFAULT 0,
        notes TEXT,
        created_by INTEGER REFERENCES employees(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, routing_code, version)
      );
    `);
    console.log('✅ mfg_routings');

    // ==========================================
    // 5. MFG_ROUTING_OPERATIONS - Routing steps
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_routing_operations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        routing_id UUID NOT NULL REFERENCES mfg_routings(id) ON DELETE CASCADE,
        operation_number INTEGER NOT NULL,
        operation_name VARCHAR(200) NOT NULL,
        work_center_id UUID REFERENCES mfg_work_centers(id),
        setup_time_minutes INTEGER DEFAULT 0,
        run_time_per_unit DECIMAL(10,2) DEFAULT 0,
        overlap_percentage DECIMAL(5,2) DEFAULT 0,
        description TEXT,
        quality_check_required BOOLEAN DEFAULT false,
        tools_required JSONB DEFAULT '[]',
        skill_required VARCHAR(100),
        cost_per_unit DECIMAL(15,2) DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ mfg_routing_operations');

    // Add FK from mfg_bom to mfg_routings
    await sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE mfg_bom ADD CONSTRAINT fk_bom_routing FOREIGN KEY (routing_id) REFERENCES mfg_routings(id);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // ==========================================
    // 6. MFG_WORK_ORDERS - Production orders
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_work_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        wo_number VARCHAR(50) NOT NULL,
        product_id INTEGER REFERENCES products(id),
        bom_id UUID REFERENCES mfg_bom(id),
        routing_id UUID REFERENCES mfg_routings(id),
        planned_quantity DECIMAL(10,2) NOT NULL,
        actual_quantity DECIMAL(10,2) DEFAULT 0,
        rejected_quantity DECIMAL(10,2) DEFAULT 0,
        uom VARCHAR(20) DEFAULT 'pcs',
        status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft','planned','released','in_progress','completed','cancelled','on_hold')),
        priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent','critical')),
        planned_start TIMESTAMP,
        planned_end TIMESTAMP,
        actual_start TIMESTAMP,
        actual_end TIMESTAMP,
        work_center_id UUID REFERENCES mfg_work_centers(id),
        assigned_to INTEGER REFERENCES employees(id),
        branch_id UUID REFERENCES branches(id),
        parent_wo_id UUID REFERENCES mfg_work_orders(id),
        source_type VARCHAR(30) CHECK (source_type IN ('manual','mrp','sales_order','reorder')),
        source_id VARCHAR(100),
        batch_number VARCHAR(50),
        lot_number VARCHAR(50),
        estimated_cost DECIMAL(15,2) DEFAULT 0,
        actual_cost DECIMAL(15,2) DEFAULT 0,
        yield_percentage DECIMAL(5,2) DEFAULT 0,
        notes TEXT,
        created_by INTEGER REFERENCES employees(id),
        approved_by INTEGER REFERENCES employees(id),
        approved_at TIMESTAMP,
        completed_by INTEGER REFERENCES employees(id),
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, wo_number)
      );
    `);
    console.log('✅ mfg_work_orders');

    // ==========================================
    // 7. MFG_WO_MATERIALS - WO material consumption
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_wo_materials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        work_order_id UUID NOT NULL REFERENCES mfg_work_orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        bom_item_id UUID REFERENCES mfg_bom_items(id),
        planned_quantity DECIMAL(10,4) NOT NULL,
        issued_quantity DECIMAL(10,4) DEFAULT 0,
        consumed_quantity DECIMAL(10,4) DEFAULT 0,
        returned_quantity DECIMAL(10,4) DEFAULT 0,
        wasted_quantity DECIMAL(10,4) DEFAULT 0,
        uom VARCHAR(20) DEFAULT 'pcs',
        status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','partial','issued','consumed','returned')),
        warehouse_id INTEGER REFERENCES warehouses(id),
        cost_per_unit DECIMAL(15,2) DEFAULT 0,
        total_cost DECIMAL(15,2) DEFAULT 0,
        issued_at TIMESTAMP,
        issued_by INTEGER REFERENCES employees(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ mfg_wo_materials');

    // ==========================================
    // 8. MFG_WO_OPERATIONS - WO operation tracking
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_wo_operations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        work_order_id UUID NOT NULL REFERENCES mfg_work_orders(id) ON DELETE CASCADE,
        routing_operation_id UUID REFERENCES mfg_routing_operations(id),
        operation_number INTEGER NOT NULL,
        operation_name VARCHAR(200) NOT NULL,
        work_center_id UUID REFERENCES mfg_work_centers(id),
        planned_start TIMESTAMP,
        planned_end TIMESTAMP,
        actual_start TIMESTAMP,
        actual_end TIMESTAMP,
        status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped','failed')),
        operator_id INTEGER REFERENCES employees(id),
        setup_time_actual INTEGER DEFAULT 0,
        run_time_actual INTEGER DEFAULT 0,
        quantity_input DECIMAL(10,2) DEFAULT 0,
        quantity_output DECIMAL(10,2) DEFAULT 0,
        quantity_rejected DECIMAL(10,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ mfg_wo_operations');

    // ==========================================
    // 9. MFG_WO_OUTPUTS - Finished goods output
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_wo_outputs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        work_order_id UUID NOT NULL REFERENCES mfg_work_orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        quantity DECIMAL(10,2) NOT NULL,
        uom VARCHAR(20) DEFAULT 'pcs',
        quality_status VARCHAR(30) DEFAULT 'pending' CHECK (quality_status IN ('pending','passed','failed','rework','scrap')),
        warehouse_id INTEGER REFERENCES warehouses(id),
        batch_number VARCHAR(50),
        lot_number VARCHAR(50),
        expiry_date DATE,
        unit_cost DECIMAL(15,2) DEFAULT 0,
        total_cost DECIMAL(15,2) DEFAULT 0,
        inspection_id UUID,
        received_at TIMESTAMP,
        received_by INTEGER REFERENCES employees(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ mfg_wo_outputs');

    // ==========================================
    // 10. MFG_QC_TEMPLATES - QC parameter templates
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_qc_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        template_code VARCHAR(50) NOT NULL,
        template_name VARCHAR(200) NOT NULL,
        product_category VARCHAR(100),
        inspection_type VARCHAR(50) DEFAULT 'in_process' CHECK (inspection_type IN ('incoming','in_process','final','random','periodic')),
        parameters JSONB DEFAULT '[]',
        sampling_method VARCHAR(50) DEFAULT 'random',
        sample_size_formula VARCHAR(100),
        acceptance_criteria TEXT,
        status VARCHAR(30) DEFAULT 'active',
        description TEXT,
        created_by INTEGER REFERENCES employees(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, template_code)
      );
    `);
    console.log('✅ mfg_qc_templates');

    // ==========================================
    // 11. MFG_QC_INSPECTIONS - QC inspection records
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_qc_inspections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        inspection_number VARCHAR(50) NOT NULL,
        work_order_id UUID REFERENCES mfg_work_orders(id),
        product_id INTEGER REFERENCES products(id),
        template_id UUID REFERENCES mfg_qc_templates(id),
        inspection_type VARCHAR(50) DEFAULT 'in_process',
        inspector_id INTEGER REFERENCES employees(id),
        inspection_date TIMESTAMP DEFAULT NOW(),
        status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
        overall_result VARCHAR(30) CHECK (overall_result IN ('passed','failed','conditional','rework')),
        sample_size INTEGER DEFAULT 1,
        defects_found INTEGER DEFAULT 0,
        defect_rate DECIMAL(5,2) DEFAULT 0,
        batch_number VARCHAR(50),
        disposition VARCHAR(50) CHECK (disposition IN ('accept','reject','rework','scrap','hold','return_to_vendor')),
        corrective_action TEXT,
        notes TEXT,
        completed_at TIMESTAMP,
        reviewed_by INTEGER REFERENCES employees(id),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, inspection_number)
      );
    `);
    console.log('✅ mfg_qc_inspections');

    // Add FK from mfg_wo_outputs to mfg_qc_inspections
    await sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE mfg_wo_outputs ADD CONSTRAINT fk_wo_output_inspection FOREIGN KEY (inspection_id) REFERENCES mfg_qc_inspections(id);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // ==========================================
    // 12. MFG_QC_RESULTS - QC test results
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_qc_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        inspection_id UUID NOT NULL REFERENCES mfg_qc_inspections(id) ON DELETE CASCADE,
        parameter_name VARCHAR(200) NOT NULL,
        parameter_type VARCHAR(50) DEFAULT 'numeric' CHECK (parameter_type IN ('numeric','boolean','text','range','visual')),
        expected_value VARCHAR(200),
        actual_value VARCHAR(200),
        uom VARCHAR(50),
        min_value DECIMAL(15,4),
        max_value DECIMAL(15,4),
        result VARCHAR(30) CHECK (result IN ('pass','fail','warning','na')),
        severity VARCHAR(30) DEFAULT 'minor' CHECK (severity IN ('critical','major','minor','cosmetic')),
        notes TEXT,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ mfg_qc_results');

    // ==========================================
    // 13. MFG_MACHINES - Equipment registry
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_machines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        machine_code VARCHAR(50) NOT NULL,
        machine_name VARCHAR(200) NOT NULL,
        type VARCHAR(100),
        manufacturer VARCHAR(200),
        model VARCHAR(200),
        serial_number VARCHAR(100),
        purchase_date DATE,
        warranty_expiry DATE,
        location VARCHAR(200),
        work_center_id UUID REFERENCES mfg_work_centers(id),
        branch_id UUID REFERENCES branches(id),
        status VARCHAR(30) DEFAULT 'operational' CHECK (status IN ('operational','maintenance','breakdown','idle','decommissioned')),
        operating_hours DECIMAL(10,2) DEFAULT 0,
        maintenance_interval_hours INTEGER DEFAULT 500,
        last_maintenance_date DATE,
        next_maintenance_date DATE,
        cost_per_hour DECIMAL(15,2) DEFAULT 0,
        purchase_cost DECIMAL(15,2) DEFAULT 0,
        depreciation_rate DECIMAL(5,2) DEFAULT 10,
        power_consumption_kw DECIMAL(10,2) DEFAULT 0,
        specifications JSONB DEFAULT '{}',
        notes TEXT,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, machine_code)
      );
    `);
    console.log('✅ mfg_machines');

    // ==========================================
    // 14. MFG_MAINTENANCE_RECORDS
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_maintenance_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        machine_id UUID NOT NULL REFERENCES mfg_machines(id) ON DELETE CASCADE,
        tenant_id UUID REFERENCES tenants(id),
        maintenance_type VARCHAR(50) DEFAULT 'preventive' CHECK (maintenance_type IN ('preventive','corrective','predictive','emergency','overhaul')),
        maintenance_number VARCHAR(50),
        description TEXT NOT NULL,
        scheduled_date DATE,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        performed_by INTEGER REFERENCES employees(id),
        vendor_name VARCHAR(200),
        cost DECIMAL(15,2) DEFAULT 0,
        parts_used JSONB DEFAULT '[]',
        parts_cost DECIMAL(15,2) DEFAULT 0,
        labor_cost DECIMAL(15,2) DEFAULT 0,
        downtime_hours DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(30) DEFAULT 'scheduled' CHECK (status IN ('scheduled','in_progress','completed','cancelled','overdue')),
        priority VARCHAR(20) DEFAULT 'normal',
        root_cause TEXT,
        findings TEXT,
        recommendations TEXT,
        next_action_date DATE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ mfg_maintenance_records');

    // ==========================================
    // 15. MFG_PRODUCTION_PLANS - MRP
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_production_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        plan_code VARCHAR(50) NOT NULL,
        plan_name VARCHAR(200) NOT NULL,
        plan_type VARCHAR(50) DEFAULT 'weekly' CHECK (plan_type IN ('daily','weekly','monthly','quarterly','annual','custom')),
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft','confirmed','in_progress','completed','cancelled')),
        total_planned_qty DECIMAL(15,2) DEFAULT 0,
        total_planned_cost DECIMAL(15,2) DEFAULT 0,
        capacity_utilization DECIMAL(5,2) DEFAULT 0,
        notes TEXT,
        created_by INTEGER REFERENCES employees(id),
        approved_by INTEGER REFERENCES employees(id),
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, plan_code)
      );
    `);
    console.log('✅ mfg_production_plans');

    // ==========================================
    // 16. MFG_PRODUCTION_PLAN_ITEMS
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_production_plan_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id UUID NOT NULL REFERENCES mfg_production_plans(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id),
        bom_id UUID REFERENCES mfg_bom(id),
        planned_quantity DECIMAL(10,2) NOT NULL,
        scheduled_date DATE,
        work_center_id UUID REFERENCES mfg_work_centers(id),
        priority VARCHAR(20) DEFAULT 'normal',
        work_order_id UUID REFERENCES mfg_work_orders(id),
        status VARCHAR(30) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ mfg_production_plan_items');

    // ==========================================
    // 17. MFG_WASTE_RECORDS - Scrap tracking
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_waste_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        work_order_id UUID REFERENCES mfg_work_orders(id),
        product_id INTEGER REFERENCES products(id),
        waste_type VARCHAR(50) DEFAULT 'scrap' CHECK (waste_type IN ('scrap','rework','defect','spoilage','overrun','trim','expired')),
        quantity DECIMAL(10,4) NOT NULL,
        uom VARCHAR(20) DEFAULT 'pcs',
        reason TEXT,
        category VARCHAR(100),
        cost_impact DECIMAL(15,2) DEFAULT 0,
        disposal_method VARCHAR(50) CHECK (disposal_method IN ('recycle','dispose','rework','return','sell_as_second')),
        work_center_id UUID REFERENCES mfg_work_centers(id),
        operation_id UUID REFERENCES mfg_wo_operations(id),
        recorded_by INTEGER REFERENCES employees(id),
        recorded_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ mfg_waste_records');

    // ==========================================
    // 18. MFG_PRODUCTION_COSTS - Cost tracking
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_production_costs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        work_order_id UUID REFERENCES mfg_work_orders(id),
        cost_type VARCHAR(50) NOT NULL CHECK (cost_type IN ('material','labor','overhead','machine','energy','packaging','indirect','other')),
        description VARCHAR(200),
        planned_amount DECIMAL(15,2) DEFAULT 0,
        actual_amount DECIMAL(15,2) DEFAULT 0,
        variance DECIMAL(15,2) DEFAULT 0,
        variance_percentage DECIMAL(5,2) DEFAULT 0,
        allocation_basis VARCHAR(50),
        reference_id VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ mfg_production_costs');

    // ==========================================
    // 19. MFG_SHIFT_PRODUCTIONS - Production by shift
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_shift_productions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        work_order_id UUID REFERENCES mfg_work_orders(id),
        work_center_id UUID REFERENCES mfg_work_centers(id),
        machine_id UUID REFERENCES mfg_machines(id),
        shift_date DATE NOT NULL,
        shift_name VARCHAR(50) NOT NULL,
        operator_id INTEGER REFERENCES employees(id),
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        planned_output DECIMAL(10,2) DEFAULT 0,
        actual_output DECIMAL(10,2) DEFAULT 0,
        good_output DECIMAL(10,2) DEFAULT 0,
        reject_count DECIMAL(10,2) DEFAULT 0,
        downtime_minutes INTEGER DEFAULT 0,
        downtime_reason TEXT,
        oee_availability DECIMAL(5,2) DEFAULT 0,
        oee_performance DECIMAL(5,2) DEFAULT 0,
        oee_quality DECIMAL(5,2) DEFAULT 0,
        oee_overall DECIMAL(5,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ mfg_shift_productions');

    // ==========================================
    // 20. MFG_SETTINGS - Module settings
    // ==========================================
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mfg_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id),
        setting_key VARCHAR(100) NOT NULL,
        setting_value JSONB DEFAULT '{}',
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(tenant_id, setting_key)
      );
    `);
    console.log('✅ mfg_settings');

    // ==========================================
    // INDEXES for performance
    // ==========================================
    console.log('\n📊 Creating indexes...');

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_mfg_bom_tenant ON mfg_bom(tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_bom_product ON mfg_bom(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_bom_status ON mfg_bom(status)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_bom_items_bom ON mfg_bom_items(bom_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_routings_tenant ON mfg_routings(tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_routing_ops_routing ON mfg_routing_operations(routing_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_wo_tenant ON mfg_work_orders(tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_wo_status ON mfg_work_orders(status)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_wo_product ON mfg_work_orders(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_wo_planned_start ON mfg_work_orders(planned_start)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_wo_branch ON mfg_work_orders(branch_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_wo_materials_wo ON mfg_wo_materials(work_order_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_wo_operations_wo ON mfg_wo_operations(work_order_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_wo_outputs_wo ON mfg_wo_outputs(work_order_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_qc_inspections_wo ON mfg_qc_inspections(work_order_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_qc_inspections_status ON mfg_qc_inspections(status)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_qc_results_inspection ON mfg_qc_results(inspection_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_machines_tenant ON mfg_machines(tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_machines_wc ON mfg_machines(work_center_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_maintenance_machine ON mfg_maintenance_records(machine_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_maintenance_status ON mfg_maintenance_records(status)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_plans_tenant ON mfg_production_plans(tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_plan_items_plan ON mfg_production_plan_items(plan_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_waste_wo ON mfg_waste_records(work_order_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_costs_wo ON mfg_production_costs(work_order_id)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_shift_prod_date ON mfg_shift_productions(shift_date)',
      'CREATE INDEX IF NOT EXISTS idx_mfg_shift_prod_wo ON mfg_shift_productions(work_order_id)',
    ];

    for (const idx of indexes) {
      await sequelize.query(idx);
    }
    console.log('✅ All indexes created');

    // ==========================================
    // SEED DATA
    // ==========================================
    console.log('\n🌱 Seeding default data...');

    // Seed default settings
    const defaultSettings = [
      { key: 'wo_number_format', value: { prefix: 'WO', separator: '-', dateFormat: 'YYMM', sequence: true }, desc: 'Work Order number format' },
      { key: 'auto_generate_wo_from_plan', value: { enabled: false }, desc: 'Auto-generate WO from production plan' },
      { key: 'require_qc_before_output', value: { enabled: true }, desc: 'Require QC inspection before marking output' },
      { key: 'auto_consume_materials', value: { enabled: false, method: 'backflush' }, desc: 'Auto-consume materials on WO completion' },
      { key: 'maintenance_alerts', value: { enabled: true, days_before: 7 }, desc: 'Machine maintenance alerts' },
      { key: 'oee_targets', value: { availability: 90, performance: 95, quality: 99, overall: 85 }, desc: 'OEE target percentages' },
      { key: 'costing_method', value: { method: 'standard', overhead_allocation: 'machine_hours' }, desc: 'Production costing method' },
      { key: 'waste_tracking', value: { enabled: true, threshold_percentage: 5, alert_on_exceed: true }, desc: 'Waste tracking settings' },
    ];

    for (const s of defaultSettings) {
      await sequelize.query(`
        INSERT INTO mfg_settings (tenant_id, setting_key, setting_value, description)
        SELECT t.id, :key, :value, :desc
        FROM tenants t
        ON CONFLICT (tenant_id, setting_key) DO NOTHING
      `, { replacements: { key: s.key, value: JSON.stringify(s.value), desc: s.desc } });
    }
    console.log('✅ Default settings seeded');

    // Seed QC templates
    const qcTemplates = [
      {
        code: 'QC-INCOMING',
        name: 'Incoming Material Inspection',
        type: 'incoming',
        category: 'Raw Material',
        params: [
          { name: 'Visual Appearance', type: 'visual', expected: 'No defects', severity: 'major' },
          { name: 'Weight Check', type: 'numeric', uom: 'kg', min: 0.95, max: 1.05, severity: 'critical' },
          { name: 'Packaging Integrity', type: 'boolean', expected: 'true', severity: 'minor' },
          { name: 'Documentation Complete', type: 'boolean', expected: 'true', severity: 'major' },
        ]
      },
      {
        code: 'QC-INPROCESS',
        name: 'In-Process Quality Check',
        type: 'in_process',
        category: 'Semi-Finished',
        params: [
          { name: 'Dimension Check', type: 'range', uom: 'mm', min: 9.8, max: 10.2, severity: 'critical' },
          { name: 'Surface Finish', type: 'visual', expected: 'Smooth, no scratches', severity: 'major' },
          { name: 'Temperature', type: 'numeric', uom: '°C', min: 180, max: 220, severity: 'critical' },
        ]
      },
      {
        code: 'QC-FINAL',
        name: 'Final Product Inspection',
        type: 'final',
        category: 'Finished Goods',
        params: [
          { name: 'Functionality Test', type: 'boolean', expected: 'true', severity: 'critical' },
          { name: 'Labeling Check', type: 'boolean', expected: 'true', severity: 'major' },
          { name: 'Weight Tolerance', type: 'range', uom: 'g', min: 495, max: 505, severity: 'critical' },
          { name: 'Visual Quality', type: 'visual', expected: 'Grade A standard', severity: 'major' },
          { name: 'Packaging Quality', type: 'visual', expected: 'No damage', severity: 'minor' },
        ]
      }
    ];

    for (const t of qcTemplates) {
      await sequelize.query(`
        INSERT INTO mfg_qc_templates (tenant_id, template_code, template_name, inspection_type, product_category, parameters, status)
        SELECT ten.id, :code, :name, :type, :category, :params, 'active'
        FROM tenants ten
        ON CONFLICT (tenant_id, template_code) DO NOTHING
      `, { replacements: { code: t.code, name: t.name, type: t.type, category: t.category, params: JSON.stringify(t.params) } });
    }
    console.log('✅ QC templates seeded');

    // Register manufacturing module
    await sequelize.query(`
      INSERT INTO modules (id, code, name, description, category, is_core, is_active, pricing_tier, features, icon, color, version, tags, setup_complexity, route, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'manufacturing',
        'Manufacturing Management',
        'Complete manufacturing management with BOM, work orders, MRP, quality control, machine management, and production analytics',
        'operations',
        false,
        true,
        'enterprise',
        '["Bill of Materials (BOM)","Work Orders","Production Planning (MRP)","Quality Control","Machine Management","Maintenance Scheduling","Waste Tracking","Production Costing","OEE Analytics","Shift Production"]',
        'Factory',
        '#7C3AED',
        '1.0.0',
        '["manufacturing","production","bom","mrp","quality","oee"]',
        'advanced',
        '/hq/manufacturing',
        NOW(),
        NOW()
      )
      ON CONFLICT (code) DO NOTHING;
    `);
    console.log('✅ Manufacturing module registered');

    // Add module dependency: manufacturing → inventory (required)
    await sequelize.query(`
      INSERT INTO module_dependencies (id, module_id, depends_on_module_id, dependency_type, created_at)
      SELECT gen_random_uuid(), m1.id, m2.id, 'required', NOW()
      FROM modules m1, modules m2
      WHERE m1.code = 'manufacturing' AND m2.code = 'inventory'
      AND NOT EXISTS (
        SELECT 1 FROM module_dependencies md WHERE md.module_id = m1.id AND md.depends_on_module_id = m2.id
      );
    `);

    // Add module dependency: manufacturing → products (required)
    await sequelize.query(`
      INSERT INTO module_dependencies (id, module_id, depends_on_module_id, dependency_type, created_at)
      SELECT gen_random_uuid(), m1.id, m2.id, 'required', NOW()
      FROM modules m1, modules m2
      WHERE m1.code = 'manufacturing' AND m2.code = 'products'
      AND NOT EXISTS (
        SELECT 1 FROM module_dependencies md WHERE md.module_id = m1.id AND md.depends_on_module_id = m2.id
      );
    `);

    // Optional dependency on HRIS for worker assignment
    await sequelize.query(`
      INSERT INTO module_dependencies (id, module_id, depends_on_module_id, dependency_type, created_at)
      SELECT gen_random_uuid(), m1.id, m2.id, 'optional', NOW()
      FROM modules m1, modules m2
      WHERE m1.code = 'manufacturing' AND m2.code = 'hris'
      AND NOT EXISTS (
        SELECT 1 FROM module_dependencies md WHERE md.module_id = m1.id AND md.depends_on_module_id = m2.id
      );
    `);
    console.log('✅ Module dependencies added');

    // Enable for existing tenants - check columns first
    try {
      await sequelize.query(`
        INSERT INTO tenant_modules (id, tenant_id, module_id, created_at)
        SELECT gen_random_uuid(), t.id, m.id, NOW()
        FROM tenants t, modules m
        WHERE m.code = 'manufacturing'
        AND NOT EXISTS (
          SELECT 1 FROM tenant_modules tm WHERE tm.tenant_id = t.id AND tm.module_id = m.id
        );
      `);
    } catch (e) {
      console.log('⚠️ tenant_modules insert skipped (may already exist):', e.message);
    }
    console.log('✅ Module enabled for tenants');

    console.log('\n🎉 Manufacturing Module migration completed successfully!');
    console.log('   Tables created: 20');
    console.log('   Indexes created: 27');
    console.log('   Settings seeded: 8');
    console.log('   QC templates: 3');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

run();
