'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('suppliers', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      company_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      supplier_type: {
        type: Sequelize.ENUM('manufacturer', 'distributor', 'wholesaler', 'retailer', 'other'),
        defaultValue: 'distributor'
      },
      contact_person: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      email: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      province: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      postal_code: {
        type: Sequelize.STRING(10),
        allowNull: true
      },
      country: {
        type: Sequelize.STRING(100),
        defaultValue: 'Indonesia'
      },
      tax_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'NPWP atau Tax ID'
      },
      payment_terms: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'e.g., "Net 30", "COD", "Net 60"'
      },
      payment_method: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'e.g., "Transfer", "Cash", "Credit"'
      },
      credit_limit: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      current_balance: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'IDR'
      },
      lead_time_days: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Default lead time untuk supplier ini'
      },
      minimum_order_value: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      rating: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0,
        comment: 'Rating supplier (0-5)'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      is_preferred: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Supplier pilihan utama'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      bank_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      bank_account_number: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      bank_account_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      website: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('suppliers', ['code']);
    await queryInterface.addIndex('suppliers', ['name']);
    await queryInterface.addIndex('suppliers', ['supplier_type']);
    await queryInterface.addIndex('suppliers', ['is_active']);
    await queryInterface.addIndex('suppliers', ['is_preferred']);

    // Insert sample suppliers
    await queryInterface.bulkInsert('suppliers', [
      {
        code: 'SUP-001',
        name: 'PT Bahan Baku Nusantara',
        company_name: 'PT Bahan Baku Nusantara',
        supplier_type: 'manufacturer',
        contact_person: 'Budi Santoso',
        phone: '021-12345678',
        email: 'info@bahanbaku.com',
        address: 'Jl. Industri No. 123',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        payment_terms: 'Net 30',
        lead_time_days: 7,
        is_active: true,
        is_preferred: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        code: 'SUP-002',
        name: 'CV Distributor Makanan',
        company_name: 'CV Distributor Makanan Sejahtera',
        supplier_type: 'distributor',
        contact_person: 'Siti Rahayu',
        phone: '021-87654321',
        email: 'sales@distributormakanan.com',
        address: 'Jl. Perdagangan No. 456',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        payment_terms: 'Net 14',
        lead_time_days: 3,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        code: 'SUP-003',
        name: 'Toko Grosir Sentosa',
        company_name: 'Toko Grosir Sentosa',
        supplier_type: 'wholesaler',
        contact_person: 'Ahmad Wijaya',
        phone: '021-55667788',
        email: 'sentosa@gmail.com',
        address: 'Jl. Pasar Besar No. 789',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        payment_terms: 'COD',
        lead_time_days: 1,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('suppliers');
  }
};
