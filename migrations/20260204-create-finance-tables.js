'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create finance_accounts table
    await queryInterface.createTable('finance_accounts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      accountNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Nomor akun keuangan'
      },
      accountName: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Nama akun'
      },
      accountType: {
        type: Sequelize.ENUM('asset', 'liability', 'equity', 'revenue', 'expense'),
        allowNull: false,
        comment: 'Tipe akun'
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Kategori akun'
      },
      parentAccountId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'finance_accounts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Parent account'
      },
      balance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Saldo akun'
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'IDR',
        comment: 'Mata uang'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Deskripsi akun'
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

    // Create finance_transactions table
    await queryInterface.createTable('finance_transactions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      transactionNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Nomor transaksi unik'
      },
      transactionDate: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Tanggal transaksi'
      },
      transactionType: {
        type: Sequelize.ENUM('income', 'expense', 'transfer'),
        allowNull: false,
        comment: 'Tipe transaksi'
      },
      accountId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'finance_accounts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Akun terkait'
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Kategori transaksi'
      },
      subcategory: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Sub-kategori'
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Jumlah transaksi'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Deskripsi'
      },
      referenceType: {
        type: Sequelize.ENUM('invoice', 'bill', 'order', 'manual', 'other'),
        allowNull: true,
        comment: 'Tipe referensi'
      },
      referenceId: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'ID referensi'
      },
      paymentMethod: {
        type: Sequelize.ENUM('cash', 'bank_transfer', 'credit_card', 'debit_card', 'e_wallet', 'other'),
        allowNull: true,
        comment: 'Metode pembayaran'
      },
      contactId: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'ID kontak'
      },
      contactName: {
        type: Sequelize.STRING(200),
        allowNull: true,
        comment: 'Nama kontak'
      },
      attachments: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Attachments'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Catatan'
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Tags'
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'completed',
        comment: 'Status'
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Created by user'
      },
      isRecurring: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Recurring transaction'
      },
      recurringPattern: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Recurring pattern'
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

    // Create finance_budgets table
    await queryInterface.createTable('finance_budgets', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      budgetName: {
        type: Sequelize.STRING(200),
        allowNull: false,
        comment: 'Nama budget'
      },
      budgetPeriod: {
        type: Sequelize.ENUM('monthly', 'quarterly', 'yearly'),
        allowNull: false,
        comment: 'Periode budget'
      },
      startDate: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Tanggal mulai'
      },
      endDate: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Tanggal akhir'
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Kategori'
      },
      accountId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'finance_accounts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Akun terkait'
      },
      budgetAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Jumlah budget'
      },
      spentAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Jumlah terpakai'
      },
      remainingAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Sisa budget'
      },
      alertThreshold: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 80,
        comment: 'Alert threshold %'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Deskripsi'
      },
      status: {
        type: Sequelize.ENUM('active', 'completed', 'exceeded', 'cancelled'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Status'
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

    // Add indexes for finance_accounts
    await queryInterface.addIndex('finance_accounts', ['accountNumber'], {
      unique: true,
      name: 'finance_accounts_account_number_unique'
    });
    await queryInterface.addIndex('finance_accounts', ['accountType'], {
      name: 'finance_accounts_account_type_index'
    });
    await queryInterface.addIndex('finance_accounts', ['category'], {
      name: 'finance_accounts_category_index'
    });

    // Add indexes for finance_transactions
    await queryInterface.addIndex('finance_transactions', ['transactionNumber'], {
      unique: true,
      name: 'finance_transactions_transaction_number_unique'
    });
    await queryInterface.addIndex('finance_transactions', ['transactionDate'], {
      name: 'finance_transactions_transaction_date_index'
    });
    await queryInterface.addIndex('finance_transactions', ['transactionType'], {
      name: 'finance_transactions_transaction_type_index'
    });
    await queryInterface.addIndex('finance_transactions', ['accountId'], {
      name: 'finance_transactions_account_id_index'
    });
    await queryInterface.addIndex('finance_transactions', ['category'], {
      name: 'finance_transactions_category_index'
    });
    await queryInterface.addIndex('finance_transactions', ['status'], {
      name: 'finance_transactions_status_index'
    });

    // Add indexes for finance_budgets
    await queryInterface.addIndex('finance_budgets', ['budgetPeriod'], {
      name: 'finance_budgets_budget_period_index'
    });
    await queryInterface.addIndex('finance_budgets', ['category'], {
      name: 'finance_budgets_category_index'
    });
    await queryInterface.addIndex('finance_budgets', ['status'], {
      name: 'finance_budgets_status_index'
    });
    await queryInterface.addIndex('finance_budgets', ['startDate', 'endDate'], {
      name: 'finance_budgets_date_range_index'
    });

    // Insert default accounts
    const now = new Date();
    await queryInterface.bulkInsert('finance_accounts', [
      // Assets
      {
        id: '00000000-0000-0000-0000-000000000001',
        accountNumber: '1-1000',
        accountName: 'Kas',
        accountType: 'asset',
        category: 'Cash',
        balance: 50000000,
        currency: 'IDR',
        description: 'Kas di tangan',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        accountNumber: '1-1100',
        accountName: 'Bank BCA',
        accountType: 'asset',
        category: 'Bank',
        balance: 150000000,
        currency: 'IDR',
        description: 'Rekening Bank BCA',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        accountNumber: '1-1200',
        accountName: 'Piutang Usaha',
        accountType: 'asset',
        category: 'Receivables',
        balance: 75000000,
        currency: 'IDR',
        description: 'Piutang dari pelanggan',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      // Liabilities
      {
        id: '00000000-0000-0000-0000-000000000004',
        accountNumber: '2-1000',
        accountName: 'Hutang Usaha',
        accountType: 'liability',
        category: 'Payables',
        balance: 50000000,
        currency: 'IDR',
        description: 'Hutang kepada supplier',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      // Revenue
      {
        id: '00000000-0000-0000-0000-000000000005',
        accountNumber: '4-1000',
        accountName: 'Pendapatan Penjualan',
        accountType: 'revenue',
        category: 'Sales',
        balance: 0,
        currency: 'IDR',
        description: 'Pendapatan dari penjualan',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      // Expenses
      {
        id: '00000000-0000-0000-0000-000000000006',
        accountNumber: '5-1000',
        accountName: 'Beban Operasional',
        accountType: 'expense',
        category: 'Operating',
        balance: 0,
        currency: 'IDR',
        description: 'Beban operasional',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: '00000000-0000-0000-0000-000000000007',
        accountNumber: '5-2000',
        accountName: 'Beban Gaji',
        accountType: 'expense',
        category: 'Salary',
        balance: 0,
        currency: 'IDR',
        description: 'Beban gaji karyawan',
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    ]);

    // Insert sample transactions
    await queryInterface.bulkInsert('finance_transactions', [
      {
        id: '10000000-0000-0000-0000-000000000001',
        transactionNumber: 'TRX-2026-001',
        transactionDate: new Date('2026-02-01'),
        transactionType: 'income',
        accountId: '00000000-0000-0000-0000-000000000002',
        category: 'Sales',
        subcategory: 'Product Sales',
        amount: 25000000,
        description: 'Penjualan produk bulan Februari',
        paymentMethod: 'bank_transfer',
        contactName: 'PT. Customer ABC',
        status: 'completed',
        isRecurring: false,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: '10000000-0000-0000-0000-000000000002',
        transactionNumber: 'TRX-2026-002',
        transactionDate: new Date('2026-02-02'),
        transactionType: 'expense',
        accountId: '00000000-0000-0000-0000-000000000006',
        category: 'Operating',
        subcategory: 'Office Supplies',
        amount: 5000000,
        description: 'Pembelian perlengkapan kantor',
        paymentMethod: 'cash',
        contactName: 'Toko Perlengkapan',
        status: 'completed',
        isRecurring: false,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: '10000000-0000-0000-0000-000000000003',
        transactionNumber: 'TRX-2026-003',
        transactionDate: new Date('2026-02-03'),
        transactionType: 'expense',
        accountId: '00000000-0000-0000-0000-000000000007',
        category: 'Salary',
        subcategory: 'Monthly Salary',
        amount: 30000000,
        description: 'Gaji karyawan bulan Februari',
        paymentMethod: 'bank_transfer',
        status: 'completed',
        isRecurring: true,
        recurringPattern: JSON.stringify({ frequency: 'monthly', dayOfMonth: 25 }),
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    ]);

    // Insert sample budgets
    await queryInterface.bulkInsert('finance_budgets', [
      {
        id: '20000000-0000-0000-0000-000000000001',
        budgetName: 'Budget Operasional Februari 2026',
        budgetPeriod: 'monthly',
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-02-28'),
        category: 'Operating',
        accountId: '00000000-0000-0000-0000-000000000006',
        budgetAmount: 50000000,
        spentAmount: 5000000,
        remainingAmount: 45000000,
        alertThreshold: 80,
        description: 'Budget untuk operasional bulan Februari',
        status: 'active',
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: '20000000-0000-0000-0000-000000000002',
        budgetName: 'Budget Gaji Q1 2026',
        budgetPeriod: 'quarterly',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
        category: 'Salary',
        accountId: '00000000-0000-0000-0000-000000000007',
        budgetAmount: 100000000,
        spentAmount: 30000000,
        remainingAmount: 70000000,
        alertThreshold: 80,
        description: 'Budget gaji Q1 2026',
        status: 'active',
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('finance_budgets');
    await queryInterface.dropTable('finance_transactions');
    await queryInterface.dropTable('finance_accounts');
  }
};
