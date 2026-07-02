'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create attendance_devices table
    await queryInterface.createTable('attendance_devices', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      branch_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      device_name: { type: Sequelize.STRING(255), allowNull: false },
      device_type: { type: Sequelize.STRING(50), allowNull: false, comment: 'fingerprint, face_recognition, card, mobile_app, manual' },
      device_brand: { type: Sequelize.STRING(100), allowNull: true },
      device_model: { type: Sequelize.STRING(100), allowNull: true },
      serial_number: { type: Sequelize.STRING(100), allowNull: true, unique: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      port: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 4370 },
      communication_key: { type: Sequelize.STRING(100), allowNull: true },
      connection_type: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'tcp' },
      api_endpoint: { type: Sequelize.STRING(500), allowNull: true },
      api_key: { type: Sequelize.STRING(255), allowNull: true },
      webhook_secret: { type: Sequelize.STRING(255), allowNull: true },
      sync_mode: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'push' },
      sync_interval: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 5 },
      last_sync_at: { type: Sequelize.DATE, allowNull: true },
      last_sync_status: { type: Sequelize.STRING(30), allowNull: true },
      last_sync_message: { type: Sequelize.TEXT, allowNull: true },
      total_synced: { type: Sequelize.INTEGER, defaultValue: 0 },
      registered_users: { type: Sequelize.INTEGER, defaultValue: 0 },
      max_capacity: { type: Sequelize.INTEGER, allowNull: true },
      firmware_version: { type: Sequelize.STRING(50), allowNull: true },
      location: { type: Sequelize.STRING(255), allowNull: true },
      status: { type: Sequelize.STRING(30), defaultValue: 'active' },
      is_online: { type: Sequelize.BOOLEAN, defaultValue: false },
      last_heartbeat_at: { type: Sequelize.DATE, allowNull: true },
      settings: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });

    await queryInterface.addIndex('attendance_devices', ['tenant_id'], { name: 'idx_att_devices_tenant' });
    await queryInterface.addIndex('attendance_devices', ['branch_id'], { name: 'idx_att_devices_branch' });
    await queryInterface.addIndex('attendance_devices', ['status'], { name: 'idx_att_devices_status' });

    // 2. Create attendance_device_logs table
    await queryInterface.createTable('attendance_device_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      device_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'attendance_devices', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      tenant_id: { type: Sequelize.UUID, allowNull: false },
      employee_id: { type: Sequelize.UUID, allowNull: true },
      device_user_id: { type: Sequelize.STRING(100), allowNull: false },
      device_user_name: { type: Sequelize.STRING(255), allowNull: true },
      punch_time: { type: Sequelize.DATE, allowNull: false },
      punch_type: { type: Sequelize.STRING(30), allowNull: true },
      verify_mode: { type: Sequelize.STRING(30), allowNull: true },
      verify_status: { type: Sequelize.INTEGER, allowNull: true },
      process_status: { type: Sequelize.STRING(30), defaultValue: 'pending' },
      processed_at: { type: Sequelize.DATE, allowNull: true },
      process_error: { type: Sequelize.TEXT, allowNull: true },
      attendance_id: { type: Sequelize.UUID, allowNull: true },
      raw_data: { type: Sequelize.JSONB, allowNull: true },
      sync_batch_id: { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });

    await queryInterface.addIndex('attendance_device_logs', ['device_id'], { name: 'idx_att_logs_device' });
    await queryInterface.addIndex('attendance_device_logs', ['tenant_id'], { name: 'idx_att_logs_tenant' });
    await queryInterface.addIndex('attendance_device_logs', ['employee_id'], { name: 'idx_att_logs_employee' });
    await queryInterface.addIndex('attendance_device_logs', ['punch_time'], { name: 'idx_att_logs_punch_time' });
    await queryInterface.addIndex('attendance_device_logs', ['process_status'], { name: 'idx_att_logs_status' });
    await queryInterface.addIndex('attendance_device_logs', ['device_user_id', 'punch_time'], { name: 'idx_att_logs_user_time' });

    // 3. Create attendance_settings table
    await queryInterface.createTable('attendance_settings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      tenant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      branch_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'branches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      work_start_time: { type: Sequelize.TIME, allowNull: false, defaultValue: '08:00:00' },
      work_end_time: { type: Sequelize.TIME, allowNull: false, defaultValue: '17:00:00' },
      break_start_time: { type: Sequelize.TIME, allowNull: true, defaultValue: '12:00:00' },
      break_end_time: { type: Sequelize.TIME, allowNull: true, defaultValue: '13:00:00' },
      break_duration_minutes: { type: Sequelize.INTEGER, defaultValue: 60 },
      work_days: { type: Sequelize.JSONB, defaultValue: [1, 2, 3, 4, 5] },
      late_grace_minutes: { type: Sequelize.INTEGER, defaultValue: 15 },
      early_leave_grace_minutes: { type: Sequelize.INTEGER, defaultValue: 15 },
      auto_absent_after_minutes: { type: Sequelize.INTEGER, defaultValue: 120 },
      overtime_enabled: { type: Sequelize.BOOLEAN, defaultValue: true },
      overtime_min_minutes: { type: Sequelize.INTEGER, defaultValue: 30 },
      overtime_requires_approval: { type: Sequelize.BOOLEAN, defaultValue: true },
      gps_attendance_enabled: { type: Sequelize.BOOLEAN, defaultValue: true },
      geo_fence_radius: { type: Sequelize.INTEGER, defaultValue: 100 },
      require_selfie: { type: Sequelize.BOOLEAN, defaultValue: false },
      allow_outside_geofence: { type: Sequelize.BOOLEAN, defaultValue: false },
      fingerprint_enabled: { type: Sequelize.BOOLEAN, defaultValue: true },
      auto_process_device_logs: { type: Sequelize.BOOLEAN, defaultValue: true },
      punch_type_detection: { type: Sequelize.STRING(30), defaultValue: 'auto' },
      annual_leave_quota: { type: Sequelize.INTEGER, defaultValue: 12 },
      sick_leave_quota: { type: Sequelize.INTEGER, defaultValue: 14 },
      leave_requires_approval: { type: Sequelize.BOOLEAN, defaultValue: true },
      notify_late_to_manager: { type: Sequelize.BOOLEAN, defaultValue: true },
      notify_absent_to_manager: { type: Sequelize.BOOLEAN, defaultValue: true },
      notify_overtime_to_hr: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    });

    await queryInterface.addIndex('attendance_settings', ['tenant_id'], { name: 'idx_att_settings_tenant' });
    await queryInterface.addIndex('attendance_settings', ['tenant_id', 'branch_id'], { name: 'idx_att_settings_unique', unique: true });

    // 4. Add source tracking columns to employee_attendance if not exists
    try {
      await queryInterface.addColumn('employee_attendance', 'source', {
        type: Sequelize.STRING(30),
        allowNull: true,
        defaultValue: 'manual',
        comment: 'manual, fingerprint, face, card, gps_mobile, api'
      });
      await queryInterface.addColumn('employee_attendance', 'device_id', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'attendance_devices', key: 'id' }
      });
      await queryInterface.addColumn('employee_attendance', 'selfie_url', {
        type: Sequelize.TEXT,
        allowNull: true
      });
      await queryInterface.addColumn('employee_attendance', 'is_outside_geofence', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      });
      await queryInterface.addColumn('employee_attendance', 'distance_from_branch', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Distance in meters from branch at clock-in'
      });
    } catch (e) {
      console.log('Columns may already exist:', e.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('employee_attendance', 'source');
      await queryInterface.removeColumn('employee_attendance', 'device_id');
      await queryInterface.removeColumn('employee_attendance', 'selfie_url');
      await queryInterface.removeColumn('employee_attendance', 'is_outside_geofence');
      await queryInterface.removeColumn('employee_attendance', 'distance_from_branch');
    } catch (e) {}
    await queryInterface.dropTable('attendance_settings');
    await queryInterface.dropTable('attendance_device_logs');
    await queryInterface.dropTable('attendance_devices');
  }
};
