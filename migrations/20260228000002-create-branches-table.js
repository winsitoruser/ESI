'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('branches')) {
      await queryInterface.createTable('branches', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
        store_id: { type: Sequelize.UUID },
        code: { type: Sequelize.STRING(50), unique: true, allowNull: false },
        name: { type: Sequelize.STRING(255), allowNull: false },
        type: { type: Sequelize.STRING(20), defaultValue: 'branch', comment: 'main, branch, warehouse, kiosk' },
        address: { type: Sequelize.TEXT },
        city: { type: Sequelize.STRING(255) },
        province: { type: Sequelize.STRING(255) },
        postal_code: { type: Sequelize.STRING(10) },
        phone: { type: Sequelize.STRING(20) },
        email: { type: Sequelize.STRING(255) },
        manager_id: { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
        operating_hours: { type: Sequelize.JSON, defaultValue: [] },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        settings: { type: Sequelize.JSON, defaultValue: {} },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
      });
    }

    // Indexes
    await queryInterface.addIndex('branches', ['code'], { name: 'idx_branches_code' }).catch(() => {});
    await queryInterface.addIndex('branches', ['is_active'], { name: 'idx_branches_is_active' }).catch(() => {});
    await queryInterface.addIndex('branches', ['type'], { name: 'idx_branches_type' }).catch(() => {});
    await queryInterface.addIndex('branches', ['manager_id'], { name: 'idx_branches_manager_id' }).catch(() => {});

    // Trigger for updated_at
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION update_branches_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS trigger_branches_updated_at ON branches;
      CREATE TRIGGER trigger_branches_updated_at
        BEFORE UPDATE ON branches
        FOR EACH ROW
        EXECUTE FUNCTION update_branches_updated_at();
    `);

    // Insert default main branch
    await queryInterface.sequelize.query(`
      INSERT INTO branches (code, name, type, is_active, operating_hours)
      VALUES (
        'MAIN-001', 'Toko Pusat', 'main', true,
        '[{"day":"Senin","open":"09:00","close":"21:00","isOpen":true},{"day":"Selasa","open":"09:00","close":"21:00","isOpen":true},{"day":"Rabu","open":"09:00","close":"21:00","isOpen":true},{"day":"Kamis","open":"09:00","close":"21:00","isOpen":true},{"day":"Jumat","open":"09:00","close":"21:00","isOpen":true},{"day":"Sabtu","open":"09:00","close":"22:00","isOpen":true},{"day":"Minggu","open":"10:00","close":"20:00","isOpen":true}]'::json
      ) ON CONFLICT (code) DO NOTHING;
    `);

    console.log('✅ Branches table created with default main branch');
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query('DROP TRIGGER IF EXISTS trigger_branches_updated_at ON branches').catch(() => {});
    await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS update_branches_updated_at()').catch(() => {});
    await queryInterface.dropTable('branches').catch(() => {});
  }
};
