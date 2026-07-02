'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Currencies
    await queryInterface.createTable('sfa_currencies', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      code: { type: Sequelize.STRING(10), allowNull: false },          // IDR, USD, EUR
      name: { type: Sequelize.STRING(100), allowNull: false },         // Indonesian Rupiah
      symbol: { type: Sequelize.STRING(10), defaultValue: '' },        // Rp, $, €
      decimal_places: { type: Sequelize.INTEGER, defaultValue: 2 },
      thousand_separator: { type: Sequelize.STRING(5), defaultValue: '.' },
      decimal_separator: { type: Sequelize.STRING(5), defaultValue: ',' },
      symbol_position: { type: Sequelize.STRING(10), defaultValue: 'before' }, // before / after
      is_default: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      sort_order: { type: Sequelize.INTEGER, defaultValue: 0 },
      created_by: { type: Sequelize.INTEGER },
      updated_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    // 2. Exchange Rates
    await queryInterface.createTable('sfa_exchange_rates', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      from_currency: { type: Sequelize.STRING(10), allowNull: false },
      to_currency: { type: Sequelize.STRING(10), allowNull: false },
      rate: { type: Sequelize.DECIMAL(18, 6), allowNull: false },
      effective_date: { type: Sequelize.DATEONLY, allowNull: false },
      expiry_date: { type: Sequelize.DATEONLY },
      source: { type: Sequelize.STRING(50), defaultValue: 'manual' },  // manual, api, bank
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      notes: { type: Sequelize.TEXT },
      created_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    // 3. Tax Settings
    await queryInterface.createTable('sfa_tax_settings', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      code: { type: Sequelize.STRING(30), allowNull: false },         // PPN, PPH23
      name: { type: Sequelize.STRING(100), allowNull: false },        // PPN 11%
      tax_type: { type: Sequelize.STRING(30), defaultValue: 'vat' },  // vat, income, withholding, service
      rate: { type: Sequelize.DECIMAL(8, 4), defaultValue: 0 },       // 11.0000
      is_inclusive: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_compound: { type: Sequelize.BOOLEAN, defaultValue: false },
      applies_to: { type: Sequelize.STRING(30), defaultValue: 'all' }, // all, product, service
      effective_from: { type: Sequelize.DATEONLY },
      effective_to: { type: Sequelize.DATEONLY },
      is_default: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      sort_order: { type: Sequelize.INTEGER, defaultValue: 0 },
      created_by: { type: Sequelize.INTEGER },
      updated_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    // 4. Numbering Formats
    await queryInterface.createTable('sfa_numbering_formats', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      entity_type: { type: Sequelize.STRING(50), allowNull: false },   // quotation, field_order, invoice, lead
      prefix: { type: Sequelize.STRING(20), defaultValue: '' },       // QT, FO, INV, LD
      suffix: { type: Sequelize.STRING(20), defaultValue: '' },
      separator: { type: Sequelize.STRING(5), defaultValue: '-' },
      date_format: { type: Sequelize.STRING(20), defaultValue: 'YYYYMM' }, // YYYYMM, YYMM, YYYY, none
      counter_length: { type: Sequelize.INTEGER, defaultValue: 4 },    // zero-padded: 0001
      current_counter: { type: Sequelize.INTEGER, defaultValue: 0 },
      reset_period: { type: Sequelize.STRING(20), defaultValue: 'monthly' }, // monthly, yearly, never
      last_reset_date: { type: Sequelize.DATEONLY },
      sample_output: { type: Sequelize.STRING(100), defaultValue: '' },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_by: { type: Sequelize.INTEGER },
      updated_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    // 5. Payment Terms
    await queryInterface.createTable('sfa_payment_terms', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      code: { type: Sequelize.STRING(30), allowNull: false },         // NET30, COD, CBD
      name: { type: Sequelize.STRING(100), allowNull: false },
      description: { type: Sequelize.TEXT },
      days_due: { type: Sequelize.INTEGER, defaultValue: 0 },          // jumlah hari jatuh tempo
      discount_days: { type: Sequelize.INTEGER, defaultValue: 0 },     // jika bayar dalam X hari
      discount_percentage: { type: Sequelize.DECIMAL(5, 2), defaultValue: 0 }, // diskon early payment
      late_fee_type: { type: Sequelize.STRING(20), defaultValue: 'none' }, // none, flat, percentage
      late_fee_value: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      is_default: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      sort_order: { type: Sequelize.INTEGER, defaultValue: 0 },
      created_by: { type: Sequelize.INTEGER },
      updated_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    // 6. General Business Settings (key-value)
    await queryInterface.createTable('sfa_business_settings', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      tenant_id: { type: Sequelize.UUID },
      category: { type: Sequelize.STRING(50), allowNull: false },    // general, sales, commission, notification, approval
      setting_key: { type: Sequelize.STRING(100), allowNull: false },
      setting_value: { type: Sequelize.TEXT },
      setting_type: { type: Sequelize.STRING(20), defaultValue: 'string' }, // string, number, boolean, json
      label: { type: Sequelize.STRING(200) },
      description: { type: Sequelize.TEXT },
      is_system: { type: Sequelize.BOOLEAN, defaultValue: false },
      updated_by: { type: Sequelize.INTEGER },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sfa_business_settings');
    await queryInterface.dropTable('sfa_payment_terms');
    await queryInterface.dropTable('sfa_numbering_formats');
    await queryInterface.dropTable('sfa_tax_settings');
    await queryInterface.dropTable('sfa_exchange_rates');
    await queryInterface.dropTable('sfa_currencies');
  }
};
