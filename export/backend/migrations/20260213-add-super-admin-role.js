'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // For PostgreSQL: Add new value to existing ENUM
    // Note: This requires PostgreSQL 9.1+
    await queryInterface.sequelize.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'super_admin' 
          AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'enum_users_role'
          )
        ) THEN
          ALTER TYPE "enum_users_role" ADD VALUE 'super_admin';
        END IF;
      END $$;
    `);

    // Make tenant_id nullable for super admin
    await queryInterface.changeColumn('users', 'tenant_id', {
      type: Sequelize.UUID,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Cannot remove ENUM value in PostgreSQL easily
    // Would need to recreate the entire ENUM type
    console.log('Cannot remove ENUM value - manual intervention required');
    
    // Revert tenant_id to NOT NULL (if needed)
    // Note: This will fail if there are super admin users
    // await queryInterface.changeColumn('users', 'tenant_id', {
    //   type: Sequelize.UUID,
    //   allowNull: false
    // });
  }
};
