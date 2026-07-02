'use strict';

/**
 * Fix type mismatch: core SFA tables have created_by/updated_by as UUID
 * but users.id is INTEGER. This migration alters them to INTEGER.
 * 
 * Affected tables: sfa_leads, sfa_opportunities, sfa_activities, sfa_quotations, sfa_targets
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = ['sfa_leads', 'sfa_opportunities', 'sfa_activities', 'sfa_quotations', 'sfa_targets'];
    const columns = ['created_by', 'updated_by'];

    for (const table of tables) {
      for (const col of columns) {
        // Check if column exists before altering
        const [cols] = await queryInterface.sequelize.query(
          `SELECT data_type FROM information_schema.columns WHERE table_name = '${table}' AND column_name = '${col}'`
        );
        if (cols.length > 0 && cols[0].data_type === 'uuid') {
          // Drop the column data first (can't cast uuid -> integer directly), then re-add as integer
          await queryInterface.sequelize.query(
            `ALTER TABLE ${table} ALTER COLUMN ${col} DROP DEFAULT`
          ).catch(() => {});
          await queryInterface.sequelize.query(
            `ALTER TABLE ${table} ALTER COLUMN ${col} TYPE INTEGER USING NULL`
          );
          console.log(`  ✓ ${table}.${col}: uuid → integer`);
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const tables = ['sfa_leads', 'sfa_opportunities', 'sfa_activities', 'sfa_quotations', 'sfa_targets'];
    const columns = ['created_by', 'updated_by'];

    for (const table of tables) {
      for (const col of columns) {
        const [cols] = await queryInterface.sequelize.query(
          `SELECT data_type FROM information_schema.columns WHERE table_name = '${table}' AND column_name = '${col}'`
        );
        if (cols.length > 0 && cols[0].data_type === 'integer') {
          await queryInterface.sequelize.query(
            `ALTER TABLE ${table} ALTER COLUMN ${col} TYPE UUID USING NULL`
          );
        }
      }
    }
  }
};
