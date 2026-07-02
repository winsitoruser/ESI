'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if F&B business type exists
    const [businessTypes] = await queryInterface.sequelize.query(
      `SELECT id, code FROM business_types WHERE code = 'fnb'`
    );

    let fnbBusinessTypeId;
    
    if (businessTypes.length === 0) {
      // Create F&B business type if doesn't exist
      const businessTypeId = require('uuid').v4();
      await queryInterface.bulkInsert('business_types', [{
        id: businessTypeId,
        code: 'fnb',
        name: 'Food & Beverage',
        description: 'Restaurant, Cafe, Food Court, Catering',
        icon: 'utensils',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }]);
      fnbBusinessTypeId = businessTypeId;
    } else {
      fnbBusinessTypeId = businessTypes[0].id;
    }

    // Check if user exists
    const [users] = await queryInterface.sequelize.query(
      `SELECT id, email FROM users WHERE email = 'winsitoruser@gmail.com'`
    );

    let userId;
    let tenantId;

    if (users.length === 0) {
      // Create new user
      userId = require('uuid').v4();
      tenantId = require('uuid').v4();

      // Create tenant first
      await queryInterface.bulkInsert('tenants', [{
        id: tenantId,
        business_name: 'Winsitor Restaurant',
        business_type_id: fnbBusinessTypeId,
        business_address: 'Jakarta',
        business_phone: '081234567890',
        business_email: 'winsitoruser@gmail.com',
        setup_completed: true,
        onboarding_step: 5,
        created_at: new Date(),
        updated_at: new Date()
      }]);

      // Create user
      const hashedPassword = await bcrypt.hash('winsitor123', 10);
      await queryInterface.bulkInsert('users', [{
        id: userId,
        tenant_id: tenantId,
        name: 'Winsitor User',
        email: 'winsitoruser@gmail.com',
        password: hashedPassword,
        role: 'owner',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }]);

      console.log('✅ Created F&B user: winsitoruser@gmail.com with password: winsitor123');
    } else {
      // Update existing user's tenant to have F&B business type
      userId = users[0].id;
      
      const [userTenants] = await queryInterface.sequelize.query(
        `SELECT tenant_id FROM users WHERE id = '${userId}'`
      );

      if (userTenants.length > 0 && userTenants[0].tenant_id) {
        tenantId = userTenants[0].tenant_id;
        
        // Update tenant to F&B business type
        await queryInterface.sequelize.query(
          `UPDATE tenants SET business_type_id = '${fnbBusinessTypeId}', setup_completed = true, updated_at = NOW() WHERE id = '${tenantId}'`
        );

        console.log('✅ Updated existing user tenant to F&B business type');
      } else {
        // Create tenant for existing user
        tenantId = require('uuid').v4();
        
        await queryInterface.bulkInsert('tenants', [{
          id: tenantId,
          business_name: 'Winsitor Restaurant',
          business_type_id: fnbBusinessTypeId,
          business_address: 'Jakarta',
          business_phone: '081234567890',
          business_email: 'winsitoruser@gmail.com',
          setup_completed: true,
          onboarding_step: 5,
          created_at: new Date(),
          updated_at: new Date()
        }]);

        // Update user with tenant
        await queryInterface.sequelize.query(
          `UPDATE users SET tenant_id = '${tenantId}', updated_at = NOW() WHERE id = '${userId}'`
        );

        console.log('✅ Created tenant for existing user');
      }
    }

    // Get all modules
    const [modules] = await queryInterface.sequelize.query(
      `SELECT id, code FROM modules WHERE is_active = true`
    );

    // Enable all modules for this F&B tenant
    const tenantModules = modules.map(module => ({
      id: require('uuid').v4(),
      tenant_id: tenantId,
      module_id: module.id,
      is_enabled: true,
      created_at: new Date(),
      updated_at: new Date()
    }));

    // Delete existing tenant modules first
    await queryInterface.sequelize.query(
      `DELETE FROM tenant_modules WHERE tenant_id = '${tenantId}'`
    );

    // Insert new tenant modules
    if (tenantModules.length > 0) {
      await queryInterface.bulkInsert('tenant_modules', tenantModules);
      console.log(`✅ Enabled ${tenantModules.length} modules for F&B tenant`);
    }

    console.log('✅ F&B user setup completed!');
    console.log('   Email: winsitoruser@gmail.com');
    console.log('   Password: winsitor123');
    console.log('   Business Type: F&B (Food & Beverage)');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove user and related data
    await queryInterface.sequelize.query(
      `DELETE FROM users WHERE email = 'winsitoruser@gmail.com'`
    );
  }
};
