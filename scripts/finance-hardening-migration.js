#!/usr/bin/env node
/**
 * Finance Module Hardening Migration
 * 
 * This script implements:
 * 1. DECIMAL(15,2) → DECIMAL(19,4) precision upgrade for all money columns
 * 2. Double-Entry Bookkeeping: journal_entries + journal_entry_lines tables
 * 3. Budget alerting columns and trigger-ready fields
 * 4. Composite indexes for P/L report performance
 * 5. tenant_id columns where missing
 * 6. Expense type categorization (opex/capex)
 * 7. Revenue recognition basis (accrual/cash) on accounts
 * 8. PPN masukan/keluaran tracking columns on invoices
 * 9. Idempotency key column on finance_invoice_payments
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.development') });

const { Sequelize } = require('sequelize');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || process.env.DB_DATABASE || 'bedagang',
  username: process.env.DB_USER || process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || 'postgres',
  dialect: 'postgres',
  logging: false,
};

const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: dbConfig.dialect,
  logging: false,
});

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = :table AND column_name = :column`,
    { replacements: { table, column } }
  );
  return rows.length > 0;
}

async function tableExists(table) {
  const [rows] = await sequelize.query(
    `SELECT table_name FROM information_schema.tables WHERE table_name = :table AND table_schema = 'public'`,
    { replacements: { table } }
  );
  return rows.length > 0;
}

async function indexExists(indexName) {
  const [rows] = await sequelize.query(
    `SELECT indexname FROM pg_indexes WHERE indexname = :indexName`,
    { replacements: { indexName } }
  );
  return rows.length > 0;
}

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // ─────────────────────────────────────────────
    // 1. DECIMAL PRECISION UPGRADE (15,2) → (19,4)
    // ─────────────────────────────────────────────
    console.log('\n📐 [1/9] Upgrading DECIMAL precision to (19,4)...');
    const moneyColumns = [
      // finance_accounts
      { table: 'finance_accounts', column: 'balance' },
      // finance_transactions
      { table: 'finance_transactions', column: 'amount' },
      // finance_budgets
      { table: 'finance_budgets', column: 'budgetAmount' },
      { table: 'finance_budgets', column: 'spentAmount' },
      { table: 'finance_budgets', column: 'remainingAmount' },
      // finance_receivables
      { table: 'finance_receivables', column: 'totalAmount' },
      { table: 'finance_receivables', column: 'paidAmount' },
      { table: 'finance_receivables', column: 'remainingAmount' },
      // finance_payables
      { table: 'finance_payables', column: 'totalAmount' },
      { table: 'finance_payables', column: 'paidAmount' },
      { table: 'finance_payables', column: 'remainingAmount' },
      // finance_invoices
      { table: 'finance_invoices', column: 'totalAmount' },
      { table: 'finance_invoices', column: 'paidAmount' },
      { table: 'finance_invoices', column: 'remainingAmount' },
      // finance_invoice_items
      { table: 'finance_invoice_items', column: 'price' },
      { table: 'finance_invoice_items', column: 'total' },
      // finance_invoice_payments
      { table: 'finance_invoice_payments', column: 'amount' },
      // finance_receivable_payments
      { table: 'finance_receivable_payments', column: 'amount' },
      // finance_payable_payments
      { table: 'finance_payable_payments', column: 'amount' },
    ];

    for (const { table, column } of moneyColumns) {
      if (await tableExists(table) && await columnExists(table, column)) {
        // Check current type
        const [typeInfo] = await sequelize.query(
          `SELECT numeric_precision, numeric_scale FROM information_schema.columns 
           WHERE table_name = :table AND column_name = :column`,
          { replacements: { table, column } }
        );
        if (typeInfo.length > 0 && (typeInfo[0].numeric_precision < 19 || typeInfo[0].numeric_scale < 4)) {
          await sequelize.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE DECIMAL(19,4)`);
          console.log(`  ✅ ${table}.${column}: DECIMAL(${typeInfo[0].numeric_precision},${typeInfo[0].numeric_scale}) → DECIMAL(19,4)`);
        } else {
          console.log(`  ⏭️  ${table}.${column}: already DECIMAL(19,4)`);
        }
      }
    }

    // ─────────────────────────────────────────────
    // 2. DOUBLE-ENTRY BOOKKEEPING TABLES
    // ─────────────────────────────────────────────
    console.log('\n📒 [2/9] Creating Double-Entry Bookkeeping tables...');
    
    if (!(await tableExists('journal_entries'))) {
      await sequelize.query(`
        CREATE TABLE journal_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID,
          entry_number VARCHAR(50) NOT NULL UNIQUE,
          entry_date DATE NOT NULL,
          description TEXT NOT NULL,
          reference_type VARCHAR(50),
          reference_id UUID,
          status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'voided')),
          total_debit DECIMAL(19,4) NOT NULL DEFAULT 0,
          total_credit DECIMAL(19,4) NOT NULL DEFAULT 0,
          is_balanced BOOLEAN GENERATED ALWAYS AS (total_debit = total_credit) STORED,
          posted_at TIMESTAMPTZ,
          posted_by UUID,
          voided_at TIMESTAMPTZ,
          voided_by UUID,
          void_reason TEXT,
          created_by UUID,
          notes TEXT,
          tags JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      console.log('  ✅ journal_entries table created');
    } else {
      console.log('  ⏭️  journal_entries already exists');
    }

    if (!(await tableExists('journal_entry_lines'))) {
      await sequelize.query(`
        CREATE TABLE journal_entry_lines (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
          account_id UUID NOT NULL,
          account_number VARCHAR(50),
          account_name VARCHAR(200),
          debit DECIMAL(19,4) NOT NULL DEFAULT 0,
          credit DECIMAL(19,4) NOT NULL DEFAULT 0,
          description TEXT,
          line_order INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      console.log('  ✅ journal_entry_lines table created');
    } else {
      console.log('  ⏭️  journal_entry_lines already exists');
    }

    // ─────────────────────────────────────────────
    // 3. BUDGET ALERTING ENHANCEMENTS
    // ─────────────────────────────────────────────
    console.log('\n🔔 [3/9] Adding budget alerting columns...');
    
    if (await tableExists('finance_budgets')) {
      const budgetCols = [
        { col: 'alert_sent_at', sql: `ALTER TABLE finance_budgets ADD COLUMN alert_sent_at TIMESTAMPTZ` },
        { col: 'alert_level', sql: `ALTER TABLE finance_budgets ADD COLUMN alert_level VARCHAR(20) DEFAULT 'none' CHECK (alert_level IN ('none', 'warning', 'critical', 'exceeded'))` },
        { col: 'auto_lock_on_exceed', sql: `ALTER TABLE finance_budgets ADD COLUMN auto_lock_on_exceed BOOLEAN DEFAULT false` },
        { col: 'critical_threshold', sql: `ALTER TABLE finance_budgets ADD COLUMN critical_threshold INTEGER DEFAULT 90` },
        { col: 'tenant_id', sql: `ALTER TABLE finance_budgets ADD COLUMN tenant_id UUID` },
      ];
      for (const { col, sql } of budgetCols) {
        if (!(await columnExists('finance_budgets', col))) {
          await sequelize.query(sql);
          console.log(`  ✅ finance_budgets.${col} added`);
        } else {
          console.log(`  ⏭️  finance_budgets.${col} already exists`);
        }
      }
    }

    // ─────────────────────────────────────────────
    // 4. COMPOSITE INDEXES FOR P/L REPORT PERFORMANCE
    // ─────────────────────────────────────────────
    console.log('\n⚡ [4/9] Adding composite indexes for report performance...');

    const compositeIndexes = [
      // P/L: revenue by tenant+type+date+status
      { name: 'idx_fin_txn_tenant_type_date_status', table: 'finance_transactions',
        sql: `CREATE INDEX IF NOT EXISTS idx_fin_txn_tenant_type_date_status ON finance_transactions (tenant_id, "transactionType", "transactionDate", status)` },
      // P/L: category aggregation
      { name: 'idx_fin_txn_tenant_category_type', table: 'finance_transactions',
        sql: `CREATE INDEX IF NOT EXISTS idx_fin_txn_tenant_category_type ON finance_transactions (tenant_id, category, "transactionType")` },
      // Invoice overdue tracking
      { name: 'idx_fin_inv_status_duedate', table: 'finance_invoices',
        sql: `CREATE INDEX IF NOT EXISTS idx_fin_inv_status_duedate ON finance_invoices (status, "dueDate")` },
      // Budget utilization
      { name: 'idx_fin_budget_tenant_status', table: 'finance_budgets',
        sql: `CREATE INDEX IF NOT EXISTS idx_fin_budget_tenant_status ON finance_budgets (tenant_id, status)` },
      // Journal entry lookup
      { name: 'idx_journal_tenant_date', table: 'journal_entries',
        sql: `CREATE INDEX IF NOT EXISTS idx_journal_tenant_date ON journal_entries (tenant_id, entry_date)` },
      { name: 'idx_journal_ref', table: 'journal_entries',
        sql: `CREATE INDEX IF NOT EXISTS idx_journal_ref ON journal_entries (reference_type, reference_id)` },
      { name: 'idx_journal_lines_entry', table: 'journal_entry_lines',
        sql: `CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_entry_lines (journal_entry_id)` },
      { name: 'idx_journal_lines_account', table: 'journal_entry_lines',
        sql: `CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_entry_lines (account_id)` },
    ];

    for (const idx of compositeIndexes) {
      if (await tableExists(idx.table)) {
        try {
          await sequelize.query(idx.sql);
          console.log(`  ✅ ${idx.name}`);
        } catch (e) {
          console.log(`  ⚠️  ${idx.name}: ${e.message.includes('already exists') ? 'already exists' : e.message}`);
        }
      }
    }

    // ─────────────────────────────────────────────
    // 5. TENANT_ID COLUMNS WHERE MISSING
    // ─────────────────────────────────────────────
    console.log('\n🔒 [5/9] Adding tenant_id columns where missing...');

    const tenantTables = [
      'finance_accounts', 'finance_transactions', 'finance_receivables',
      'finance_payables', 'finance_invoices', 'finance_invoice_payments',
      'finance_receivable_payments', 'finance_payable_payments'
    ];
    for (const table of tenantTables) {
      if (await tableExists(table) && !(await columnExists(table, 'tenant_id'))) {
        await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN tenant_id UUID`);
        await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_${table.replace(/-/g,'_')}_tenant ON "${table}" (tenant_id)`);
        console.log(`  ✅ ${table}.tenant_id added + indexed`);
      } else if (await tableExists(table)) {
        console.log(`  ⏭️  ${table}.tenant_id already exists`);
      }
    }

    // ─────────────────────────────────────────────
    // 6. EXPENSE TYPE: OPEX/CAPEX CATEGORIZATION
    // ─────────────────────────────────────────────
    console.log('\n📊 [6/9] Adding expense_type (opex/capex) to transactions...');
    
    if (await tableExists('finance_transactions')) {
      if (!(await columnExists('finance_transactions', 'expense_type'))) {
        await sequelize.query(`ALTER TABLE finance_transactions ADD COLUMN expense_type VARCHAR(10) CHECK (expense_type IN ('opex', 'capex'))`);
        console.log('  ✅ finance_transactions.expense_type added');
      } else {
        console.log('  ⏭️  finance_transactions.expense_type already exists');
      }
    }

    // ─────────────────────────────────────────────
    // 7. REVENUE RECOGNITION BASIS (ACCRUAL/CASH)
    // ─────────────────────────────────────────────
    console.log('\n💰 [7/9] Adding revenue_recognition_basis to accounts...');
    
    if (await tableExists('finance_accounts')) {
      if (!(await columnExists('finance_accounts', 'recognition_basis'))) {
        await sequelize.query(`ALTER TABLE finance_accounts ADD COLUMN recognition_basis VARCHAR(10) DEFAULT 'accrual' CHECK (recognition_basis IN ('accrual', 'cash'))`);
        console.log('  ✅ finance_accounts.recognition_basis added');
      } else {
        console.log('  ⏭️  finance_accounts.recognition_basis already exists');
      }
    }

    // ─────────────────────────────────────────────
    // 8. PPN MASUKAN/KELUARAN ON INVOICES
    // ─────────────────────────────────────────────
    console.log('\n🧾 [8/9] Adding PPN masukan/keluaran columns to invoices...');
    
    if (await tableExists('finance_invoices')) {
      const ppnCols = [
        { col: 'subtotal', sql: `ALTER TABLE finance_invoices ADD COLUMN subtotal DECIMAL(19,4) DEFAULT 0` },
        { col: 'ppn_amount', sql: `ALTER TABLE finance_invoices ADD COLUMN ppn_amount DECIMAL(19,4) DEFAULT 0` },
        { col: 'ppn_rate', sql: `ALTER TABLE finance_invoices ADD COLUMN ppn_rate DECIMAL(5,2) DEFAULT 12.00` },
        { col: 'ppn_type', sql: `ALTER TABLE finance_invoices ADD COLUMN ppn_type VARCHAR(20) CHECK (ppn_type IN ('masukan', 'keluaran'))` },
        { col: 'pph23_amount', sql: `ALTER TABLE finance_invoices ADD COLUMN pph23_amount DECIMAL(19,4) DEFAULT 0` },
        { col: 'tax_invoice_number', sql: `ALTER TABLE finance_invoices ADD COLUMN tax_invoice_number VARCHAR(50)` },
      ];
      for (const { col, sql } of ppnCols) {
        if (!(await columnExists('finance_invoices', col))) {
          await sequelize.query(sql);
          console.log(`  ✅ finance_invoices.${col} added`);
        } else {
          console.log(`  ⏭️  finance_invoices.${col} already exists`);
        }
      }
    }

    // ─────────────────────────────────────────────
    // 9. IDEMPOTENCY KEY ON PAYMENT TABLES
    // ─────────────────────────────────────────────
    console.log('\n🔑 [9/9] Adding idempotency_key to payment tables...');
    
    const paymentTables = ['finance_invoice_payments', 'finance_receivable_payments', 'finance_payable_payments'];
    for (const table of paymentTables) {
      if (await tableExists(table)) {
        if (!(await columnExists(table, 'idempotency_key'))) {
          await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN idempotency_key VARCHAR(100)`);
          await sequelize.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_${table}_idempotency ON "${table}" (idempotency_key) WHERE idempotency_key IS NOT NULL`);
          console.log(`  ✅ ${table}.idempotency_key added + unique index`);
        } else {
          console.log(`  ⏭️  ${table}.idempotency_key already exists`);
        }
      }
    }

    // ─── SEED: Default Chart of Accounts for Double-Entry ───
    console.log('\n📋 Seeding additional chart of accounts for double-entry...');
    const seedAccounts = [
      { num: '1-1300', name: 'Persediaan Barang', type: 'asset', cat: 'Inventory' },
      { num: '1-1400', name: 'Uang Muka', type: 'asset', cat: 'Prepaid' },
      { num: '1-2000', name: 'Aktiva Tetap', type: 'asset', cat: 'Fixed Assets' },
      { num: '1-2100', name: 'Akum. Penyusutan', type: 'asset', cat: 'Depreciation' },
      { num: '2-2000', name: 'Hutang Pajak', type: 'liability', cat: 'Tax Payable' },
      { num: '2-3000', name: 'Hutang Bank', type: 'liability', cat: 'Bank Loan' },
      { num: '3-1000', name: 'Modal Disetor', type: 'equity', cat: 'Capital' },
      { num: '3-2000', name: 'Laba Ditahan', type: 'equity', cat: 'Retained Earnings' },
      { num: '4-2000', name: 'Pendapatan Lain-lain', type: 'revenue', cat: 'Other Income' },
      { num: '5-3000', name: 'HPP (COGS)', type: 'expense', cat: 'COGS' },
      { num: '5-4000', name: 'Beban Marketing', type: 'expense', cat: 'Marketing' },
      { num: '5-5000', name: 'Beban Utilitas', type: 'expense', cat: 'Utilities' },
      { num: '5-6000', name: 'Beban Sewa', type: 'expense', cat: 'Rent' },
      { num: '5-7000', name: 'Beban Penyusutan', type: 'expense', cat: 'Depreciation' },
      { num: '5-8000', name: 'Beban Pajak', type: 'expense', cat: 'Tax' },
      { num: '5-9000', name: 'Beban Bunga', type: 'expense', cat: 'Interest' },
    ];

    for (const acc of seedAccounts) {
      const [existing] = await sequelize.query(
        `SELECT id FROM finance_accounts WHERE "accountNumber" = :num LIMIT 1`,
        { replacements: { num: acc.num } }
      );
      if (existing.length === 0) {
        await sequelize.query(`
          INSERT INTO finance_accounts (id, "accountNumber", "accountName", "accountType", category, balance, currency, description, "isActive", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), :num, :name, :type, :cat, 0, 'IDR', :name, true, NOW(), NOW())
        `, { replacements: { num: acc.num, name: acc.name, type: acc.type, cat: acc.cat } });
        console.log(`  ✅ Account ${acc.num} - ${acc.name}`);
      }
    }

    console.log('\n🎉 Finance hardening migration completed successfully!');
    console.log('\nSummary:');
    console.log('  • All money columns upgraded to DECIMAL(19,4)');
    console.log('  • Double-entry bookkeeping tables (journal_entries + journal_entry_lines)');
    console.log('  • Budget alerting columns (alert_level, critical_threshold, alert_sent_at)');
    console.log('  • Composite indexes for P/L report performance');
    console.log('  • tenant_id on all finance tables');
    console.log('  • expense_type (opex/capex) on transactions');
    console.log('  • recognition_basis (accrual/cash) on accounts');
    console.log('  • PPN masukan/keluaran columns on invoices');
    console.log('  • idempotency_key on all payment tables');
    console.log('  • 16 additional chart-of-accounts entries');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
