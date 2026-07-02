import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class FinanceAccount extends Model {}
FinanceAccount.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  parent_id: { type: DataTypes.INTEGER, allowNull: true },
  code: { type: DataTypes.STRING(20), allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  type: { type: DataTypes.ENUM('asset', 'liability', 'equity', 'revenue', 'expense', 'cogs'), allowNull: false },
  sub_type: { type: DataTypes.STRING(50), allowNull: true },
  normal_balance: { type: DataTypes.ENUM('debit', 'credit'), allowNull: false },
  is_header: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_system: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  opening_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  current_balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
}, {
  sequelize, tableName: 'finance_accounts', paranoid: true, underscored: true,
  indexes: [{ unique: true, fields: ['tenant_id', 'code'] }],
});

export class JournalEntry extends Model {}
JournalEntry.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: true },
  entry_no: { type: DataTypes.STRING(50), allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  reference_type: { type: DataTypes.STRING(50), allowNull: true },
  reference_id: { type: DataTypes.INTEGER, allowNull: true },
  total_debit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total_credit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('draft', 'posted', 'voided'), defaultValue: 'draft' },
  posted_at: { type: DataTypes.DATE, allowNull: true },
  voided_at: { type: DataTypes.DATE, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
  approved_by: { type: DataTypes.INTEGER, allowNull: true },
}, { sequelize, tableName: 'journal_entries', paranoid: true, underscored: true });

export class JournalEntryLine extends Model {}
JournalEntryLine.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  journal_entry_id: { type: DataTypes.INTEGER, allowNull: false },
  account_id: { type: DataTypes.INTEGER, allowNull: false },
  description: { type: DataTypes.STRING(300), allowNull: true },
  debit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  credit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  department: { type: DataTypes.STRING(100), allowNull: true },
  project_id: { type: DataTypes.INTEGER, allowNull: true },
}, { sequelize, tableName: 'journal_entry_lines', underscored: true });

export class FinanceTransaction extends Model {}
FinanceTransaction.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.ENUM('income', 'expense', 'transfer'), allowNull: false },
  category: { type: DataTypes.STRING(100), allowNull: true },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  reference_type: { type: DataTypes.STRING(50), allowNull: true },
  reference_id: { type: DataTypes.INTEGER, allowNull: true },
  account_id: { type: DataTypes.INTEGER, allowNull: true },
  payment_method: { type: DataTypes.STRING(50), allowNull: true },
  transaction_date: { type: DataTypes.DATEONLY, allowNull: false },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'finance_transactions', underscored: true });

export class FinanceInvoice extends Model {}
FinanceInvoice.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: true },
  invoice_no: { type: DataTypes.STRING(50), allowNull: false },
  type: { type: DataTypes.ENUM('sales', 'purchase'), allowNull: false },
  customer_id: { type: DataTypes.INTEGER, allowNull: true },
  supplier_id: { type: DataTypes.INTEGER, allowNull: true },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  due_date: { type: DataTypes.DATEONLY, allowNull: false },
  subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  discount_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  paid_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  balance_due: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('draft', 'sent', 'partial', 'paid', 'overdue', 'voided'), defaultValue: 'draft' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'finance_invoices', paranoid: true, underscored: true });

export class FinanceInvoiceItem extends Model {}
FinanceInvoiceItem.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  invoice_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: true },
  description: { type: DataTypes.STRING(500), allowNull: false },
  quantity: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
  unit_price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  discount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  tax_rate: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  account_id: { type: DataTypes.INTEGER, allowNull: true },
}, { sequelize, tableName: 'finance_invoice_items', underscored: true });

export class FinancePayment extends Model {}
FinancePayment.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  invoice_id: { type: DataTypes.INTEGER, allowNull: false },
  payment_no: { type: DataTypes.STRING(50), allowNull: false },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  payment_date: { type: DataTypes.DATEONLY, allowNull: false },
  payment_method: { type: DataTypes.STRING(50), allowNull: true },
  reference: { type: DataTypes.STRING(100), allowNull: true },
  account_id: { type: DataTypes.INTEGER, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'finance_payments', underscored: true });

export class FinanceBudget extends Model {}
FinanceBudget.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  department: { type: DataTypes.STRING(100), allowNull: true },
  account_id: { type: DataTypes.INTEGER, allowNull: true },
  period_start: { type: DataTypes.DATEONLY, allowNull: false },
  period_end: { type: DataTypes.DATEONLY, allowNull: false },
  budgeted_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  actual_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  variance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('draft', 'approved', 'active', 'closed'), defaultValue: 'draft' },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'finance_budgets', underscored: true });

export class TaxSetting extends Model {}
TaxSetting.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  rate: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  type: { type: DataTypes.ENUM('ppn', 'pph21', 'pph23', 'pph_final', 'custom'), defaultValue: 'ppn' },
  account_id: { type: DataTypes.INTEGER, allowNull: true },
  is_inclusive: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'tax_settings', underscored: true });
