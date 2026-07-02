'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const UUID = { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true };
    const TID = { type: Sequelize.UUID, allowNull: false };
    const NOW = { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW };
    const OPT_STR = (len = 255) => ({ type: Sequelize.STRING(len), allowNull: true });
    const REQ_STR = (len = 255) => ({ type: Sequelize.STRING(len), allowNull: false });
    const DEC = (p = 15, s = 2) => ({ type: Sequelize.DECIMAL(p, s), defaultValue: 0 });
    const BOOL_T = { type: Sequelize.BOOLEAN, defaultValue: true };
    const BOOL_F = { type: Sequelize.BOOLEAN, defaultValue: false };

    // ═══════════════════════════════════════════════════
    // FMS — FLEET MANAGEMENT SYSTEM (15 tables)
    // ═══════════════════════════════════════════════════

    // 1. fms_vehicles — Master kendaraan
    await queryInterface.createTable('fms_vehicles', {
      id: UUID, tenant_id: TID,
      vehicle_code: REQ_STR(30), license_plate: REQ_STR(20),
      vehicle_type: REQ_STR(50), // truck, van, bus, car, motorcycle, heavy_equipment, trailer
      vehicle_category: OPT_STR(50), // delivery, rental, operational, executive
      brand: OPT_STR(100), model: OPT_STR(100), year: { type: Sequelize.INTEGER, allowNull: true },
      color: OPT_STR(30), vin_number: OPT_STR(50), engine_number: OPT_STR(50),
      chassis_number: OPT_STR(50), engine_type: OPT_STR(30), // diesel, petrol, electric, hybrid
      transmission: OPT_STR(20), // manual, automatic
      fuel_type: OPT_STR(20), // diesel, petrol, lpg, electric
      seating_capacity: { type: Sequelize.INTEGER, allowNull: true },
      max_weight_kg: DEC(10,2), max_volume_m3: DEC(10,2), fuel_tank_capacity_l: DEC(10,2),
      avg_fuel_consumption: DEC(8,2), // km/l
      ownership_type: OPT_STR(30), // owned, leased, rented
      purchase_date: { type: Sequelize.DATEONLY, allowNull: true },
      purchase_price: DEC(), depreciation_rate: DEC(5,2),
      current_value: DEC(), salvage_value: DEC(),
      lease_vendor: OPT_STR(), lease_start: { type: Sequelize.DATEONLY, allowNull: true },
      lease_end: { type: Sequelize.DATEONLY, allowNull: true }, lease_monthly: DEC(),
      registration_number: OPT_STR(50), // STNK
      registration_expiry: { type: Sequelize.DATEONLY, allowNull: true },
      bpkb_number: OPT_STR(50),
      kir_number: OPT_STR(50), kir_expiry: { type: Sequelize.DATEONLY, allowNull: true },
      insurance_provider: OPT_STR(), insurance_policy: OPT_STR(50),
      insurance_type: OPT_STR(30), // comprehensive, tlo, third_party
      insurance_start: { type: Sequelize.DATEONLY, allowNull: true },
      insurance_expiry: { type: Sequelize.DATEONLY, allowNull: true },
      insurance_premium: DEC(),
      gps_device_id: OPT_STR(50), gps_imei: OPT_STR(50),
      current_odometer_km: DEC(12,2), last_odometer_date: { type: Sequelize.DATEONLY, allowNull: true },
      current_hour_meter: DEC(10,2), // for heavy equipment
      status: { type: Sequelize.STRING(30), defaultValue: 'available' }, // available, in_use, maintenance, reserved, retired, sold
      condition_rating: { type: Sequelize.INTEGER, defaultValue: 5 }, // 1-5
      assigned_branch_id: { type: Sequelize.UUID, allowNull: true },
      assigned_driver_id: { type: Sequelize.UUID, allowNull: true },
      current_lat: DEC(10,7), current_lng: DEC(10,7),
      current_location: OPT_STR(),
      photo_url: { type: Sequelize.TEXT, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: BOOL_T,
      created_by: OPT_STR(50),
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('fms_vehicles', ['tenant_id']);
    await queryInterface.addIndex('fms_vehicles', ['status']);
    await queryInterface.addIndex('fms_vehicles', ['vehicle_type']);
    await queryInterface.addIndex('fms_vehicles', ['license_plate']);

    // 2. fms_drivers — Master driver
    await queryInterface.createTable('fms_drivers', {
      id: UUID, tenant_id: TID,
      driver_code: REQ_STR(30), full_name: REQ_STR(),
      phone: OPT_STR(30), email: OPT_STR(),
      address: { type: Sequelize.TEXT, allowNull: true },
      date_of_birth: { type: Sequelize.DATEONLY, allowNull: true },
      blood_type: OPT_STR(5),
      emergency_contact_name: OPT_STR(), emergency_contact_phone: OPT_STR(30),
      license_number: OPT_STR(50),
      license_type: OPT_STR(20), // SIM A, SIM B1, SIM B2, SIM C
      license_issue_date: { type: Sequelize.DATEONLY, allowNull: true },
      license_expiry_date: { type: Sequelize.DATEONLY, allowNull: true },
      employment_type: OPT_STR(30), // permanent, contract, freelance, outsource
      hire_date: { type: Sequelize.DATEONLY, allowNull: true },
      termination_date: { type: Sequelize.DATEONLY, allowNull: true },
      base_salary: DEC(), allowance_per_trip: DEC(), allowance_per_km: DEC(),
      assigned_branch_id: { type: Sequelize.UUID, allowNull: true },
      assigned_vehicle_id: { type: Sequelize.UUID, allowNull: true },
      total_trips: { type: Sequelize.INTEGER, defaultValue: 0 },
      total_distance_km: DEC(12,2),
      on_time_rate: DEC(5,2), safety_score: DEC(5,2),
      customer_rating: DEC(3,2), violations_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      status: { type: Sequelize.STRING(30), defaultValue: 'active' }, // active, on_leave, suspended, terminated
      availability: { type: Sequelize.STRING(30), defaultValue: 'available' }, // available, on_trip, off_duty, resting
      photo_url: { type: Sequelize.TEXT, allowNull: true },
      license_photo_url: { type: Sequelize.TEXT, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: BOOL_T,
      created_by: OPT_STR(50),
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('fms_drivers', ['tenant_id']);
    await queryInterface.addIndex('fms_drivers', ['status']);
    await queryInterface.addIndex('fms_drivers', ['availability']);

    // 3. fms_maintenance_schedules — Jadwal preventive maintenance
    await queryInterface.createTable('fms_maintenance_schedules', {
      id: UUID, tenant_id: TID,
      vehicle_id: { type: Sequelize.UUID, allowNull: false },
      schedule_type: REQ_STR(30), // km_based, time_based, hour_based
      maintenance_type: REQ_STR(50), // oil_change, tire_rotation, brake_check, full_service, kir_renewal, etc
      description: OPT_STR(),
      interval_km: { type: Sequelize.INTEGER, allowNull: true },
      interval_days: { type: Sequelize.INTEGER, allowNull: true },
      interval_hours: { type: Sequelize.INTEGER, allowNull: true },
      last_done_at: { type: Sequelize.DATEONLY, allowNull: true },
      last_done_km: DEC(12,2),
      next_due_at: { type: Sequelize.DATEONLY, allowNull: true },
      next_due_km: DEC(12,2),
      alert_before_days: { type: Sequelize.INTEGER, defaultValue: 7 },
      alert_before_km: { type: Sequelize.INTEGER, defaultValue: 500 },
      estimated_cost: DEC(),
      vendor: OPT_STR(),
      is_active: BOOL_T,
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('fms_maintenance_schedules', ['tenant_id']);
    await queryInterface.addIndex('fms_maintenance_schedules', ['vehicle_id']);

    // 4. fms_maintenance_records — Work order maintenance aktual
    await queryInterface.createTable('fms_maintenance_records', {
      id: UUID, tenant_id: TID,
      vehicle_id: { type: Sequelize.UUID, allowNull: false },
      schedule_id: { type: Sequelize.UUID, allowNull: true },
      work_order_number: REQ_STR(30),
      maintenance_type: REQ_STR(50),
      category: OPT_STR(30), // preventive, corrective, emergency, accident_repair
      priority: OPT_STR(20), // low, medium, high, critical
      description: { type: Sequelize.TEXT, allowNull: true },
      vendor_name: OPT_STR(), vendor_contact: OPT_STR(50),
      odometer_at_service: DEC(12,2),
      hour_meter_at_service: DEC(10,2),
      started_at: { type: Sequelize.DATE, allowNull: true },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      parts_cost: DEC(), labor_cost: DEC(), other_cost: DEC(), total_cost: DEC(),
      warranty_claim: BOOL_F, warranty_amount: DEC(),
      downtime_hours: DEC(8,2),
      technician_name: OPT_STR(),
      status: { type: Sequelize.STRING(30), defaultValue: 'scheduled' }, // scheduled, in_progress, completed, cancelled
      approval_status: OPT_STR(20), // pending, approved, rejected
      approved_by: OPT_STR(50),
      photos: { type: Sequelize.JSONB, defaultValue: [] },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_by: OPT_STR(50),
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('fms_maintenance_records', ['tenant_id']);
    await queryInterface.addIndex('fms_maintenance_records', ['vehicle_id']);
    await queryInterface.addIndex('fms_maintenance_records', ['status']);

    // 5. fms_fuel_records — Transaksi BBM
    await queryInterface.createTable('fms_fuel_records', {
      id: UUID, tenant_id: TID,
      vehicle_id: { type: Sequelize.UUID, allowNull: false },
      driver_id: { type: Sequelize.UUID, allowNull: true },
      trip_id: { type: Sequelize.UUID, allowNull: true },
      fill_date: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      fuel_type: OPT_STR(20), // diesel, petrol, pertamax, dexlite, solar
      quantity_liters: DEC(10,2),
      price_per_liter: DEC(10,2),
      total_cost: DEC(),
      odometer_reading: DEC(12,2),
      fill_type: OPT_STR(20), // full_tank, partial
      station_name: OPT_STR(),
      station_location: OPT_STR(),
      payment_method: OPT_STR(30), // cash, fuel_card, transfer
      fuel_card_number: OPT_STR(30),
      receipt_number: OPT_STR(50),
      receipt_photo_url: { type: Sequelize.TEXT, allowNull: true },
      consumption_rate: DEC(8,2), // km/l computed
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_by: OPT_STR(50),
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('fms_fuel_records', ['tenant_id']);
    await queryInterface.addIndex('fms_fuel_records', ['vehicle_id']);
    await queryInterface.addIndex('fms_fuel_records', ['fill_date']);

    // 6. fms_inspections — Inspeksi kendaraan
    await queryInterface.createTable('fms_inspections', {
      id: UUID, tenant_id: TID,
      vehicle_id: { type: Sequelize.UUID, allowNull: false },
      driver_id: { type: Sequelize.UUID, allowNull: true },
      inspection_type: REQ_STR(30), // pre_trip, post_trip, periodic, annual, kir
      inspection_date: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      odometer_reading: DEC(12,2),
      overall_status: OPT_STR(20), // pass, fail, conditional
      overall_score: { type: Sequelize.INTEGER, allowNull: true },
      items_checked: { type: Sequelize.INTEGER, defaultValue: 0 },
      items_passed: { type: Sequelize.INTEGER, defaultValue: 0 },
      items_failed: { type: Sequelize.INTEGER, defaultValue: 0 },
      checklist_data: { type: Sequelize.JSONB, defaultValue: [] },
      defects_found: { type: Sequelize.JSONB, defaultValue: [] },
      photos: { type: Sequelize.JSONB, defaultValue: [] },
      inspector_name: OPT_STR(),
      inspector_signature: { type: Sequelize.TEXT, allowNull: true },
      driver_signature: { type: Sequelize.TEXT, allowNull: true },
      follow_up_required: BOOL_F,
      follow_up_notes: { type: Sequelize.TEXT, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_by: OPT_STR(50),
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('fms_inspections', ['tenant_id']);
    await queryInterface.addIndex('fms_inspections', ['vehicle_id']);

    // 7. fms_rentals — Kontrak rental/sewa
    await queryInterface.createTable('fms_rentals', {
      id: UUID, tenant_id: TID,
      rental_number: REQ_STR(30),
      rental_type: REQ_STR(30), // rent_out, rent_in (sewa keluar vs sewa masuk)
      vehicle_id: { type: Sequelize.UUID, allowNull: false },
      driver_id: { type: Sequelize.UUID, allowNull: true },
      customer_name: OPT_STR(), customer_phone: OPT_STR(30), customer_email: OPT_STR(),
      customer_company: OPT_STR(), customer_id_number: OPT_STR(30), // KTP/SIM
      vendor_name: OPT_STR(), // for rent_in
      contract_type: OPT_STR(30), // daily, weekly, monthly, yearly, project_based
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: false },
      actual_return_date: { type: Sequelize.DATEONLY, allowNull: true },
      pickup_location: OPT_STR(), return_location: OPT_STR(),
      start_odometer: DEC(12,2), end_odometer: DEC(12,2),
      rate_type: OPT_STR(20), // per_day, per_km, per_hour, flat
      rate_amount: DEC(), min_km: DEC(10,2), max_km: DEC(10,2), overage_rate: DEC(),
      include_driver: BOOL_F, include_fuel: BOOL_F,
      deposit_amount: DEC(), deposit_status: OPT_STR(20), // pending, paid, refunded, forfeited
      subtotal: DEC(), tax_amount: DEC(), discount_amount: DEC(), total_amount: DEC(),
      penalty_amount: DEC(), // late return, damage, etc
      payment_status: { type: Sequelize.STRING(20), defaultValue: 'unpaid' }, // unpaid, partial, paid, refunded
      status: { type: Sequelize.STRING(30), defaultValue: 'draft' }, // draft, confirmed, active, completed, cancelled
      terms_conditions: { type: Sequelize.TEXT, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_by: OPT_STR(50),
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('fms_rentals', ['tenant_id']);
    await queryInterface.addIndex('fms_rentals', ['vehicle_id']);
    await queryInterface.addIndex('fms_rentals', ['status']);
    await queryInterface.addIndex('fms_rentals', ['rental_type']);

    // 8. fms_rental_payments — Pembayaran rental
    await queryInterface.createTable('fms_rental_payments', {
      id: UUID, tenant_id: TID,
      rental_id: { type: Sequelize.UUID, allowNull: false },
      payment_number: OPT_STR(30),
      payment_date: { type: Sequelize.DATEONLY, allowNull: false },
      amount: DEC(),
      payment_method: OPT_STR(30), // cash, transfer, card, check
      reference_number: OPT_STR(50),
      payment_type: OPT_STR(20), // rental, deposit, penalty, refund
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_by: OPT_STR(50),
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('fms_rental_payments', ['tenant_id']);
    await queryInterface.addIndex('fms_rental_payments', ['rental_id']);

    // 9. fms_documents — Dokumen kendaraan & driver
    await queryInterface.createTable('fms_documents', {
      id: UUID, tenant_id: TID,
      entity_type: REQ_STR(20), // vehicle, driver
      entity_id: { type: Sequelize.UUID, allowNull: false },
      document_type: REQ_STR(30), // stnk, bpkb, kir, sim, insurance, contract, etc
      document_number: OPT_STR(50),
      issued_date: { type: Sequelize.DATEONLY, allowNull: true },
      expiry_date: { type: Sequelize.DATEONLY, allowNull: true },
      issuing_authority: OPT_STR(),
      file_url: { type: Sequelize.TEXT, allowNull: true },
      reminder_days: { type: Sequelize.INTEGER, defaultValue: 30 },
      status: { type: Sequelize.STRING(20), defaultValue: 'active' }, // active, expired, pending_renewal
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('fms_documents', ['tenant_id']);
    await queryInterface.addIndex('fms_documents', ['entity_type', 'entity_id']);
    await queryInterface.addIndex('fms_documents', ['expiry_date']);

    // 10. fms_incidents — Kecelakaan & insiden
    await queryInterface.createTable('fms_incidents', {
      id: UUID, tenant_id: TID,
      incident_number: REQ_STR(30),
      vehicle_id: { type: Sequelize.UUID, allowNull: false },
      driver_id: { type: Sequelize.UUID, allowNull: true },
      trip_id: { type: Sequelize.UUID, allowNull: true },
      incident_type: REQ_STR(30), // accident, breakdown, theft, vandalism, traffic_violation
      severity: OPT_STR(20), // minor, moderate, major, total_loss
      incident_date: { type: Sequelize.DATE, allowNull: false },
      location: OPT_STR(), lat: DEC(10,7), lng: DEC(10,7),
      description: { type: Sequelize.TEXT, allowNull: true },
      police_report_number: OPT_STR(50),
      insurance_claim_number: OPT_STR(50), insurance_claim_status: OPT_STR(20),
      insurance_claim_amount: DEC(), insurance_paid_amount: DEC(),
      repair_cost: DEC(), other_cost: DEC(), total_cost: DEC(),
      third_party_involved: BOOL_F, third_party_details: { type: Sequelize.TEXT, allowNull: true },
      injuries: BOOL_F, injury_details: { type: Sequelize.TEXT, allowNull: true },
      photos: { type: Sequelize.JSONB, defaultValue: [] },
      root_cause: OPT_STR(),
      corrective_action: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.STRING(20), defaultValue: 'open' }, // open, investigating, resolved, closed
      created_by: OPT_STR(50),
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('fms_incidents', ['tenant_id']);
    await queryInterface.addIndex('fms_incidents', ['vehicle_id']);

    // 11. fms_tires — Tracking ban
    await queryInterface.createTable('fms_tires', {
      id: UUID, tenant_id: TID,
      tire_serial: REQ_STR(50),
      vehicle_id: { type: Sequelize.UUID, allowNull: true },
      position: OPT_STR(20), // FL, FR, RL, RR, spare, etc
      brand: OPT_STR(100), model: OPT_STR(100), size: OPT_STR(30),
      type: OPT_STR(20), // radial, bias, tubeless
      purchase_date: { type: Sequelize.DATEONLY, allowNull: true },
      purchase_price: DEC(),
      install_date: { type: Sequelize.DATEONLY, allowNull: true },
      install_odometer: DEC(12,2),
      max_km: DEC(12,2),
      current_tread_depth: DEC(5,2), min_tread_depth: DEC(5,2),
      retread_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      status: { type: Sequelize.STRING(20), defaultValue: 'in_use' }, // in_use, spare, retread, disposed
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('fms_tires', ['tenant_id']);
    await queryInterface.addIndex('fms_tires', ['vehicle_id']);

    // 12. fms_cost_records — Semua biaya kendaraan
    await queryInterface.createTable('fms_cost_records', {
      id: UUID, tenant_id: TID,
      vehicle_id: { type: Sequelize.UUID, allowNull: false },
      driver_id: { type: Sequelize.UUID, allowNull: true },
      cost_category: REQ_STR(30), // fuel, maintenance, tire, insurance, tax, toll, parking, penalty, depreciation, other
      cost_subcategory: OPT_STR(50),
      reference_type: OPT_STR(30), // fuel_record, maintenance_record, incident, rental, manual
      reference_id: { type: Sequelize.UUID, allowNull: true },
      cost_date: { type: Sequelize.DATEONLY, allowNull: false },
      amount: DEC(),
      description: OPT_STR(),
      receipt_number: OPT_STR(50),
      receipt_url: { type: Sequelize.TEXT, allowNull: true },
      is_reimbursable: BOOL_F, reimbursement_status: OPT_STR(20),
      created_by: OPT_STR(50),
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('fms_cost_records', ['tenant_id']);
    await queryInterface.addIndex('fms_cost_records', ['vehicle_id']);
    await queryInterface.addIndex('fms_cost_records', ['cost_category']);
    await queryInterface.addIndex('fms_cost_records', ['cost_date']);

    // 13. fms_gps_tracking — Log posisi GPS
    await queryInterface.createTable('fms_gps_tracking', {
      id: UUID, tenant_id: TID,
      vehicle_id: { type: Sequelize.UUID, allowNull: false },
      driver_id: { type: Sequelize.UUID, allowNull: true },
      recorded_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      lat: DEC(10,7), lng: DEC(10,7),
      speed_kmh: DEC(6,2), heading: DEC(5,2),
      altitude_m: DEC(8,2),
      odometer: DEC(12,2),
      engine_status: OPT_STR(10), // on, off, idle
      fuel_level: DEC(5,2),
      event_type: OPT_STR(30), // position, speeding, harsh_brake, harsh_accel, idle, geofence_enter, geofence_exit
      address: OPT_STR(),
      created_at: NOW
    });
    await queryInterface.addIndex('fms_gps_tracking', ['tenant_id', 'vehicle_id', 'recorded_at']);

    // 14. fms_vehicle_assignments — Riwayat assignment kendaraan-driver
    await queryInterface.createTable('fms_vehicle_assignments', {
      id: UUID, tenant_id: TID,
      vehicle_id: { type: Sequelize.UUID, allowNull: false },
      driver_id: { type: Sequelize.UUID, allowNull: false },
      assigned_date: { type: Sequelize.DATEONLY, allowNull: false },
      released_date: { type: Sequelize.DATEONLY, allowNull: true },
      start_odometer: DEC(12,2), end_odometer: DEC(12,2),
      reason: OPT_STR(),
      status: { type: Sequelize.STRING(20), defaultValue: 'active' }, // active, released
      created_by: OPT_STR(50),
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('fms_vehicle_assignments', ['tenant_id']);
    await queryInterface.addIndex('fms_vehicle_assignments', ['vehicle_id']);
    await queryInterface.addIndex('fms_vehicle_assignments', ['driver_id']);

    // 15. fms_settings — Pengaturan FMS
    await queryInterface.createTable('fms_settings', {
      id: UUID, tenant_id: TID,
      setting_key: REQ_STR(50),
      setting_value: { type: Sequelize.TEXT, allowNull: true },
      setting_type: OPT_STR(20), // string, number, boolean, json
      category: OPT_STR(30),
      label: OPT_STR(),
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('fms_settings', ['tenant_id', 'setting_key'], { unique: true });

    // ═══════════════════════════════════════════════════
    // TMS — TRANSPORTATION MANAGEMENT SYSTEM (15 tables)
    // ═══════════════════════════════════════════════════

    // 16. tms_carriers — Perusahaan pengangkut/transporter
    await queryInterface.createTable('tms_carriers', {
      id: UUID, tenant_id: TID,
      carrier_code: REQ_STR(30), carrier_name: REQ_STR(),
      carrier_type: OPT_STR(30), // internal, external, third_party
      contact_person: OPT_STR(), phone: OPT_STR(30), email: OPT_STR(),
      address: { type: Sequelize.TEXT, allowNull: true },
      npwp: OPT_STR(30), // tax ID
      license_number: OPT_STR(50), license_expiry: { type: Sequelize.DATEONLY, allowNull: true },
      service_areas: { type: Sequelize.JSONB, defaultValue: [] },
      vehicle_types: { type: Sequelize.JSONB, defaultValue: [] },
      rating: DEC(3,2), completed_shipments: { type: Sequelize.INTEGER, defaultValue: 0 },
      on_time_rate: DEC(5,2),
      payment_terms: OPT_STR(30), // cod, net7, net14, net30
      bank_name: OPT_STR(), bank_account: OPT_STR(50), bank_holder: OPT_STR(),
      is_active: BOOL_T,
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_by: OPT_STR(50),
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('tms_carriers', ['tenant_id']);

    // 17. tms_carrier_rates — Tarif carrier
    await queryInterface.createTable('tms_carrier_rates', {
      id: UUID, tenant_id: TID,
      carrier_id: { type: Sequelize.UUID, allowNull: false },
      rate_name: REQ_STR(),
      origin_zone: OPT_STR(50), destination_zone: OPT_STR(50),
      vehicle_type: OPT_STR(50),
      rate_type: OPT_STR(20), // per_kg, per_m3, per_trip, per_km, flat
      base_rate: DEC(), min_charge: DEC(), max_weight_kg: DEC(10,2),
      overweight_rate: DEC(),
      effective_from: { type: Sequelize.DATEONLY, allowNull: true },
      effective_to: { type: Sequelize.DATEONLY, allowNull: true },
      is_active: BOOL_T,
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('tms_carrier_rates', ['tenant_id']);
    await queryInterface.addIndex('tms_carrier_rates', ['carrier_id']);

    // 18. tms_routes — Definisi rute
    await queryInterface.createTable('tms_routes', {
      id: UUID, tenant_id: TID,
      route_code: REQ_STR(30), route_name: REQ_STR(),
      origin_name: OPT_STR(), origin_address: { type: Sequelize.TEXT, allowNull: true },
      origin_lat: DEC(10,7), origin_lng: DEC(10,7),
      destination_name: OPT_STR(), destination_address: { type: Sequelize.TEXT, allowNull: true },
      destination_lat: DEC(10,7), destination_lng: DEC(10,7),
      distance_km: DEC(10,2), estimated_duration_hours: DEC(6,2),
      toll_cost: DEC(), fuel_estimate: DEC(),
      route_type: OPT_STR(20), // one_way, round_trip, multi_stop
      waypoints: { type: Sequelize.JSONB, defaultValue: [] },
      is_active: BOOL_T,
      created_by: OPT_STR(50),
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('tms_routes', ['tenant_id']);

    // 19. tms_shipments — Order pengiriman
    await queryInterface.createTable('tms_shipments', {
      id: UUID, tenant_id: TID,
      shipment_number: REQ_STR(30),
      shipment_type: OPT_STR(30), // standard, express, same_day, scheduled, charter
      order_date: { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.literal('CURRENT_DATE') },
      required_delivery_date: { type: Sequelize.DATEONLY, allowNull: true },
      actual_delivery_date: { type: Sequelize.DATEONLY, allowNull: true },
      shipper_name: OPT_STR(), shipper_phone: OPT_STR(30), shipper_address: { type: Sequelize.TEXT, allowNull: true },
      consignee_name: OPT_STR(), consignee_phone: OPT_STR(30), consignee_address: { type: Sequelize.TEXT, allowNull: true },
      origin_name: OPT_STR(), origin_address: { type: Sequelize.TEXT, allowNull: true },
      origin_lat: DEC(10,7), origin_lng: DEC(10,7),
      destination_name: OPT_STR(), destination_address: { type: Sequelize.TEXT, allowNull: true },
      destination_lat: DEC(10,7), destination_lng: DEC(10,7),
      total_weight_kg: DEC(12,2), total_volume_m3: DEC(10,2),
      total_pieces: { type: Sequelize.INTEGER, defaultValue: 0 },
      goods_description: OPT_STR(), goods_value: DEC(),
      is_fragile: BOOL_F, is_hazardous: BOOL_F, temperature_controlled: BOOL_F,
      min_temp: DEC(5,2), max_temp: DEC(5,2),
      carrier_id: { type: Sequelize.UUID, allowNull: true },
      route_id: { type: Sequelize.UUID, allowNull: true },
      vehicle_id: { type: Sequelize.UUID, allowNull: true },
      driver_id: { type: Sequelize.UUID, allowNull: true },
      freight_charge: DEC(), insurance_charge: DEC(), handling_charge: DEC(),
      other_charges: DEC(), tax_amount: DEC(), discount_amount: DEC(), total_charge: DEC(),
      payment_status: { type: Sequelize.STRING(20), defaultValue: 'unpaid' },
      payment_method: OPT_STR(30),
      priority: { type: Sequelize.STRING(10), defaultValue: 'normal' }, // low, normal, high, urgent
      status: { type: Sequelize.STRING(30), defaultValue: 'draft' }, // draft, confirmed, assigned, picked_up, in_transit, arrived, delivered, pod_received, cancelled
      tracking_url: { type: Sequelize.TEXT, allowNull: true },
      special_instructions: { type: Sequelize.TEXT, allowNull: true },
      internal_notes: { type: Sequelize.TEXT, allowNull: true },
      created_by: OPT_STR(50),
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('tms_shipments', ['tenant_id']);
    await queryInterface.addIndex('tms_shipments', ['shipment_number']);
    await queryInterface.addIndex('tms_shipments', ['status']);
    await queryInterface.addIndex('tms_shipments', ['carrier_id']);
    await queryInterface.addIndex('tms_shipments', ['order_date']);

    // 20. tms_shipment_items — Item dalam shipment
    await queryInterface.createTable('tms_shipment_items', {
      id: UUID, tenant_id: TID,
      shipment_id: { type: Sequelize.UUID, allowNull: false },
      item_number: { type: Sequelize.INTEGER, defaultValue: 1 },
      description: REQ_STR(),
      sku: OPT_STR(50),
      quantity: { type: Sequelize.INTEGER, defaultValue: 1 },
      weight_kg: DEC(10,2), volume_m3: DEC(10,2),
      length_cm: DEC(8,2), width_cm: DEC(8,2), height_cm: DEC(8,2),
      unit_value: DEC(), total_value: DEC(),
      packaging_type: OPT_STR(30), // box, pallet, drum, bag, loose
      is_fragile: BOOL_F, is_hazardous: BOOL_F,
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: NOW
    });
    await queryInterface.addIndex('tms_shipment_items', ['shipment_id']);

    // 21. tms_trips — Trip/perjalanan aktual
    await queryInterface.createTable('tms_trips', {
      id: UUID, tenant_id: TID,
      trip_number: REQ_STR(30),
      trip_type: OPT_STR(20), // delivery, pickup, transfer, charter
      vehicle_id: { type: Sequelize.UUID, allowNull: false },
      driver_id: { type: Sequelize.UUID, allowNull: false },
      helper_driver_id: { type: Sequelize.UUID, allowNull: true },
      route_id: { type: Sequelize.UUID, allowNull: true },
      carrier_id: { type: Sequelize.UUID, allowNull: true },
      planned_start: { type: Sequelize.DATE, allowNull: true },
      planned_end: { type: Sequelize.DATE, allowNull: true },
      actual_start: { type: Sequelize.DATE, allowNull: true },
      actual_end: { type: Sequelize.DATE, allowNull: true },
      start_odometer: DEC(12,2), end_odometer: DEC(12,2),
      total_distance_km: DEC(10,2),
      start_location: OPT_STR(), end_location: OPT_STR(),
      start_lat: DEC(10,7), start_lng: DEC(10,7),
      end_lat: DEC(10,7), end_lng: DEC(10,7),
      fuel_used_liters: DEC(10,2), fuel_cost: DEC(),
      toll_cost: DEC(), parking_cost: DEC(), meal_allowance: DEC(),
      other_expense: DEC(), total_expense: DEC(),
      total_shipments: { type: Sequelize.INTEGER, defaultValue: 0 },
      delivered_shipments: { type: Sequelize.INTEGER, defaultValue: 0 },
      failed_shipments: { type: Sequelize.INTEGER, defaultValue: 0 },
      status: { type: Sequelize.STRING(30), defaultValue: 'planned' }, // planned, dispatched, in_progress, completed, cancelled
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_by: OPT_STR(50),
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('tms_trips', ['tenant_id']);
    await queryInterface.addIndex('tms_trips', ['vehicle_id']);
    await queryInterface.addIndex('tms_trips', ['driver_id']);
    await queryInterface.addIndex('tms_trips', ['status']);

    // 22. tms_trip_shipments — Link trip ↔ shipment (M:N)
    await queryInterface.createTable('tms_trip_shipments', {
      id: UUID,
      trip_id: { type: Sequelize.UUID, allowNull: false },
      shipment_id: { type: Sequelize.UUID, allowNull: false },
      stop_sequence: { type: Sequelize.INTEGER, defaultValue: 1 },
      planned_arrival: { type: Sequelize.DATE, allowNull: true },
      actual_arrival: { type: Sequelize.DATE, allowNull: true },
      status: { type: Sequelize.STRING(20), defaultValue: 'pending' }, // pending, arrived, delivered, failed, skipped
      failure_reason: OPT_STR(),
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: NOW
    });
    await queryInterface.addIndex('tms_trip_shipments', ['trip_id']);
    await queryInterface.addIndex('tms_trip_shipments', ['shipment_id']);

    // 23. tms_trip_events — Event tracking per trip
    await queryInterface.createTable('tms_trip_events', {
      id: UUID, tenant_id: TID,
      trip_id: { type: Sequelize.UUID, allowNull: false },
      event_type: REQ_STR(30), // departed, arrived, loading, unloading, rest_stop, checkpoint, delay, incident, note
      event_time: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      location: OPT_STR(), lat: DEC(10,7), lng: DEC(10,7),
      description: OPT_STR(),
      photo_url: { type: Sequelize.TEXT, allowNull: true },
      created_by: OPT_STR(50),
      created_at: NOW
    });
    await queryInterface.addIndex('tms_trip_events', ['trip_id']);

    // 24. tms_proof_of_delivery — Bukti pengiriman
    await queryInterface.createTable('tms_proof_of_delivery', {
      id: UUID, tenant_id: TID,
      shipment_id: { type: Sequelize.UUID, allowNull: false },
      trip_id: { type: Sequelize.UUID, allowNull: true },
      pod_number: OPT_STR(30),
      received_by: OPT_STR(), receiver_title: OPT_STR(50),
      received_at: { type: Sequelize.DATE, allowNull: true },
      signature_url: { type: Sequelize.TEXT, allowNull: true },
      photos: { type: Sequelize.JSONB, defaultValue: [] },
      condition: OPT_STR(20), // good, damaged, partial
      items_received: { type: Sequelize.INTEGER, allowNull: true },
      items_damaged: { type: Sequelize.INTEGER, defaultValue: 0 },
      items_missing: { type: Sequelize.INTEGER, defaultValue: 0 },
      damage_description: { type: Sequelize.TEXT, allowNull: true },
      receiver_notes: { type: Sequelize.TEXT, allowNull: true },
      driver_notes: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.STRING(20), defaultValue: 'pending' }, // pending, confirmed, disputed
      created_by: OPT_STR(50),
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('tms_proof_of_delivery', ['shipment_id']);

    // 25. tms_freight_bills — Tagihan freight
    await queryInterface.createTable('tms_freight_bills', {
      id: UUID, tenant_id: TID,
      bill_number: REQ_STR(30),
      bill_type: OPT_STR(20), // invoice_customer, invoice_carrier
      bill_date: { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.literal('CURRENT_DATE') },
      due_date: { type: Sequelize.DATEONLY, allowNull: true },
      customer_name: OPT_STR(), carrier_name: OPT_STR(),
      carrier_id: { type: Sequelize.UUID, allowNull: true },
      period_from: { type: Sequelize.DATEONLY, allowNull: true },
      period_to: { type: Sequelize.DATEONLY, allowNull: true },
      subtotal: DEC(), tax_amount: DEC(), discount_amount: DEC(), total_amount: DEC(),
      paid_amount: DEC(), balance: DEC(),
      currency: OPT_STR(10),
      payment_status: { type: Sequelize.STRING(20), defaultValue: 'unpaid' }, // unpaid, partial, paid, overdue
      status: { type: Sequelize.STRING(20), defaultValue: 'draft' }, // draft, sent, paid, void
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_by: OPT_STR(50),
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('tms_freight_bills', ['tenant_id']);
    await queryInterface.addIndex('tms_freight_bills', ['status']);

    // 26. tms_freight_bill_items — Item tagihan
    await queryInterface.createTable('tms_freight_bill_items', {
      id: UUID,
      bill_id: { type: Sequelize.UUID, allowNull: false },
      shipment_id: { type: Sequelize.UUID, allowNull: true },
      trip_id: { type: Sequelize.UUID, allowNull: true },
      description: REQ_STR(),
      quantity: DEC(10,2), unit: OPT_STR(20),
      rate: DEC(), amount: DEC(),
      created_at: NOW
    });
    await queryInterface.addIndex('tms_freight_bill_items', ['bill_id']);

    // 27. tms_zones — Zona/area pengiriman
    await queryInterface.createTable('tms_zones', {
      id: UUID, tenant_id: TID,
      zone_code: REQ_STR(20), zone_name: REQ_STR(),
      zone_type: OPT_STR(20), // city, province, region, country, custom
      parent_zone_id: { type: Sequelize.UUID, allowNull: true },
      provinces: { type: Sequelize.JSONB, defaultValue: [] },
      cities: { type: Sequelize.JSONB, defaultValue: [] },
      postal_codes: { type: Sequelize.JSONB, defaultValue: [] },
      is_active: BOOL_T,
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('tms_zones', ['tenant_id']);

    // 28. tms_rate_cards — Tarif pengiriman
    await queryInterface.createTable('tms_rate_cards', {
      id: UUID, tenant_id: TID,
      rate_name: REQ_STR(),
      origin_zone_id: { type: Sequelize.UUID, allowNull: true },
      destination_zone_id: { type: Sequelize.UUID, allowNull: true },
      service_type: OPT_STR(30), // standard, express, same_day, overnight
      vehicle_type: OPT_STR(50),
      rate_type: OPT_STR(20), // per_kg, per_m3, per_piece, per_trip, per_km
      min_weight_kg: DEC(10,2), max_weight_kg: DEC(10,2),
      base_rate: DEC(), per_unit_rate: DEC(), min_charge: DEC(),
      surcharge_pct: DEC(5,2), // fuel surcharge percentage
      effective_from: { type: Sequelize.DATEONLY, allowNull: true },
      effective_to: { type: Sequelize.DATEONLY, allowNull: true },
      is_active: BOOL_T,
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('tms_rate_cards', ['tenant_id']);

    // 29. tms_warehouses — Gudang/depot
    await queryInterface.createTable('tms_warehouses', {
      id: UUID, tenant_id: TID,
      warehouse_code: REQ_STR(20), warehouse_name: REQ_STR(),
      warehouse_type: OPT_STR(20), // hub, depot, cross_dock, distribution_center
      address: { type: Sequelize.TEXT, allowNull: true },
      city: OPT_STR(100), province: OPT_STR(100),
      lat: DEC(10,7), lng: DEC(10,7),
      contact_person: OPT_STR(), phone: OPT_STR(30),
      capacity_m3: DEC(12,2), capacity_pallets: { type: Sequelize.INTEGER, allowNull: true },
      operating_hours: OPT_STR(50),
      is_active: BOOL_T,
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('tms_warehouses', ['tenant_id']);

    // 30. tms_settings — Pengaturan TMS
    await queryInterface.createTable('tms_settings', {
      id: UUID, tenant_id: TID,
      setting_key: REQ_STR(50),
      setting_value: { type: Sequelize.TEXT, allowNull: true },
      setting_type: OPT_STR(20),
      category: OPT_STR(30),
      label: OPT_STR(),
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('tms_settings', ['tenant_id', 'setting_key'], { unique: true });
  },

  down: async (queryInterface) => {
    const tables = [
      'tms_settings','tms_warehouses','tms_rate_cards','tms_zones',
      'tms_freight_bill_items','tms_freight_bills','tms_proof_of_delivery',
      'tms_trip_events','tms_trip_shipments','tms_trips',
      'tms_shipment_items','tms_shipments','tms_routes','tms_carrier_rates','tms_carriers',
      'fms_settings','fms_vehicle_assignments','fms_gps_tracking','fms_cost_records',
      'fms_tires','fms_incidents','fms_documents','fms_rental_payments','fms_rentals',
      'fms_inspections','fms_fuel_records','fms_maintenance_records','fms_maintenance_schedules',
      'fms_drivers','fms_vehicles'
    ];
    for (const t of tables) {
      await queryInterface.dropTable(t).catch(() => {});
    }
  }
};
