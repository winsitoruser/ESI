'use strict';

/** Add `archived` to tenants.status enum for QA hygiene / soft-delete. */
module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    await sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE enum_tenants_status ADD VALUE IF NOT EXISTS 'archived';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
        WHEN undefined_object THEN NULL;
      END $$;
    `);
  },

  async down() {
    // Postgres cannot easily remove enum values; leave as no-op.
  },
};
