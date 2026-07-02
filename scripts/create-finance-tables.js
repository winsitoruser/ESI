const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '.env.development' });

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: console.log
  }
);

async function createFinanceTables() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Create ENUM types first
    console.log('📝 Creating ENUM types...');
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE account_type_enum AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE transaction_type_enum AS ENUM ('income', 'expense', 'transfer');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE reference_type_enum AS ENUM ('invoice', 'bill', 'order', 'manual', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE payment_method_enum AS ENUM ('cash', 'bank_transfer', 'credit_card', 'debit_card', 'e_wallet', 'other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE transaction_status_enum AS ENUM ('pending', 'completed', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE budget_period_enum AS ENUM ('monthly', 'quarterly', 'yearly');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE budget_status_enum AS ENUM ('active', 'completed', 'exceeded', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ ENUM types created\n');

    // Create finance_accounts table
    console.log('📝 Creating finance_accounts table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS finance_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "accountNumber" VARCHAR(50) NOT NULL UNIQUE,
        "accountName" VARCHAR(200) NOT NULL,
        "accountType" account_type_enum NOT NULL,
        category VARCHAR(100),
        "parentAccountId" UUID REFERENCES finance_accounts(id) ON DELETE SET NULL,
        balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
        currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
        description TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ finance_accounts table created\n');

    // Create finance_transactions table
    console.log('📝 Creating finance_transactions table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS finance_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "transactionNumber" VARCHAR(50) NOT NULL UNIQUE,
        "transactionDate" TIMESTAMP NOT NULL,
        "transactionType" transaction_type_enum NOT NULL,
        "accountId" UUID NOT NULL REFERENCES finance_accounts(id) ON DELETE RESTRICT,
        category VARCHAR(100) NOT NULL,
        subcategory VARCHAR(100),
        amount DECIMAL(15, 2) NOT NULL,
        description TEXT,
        "referenceType" reference_type_enum,
        "referenceId" UUID,
        "paymentMethod" payment_method_enum,
        "contactId" UUID,
        "contactName" VARCHAR(200),
        attachments JSON,
        notes TEXT,
        tags JSON,
        status transaction_status_enum NOT NULL DEFAULT 'completed',
        "createdBy" UUID,
        "isRecurring" BOOLEAN NOT NULL DEFAULT false,
        "recurringPattern" JSON,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ finance_transactions table created\n');

    // Create finance_budgets table
    console.log('📝 Creating finance_budgets table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS finance_budgets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "budgetName" VARCHAR(200) NOT NULL,
        "budgetPeriod" budget_period_enum NOT NULL,
        "startDate" TIMESTAMP NOT NULL,
        "endDate" TIMESTAMP NOT NULL,
        category VARCHAR(100) NOT NULL,
        "accountId" UUID REFERENCES finance_accounts(id) ON DELETE SET NULL,
        "budgetAmount" DECIMAL(15, 2) NOT NULL,
        "spentAmount" DECIMAL(15, 2) NOT NULL DEFAULT 0,
        "remainingAmount" DECIMAL(15, 2) NOT NULL DEFAULT 0,
        "alertThreshold" INTEGER NOT NULL DEFAULT 80,
        description TEXT,
        status budget_status_enum NOT NULL DEFAULT 'active',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ finance_budgets table created\n');

    // Create indexes
    console.log('📝 Creating indexes...');
    await sequelize.query('CREATE INDEX IF NOT EXISTS finance_accounts_account_type_index ON finance_accounts("accountType")');
    await sequelize.query('CREATE INDEX IF NOT EXISTS finance_accounts_category_index ON finance_accounts(category)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS finance_transactions_transaction_date_index ON finance_transactions("transactionDate")');
    await sequelize.query('CREATE INDEX IF NOT EXISTS finance_transactions_transaction_type_index ON finance_transactions("transactionType")');
    await sequelize.query('CREATE INDEX IF NOT EXISTS finance_transactions_account_id_index ON finance_transactions("accountId")');
    await sequelize.query('CREATE INDEX IF NOT EXISTS finance_transactions_category_index ON finance_transactions(category)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS finance_transactions_status_index ON finance_transactions(status)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS finance_budgets_budget_period_index ON finance_budgets("budgetPeriod")');
    await sequelize.query('CREATE INDEX IF NOT EXISTS finance_budgets_category_index ON finance_budgets(category)');
    await sequelize.query('CREATE INDEX IF NOT EXISTS finance_budgets_status_index ON finance_budgets(status)');
    console.log('✅ Indexes created\n');

    // Insert default accounts
    console.log('📝 Inserting default accounts...');
    await sequelize.query(`
      INSERT INTO finance_accounts (id, "accountNumber", "accountName", "accountType", category, balance, currency, description, "isActive")
      VALUES 
        ('00000000-0000-0000-0000-000000000001', '1-1000', 'Kas', 'asset', 'Cash', 50000000, 'IDR', 'Kas di tangan', true),
        ('00000000-0000-0000-0000-000000000002', '1-1100', 'Bank BCA', 'asset', 'Bank', 150000000, 'IDR', 'Rekening Bank BCA', true),
        ('00000000-0000-0000-0000-000000000003', '1-1200', 'Piutang Usaha', 'asset', 'Receivables', 75000000, 'IDR', 'Piutang dari pelanggan', true),
        ('00000000-0000-0000-0000-000000000004', '2-1000', 'Hutang Usaha', 'liability', 'Payables', 50000000, 'IDR', 'Hutang kepada supplier', true),
        ('00000000-0000-0000-0000-000000000005', '4-1000', 'Pendapatan Penjualan', 'revenue', 'Sales', 0, 'IDR', 'Pendapatan dari penjualan', true),
        ('00000000-0000-0000-0000-000000000006', '5-1000', 'Beban Operasional', 'expense', 'Operating', 0, 'IDR', 'Beban operasional', true),
        ('00000000-0000-0000-0000-000000000007', '5-2000', 'Beban Gaji', 'expense', 'Salary', 0, 'IDR', 'Beban gaji karyawan', true)
      ON CONFLICT ("accountNumber") DO NOTHING;
    `);
    console.log('✅ Default accounts inserted\n');

    // Insert sample transactions
    console.log('📝 Inserting sample transactions...');
    await sequelize.query(`
      INSERT INTO finance_transactions (id, "transactionNumber", "transactionDate", "transactionType", "accountId", category, subcategory, amount, description, "paymentMethod", "contactName", status, "isRecurring")
      VALUES 
        ('10000000-0000-0000-0000-000000000001', 'TRX-2026-001', '2026-02-01', 'income', '00000000-0000-0000-0000-000000000002', 'Sales', 'Product Sales', 25000000, 'Penjualan produk bulan Februari', 'bank_transfer', 'PT. Customer ABC', 'completed', false),
        ('10000000-0000-0000-0000-000000000002', 'TRX-2026-002', '2026-02-02', 'expense', '00000000-0000-0000-0000-000000000006', 'Operating', 'Office Supplies', 5000000, 'Pembelian perlengkapan kantor', 'cash', 'Toko Perlengkapan', 'completed', false),
        ('10000000-0000-0000-0000-000000000003', 'TRX-2026-003', '2026-02-03', 'expense', '00000000-0000-0000-0000-000000000007', 'Salary', 'Monthly Salary', 30000000, 'Gaji karyawan bulan Februari', 'bank_transfer', 'Karyawan', 'completed', true)
      ON CONFLICT ("transactionNumber") DO NOTHING;
    `);
    console.log('✅ Sample transactions inserted\n');

    // Insert sample budgets
    console.log('📝 Inserting sample budgets...');
    await sequelize.query(`
      INSERT INTO finance_budgets (id, "budgetName", "budgetPeriod", "startDate", "endDate", category, "accountId", "budgetAmount", "spentAmount", "remainingAmount", "alertThreshold", description, status)
      VALUES 
        ('20000000-0000-0000-0000-000000000001', 'Budget Operasional Februari 2026', 'monthly', '2026-02-01', '2026-02-28', 'Operating', '00000000-0000-0000-0000-000000000006', 50000000, 5000000, 45000000, 80, 'Budget untuk operasional bulan Februari', 'active'),
        ('20000000-0000-0000-0000-000000000002', 'Budget Gaji Q1 2026', 'quarterly', '2026-01-01', '2026-03-31', 'Salary', '00000000-0000-0000-0000-000000000007', 100000000, 30000000, 70000000, 80, 'Budget gaji Q1 2026', 'active')
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Sample budgets inserted\n');

    console.log('🎉 Finance tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

createFinanceTables();
