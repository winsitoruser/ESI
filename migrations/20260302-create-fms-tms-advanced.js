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
    // FMS ADVANCED — Geofences, Driver Violations, Reminders, Fleet KPI
    // ═══════════════════════════════════════════════════

    // 1. fms_geofences — Virtual boundaries for vehicle tracking
    await queryInterface.createTable('fms_geofences', {
      id: UUID, tenant_id: TID,
      fence_code: REQ_STR(30), fence_name: REQ_STR(),
      fence_type: OPT_STR(20), // circle, polygon, route_corridor
      center_lat: DEC(10,7), center_lng: DEC(10,7),
      radius_m: DEC(10,2), // for circle type
      polygon_points: { type: Sequelize.JSONB, defaultValue: [] }, // [{lat, lng}]
      category: OPT_STR(30), // depot, customer, restricted, speed_zone, rest_area
      speed_limit_kmh: { type: Sequelize.INTEGER, allowNull: true },
      alert_on_enter: BOOL_T, alert_on_exit: BOOL_T, alert_on_speeding: BOOL_F,
      active_hours_start: OPT_STR(5), // "08:00"
      active_hours_end: OPT_STR(5), // "17:00"
      assigned_vehicles: { type: Sequelize.JSONB, defaultValue: [] }, // vehicle IDs
      color: OPT_STR(10), // hex color for map
      is_active: BOOL_T,
      created_by: OPT_STR(50),
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('fms_geofences', ['tenant_id']);

    // 2. fms_geofence_events — Log enter/exit/violation events
    await queryInterface.createTable('fms_geofence_events', {
      id: UUID, tenant_id: TID,
      geofence_id: { type: Sequelize.UUID, allowNull: false },
      vehicle_id: { type: Sequelize.UUID, allowNull: false },
      driver_id: { type: Sequelize.UUID, allowNull: true },
      event_type: REQ_STR(20), // enter, exit, speeding, dwell_time_exceeded
      event_time: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      lat: DEC(10,7), lng: DEC(10,7),
      speed_kmh: DEC(6,2),
      duration_minutes: DEC(8,2), // for dwell time
      is_violation: BOOL_F,
      acknowledged: BOOL_F, acknowledged_by: OPT_STR(50),
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: NOW
    });
    await queryInterface.addIndex('fms_geofence_events', ['tenant_id', 'event_time']);
    await queryInterface.addIndex('fms_geofence_events', ['vehicle_id']);
    await queryInterface.addIndex('fms_geofence_events', ['geofence_id']);

    // 3. fms_driver_violations — Pelanggaran driver (speeding, harsh braking, dll)
    await queryInterface.createTable('fms_driver_violations', {
      id: UUID, tenant_id: TID,
      driver_id: { type: Sequelize.UUID, allowNull: false },
      vehicle_id: { type: Sequelize.UUID, allowNull: true },
      trip_id: { type: Sequelize.UUID, allowNull: true },
      violation_type: REQ_STR(30), // speeding, harsh_braking, harsh_acceleration, idle_excess, unauthorized_stop, route_deviation, fatigue_driving, phone_use
      violation_date: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      location: OPT_STR(), lat: DEC(10,7), lng: DEC(10,7),
      speed_kmh: DEC(6,2), speed_limit_kmh: { type: Sequelize.INTEGER, allowNull: true },
      severity: OPT_STR(20), // warning, minor, major, critical
      deduction_points: { type: Sequelize.INTEGER, defaultValue: 0 },
      fine_amount: DEC(),
      description: { type: Sequelize.TEXT, allowNull: true },
      evidence_url: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.STRING(20), defaultValue: 'recorded' }, // recorded, reviewed, disputed, confirmed, dismissed
      reviewed_by: OPT_STR(50),
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('fms_driver_violations', ['tenant_id']);
    await queryInterface.addIndex('fms_driver_violations', ['driver_id']);

    // 4. fms_reminders — Automated reminders (document expiry, maintenance due, etc)
    await queryInterface.createTable('fms_reminders', {
      id: UUID, tenant_id: TID,
      reminder_type: REQ_STR(30), // document_expiry, maintenance_due, insurance_expiry, kir_expiry, sim_expiry, rental_end, inspection_due
      entity_type: OPT_STR(20), // vehicle, driver, rental, maintenance
      entity_id: { type: Sequelize.UUID, allowNull: true },
      title: REQ_STR(),
      description: { type: Sequelize.TEXT, allowNull: true },
      due_date: { type: Sequelize.DATEONLY, allowNull: false },
      days_before: { type: Sequelize.INTEGER, defaultValue: 7 },
      priority: OPT_STR(10), // low, medium, high, critical
      status: { type: Sequelize.STRING(20), defaultValue: 'pending' }, // pending, sent, acknowledged, resolved, dismissed
      notify_email: BOOL_T, notify_sms: BOOL_F, notify_push: BOOL_T,
      assigned_to: OPT_STR(50),
      resolved_at: { type: Sequelize.DATE, allowNull: true },
      resolved_by: OPT_STR(50),
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('fms_reminders', ['tenant_id', 'due_date']);
    await queryInterface.addIndex('fms_reminders', ['status']);

    // 5. fms_fleet_kpi — Pre-computed fleet KPI snapshots (daily)
    await queryInterface.createTable('fms_fleet_kpi', {
      id: UUID, tenant_id: TID,
      kpi_date: { type: Sequelize.DATEONLY, allowNull: false },
      total_vehicles: { type: Sequelize.INTEGER, defaultValue: 0 },
      active_vehicles: { type: Sequelize.INTEGER, defaultValue: 0 },
      utilization_rate: DEC(5,2), // % vehicles used
      in_maintenance: { type: Sequelize.INTEGER, defaultValue: 0 },
      total_drivers: { type: Sequelize.INTEGER, defaultValue: 0 },
      active_drivers: { type: Sequelize.INTEGER, defaultValue: 0 },
      total_trips: { type: Sequelize.INTEGER, defaultValue: 0 },
      total_distance_km: DEC(12,2),
      total_fuel_liters: DEC(12,2),
      total_fuel_cost: DEC(),
      avg_fuel_consumption: DEC(8,2), // km/l
      total_maintenance_cost: DEC(),
      total_operational_cost: DEC(),
      cost_per_km: DEC(8,2),
      total_incidents: { type: Sequelize.INTEGER, defaultValue: 0 },
      total_violations: { type: Sequelize.INTEGER, defaultValue: 0 },
      on_time_delivery_rate: DEC(5,2),
      avg_safety_score: DEC(5,2),
      created_at: NOW
    });
    await queryInterface.addIndex('fms_fleet_kpi', ['tenant_id', 'kpi_date'], { unique: true });

    // ═══════════════════════════════════════════════════
    // TMS ADVANCED — Delivery SLAs, Shipment Tracking, Logistics KPI
    // ═══════════════════════════════════════════════════

    // 6. tms_delivery_slas — SLA definitions for delivery
    await queryInterface.createTable('tms_delivery_slas', {
      id: UUID, tenant_id: TID,
      sla_name: REQ_STR(),
      sla_type: OPT_STR(30), // time_based, on_time, condition, response
      origin_zone_id: { type: Sequelize.UUID, allowNull: true },
      destination_zone_id: { type: Sequelize.UUID, allowNull: true },
      service_type: OPT_STR(30), // standard, express, same_day
      max_delivery_hours: { type: Sequelize.INTEGER, allowNull: true },
      max_delivery_days: { type: Sequelize.INTEGER, allowNull: true },
      penalty_per_hour_late: DEC(),
      penalty_per_day_late: DEC(),
      max_damage_rate_pct: DEC(5,2),
      max_loss_rate_pct: DEC(5,2),
      is_active: BOOL_T,
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('tms_delivery_slas', ['tenant_id']);

    // 7. tms_shipment_tracking — Real-time status log per shipment
    await queryInterface.createTable('tms_shipment_tracking', {
      id: UUID, tenant_id: TID,
      shipment_id: { type: Sequelize.UUID, allowNull: false },
      status: REQ_STR(30), // draft, confirmed, assigned, picked_up, in_transit, arrived, out_for_delivery, delivered, pod_received, returned, cancelled
      location: OPT_STR(), lat: DEC(10,7), lng: DEC(10,7),
      description: OPT_STR(),
      performed_by: OPT_STR(50),
      photo_url: { type: Sequelize.TEXT, allowNull: true },
      is_customer_visible: BOOL_T,
      created_at: NOW
    });
    await queryInterface.addIndex('tms_shipment_tracking', ['shipment_id']);
    await queryInterface.addIndex('tms_shipment_tracking', ['tenant_id', 'created_at']);

    // 8. tms_carrier_scores — Carrier performance scoring (monthly)
    await queryInterface.createTable('tms_carrier_scores', {
      id: UUID, tenant_id: TID,
      carrier_id: { type: Sequelize.UUID, allowNull: false },
      score_period: { type: Sequelize.STRING(7), allowNull: false }, // YYYY-MM
      total_shipments: { type: Sequelize.INTEGER, defaultValue: 0 },
      delivered_on_time: { type: Sequelize.INTEGER, defaultValue: 0 },
      delivered_late: { type: Sequelize.INTEGER, defaultValue: 0 },
      damaged_shipments: { type: Sequelize.INTEGER, defaultValue: 0 },
      lost_shipments: { type: Sequelize.INTEGER, defaultValue: 0 },
      cancelled_shipments: { type: Sequelize.INTEGER, defaultValue: 0 },
      on_time_rate: DEC(5,2),
      damage_rate: DEC(5,2),
      loss_rate: DEC(5,2),
      avg_delivery_hours: DEC(8,2),
      total_revenue: DEC(),
      total_cost: DEC(),
      overall_score: DEC(5,2), // 0-100
      rank: { type: Sequelize.INTEGER, allowNull: true },
      created_at: NOW
    });
    await queryInterface.addIndex('tms_carrier_scores', ['tenant_id', 'carrier_id', 'score_period'], { unique: true });

    // 9. tms_logistics_kpi — Pre-computed logistics KPI snapshots (daily)
    await queryInterface.createTable('tms_logistics_kpi', {
      id: UUID, tenant_id: TID,
      kpi_date: { type: Sequelize.DATEONLY, allowNull: false },
      total_shipments: { type: Sequelize.INTEGER, defaultValue: 0 },
      delivered_shipments: { type: Sequelize.INTEGER, defaultValue: 0 },
      pending_shipments: { type: Sequelize.INTEGER, defaultValue: 0 },
      cancelled_shipments: { type: Sequelize.INTEGER, defaultValue: 0 },
      on_time_delivery_rate: DEC(5,2),
      avg_delivery_time_hours: DEC(8,2),
      total_weight_kg: DEC(12,2),
      total_volume_m3: DEC(10,2),
      total_revenue: DEC(),
      total_cost: DEC(),
      profit_margin_pct: DEC(5,2),
      cost_per_kg: DEC(8,4),
      cost_per_shipment: DEC(),
      total_trips: { type: Sequelize.INTEGER, defaultValue: 0 },
      total_distance_km: DEC(12,2),
      fuel_cost: DEC(),
      toll_cost: DEC(),
      pod_completion_rate: DEC(5,2),
      customer_complaint_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      created_at: NOW
    });
    await queryInterface.addIndex('tms_logistics_kpi', ['tenant_id', 'kpi_date'], { unique: true });

    // 10. tms_customer_addresses — Saved customer addresses for quick shipment creation
    await queryInterface.createTable('tms_customer_addresses', {
      id: UUID, tenant_id: TID,
      customer_name: REQ_STR(),
      customer_phone: OPT_STR(30), customer_email: OPT_STR(),
      company_name: OPT_STR(),
      address_type: OPT_STR(20), // shipper, consignee, both
      address_label: OPT_STR(50), // "Kantor Pusat", "Gudang Cibitung"
      address: { type: Sequelize.TEXT, allowNull: true },
      city: OPT_STR(100), province: OPT_STR(100), postal_code: OPT_STR(10),
      lat: DEC(10,7), lng: DEC(10,7),
      zone_id: { type: Sequelize.UUID, allowNull: true },
      contact_person: OPT_STR(), contact_phone: OPT_STR(30),
      special_instructions: { type: Sequelize.TEXT, allowNull: true },
      is_default: BOOL_F,
      is_active: BOOL_T,
      created_at: NOW, updated_at: NOW
    });
    await queryInterface.addIndex('tms_customer_addresses', ['tenant_id']);
    await queryInterface.addIndex('tms_customer_addresses', ['customer_name']);
  },

  down: async (queryInterface) => {
    const tables = [
      'tms_customer_addresses', 'tms_logistics_kpi', 'tms_carrier_scores',
      'tms_shipment_tracking', 'tms_delivery_slas',
      'fms_fleet_kpi', 'fms_reminders', 'fms_driver_violations',
      'fms_geofence_events', 'fms_geofences'
    ];
    for (const t of tables) {
      await queryInterface.dropTable(t).catch(() => {});
    }
  }
};
