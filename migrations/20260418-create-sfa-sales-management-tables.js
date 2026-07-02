'use strict';

/**
 * SFA Sales Management Tables
 *
 * Mendukung pencatatan penjualan terupdated untuk industri retail, FMCG,
 * dan direct sales. Mencakup:
 *  - sfa_sales_entries         : catatan penjualan aktual (primary/secondary/direct)
 *                                per tanggal/periode, per outlet, per item/group produk,
 *                                per salesperson/tim/territory.
 *  - sfa_outlet_growth_targets : target pertumbuhan outlet (active, new, productive)
 *                                untuk tracking "outlet transaksi" vs target.
 *  - sfa_sales_item_targets    : target penjualan per item produk (extension ringan,
 *                                melengkapi sfa_outlet_targets yang sudah ada).
 *
 * Kolom actual pada tabel target diisi secara on-demand saat query analytics
 * (atau dapat juga diupdate via job/aggregator).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ------------------------------------------------------------------
    // 1. sfa_sales_entries — master catatan penjualan aktual
    // ------------------------------------------------------------------
    await queryInterface.createTable('sfa_sales_entries', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },

      // Periode & tanggal
      entry_date: { type: Sequelize.DATEONLY, allowNull: false },
      period: { type: Sequelize.STRING(7), allowNull: false },   // YYYY-MM
      year: { type: Sequelize.INTEGER, allowNull: false },
      week_number: { type: Sequelize.INTEGER },

      // Klasifikasi penjualan (penting utk FMCG)
      // primary   = distributor / HQ jual ke outlet (sell-in)
      // secondary = outlet jual ke konsumen akhir (sell-out / sell-through)
      // direct    = direct sales door-to-door / B2B langsung
      sales_type: { type: Sequelize.STRING(20), defaultValue: 'primary' },

      // Sumber data
      source: { type: Sequelize.STRING(20), defaultValue: 'manual' }, // manual, pos, field_order, import, api
      reference_type: { type: Sequelize.STRING(30) },                  // field_order, pos_transaction, manual
      reference_id: { type: Sequelize.STRING(64) },
      reference_number: { type: Sequelize.STRING(64) },

      // Aktor
      salesperson_id: { type: Sequelize.INTEGER },
      salesperson_name: { type: Sequelize.STRING(160) },
      team_id: { type: Sequelize.INTEGER },
      territory_id: { type: Sequelize.INTEGER },
      branch_id: { type: Sequelize.INTEGER },

      // Outlet / customer
      outlet_id: { type: Sequelize.STRING(64) },
      outlet_code: { type: Sequelize.STRING(64) },
      outlet_name: { type: Sequelize.STRING(200) },
      outlet_class: { type: Sequelize.STRING(30) },       // A/B/C/D atau general/gold/silver
      outlet_channel: { type: Sequelize.STRING(30) },     // modern_trade, general_trade, horeca, ecommerce, wholesale
      outlet_city: { type: Sequelize.STRING(100) },
      outlet_province: { type: Sequelize.STRING(100) },

      // Produk
      product_id: { type: Sequelize.STRING(64) },
      product_sku: { type: Sequelize.STRING(80) },
      product_name: { type: Sequelize.STRING(200) },
      product_group: { type: Sequelize.STRING(120) },     // category / product group
      product_brand: { type: Sequelize.STRING(120) },
      product_uom: { type: Sequelize.STRING(20), defaultValue: 'pcs' },

      // Nilai
      quantity: { type: Sequelize.DECIMAL(18, 3), defaultValue: 0 },
      unit_price: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      gross_amount: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      discount_amount: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      tax_amount: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      net_amount: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      currency: { type: Sequelize.STRING(10), defaultValue: 'IDR' },

      // Status penjualan (draft -> confirmed -> invoiced -> paid / cancelled / returned)
      status: { type: Sequelize.STRING(20), defaultValue: 'confirmed' },
      is_return: { type: Sequelize.BOOLEAN, defaultValue: false },

      // Promo / bundle flag
      promo_code: { type: Sequelize.STRING(50) },

      notes: { type: Sequelize.TEXT },

      created_by: { type: Sequelize.INTEGER },
      updated_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('sfa_sales_entries', ['tenant_id', 'period']);
    await queryInterface.addIndex('sfa_sales_entries', ['tenant_id', 'entry_date']);
    await queryInterface.addIndex('sfa_sales_entries', ['tenant_id', 'salesperson_id']);
    await queryInterface.addIndex('sfa_sales_entries', ['tenant_id', 'outlet_id']);
    await queryInterface.addIndex('sfa_sales_entries', ['tenant_id', 'product_id']);
    await queryInterface.addIndex('sfa_sales_entries', ['tenant_id', 'product_group']);
    await queryInterface.addIndex('sfa_sales_entries', ['tenant_id', 'sales_type']);

    // ------------------------------------------------------------------
    // 2. sfa_outlet_growth_targets — target pertumbuhan outlet
    // ------------------------------------------------------------------
    await queryInterface.createTable('sfa_outlet_growth_targets', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },

      code: { type: Sequelize.STRING(50), allowNull: false },
      name: { type: Sequelize.STRING(160), allowNull: false },

      // Scope: global, branch, territory, team, salesperson
      scope_type: { type: Sequelize.STRING(20), defaultValue: 'global' },
      scope_id: { type: Sequelize.STRING(64) },
      scope_name: { type: Sequelize.STRING(160) },

      // Periode
      period_type: { type: Sequelize.STRING(20), defaultValue: 'monthly' }, // monthly, quarterly, yearly
      period: { type: Sequelize.STRING(10), allowNull: false },             // YYYY-MM atau YYYY-Qn
      year: { type: Sequelize.INTEGER, allowNull: false },

      // Metrik target
      target_active_outlets: { type: Sequelize.INTEGER, defaultValue: 0 },     // # outlet bertransaksi pada periode
      target_new_outlets: { type: Sequelize.INTEGER, defaultValue: 0 },        // # outlet baru yang di-onboard
      target_productive_outlets: { type: Sequelize.INTEGER, defaultValue: 0 }, // # outlet dgn transaksi >= threshold
      target_registered_outlets: { type: Sequelize.INTEGER, defaultValue: 0 }, // # outlet terdaftar (universe)
      productive_threshold: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 }, // min total value utk disebut produktif

      // Target growth rate dibanding periode sebelumnya (opsional)
      growth_rate_target: { type: Sequelize.DECIMAL(8, 2), defaultValue: 0 },  // dalam %

      // Aktual (akan di-refresh via trigger / job / on-demand query)
      actual_active_outlets: { type: Sequelize.INTEGER, defaultValue: 0 },
      actual_new_outlets: { type: Sequelize.INTEGER, defaultValue: 0 },
      actual_productive_outlets: { type: Sequelize.INTEGER, defaultValue: 0 },
      actual_registered_outlets: { type: Sequelize.INTEGER, defaultValue: 0 },
      actual_growth_rate: { type: Sequelize.DECIMAL(8, 2), defaultValue: 0 },

      status: { type: Sequelize.STRING(20), defaultValue: 'active' },
      notes: { type: Sequelize.TEXT },

      created_by: { type: Sequelize.INTEGER },
      updated_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('sfa_outlet_growth_targets', ['tenant_id', 'period']);
    await queryInterface.addIndex('sfa_outlet_growth_targets', ['tenant_id', 'scope_type', 'scope_id']);

    // ------------------------------------------------------------------
    // 3. sfa_sales_item_targets — target penjualan per item & per group
    //    (melengkapi sfa_outlet_targets yang fokus ke tier bonus outlet)
    // ------------------------------------------------------------------
    await queryInterface.createTable('sfa_sales_item_targets', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },

      code: { type: Sequelize.STRING(50), allowNull: false },
      name: { type: Sequelize.STRING(200), allowNull: false },

      // Level: global, product, product_group, brand
      target_level: { type: Sequelize.STRING(20), defaultValue: 'product' },
      product_id: { type: Sequelize.STRING(64) },
      product_sku: { type: Sequelize.STRING(80) },
      product_name: { type: Sequelize.STRING(200) },
      product_group: { type: Sequelize.STRING(120) },
      product_brand: { type: Sequelize.STRING(120) },

      // Scope
      scope_type: { type: Sequelize.STRING(20), defaultValue: 'global' }, // global, branch, territory, team, salesperson
      scope_id: { type: Sequelize.STRING(64) },
      scope_name: { type: Sequelize.STRING(160) },

      // Period
      period_type: { type: Sequelize.STRING(20), defaultValue: 'monthly' },
      period: { type: Sequelize.STRING(10), allowNull: false },
      year: { type: Sequelize.INTEGER, allowNull: false },

      // Metrik
      target_type: { type: Sequelize.STRING(20), defaultValue: 'value' }, // value, quantity, both
      target_quantity: { type: Sequelize.DECIMAL(18, 3), defaultValue: 0 },
      target_value: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      currency: { type: Sequelize.STRING(10), defaultValue: 'IDR' },

      actual_quantity: { type: Sequelize.DECIMAL(18, 3), defaultValue: 0 },
      actual_value: { type: Sequelize.DECIMAL(18, 2), defaultValue: 0 },
      achievement_pct: { type: Sequelize.DECIMAL(8, 2), defaultValue: 0 },

      status: { type: Sequelize.STRING(20), defaultValue: 'active' },
      notes: { type: Sequelize.TEXT },

      created_by: { type: Sequelize.INTEGER },
      updated_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('sfa_sales_item_targets', ['tenant_id', 'period']);
    await queryInterface.addIndex('sfa_sales_item_targets', ['tenant_id', 'target_level']);
    await queryInterface.addIndex('sfa_sales_item_targets', ['tenant_id', 'product_group']);
    await queryInterface.addIndex('sfa_sales_item_targets', ['tenant_id', 'scope_type', 'scope_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sfa_sales_item_targets');
    await queryInterface.dropTable('sfa_outlet_growth_targets');
    await queryInterface.dropTable('sfa_sales_entries');
  },
};
