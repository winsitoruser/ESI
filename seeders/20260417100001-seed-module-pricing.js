'use strict';

/**
 * Seeds default pricing for add-on modules. The entries are module-code based
 * so they stay idempotent when modules are inserted via other seeders.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Look up modules by code to get their ids
    const [modules] = await queryInterface.sequelize.query(
      `SELECT id, code FROM modules WHERE code IS NOT NULL`
    );

    if (!modules || modules.length === 0) {
      console.log('No modules found, skipping module_pricing seeding');
      return;
    }

    const priceMap = {
      pos: { price: 0, includedInPlans: ['Starter', 'Professional', 'Enterprise'] },
      inventory: { price: 0, includedInPlans: ['Starter', 'Professional', 'Enterprise'] },
      finance: { price: 299000, includedInPlans: ['Professional', 'Enterprise'] },
      kitchen: { price: 199000, includedInPlans: ['Professional', 'Enterprise'] },
      tables: { price: 99000, includedInPlans: ['Professional', 'Enterprise'] },
      reservations: { price: 99000, includedInPlans: ['Professional', 'Enterprise'] },
      hris: { price: 499000, perUser: true, includedInPlans: ['Enterprise'] },
      sfa: { price: 399000, perUser: true, includedInPlans: ['Enterprise'] },
      crm: { price: 299000, includedInPlans: ['Enterprise'] },
      marketing: { price: 299000, includedInPlans: ['Enterprise'] },
      manufacturing: { price: 599000, includedInPlans: ['Enterprise'] },
      project_management: { price: 299000, includedInPlans: ['Enterprise'] },
      eprocurement: { price: 399000, includedInPlans: ['Enterprise'] },
      export_import: { price: 499000, includedInPlans: ['Enterprise'] },
      fleet: { price: 349000, perBranch: true, includedInPlans: ['Enterprise'] },
      loyalty: { price: 199000, includedInPlans: ['Professional', 'Enterprise'] },
      fnb: { price: 249000, includedInPlans: ['Professional', 'Enterprise'] },
      reports: { price: 0, includedInPlans: ['Starter', 'Professional', 'Enterprise'] },
    };

    const rows = modules
      .filter((m) => priceMap[m.code])
      .map((m) => {
        const cfg = priceMap[m.code];
        return {
          id: Sequelize.fn('gen_random_uuid'),
          module_id: m.id,
          price: cfg.price,
          currency: 'IDR',
          billing_interval: 'monthly',
          per_user: cfg.perUser || false,
          per_branch: cfg.perBranch || false,
          included_in_plans: JSON.stringify(cfg.includedInPlans || []),
          trial_days: 14,
          is_active: true,
          yearly_discount_percent: 20,
          metadata: JSON.stringify({ source: 'seed-default' }),
          created_at: new Date(),
          updated_at: new Date()
        };
      });

    if (rows.length === 0) {
      console.log('No matching modules for pricing map');
      return;
    }

    // Use raw INSERT so we can call gen_random_uuid safely; fallback to plain uuid if unsupported
    try {
      await queryInterface.bulkInsert(
        'module_pricing',
        rows.map((r) => ({
          ...r,
          id: undefined
        }))
      );
    } catch (err) {
      console.warn('bulkInsert failed, using raw SQL fallback:', err.message);
      for (const r of rows) {
        await queryInterface.sequelize.query(
          `INSERT INTO module_pricing (module_id, price, currency, billing_interval, per_user, per_branch, included_in_plans, trial_days, is_active, yearly_discount_percent, metadata, created_at, updated_at)
           VALUES (:module_id, :price, :currency, :billing_interval, :per_user, :per_branch, :included_in_plans::jsonb, :trial_days, :is_active, :yearly_discount_percent, :metadata::jsonb, NOW(), NOW())
           ON CONFLICT DO NOTHING`,
          { replacements: r }
        );
      }
    }

    console.log(`✅ Seeded ${rows.length} module pricing entries`);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('module_pricing', null);
  }
};
