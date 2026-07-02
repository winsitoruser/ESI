'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();

    // 1. employee_schedules (UUID version with constraints)
    if (!tables.includes('employee_schedules')) {
      await queryInterface.createTable('employee_schedules', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        employee_id: { type: Sequelize.UUID, allowNull: false },
        schedule_date: { type: Sequelize.DATEONLY, allowNull: false },
        shift_type: { type: Sequelize.STRING(10), allowNull: false, comment: 'pagi, siang, malam, full' },
        start_time: { type: Sequelize.TIME, allowNull: false },
        end_time: { type: Sequelize.TIME, allowNull: false },
        location_id: { type: Sequelize.UUID },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'scheduled', comment: 'scheduled, confirmed, completed, cancelled, absent' },
        notes: { type: Sequelize.TEXT },
        is_recurring: { type: Sequelize.BOOLEAN, defaultValue: false },
        recurring_pattern: { type: Sequelize.STRING(10), defaultValue: 'none', comment: 'daily, weekly, monthly, none' },
        recurring_end_date: { type: Sequelize.DATEONLY },
        created_by: { type: Sequelize.UUID },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // 2. shift_templates
    if (!tables.includes('shift_templates')) {
      await queryInterface.createTable('shift_templates', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        name: { type: Sequelize.STRING(100), allowNull: false },
        shift_type: { type: Sequelize.STRING(10), allowNull: false, comment: 'pagi, siang, malam, full' },
        start_time: { type: Sequelize.TIME, allowNull: false },
        end_time: { type: Sequelize.TIME, allowNull: false },
        break_duration: { type: Sequelize.INTEGER, defaultValue: 0, comment: 'Break duration in minutes' },
        color: { type: Sequelize.STRING(20), comment: 'Hex color code for UI display' },
        description: { type: Sequelize.TEXT },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // Indexes for employee_schedules
    await queryInterface.addIndex('employee_schedules', ['employee_id'], { name: 'idx_es_employee' }).catch(() => {});
    await queryInterface.addIndex('employee_schedules', ['schedule_date'], { name: 'idx_es_date' }).catch(() => {});
    await queryInterface.addIndex('employee_schedules', ['status'], { name: 'idx_es_status' }).catch(() => {});
    await queryInterface.addIndex('employee_schedules', ['shift_type'], { name: 'idx_es_shift' }).catch(() => {});
    await queryInterface.addIndex('employee_schedules', ['location_id'], { name: 'idx_es_location' }).catch(() => {});
    await queryInterface.addIndex('employee_schedules', ['schedule_date', 'employee_id'], { name: 'idx_es_date_range' }).catch(() => {});
    await queryInterface.addIndex('employee_schedules', ['employee_id', 'schedule_date', 'status'], { name: 'idx_es_composite' }).catch(() => {});

    // Indexes for shift_templates
    await queryInterface.addIndex('shift_templates', ['is_active'], { name: 'idx_st_active' }).catch(() => {});
    await queryInterface.addIndex('shift_templates', ['shift_type'], { name: 'idx_st_type' }).catch(() => {});

    // Triggers for updated_at
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS update_employee_schedules_updated_at ON employee_schedules;
      CREATE TRIGGER update_employee_schedules_updated_at
        BEFORE UPDATE ON employee_schedules
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS update_shift_templates_updated_at ON shift_templates;
      CREATE TRIGGER update_shift_templates_updated_at
        BEFORE UPDATE ON shift_templates
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Sample shift templates
    await queryInterface.sequelize.query(`
      INSERT INTO shift_templates (id, name, shift_type, start_time, end_time, break_duration, color, description, is_active) VALUES
        (gen_random_uuid(), 'Shift Pagi Standar', 'pagi', '08:00:00', '16:00:00', 60, '#FCD34D', 'Shift pagi standar dengan istirahat 1 jam', true),
        (gen_random_uuid(), 'Shift Siang Standar', 'siang', '14:00:00', '22:00:00', 60, '#60A5FA', 'Shift siang standar dengan istirahat 1 jam', true),
        (gen_random_uuid(), 'Shift Malam Standar', 'malam', '22:00:00', '06:00:00', 60, '#A78BFA', 'Shift malam standar dengan istirahat 1 jam', true),
        (gen_random_uuid(), 'Shift Full Day', 'full', '08:00:00', '20:00:00', 120, '#34D399', 'Shift full day dengan istirahat 2 jam', true)
      ON CONFLICT DO NOTHING;
    `).catch(() => {});

    console.log('✅ Employee schedules & shift templates tables created');
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS update_shift_templates_updated_at ON shift_templates').catch(() => {});
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS update_employee_schedules_updated_at ON employee_schedules').catch(() => {});
    await queryInterface.dropTable('shift_templates').catch(() => {});
    await queryInterface.dropTable('employee_schedules').catch(() => {});
  }
};
