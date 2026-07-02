/**
 * Asset Management Module - Database Migration Script
 * 
 * Creates all tables for:
 * 1. Core: Asset Registry, Categories, Lifecycle, Depreciation, Movements, Custody
 * 2. EAV Dynamic Fields: Attributes & Values
 * 3. Industry Extensions:
 *    A. Manufacturing: Maintenance, OEE, Spare Parts
 *    B. Property: Tenancy, Utility, Facility Booking
 *    C. IT/Office: License, Discovery, Handover
 * 4. Integration: Journal triggers, Alerts, Settings
 */

const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: dbConfig.dialect,
  logging: console.log
});

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // ========================================
    // 1. CORE TABLES
    // ========================================

    // Asset Categories (hierarchical)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS asset_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        code VARCHAR(30) NOT NULL,
        name VARCHAR(100) NOT NULL,
        parent_id UUID REFERENCES asset_categories(id) ON DELETE SET NULL,
        description TEXT,
        icon VARCHAR(50),
        depreciation_method VARCHAR(30) DEFAULT 'straight_line',
        default_useful_life INTEGER DEFAULT 60,
        default_salvage_pct DECIMAL(5,2) DEFAULT 0,
        industry_pack VARCHAR(30),
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ asset_categories created');

    // Assets (Core Registry)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        asset_code VARCHAR(50) NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        category_id UUID REFERENCES asset_categories(id),
        status VARCHAR(30) DEFAULT 'draft',
        condition VARCHAR(30) DEFAULT 'good',
        -- Acquisition
        acquisition_type VARCHAR(30) DEFAULT 'purchase',
        acquisition_date DATE,
        purchase_price DECIMAL(19,4) DEFAULT 0,
        supplier_id UUID,
        po_number VARCHAR(50),
        invoice_number VARCHAR(50),
        warranty_expiry DATE,
        -- Identification
        serial_number VARCHAR(100),
        barcode VARCHAR(100),
        qr_code VARCHAR(200),
        rfid_tag VARCHAR(100),
        -- Location & Custody
        branch_id UUID,
        department VARCHAR(100),
        location VARCHAR(200),
        floor VARCHAR(20),
        room VARCHAR(50),
        gps_latitude DECIMAL(10,7),
        gps_longitude DECIMAL(10,7),
        custodian_id INTEGER,
        custodian_name VARCHAR(100),
        -- Specs
        brand VARCHAR(100),
        model VARCHAR(100),
        manufacturer VARCHAR(100),
        year_manufactured INTEGER,
        color VARCHAR(30),
        weight_kg DECIMAL(10,2),
        dimensions VARCHAR(100),
        -- Depreciation
        depreciation_method VARCHAR(30) DEFAULT 'straight_line',
        useful_life_months INTEGER DEFAULT 60,
        salvage_value DECIMAL(19,4) DEFAULT 0,
        accumulated_depreciation DECIMAL(19,4) DEFAULT 0,
        current_book_value DECIMAL(19,4) DEFAULT 0,
        last_depreciation_date DATE,
        -- Disposal
        disposal_date DATE,
        disposal_method VARCHAR(30),
        disposal_price DECIMAL(19,4),
        disposal_reason TEXT,
        disposal_approved_by INTEGER,
        -- Insurance
        insurance_policy VARCHAR(100),
        insurance_provider VARCHAR(100),
        insurance_expiry DATE,
        insurance_value DECIMAL(19,4),
        -- Metadata
        photo_url TEXT,
        attachments JSONB DEFAULT '[]',
        tags JSONB DEFAULT '[]',
        custom_fields JSONB DEFAULT '{}',
        notes TEXT,
        created_by INTEGER,
        updated_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, asset_code)
      );
    `);
    console.log('✅ assets created');

    // EAV: Dynamic Attributes
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS asset_attributes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL,
        data_type VARCHAR(20) NOT NULL DEFAULT 'string',
        category_id UUID REFERENCES asset_categories(id),
        industry_pack VARCHAR(30),
        options JSONB,
        is_required BOOLEAN DEFAULT false,
        is_searchable BOOLEAN DEFAULT false,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ asset_attributes created');

    // EAV: Attribute Values
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS asset_attribute_values (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        attribute_id UUID NOT NULL REFERENCES asset_attributes(id) ON DELETE CASCADE,
        value_string VARCHAR(500),
        value_number DECIMAL(19,4),
        value_date DATE,
        value_boolean BOOLEAN,
        value_json JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(asset_id, attribute_id)
      );
    `);
    console.log('✅ asset_attribute_values created');

    // Asset Lifecycle Events
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS asset_lifecycle_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        event_type VARCHAR(30) NOT NULL,
        event_date TIMESTAMPTZ DEFAULT NOW(),
        from_status VARCHAR(30),
        to_status VARCHAR(30),
        description TEXT,
        performed_by INTEGER,
        performed_by_name VARCHAR(100),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ asset_lifecycle_events created');

    // Depreciation Schedule
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS asset_depreciation_schedule (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        period_number INTEGER NOT NULL,
        period_date DATE NOT NULL,
        opening_value DECIMAL(19,4) NOT NULL,
        depreciation_amount DECIMAL(19,4) NOT NULL,
        accumulated DECIMAL(19,4) NOT NULL,
        closing_value DECIMAL(19,4) NOT NULL,
        is_posted BOOLEAN DEFAULT false,
        posted_at TIMESTAMPTZ,
        journal_entry_id UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ asset_depreciation_schedule created');

    // Asset Movements & Transfers
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS asset_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        movement_type VARCHAR(30) NOT NULL,
        movement_date TIMESTAMPTZ DEFAULT NOW(),
        reference_number VARCHAR(50),
        -- From
        from_branch_id UUID,
        from_department VARCHAR(100),
        from_location VARCHAR(200),
        from_custodian_id INTEGER,
        from_custodian_name VARCHAR(100),
        -- To
        to_branch_id UUID,
        to_department VARCHAR(100),
        to_location VARCHAR(200),
        to_custodian_id INTEGER,
        to_custodian_name VARCHAR(100),
        -- Approval
        status VARCHAR(20) DEFAULT 'pending',
        requested_by INTEGER,
        requested_by_name VARCHAR(100),
        approved_by INTEGER,
        approved_by_name VARCHAR(100),
        approved_at TIMESTAMPTZ,
        received_by INTEGER,
        received_by_name VARCHAR(100),
        received_at TIMESTAMPTZ,
        -- Details
        reason TEXT,
        condition_on_transfer VARCHAR(30),
        notes TEXT,
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ asset_movements created');

    // Asset Custody Log (Serah Terima)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS asset_custody_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        action VARCHAR(20) NOT NULL,
        custodian_id INTEGER,
        custodian_name VARCHAR(100),
        handover_date TIMESTAMPTZ DEFAULT NOW(),
        return_date TIMESTAMPTZ,
        condition_checkout VARCHAR(30),
        condition_checkin VARCHAR(30),
        checklist JSONB DEFAULT '[]',
        notes TEXT,
        signature_url TEXT,
        witness_name VARCHAR(100),
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ asset_custody_logs created');

    // ========================================
    // 2. INDUSTRY EXTENSION: MANUFACTURING
    // ========================================

    // Preventive Maintenance Schedules
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS asset_maintenance_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        schedule_type VARCHAR(20) NOT NULL DEFAULT 'calendar',
        title VARCHAR(200) NOT NULL,
        description TEXT,
        -- Calendar-based
        frequency VARCHAR(20),
        interval_value INTEGER,
        next_due_date DATE,
        last_performed_date DATE,
        -- Hour-meter based
        hour_meter_interval INTEGER,
        last_hour_meter DECIMAL(12,2),
        current_hour_meter DECIMAL(12,2),
        next_due_hour_meter DECIMAL(12,2),
        -- Details
        estimated_duration_hours DECIMAL(6,2),
        estimated_cost DECIMAL(19,4),
        assigned_to INTEGER,
        assigned_to_name VARCHAR(100),
        priority VARCHAR(10) DEFAULT 'medium',
        is_active BOOLEAN DEFAULT true,
        checklist JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ asset_maintenance_schedules created');

    // Work Orders (Maintenance Execution)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS asset_work_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        schedule_id UUID REFERENCES asset_maintenance_schedules(id),
        wo_number VARCHAR(50) NOT NULL,
        wo_type VARCHAR(30) NOT NULL DEFAULT 'preventive',
        title VARCHAR(200) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'open',
        priority VARCHAR(10) DEFAULT 'medium',
        -- Dates
        planned_start DATE,
        planned_end DATE,
        actual_start TIMESTAMPTZ,
        actual_end TIMESTAMPTZ,
        -- Assignment
        assigned_to INTEGER,
        assigned_to_name VARCHAR(100),
        completed_by INTEGER,
        completed_by_name VARCHAR(100),
        -- Cost
        labor_cost DECIMAL(19,4) DEFAULT 0,
        parts_cost DECIMAL(19,4) DEFAULT 0,
        total_cost DECIMAL(19,4) DEFAULT 0,
        -- Details
        root_cause TEXT,
        resolution TEXT,
        downtime_minutes INTEGER DEFAULT 0,
        hour_meter_reading DECIMAL(12,2),
        checklist_results JSONB DEFAULT '[]',
        parts_used JSONB DEFAULT '[]',
        attachments JSONB DEFAULT '[]',
        notes TEXT,
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ asset_work_orders created');

    // OEE Records (Overall Equipment Effectiveness)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS asset_oee_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        record_date DATE NOT NULL,
        shift VARCHAR(20),
        -- Availability
        planned_production_time INTEGER NOT NULL DEFAULT 480,
        actual_run_time INTEGER NOT NULL DEFAULT 0,
        downtime_minutes INTEGER DEFAULT 0,
        -- Performance
        ideal_cycle_time DECIMAL(10,4),
        total_count INTEGER DEFAULT 0,
        -- Quality
        good_count INTEGER DEFAULT 0,
        reject_count INTEGER DEFAULT 0,
        -- Calculated
        availability_pct DECIMAL(5,2) DEFAULT 0,
        performance_pct DECIMAL(5,2) DEFAULT 0,
        quality_pct DECIMAL(5,2) DEFAULT 0,
        oee_pct DECIMAL(5,2) DEFAULT 0,
        notes TEXT,
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(asset_id, record_date, shift)
      );
    `);
    console.log('✅ asset_oee_records created');

    // Spare Part Links
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS asset_spare_parts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        product_id UUID,
        part_name VARCHAR(200) NOT NULL,
        part_number VARCHAR(50),
        quantity_required INTEGER DEFAULT 1,
        min_stock INTEGER DEFAULT 1,
        current_stock INTEGER DEFAULT 0,
        unit VARCHAR(20) DEFAULT 'pcs',
        supplier_id UUID,
        lead_time_days INTEGER DEFAULT 7,
        last_replacement_date DATE,
        replacement_interval_days INTEGER,
        estimated_cost DECIMAL(19,4),
        auto_reorder BOOLEAN DEFAULT false,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ asset_spare_parts created');

    // ========================================
    // 3. INDUSTRY EXTENSION: PROPERTY / REAL ESTATE
    // ========================================

    // Tenancy Management
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS asset_tenancies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        tenant_name VARCHAR(200) NOT NULL,
        tenant_contact VARCHAR(100),
        tenant_email VARCHAR(100),
        tenant_phone VARCHAR(30),
        tenant_company VARCHAR(200),
        -- Lease
        lease_number VARCHAR(50),
        lease_start DATE,
        lease_end DATE,
        monthly_rent DECIMAL(19,4),
        deposit_amount DECIMAL(19,4),
        payment_due_day INTEGER DEFAULT 1,
        billing_cycle VARCHAR(20) DEFAULT 'monthly',
        -- Status
        status VARCHAR(20) DEFAULT 'active',
        auto_renew BOOLEAN DEFAULT false,
        renewal_terms TEXT,
        -- Details
        unit_size_sqm DECIMAL(10,2),
        occupancy_date DATE,
        vacate_date DATE,
        notes TEXT,
        contract_url TEXT,
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ asset_tenancies created');

    // Utility Tracking
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS asset_utility_readings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        tenancy_id UUID REFERENCES asset_tenancies(id),
        utility_type VARCHAR(30) NOT NULL,
        reading_date DATE NOT NULL,
        previous_reading DECIMAL(12,2),
        current_reading DECIMAL(12,2),
        usage_amount DECIMAL(12,2),
        unit VARCHAR(20),
        rate_per_unit DECIMAL(10,4),
        total_cost DECIMAL(19,4),
        photo_url TEXT,
        recorded_by INTEGER,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ asset_utility_readings created');

    // Facility Booking
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS asset_facility_bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        booking_number VARCHAR(50),
        title VARCHAR(200) NOT NULL,
        booked_by INTEGER,
        booked_by_name VARCHAR(100),
        department VARCHAR(100),
        -- Schedule
        booking_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        duration_minutes INTEGER,
        is_recurring BOOLEAN DEFAULT false,
        recurrence_pattern JSONB,
        -- Status
        status VARCHAR(20) DEFAULT 'confirmed',
        -- Details
        attendees INTEGER DEFAULT 1,
        purpose TEXT,
        equipment_needed JSONB DEFAULT '[]',
        catering BOOLEAN DEFAULT false,
        notes TEXT,
        cancelled_by INTEGER,
        cancelled_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ asset_facility_bookings created');

    // ========================================
    // 4. INDUSTRY EXTENSION: IT & OFFICE
    // ========================================

    // Software License Management
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS asset_licenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
        license_name VARCHAR(200) NOT NULL,
        vendor VARCHAR(200),
        license_key VARCHAR(500),
        license_type VARCHAR(30) DEFAULT 'perpetual',
        -- Dates
        purchase_date DATE,
        activation_date DATE,
        expiry_date DATE,
        renewal_date DATE,
        -- Seats
        total_seats INTEGER DEFAULT 1,
        used_seats INTEGER DEFAULT 0,
        -- Cost
        purchase_cost DECIMAL(19,4),
        renewal_cost DECIMAL(19,4),
        billing_cycle VARCHAR(20),
        -- Status
        status VARCHAR(20) DEFAULT 'active',
        auto_renew BOOLEAN DEFAULT false,
        alert_days_before INTEGER DEFAULT 30,
        -- Details
        version VARCHAR(50),
        edition VARCHAR(50),
        assigned_users JSONB DEFAULT '[]',
        notes TEXT,
        contract_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ asset_licenses created');

    // IT Asset Discovery
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS asset_it_discoveries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
        hostname VARCHAR(200),
        ip_address VARCHAR(45),
        mac_address VARCHAR(17),
        os_name VARCHAR(100),
        os_version VARCHAR(50),
        device_type VARCHAR(30),
        -- Hardware
        cpu VARCHAR(100),
        ram_gb DECIMAL(6,2),
        storage_gb DECIMAL(10,2),
        -- Network
        network_name VARCHAR(100),
        is_online BOOLEAN DEFAULT false,
        last_seen TIMESTAMPTZ,
        -- Status
        is_managed BOOLEAN DEFAULT false,
        is_compliant BOOLEAN DEFAULT true,
        compliance_issues JSONB DEFAULT '[]',
        -- Details
        installed_software JSONB DEFAULT '[]',
        open_ports JSONB DEFAULT '[]',
        scan_date TIMESTAMPTZ DEFAULT NOW(),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ asset_it_discoveries created');

    // Employee Handover Checklist
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS asset_handover_checklists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        employee_id INTEGER NOT NULL,
        employee_name VARCHAR(100) NOT NULL,
        handover_type VARCHAR(20) NOT NULL DEFAULT 'offboarding',
        handover_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        -- Items
        items JSONB DEFAULT '[]',
        -- Approval
        hr_approved_by INTEGER,
        hr_approved_name VARCHAR(100),
        hr_approved_at TIMESTAMPTZ,
        it_approved_by INTEGER,
        it_approved_name VARCHAR(100),
        it_approved_at TIMESTAMPTZ,
        manager_approved_by INTEGER,
        manager_approved_name VARCHAR(100),
        manager_approved_at TIMESTAMPTZ,
        -- Details
        notes TEXT,
        completion_pct DECIMAL(5,2) DEFAULT 0,
        completed_at TIMESTAMPTZ,
        created_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ asset_handover_checklists created');

    // ========================================
    // 5. INTEGRATION & SUPPORT TABLES
    // ========================================

    // Asset Alerts & Notifications
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS asset_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
        alert_type VARCHAR(30) NOT NULL,
        severity VARCHAR(10) DEFAULT 'info',
        title VARCHAR(200) NOT NULL,
        message TEXT,
        -- Reference
        reference_type VARCHAR(30),
        reference_id UUID,
        -- Status
        status VARCHAR(20) DEFAULT 'active',
        acknowledged_by INTEGER,
        acknowledged_at TIMESTAMPTZ,
        resolved_by INTEGER,
        resolved_at TIMESTAMPTZ,
        -- Auto
        auto_generated BOOLEAN DEFAULT true,
        due_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ asset_alerts created');

    // Asset Module Settings
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS asset_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID,
        setting_key VARCHAR(100) NOT NULL,
        setting_value JSONB NOT NULL DEFAULT '{}',
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, setting_key)
      );
    `);
    console.log('✅ asset_settings created');

    // ========================================
    // 6. INDEXES
    // ========================================

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_assets_tenant ON assets(tenant_id)',
      'CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(tenant_id, status)',
      'CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id)',
      'CREATE INDEX IF NOT EXISTS idx_assets_branch ON assets(branch_id)',
      'CREATE INDEX IF NOT EXISTS idx_assets_custodian ON assets(custodian_id)',
      'CREATE INDEX IF NOT EXISTS idx_assets_barcode ON assets(barcode)',
      'CREATE INDEX IF NOT EXISTS idx_assets_serial ON assets(serial_number)',
      'CREATE INDEX IF NOT EXISTS idx_asset_attr_vals_asset ON asset_attribute_values(asset_id)',
      'CREATE INDEX IF NOT EXISTS idx_asset_lifecycle_asset ON asset_lifecycle_events(asset_id)',
      'CREATE INDEX IF NOT EXISTS idx_asset_depr_asset ON asset_depreciation_schedule(asset_id)',
      'CREATE INDEX IF NOT EXISTS idx_asset_movements_asset ON asset_movements(asset_id)',
      'CREATE INDEX IF NOT EXISTS idx_asset_custody_asset ON asset_custody_logs(asset_id)',
      'CREATE INDEX IF NOT EXISTS idx_asset_maint_asset ON asset_maintenance_schedules(asset_id)',
      'CREATE INDEX IF NOT EXISTS idx_asset_wo_asset ON asset_work_orders(asset_id)',
      'CREATE INDEX IF NOT EXISTS idx_asset_oee_asset ON asset_oee_records(asset_id, record_date)',
      'CREATE INDEX IF NOT EXISTS idx_asset_spare_asset ON asset_spare_parts(asset_id)',
      'CREATE INDEX IF NOT EXISTS idx_asset_tenancy_asset ON asset_tenancies(asset_id)',
      'CREATE INDEX IF NOT EXISTS idx_asset_utility_asset ON asset_utility_readings(asset_id)',
      'CREATE INDEX IF NOT EXISTS idx_asset_booking_asset ON asset_facility_bookings(asset_id, booking_date)',
      'CREATE INDEX IF NOT EXISTS idx_asset_license_expiry ON asset_licenses(expiry_date)',
      'CREATE INDEX IF NOT EXISTS idx_asset_discovery_ip ON asset_it_discoveries(ip_address)',
      'CREATE INDEX IF NOT EXISTS idx_asset_handover_emp ON asset_handover_checklists(employee_id)',
      'CREATE INDEX IF NOT EXISTS idx_asset_alerts_asset ON asset_alerts(asset_id, status)',
    ];

    for (const idx of indexes) {
      await sequelize.query(idx);
    }
    console.log('✅ All indexes created');

    // ========================================
    // 7. SEED: Default Categories
    // ========================================

    const categories = [
      { code: 'LAND', name: 'Tanah', icon: 'MapPin', depreciation_method: 'none', default_useful_life: 0, sort_order: 1 },
      { code: 'BUILDING', name: 'Bangunan & Gedung', icon: 'Building2', depreciation_method: 'straight_line', default_useful_life: 240, sort_order: 2 },
      { code: 'VEHICLE', name: 'Kendaraan', icon: 'Truck', depreciation_method: 'straight_line', default_useful_life: 96, sort_order: 3 },
      { code: 'MACHINE', name: 'Mesin & Peralatan', icon: 'Cog', depreciation_method: 'straight_line', default_useful_life: 96, industry_pack: 'manufacturing', sort_order: 4 },
      { code: 'ELECTRONIC', name: 'Elektronik & Komputer', icon: 'Monitor', depreciation_method: 'straight_line', default_useful_life: 48, industry_pack: 'it_office', sort_order: 5 },
      { code: 'FURNITURE', name: 'Perabot & Furnitur', icon: 'Armchair', depreciation_method: 'straight_line', default_useful_life: 96, sort_order: 6 },
      { code: 'TOOL', name: 'Alat Kerja', icon: 'Wrench', depreciation_method: 'straight_line', default_useful_life: 48, sort_order: 7 },
      { code: 'PROPERTY', name: 'Properti Sewaan', icon: 'Home', depreciation_method: 'straight_line', default_useful_life: 240, industry_pack: 'property', sort_order: 8 },
      { code: 'SOFTWARE', name: 'Lisensi Software', icon: 'Code', depreciation_method: 'straight_line', default_useful_life: 36, industry_pack: 'it_office', sort_order: 9 },
      { code: 'INTANGIBLE', name: 'Aset Tak Berwujud', icon: 'FileText', depreciation_method: 'straight_line', default_useful_life: 60, sort_order: 10 },
    ];

    for (const cat of categories) {
      await sequelize.query(`
        INSERT INTO asset_categories (code, name, icon, depreciation_method, default_useful_life, industry_pack, sort_order)
        SELECT :code, :name, :icon, :depreciation_method, :default_useful_life, :industry_pack, :sort_order
        WHERE NOT EXISTS (SELECT 1 FROM asset_categories WHERE code = :code AND tenant_id IS NULL)
      `, { replacements: cat });
    }
    console.log('✅ Default categories seeded');

    // ========================================
    // 8. SEED: Default EAV Attributes per Industry Pack
    // ========================================

    const attributes = [
      // Manufacturing
      { code: 'hour_meter', name: 'Hour Meter (Jam Kerja)', data_type: 'number', industry_pack: 'manufacturing', sort_order: 1 },
      { code: 'power_rating', name: 'Daya (kW/HP)', data_type: 'string', industry_pack: 'manufacturing', sort_order: 2 },
      { code: 'operating_temp', name: 'Suhu Operasi (°C)', data_type: 'string', industry_pack: 'manufacturing', sort_order: 3 },
      { code: 'vibration_level', name: 'Level Getaran', data_type: 'string', industry_pack: 'manufacturing', sort_order: 4 },
      { code: 'calibration_date', name: 'Tanggal Kalibrasi', data_type: 'date', industry_pack: 'manufacturing', sort_order: 5 },
      // Property
      { code: 'floor_area_sqm', name: 'Luas Lantai (m²)', data_type: 'number', industry_pack: 'property', sort_order: 1 },
      { code: 'land_certificate', name: 'No. Sertifikat Tanah', data_type: 'string', industry_pack: 'property', sort_order: 2 },
      { code: 'imb_number', name: 'No. IMB/PBG', data_type: 'string', industry_pack: 'property', sort_order: 3 },
      { code: 'njop', name: 'NJOP', data_type: 'number', industry_pack: 'property', sort_order: 4 },
      { code: 'pbb_tax_number', name: 'No. SPPT PBB', data_type: 'string', industry_pack: 'property', sort_order: 5 },
      // IT & Office
      { code: 'mac_address', name: 'MAC Address', data_type: 'string', industry_pack: 'it_office', sort_order: 1 },
      { code: 'ip_address', name: 'IP Address', data_type: 'string', industry_pack: 'it_office', sort_order: 2 },
      { code: 'os_version', name: 'Versi OS', data_type: 'string', industry_pack: 'it_office', sort_order: 3 },
      { code: 'ram_gb', name: 'RAM (GB)', data_type: 'number', industry_pack: 'it_office', sort_order: 4 },
      { code: 'storage_gb', name: 'Storage (GB)', data_type: 'number', industry_pack: 'it_office', sort_order: 5 },
      { code: 'processor', name: 'Processor', data_type: 'string', industry_pack: 'it_office', sort_order: 6 },
    ];

    for (const attr of attributes) {
      await sequelize.query(`
        INSERT INTO asset_attributes (code, name, data_type, industry_pack, sort_order)
        SELECT :code, :name, :data_type, :industry_pack, :sort_order
        WHERE NOT EXISTS (SELECT 1 FROM asset_attributes WHERE code = :code AND tenant_id IS NULL)
      `, { replacements: attr });
    }
    console.log('✅ Default attributes seeded');

    // ========================================
    // 9. SEED: Default Settings
    // ========================================

    const settings = [
      { key: 'general', value: { auto_generate_code: true, code_prefix: 'AST', code_digits: 5, barcode_format: 'CODE128', enable_qr: true, enable_rfid: false } },
      { key: 'depreciation', value: { default_method: 'straight_line', auto_calculate: true, posting_frequency: 'monthly', fiscal_year_start: 1 } },
      { key: 'maintenance', value: { enable_preventive: true, enable_work_orders: true, auto_alert_days: 7, enable_oee: false } },
      { key: 'industry_packs', value: { manufacturing: false, property: false, it_office: false } },
      { key: 'integration', value: { finance_journal: true, hr_custody: true, inventory_sparepart: true, procurement_auto: false } },
      { key: 'alerts', value: { warranty_expiry_days: 30, license_expiry_days: 30, maintenance_due_days: 7, insurance_expiry_days: 30 } },
      { key: 'gis', value: { enable_mapping: false, default_center_lat: -6.2088, default_center_lng: 106.8456, default_zoom: 12 } },
    ];

    for (const s of settings) {
      await sequelize.query(`
        INSERT INTO asset_settings (setting_key, setting_value, description)
        SELECT :key, :value::jsonb, :desc
        WHERE NOT EXISTS (SELECT 1 FROM asset_settings WHERE setting_key = :key AND tenant_id IS NULL)
      `, { replacements: { key: s.key, value: JSON.stringify(s.value), desc: `Default ${s.key} settings` } });
    }
    console.log('✅ Default settings seeded');

    console.log('\n🎉 Asset Management module migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

run();
