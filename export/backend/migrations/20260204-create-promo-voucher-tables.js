'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create promos table
    await queryInterface.createTable('promos', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Nama promo'
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Kode promo unik'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Deskripsi promo'
      },
      type: {
        type: Sequelize.ENUM('percentage', 'fixed'),
        allowNull: false,
        defaultValue: 'percentage',
        comment: 'Tipe diskon: percentage atau fixed amount'
      },
      value: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Nilai diskon (persentase atau nominal)'
      },
      minPurchase: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Minimum pembelian untuk menggunakan promo'
      },
      maxDiscount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Maximum diskon yang bisa didapat (untuk percentage)'
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Tanggal mulai promo'
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Tanggal berakhir promo'
      },
      usageLimit: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Batas penggunaan promo (null = unlimited)'
      },
      usageCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Jumlah penggunaan promo'
      },
      perUserLimit: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Batas penggunaan per user (null = unlimited)'
      },
      applicableProducts: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of product IDs yang berlaku (null = all products)'
      },
      applicableCategories: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of category IDs yang berlaku (null = all categories)'
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'expired'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Status promo'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Create vouchers table
    await queryInterface.createTable('vouchers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Kode voucher unik'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Deskripsi voucher'
      },
      category: {
        type: Sequelize.ENUM('welcome', 'member', 'birthday', 'referral', 'seasonal', 'custom'),
        allowNull: false,
        defaultValue: 'custom',
        comment: 'Kategori voucher'
      },
      type: {
        type: Sequelize.ENUM('percentage', 'fixed'),
        allowNull: false,
        defaultValue: 'fixed',
        comment: 'Tipe diskon: percentage atau fixed amount'
      },
      value: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Nilai diskon (persentase atau nominal)'
      },
      minPurchase: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Minimum pembelian untuk menggunakan voucher'
      },
      maxDiscount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Maximum diskon yang bisa didapat (untuk percentage)'
      },
      validFrom: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'Tanggal mulai berlaku'
      },
      validUntil: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Tanggal berakhir voucher'
      },
      usageLimit: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Batas total penggunaan voucher (null = unlimited)'
      },
      usageCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Jumlah penggunaan voucher'
      },
      perUserLimit: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 1,
        comment: 'Batas penggunaan per user (null = unlimited)'
      },
      applicableFor: {
        type: Sequelize.ENUM('all', 'new_customer', 'existing_customer', 'specific_customer'),
        allowNull: false,
        defaultValue: 'all',
        comment: 'Berlaku untuk siapa'
      },
      specificCustomers: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of customer IDs jika applicableFor = specific_customer'
      },
      applicableProducts: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of product IDs yang berlaku (null = all products)'
      },
      applicableCategories: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of category IDs yang berlaku (null = all categories)'
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'expired'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Status voucher'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for promos
    await queryInterface.addIndex('promos', ['code'], {
      unique: true,
      name: 'promos_code_unique'
    });
    await queryInterface.addIndex('promos', ['status'], {
      name: 'promos_status_index'
    });
    await queryInterface.addIndex('promos', ['startDate', 'endDate'], {
      name: 'promos_dates_index'
    });

    // Add indexes for vouchers
    await queryInterface.addIndex('vouchers', ['code'], {
      unique: true,
      name: 'vouchers_code_unique'
    });
    await queryInterface.addIndex('vouchers', ['category'], {
      name: 'vouchers_category_index'
    });
    await queryInterface.addIndex('vouchers', ['status'], {
      name: 'vouchers_status_index'
    });
    await queryInterface.addIndex('vouchers', ['validFrom', 'validUntil'], {
      name: 'vouchers_dates_index'
    });

    // Insert default promos
    await queryInterface.bulkInsert('promos', [
      {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Diskon Akhir Tahun',
        code: 'NEWYEAR2026',
        description: 'Diskon spesial untuk menyambut tahun baru 2026',
        type: 'percentage',
        value: 20.00,
        minPurchase: 100000.00,
        maxDiscount: 50000.00,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-31'),
        usageLimit: 100,
        usageCount: 0,
        perUserLimit: 1,
        applicableProducts: null,
        applicableCategories: null,
        status: 'active',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Gratis Ongkir',
        code: 'FREESHIPJAN',
        description: 'Gratis ongkir untuk pembelian minimal Rp 50.000',
        type: 'fixed',
        value: 15000.00,
        minPurchase: 50000.00,
        maxDiscount: 15000.00,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-31'),
        usageLimit: 500,
        usageCount: 0,
        perUserLimit: 3,
        applicableProducts: null,
        applicableCategories: null,
        status: 'active',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        name: 'Cashback 10%',
        code: 'CASHBACK10',
        description: 'Cashback 10% untuk pembelian minimal Rp 200.000',
        type: 'percentage',
        value: 10.00,
        minPurchase: 200000.00,
        maxDiscount: 100000.00,
        startDate: new Date('2026-01-15'),
        endDate: new Date('2026-02-15'),
        usageLimit: 200,
        usageCount: 0,
        perUserLimit: 2,
        applicableProducts: null,
        applicableCategories: null,
        status: 'active',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);

    // Insert default vouchers
    await queryInterface.bulkInsert('vouchers', [
      {
        id: '00000000-0000-0000-0000-000000000011',
        code: 'WELCOME50K',
        description: 'Voucher selamat datang untuk pelanggan baru',
        category: 'welcome',
        type: 'fixed',
        value: 50000.00,
        minPurchase: 250000.00,
        maxDiscount: null,
        validFrom: new Date(),
        validUntil: new Date('2026-12-31'),
        usageLimit: 1000,
        usageCount: 0,
        perUserLimit: 1,
        applicableFor: 'new_customer',
        specificCustomers: null,
        applicableProducts: null,
        applicableCategories: null,
        status: 'active',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '00000000-0000-0000-0000-000000000012',
        code: 'MEMBER20',
        description: 'Diskon 20% untuk member setia',
        category: 'member',
        type: 'percentage',
        value: 20.00,
        minPurchase: 100000.00,
        maxDiscount: 200000.00,
        validFrom: new Date(),
        validUntil: new Date('2026-06-30'),
        usageLimit: null,
        usageCount: 0,
        perUserLimit: null,
        applicableFor: 'existing_customer',
        specificCustomers: null,
        applicableProducts: null,
        applicableCategories: null,
        status: 'active',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '00000000-0000-0000-0000-000000000013',
        code: 'BIRTHDAY100K',
        description: 'Voucher ulang tahun spesial',
        category: 'birthday',
        type: 'fixed',
        value: 100000.00,
        minPurchase: 500000.00,
        maxDiscount: null,
        validFrom: new Date(),
        validUntil: new Date('2026-12-31'),
        usageLimit: 500,
        usageCount: 0,
        perUserLimit: 1,
        applicableFor: 'all',
        specificCustomers: null,
        applicableProducts: null,
        applicableCategories: null,
        status: 'active',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('vouchers');
    await queryInterface.dropTable('promos');
  }
};
