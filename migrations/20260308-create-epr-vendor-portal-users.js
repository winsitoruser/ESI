'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('epr_vendor_portal_users', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      vendor_id: { type: Sequelize.UUID, references: { model: 'epr_vendors', key: 'id' }, onDelete: 'SET NULL' },
      company_name: { type: Sequelize.STRING(200), allowNull: false },
      contact_person: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      phone: { type: Sequelize.STRING(50) },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      npwp: { type: Sequelize.STRING(50) },
      address: { type: Sequelize.TEXT },
      city: { type: Sequelize.STRING(100) },
      province: { type: Sequelize.STRING(100) },
      business_type: { type: Sequelize.STRING(100) },
      status: { type: Sequelize.STRING(30), defaultValue: 'pending' }, // pending, approved, rejected, suspended
      approved_by: { type: Sequelize.INTEGER },
      approved_at: { type: Sequelize.DATE },
      last_login: { type: Sequelize.DATE },
      login_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    });

    await queryInterface.addIndex('epr_vendor_portal_users', ['email'], { unique: true, name: 'idx_epr_vpu_email' });
    await queryInterface.addIndex('epr_vendor_portal_users', ['vendor_id'], { name: 'idx_epr_vpu_vendor_id' });
    await queryInterface.addIndex('epr_vendor_portal_users', ['status'], { name: 'idx_epr_vpu_status' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('epr_vendor_portal_users');
  }
};
