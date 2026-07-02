'use strict';

/**
 * Seed CRM, SFA, and Marketing module definitions into the modules table.
 * These entries allow tenants to enable/disable each module independently
 * via the Module Management settings page.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if modules table exists
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('modules')) {
      console.log('⚠️  modules table does not exist yet — skipping seed');
      return;
    }

    const now = new Date();

    // Upsert module definitions (avoid duplicate errors)
    const modules = [
      {
        id: require('crypto').randomUUID(),
        code: 'crm',
        name: 'Customer Relationship Management',
        description: 'Customer 360°, komunikasi, task & kalender, tiket & SLA, forecasting, automasi CRM, dokumen',
        category: 'addon',
        version: '1.0.0',
        is_active: true,
        is_core: false,
        icon: 'Heart',
        sort_order: 50,
        features: JSON.stringify([
          'customer_360', 'communications', 'tasks', 'tickets', 'forecasting', 'automation', 'documents'
        ]),
        dependencies: JSON.stringify([]),
        created_at: now,
        updated_at: now,
      },
      {
        id: require('crypto').randomUUID(),
        code: 'sfa',
        name: 'Sales Force Automation',
        description: 'Lead management, pipeline, tim & territory, kunjungan, order, target, insentif, coverage, geofence',
        category: 'addon',
        version: '1.0.0',
        is_active: true,
        is_core: false,
        icon: 'Briefcase',
        sort_order: 51,
        features: JSON.stringify([
          'leads', 'pipeline', 'teams', 'visits', 'orders', 'targets', 'incentives', 'coverage', 'geofence', 'approval'
        ]),
        dependencies: JSON.stringify([]),
        created_at: now,
        updated_at: now,
      },
      {
        id: require('crypto').randomUUID(),
        code: 'marketing',
        name: 'Marketing & Campaign',
        description: 'Campaign management, promosi, segmentasi pelanggan, budget marketing',
        category: 'addon',
        version: '1.0.0',
        is_active: true,
        is_core: false,
        icon: 'Megaphone',
        sort_order: 52,
        features: JSON.stringify([
          'campaigns', 'promotions', 'segments', 'budgets'
        ]),
        dependencies: JSON.stringify([]),
        created_at: now,
        updated_at: now,
      },
    ];

    for (const mod of modules) {
      // Check if module with this code already exists
      const existing = await queryInterface.sequelize.query(
        `SELECT id FROM modules WHERE code = :code LIMIT 1`,
        { replacements: { code: mod.code }, type: Sequelize.QueryTypes.SELECT }
      );

      if (existing.length === 0) {
        await queryInterface.bulkInsert('modules', [mod]);
        console.log(`✅ Module seeded: ${mod.name} (${mod.code})`);
      } else {
        console.log(`⏭️  Module already exists: ${mod.code}`);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('modules', {
      code: { [Sequelize.Op.in]: ['crm', 'sfa', 'marketing'] }
    });
  }
};
