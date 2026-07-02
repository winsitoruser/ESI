'use strict';

/**
 * Smart Warehouse & Inventory Management - Revolutionary Enhancement
 * Tables: IoT sensors, AI demand forecasts, automation rules, bin optimization,
 *         warehouse zones enhanced, pick/pack tasks, quality inspections,
 *         inventory snapshots, smart alerts
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {

    // ─── 1. Warehouse IoT Sensors ───
    await queryInterface.createTable('warehouse_iot_sensors', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true },
      warehouse_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'warehouses', key: 'id' } },
      zone_id: { type: Sequelize.INTEGER, allowNull: true },
      location_id: { type: Sequelize.INTEGER, allowNull: true },
      sensor_code: { type: Sequelize.STRING(50), allowNull: false },
      sensor_type: { type: Sequelize.ENUM('temperature', 'humidity', 'motion', 'weight', 'door', 'camera', 'rfid', 'barcode_scanner', 'light', 'air_quality'), allowNull: false },
      name: { type: Sequelize.STRING(100), allowNull: false },
      model: { type: Sequelize.STRING(100), allowNull: true },
      firmware_version: { type: Sequelize.STRING(50), allowNull: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      mac_address: { type: Sequelize.STRING(17), allowNull: true },
      protocol: { type: Sequelize.ENUM('mqtt', 'http', 'modbus', 'zigbee', 'bluetooth', 'lorawan'), defaultValue: 'mqtt' },
      status: { type: Sequelize.ENUM('online', 'offline', 'error', 'maintenance', 'calibrating'), defaultValue: 'online' },
      battery_level: { type: Sequelize.INTEGER, allowNull: true },
      last_reading: { type: Sequelize.JSONB, allowNull: true },
      last_reading_at: { type: Sequelize.DATE, allowNull: true },
      config: { type: Sequelize.JSONB, allowNull: true },
      alert_thresholds: { type: Sequelize.JSONB, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      installed_at: { type: Sequelize.DATE, allowNull: true },
      next_maintenance: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('warehouse_iot_sensors', ['warehouse_id']);
    await queryInterface.addIndex('warehouse_iot_sensors', ['sensor_code'], { unique: true });
    await queryInterface.addIndex('warehouse_iot_sensors', ['sensor_type']);
    await queryInterface.addIndex('warehouse_iot_sensors', ['status']);

    // ─── 2. IoT Sensor Readings (time-series) ───
    await queryInterface.createTable('warehouse_sensor_readings', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      sensor_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'warehouse_iot_sensors', key: 'id' } },
      reading_type: { type: Sequelize.STRING(50), allowNull: false },
      value: { type: Sequelize.DECIMAL(15, 4), allowNull: false },
      unit: { type: Sequelize.STRING(20), allowNull: true },
      quality: { type: Sequelize.ENUM('good', 'uncertain', 'bad'), defaultValue: 'good' },
      metadata: { type: Sequelize.JSONB, allowNull: true },
      recorded_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('warehouse_sensor_readings', ['sensor_id', 'recorded_at']);
    await queryInterface.addIndex('warehouse_sensor_readings', ['recorded_at']);

    // ─── 3. AI Demand Forecasts ───
    await queryInterface.createTable('ai_demand_forecasts', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true },
      product_id: { type: Sequelize.INTEGER, allowNull: false },
      warehouse_id: { type: Sequelize.INTEGER, allowNull: true },
      forecast_date: { type: Sequelize.DATEONLY, allowNull: false },
      period_type: { type: Sequelize.ENUM('daily', 'weekly', 'monthly'), allowNull: false },
      predicted_demand: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      confidence_lower: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      confidence_upper: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      confidence_level: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      model_used: { type: Sequelize.STRING(50), allowNull: true },
      model_version: { type: Sequelize.STRING(20), allowNull: true },
      features_used: { type: Sequelize.JSONB, allowNull: true },
      accuracy_score: { type: Sequelize.DECIMAL(5, 4), allowNull: true },
      actual_demand: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      seasonality_factor: { type: Sequelize.DECIMAL(5, 3), allowNull: true },
      trend_direction: { type: Sequelize.ENUM('up', 'down', 'stable', 'volatile'), allowNull: true },
      anomaly_flag: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('ai_demand_forecasts', ['product_id', 'forecast_date']);
    await queryInterface.addIndex('ai_demand_forecasts', ['warehouse_id']);
    await queryInterface.addIndex('ai_demand_forecasts', ['forecast_date']);

    // ─── 4. AI Reorder Recommendations ───
    await queryInterface.createTable('ai_reorder_recommendations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true },
      product_id: { type: Sequelize.INTEGER, allowNull: false },
      warehouse_id: { type: Sequelize.INTEGER, allowNull: true },
      supplier_id: { type: Sequelize.INTEGER, allowNull: true },
      recommended_qty: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      recommended_date: { type: Sequelize.DATEONLY, allowNull: false },
      urgency: { type: Sequelize.ENUM('critical', 'high', 'medium', 'low'), defaultValue: 'medium' },
      reason: { type: Sequelize.TEXT, allowNull: true },
      current_stock: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      predicted_stockout_date: { type: Sequelize.DATEONLY, allowNull: true },
      estimated_cost: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      lead_time_days: { type: Sequelize.INTEGER, allowNull: true },
      safety_stock: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      economic_order_qty: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      status: { type: Sequelize.ENUM('pending', 'approved', 'ordered', 'rejected', 'expired'), defaultValue: 'pending' },
      approved_by: { type: Sequelize.STRING(100), allowNull: true },
      approved_at: { type: Sequelize.DATE, allowNull: true },
      po_id: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('ai_reorder_recommendations', ['product_id']);
    await queryInterface.addIndex('ai_reorder_recommendations', ['status']);
    await queryInterface.addIndex('ai_reorder_recommendations', ['urgency']);

    // ─── 5. Warehouse Automation Rules ───
    await queryInterface.createTable('warehouse_automation_rules', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true },
      name: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      rule_type: { type: Sequelize.ENUM('reorder', 'transfer', 'alert', 'pricing', 'quality_check', 'putaway', 'replenishment', 'cycle_count'), allowNull: false },
      trigger_type: { type: Sequelize.ENUM('threshold', 'schedule', 'event', 'ai_recommendation', 'manual'), allowNull: false },
      trigger_config: { type: Sequelize.JSONB, allowNull: false },
      action_config: { type: Sequelize.JSONB, allowNull: false },
      conditions: { type: Sequelize.JSONB, allowNull: true },
      priority: { type: Sequelize.INTEGER, defaultValue: 50 },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      last_triggered_at: { type: Sequelize.DATE, allowNull: true },
      trigger_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      success_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      failure_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      cooldown_minutes: { type: Sequelize.INTEGER, defaultValue: 60 },
      max_daily_triggers: { type: Sequelize.INTEGER, allowNull: true },
      created_by: { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('warehouse_automation_rules', ['rule_type']);
    await queryInterface.addIndex('warehouse_automation_rules', ['is_active']);

    // ─── 6. Automation Execution Log ───
    await queryInterface.createTable('warehouse_automation_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      rule_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'warehouse_automation_rules', key: 'id' } },
      status: { type: Sequelize.ENUM('success', 'failure', 'partial', 'skipped'), allowNull: false },
      trigger_data: { type: Sequelize.JSONB, allowNull: true },
      action_result: { type: Sequelize.JSONB, allowNull: true },
      error_message: { type: Sequelize.TEXT, allowNull: true },
      execution_time_ms: { type: Sequelize.INTEGER, allowNull: true },
      executed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('warehouse_automation_logs', ['rule_id']);
    await queryInterface.addIndex('warehouse_automation_logs', ['executed_at']);

    // ─── 7. Smart Pick/Pack Tasks ───
    await queryInterface.createTable('warehouse_pick_tasks', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true },
      task_number: { type: Sequelize.STRING(50), allowNull: false },
      task_type: { type: Sequelize.ENUM('pick', 'pack', 'putaway', 'replenish', 'cycle_count', 'relocation'), allowNull: false },
      warehouse_id: { type: Sequelize.INTEGER, allowNull: false },
      order_reference: { type: Sequelize.STRING(100), allowNull: true },
      priority: { type: Sequelize.ENUM('urgent', 'high', 'normal', 'low'), defaultValue: 'normal' },
      status: { type: Sequelize.ENUM('pending', 'assigned', 'in_progress', 'completed', 'cancelled'), defaultValue: 'pending' },
      assigned_to: { type: Sequelize.STRING(100), allowNull: true },
      items: { type: Sequelize.JSONB, allowNull: false },
      optimized_route: { type: Sequelize.JSONB, allowNull: true },
      estimated_time_min: { type: Sequelize.INTEGER, allowNull: true },
      actual_time_min: { type: Sequelize.INTEGER, allowNull: true },
      distance_meters: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      started_at: { type: Sequelize.DATE, allowNull: true },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('warehouse_pick_tasks', ['warehouse_id']);
    await queryInterface.addIndex('warehouse_pick_tasks', ['status']);
    await queryInterface.addIndex('warehouse_pick_tasks', ['assigned_to']);
    await queryInterface.addIndex('warehouse_pick_tasks', ['task_number'], { unique: true });

    // ─── 8. Quality Inspections ───
    await queryInterface.createTable('warehouse_quality_inspections', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true },
      inspection_number: { type: Sequelize.STRING(50), allowNull: false },
      inspection_type: { type: Sequelize.ENUM('incoming', 'outgoing', 'periodic', 'random', 'customer_return'), allowNull: false },
      warehouse_id: { type: Sequelize.INTEGER, allowNull: false },
      reference_type: { type: Sequelize.STRING(50), allowNull: true },
      reference_id: { type: Sequelize.INTEGER, allowNull: true },
      items: { type: Sequelize.JSONB, allowNull: false },
      overall_result: { type: Sequelize.ENUM('passed', 'failed', 'conditional', 'pending'), defaultValue: 'pending' },
      inspector_name: { type: Sequelize.STRING(100), allowNull: true },
      inspection_date: { type: Sequelize.DATE, allowNull: false },
      findings: { type: Sequelize.TEXT, allowNull: true },
      corrective_actions: { type: Sequelize.TEXT, allowNull: true },
      photos: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('warehouse_quality_inspections', ['warehouse_id']);
    await queryInterface.addIndex('warehouse_quality_inspections', ['overall_result']);
    await queryInterface.addIndex('warehouse_quality_inspections', ['inspection_number'], { unique: true });

    // ─── 9. Inventory Snapshots (daily/weekly for trend analysis) ───
    await queryInterface.createTable('inventory_snapshots', {
      id: { type: Sequelize.BIGINT, primaryKey: true, autoIncrement: true },
      tenant_id: { type: Sequelize.UUID, allowNull: true },
      snapshot_date: { type: Sequelize.DATEONLY, allowNull: false },
      snapshot_type: { type: Sequelize.ENUM('daily', 'weekly', 'monthly'), allowNull: false },
      warehouse_id: { type: Sequelize.INTEGER, allowNull: true },
      total_skus: { type: Sequelize.INTEGER, defaultValue: 0 },
      total_quantity: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      total_value: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      low_stock_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      out_of_stock_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      over_stock_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      turnover_rate: { type: Sequelize.DECIMAL(10, 4), allowNull: true },
      fill_rate: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      accuracy_rate: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      details: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('inventory_snapshots', ['snapshot_date', 'warehouse_id']);
    await queryInterface.addIndex('inventory_snapshots', ['snapshot_type']);

    // ─── 10. Bin Optimization History ───
    await queryInterface.createTable('warehouse_bin_optimization', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      warehouse_id: { type: Sequelize.INTEGER, allowNull: false },
      optimization_type: { type: Sequelize.ENUM('slotting', 'consolidation', 'rebalance', 'seasonal'), allowNull: false },
      status: { type: Sequelize.ENUM('proposed', 'approved', 'in_progress', 'completed', 'cancelled'), defaultValue: 'proposed' },
      moves: { type: Sequelize.JSONB, allowNull: false },
      total_moves: { type: Sequelize.INTEGER, defaultValue: 0 },
      estimated_savings_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      actual_savings_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      ai_confidence: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      approved_by: { type: Sequelize.STRING(100), allowNull: true },
      started_at: { type: Sequelize.DATE, allowNull: true },
      completed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });
    await queryInterface.addIndex('warehouse_bin_optimization', ['warehouse_id']);
    await queryInterface.addIndex('warehouse_bin_optimization', ['status']);

    // ─── Add smart columns to existing warehouses table ───
    try {
      await queryInterface.addColumn('warehouses', 'latitude', { type: Sequelize.DECIMAL(10, 7), allowNull: true });
      await queryInterface.addColumn('warehouses', 'longitude', { type: Sequelize.DECIMAL(10, 7), allowNull: true });
      await queryInterface.addColumn('warehouses', 'total_area_sqm', { type: Sequelize.DECIMAL(10, 2), allowNull: true });
      await queryInterface.addColumn('warehouses', 'usable_area_sqm', { type: Sequelize.DECIMAL(10, 2), allowNull: true });
      await queryInterface.addColumn('warehouses', 'max_height_m', { type: Sequelize.DECIMAL(5, 2), allowNull: true });
      await queryInterface.addColumn('warehouses', 'dock_count', { type: Sequelize.INTEGER, allowNull: true });
      await queryInterface.addColumn('warehouses', 'operating_hours', { type: Sequelize.JSONB, allowNull: true });
      await queryInterface.addColumn('warehouses', 'certifications', { type: Sequelize.JSONB, allowNull: true });
      await queryInterface.addColumn('warehouses', 'smart_features', { type: Sequelize.JSONB, allowNull: true });
      await queryInterface.addColumn('warehouses', 'iot_enabled', { type: Sequelize.BOOLEAN, defaultValue: false });
      await queryInterface.addColumn('warehouses', 'automation_level', { type: Sequelize.ENUM('manual', 'semi_auto', 'fully_auto'), defaultValue: 'manual' });
    } catch (e) { console.log('Some warehouse columns may already exist:', e.message); }

    // ─── Add smart columns to locations table ───
    try {
      await queryInterface.addColumn('locations', 'max_weight_kg', { type: Sequelize.DECIMAL(10, 2), allowNull: true });
      await queryInterface.addColumn('locations', 'dimensions', { type: Sequelize.JSONB, allowNull: true });
      await queryInterface.addColumn('locations', 'abc_class', { type: Sequelize.CHAR(1), allowNull: true });
      await queryInterface.addColumn('locations', 'pick_frequency', { type: Sequelize.INTEGER, defaultValue: 0 });
      await queryInterface.addColumn('locations', 'last_pick_at', { type: Sequelize.DATE, allowNull: true });
      await queryInterface.addColumn('locations', 'barcode', { type: Sequelize.STRING(100), allowNull: true });
      await queryInterface.addColumn('locations', 'rfid_tag', { type: Sequelize.STRING(100), allowNull: true });
    } catch (e) { console.log('Some location columns may already exist:', e.message); }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('warehouse_bin_optimization');
    await queryInterface.dropTable('inventory_snapshots');
    await queryInterface.dropTable('warehouse_quality_inspections');
    await queryInterface.dropTable('warehouse_pick_tasks');
    await queryInterface.dropTable('warehouse_automation_logs');
    await queryInterface.dropTable('warehouse_automation_rules');
    await queryInterface.dropTable('ai_reorder_recommendations');
    await queryInterface.dropTable('ai_demand_forecasts');
    await queryInterface.dropTable('warehouse_sensor_readings');
    await queryInterface.dropTable('warehouse_iot_sensors');

    try {
      await queryInterface.removeColumn('warehouses', 'latitude');
      await queryInterface.removeColumn('warehouses', 'longitude');
      await queryInterface.removeColumn('warehouses', 'total_area_sqm');
      await queryInterface.removeColumn('warehouses', 'usable_area_sqm');
      await queryInterface.removeColumn('warehouses', 'max_height_m');
      await queryInterface.removeColumn('warehouses', 'dock_count');
      await queryInterface.removeColumn('warehouses', 'operating_hours');
      await queryInterface.removeColumn('warehouses', 'certifications');
      await queryInterface.removeColumn('warehouses', 'smart_features');
      await queryInterface.removeColumn('warehouses', 'iot_enabled');
      await queryInterface.removeColumn('warehouses', 'automation_level');
    } catch (e) {}
    try {
      await queryInterface.removeColumn('locations', 'max_weight_kg');
      await queryInterface.removeColumn('locations', 'dimensions');
      await queryInterface.removeColumn('locations', 'abc_class');
      await queryInterface.removeColumn('locations', 'pick_frequency');
      await queryInterface.removeColumn('locations', 'last_pick_at');
      await queryInterface.removeColumn('locations', 'barcode');
      await queryInterface.removeColumn('locations', 'rfid_tag');
    } catch (e) {}
  }
};
