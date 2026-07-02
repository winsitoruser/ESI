'use strict';

/** Tujuan kunjungan/call + referensi outlet (integrasi SFA / CRM) */
module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface.sequelize;
    await qi.query(`
      ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS purpose TEXT;
      ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS outlet_code VARCHAR(80);
      ALTER TABLE crm_tasks ADD COLUMN IF NOT EXISTS outlet_name VARCHAR(300);
    `);
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('crm_tasks', 'purpose').catch(() => {});
    await queryInterface.removeColumn('crm_tasks', 'outlet_code').catch(() => {});
    await queryInterface.removeColumn('crm_tasks', 'outlet_name').catch(() => {});
  },
};
