import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class SubscriptionPackage extends Model {}
SubscriptionPackage.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  price_monthly: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  price_yearly: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  max_branches: { type: DataTypes.INTEGER, defaultValue: 1 },
  max_users: { type: DataTypes.INTEGER, defaultValue: 5 },
  max_products: { type: DataTypes.INTEGER, allowNull: true },
  max_transactions: { type: DataTypes.INTEGER, allowNull: true },
  modules_included: { type: DataTypes.JSONB, defaultValue: [] },
  features: { type: DataTypes.JSONB, defaultValue: {} },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { sequelize, tableName: 'subscription_packages', underscored: true });

export class Subscription extends Model {}
Subscription.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  package_id: { type: DataTypes.INTEGER, allowNull: false },
  billing_cycle: { type: DataTypes.ENUM('monthly', 'yearly', 'lifetime'), defaultValue: 'monthly' },
  status: { type: DataTypes.ENUM('trial', 'active', 'past_due', 'cancelled', 'suspended', 'expired'), defaultValue: 'trial' },
  trial_ends_at: { type: DataTypes.DATE, allowNull: true },
  current_period_start: { type: DataTypes.DATE, allowNull: true },
  current_period_end: { type: DataTypes.DATE, allowNull: true },
  cancelled_at: { type: DataTypes.DATE, allowNull: true },
  cancel_reason: { type: DataTypes.TEXT, allowNull: true },
  next_billing_date: { type: DataTypes.DATE, allowNull: true },
  amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  discount_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  payment_method: { type: DataTypes.STRING(50), allowNull: true },
  payment_gateway_id: { type: DataTypes.STRING(100), allowNull: true },
}, { sequelize, tableName: 'subscriptions', underscored: true });

export class BillingInvoice extends Model {}
BillingInvoice.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  subscription_id: { type: DataTypes.INTEGER, allowNull: false },
  invoice_no: { type: DataTypes.STRING(50), allowNull: false },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  tax_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  currency: { type: DataTypes.STRING(3), defaultValue: 'IDR' },
  status: { type: DataTypes.ENUM('draft', 'pending', 'paid', 'failed', 'refunded', 'voided'), defaultValue: 'pending' },
  due_date: { type: DataTypes.DATEONLY, allowNull: false },
  paid_at: { type: DataTypes.DATE, allowNull: true },
  payment_method: { type: DataTypes.STRING(50), allowNull: true },
  payment_reference: { type: DataTypes.STRING(200), allowNull: true },
  gateway_invoice_id: { type: DataTypes.STRING(100), allowNull: true },
  items: { type: DataTypes.JSONB, defaultValue: [] },
  pdf_url: { type: DataTypes.STRING(500), allowNull: true },
}, { sequelize, tableName: 'billing_invoices', underscored: true });

export class PaymentTransaction extends Model {}
PaymentTransaction.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  billing_invoice_id: { type: DataTypes.INTEGER, allowNull: true },
  gateway: { type: DataTypes.ENUM('midtrans', 'stripe', 'manual', 'bank_transfer'), defaultValue: 'midtrans' },
  gateway_transaction_id: { type: DataTypes.STRING(200), allowNull: true },
  amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  currency: { type: DataTypes.STRING(3), defaultValue: 'IDR' },
  status: { type: DataTypes.ENUM('pending', 'processing', 'success', 'failed', 'refunded', 'expired'), defaultValue: 'pending' },
  payment_method: { type: DataTypes.STRING(50), allowNull: true },
  payment_url: { type: DataTypes.STRING(500), allowNull: true },
  metadata: { type: DataTypes.JSONB, defaultValue: {} },
  paid_at: { type: DataTypes.DATE, allowNull: true },
  expired_at: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'payment_transactions', underscored: true });

export class UsageRecord extends Model {}
UsageRecord.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  metric: { type: DataTypes.STRING(50), allowNull: false },
  value: { type: DataTypes.INTEGER, defaultValue: 0 },
  period_start: { type: DataTypes.DATE, allowNull: false },
  period_end: { type: DataTypes.DATE, allowNull: false },
}, { sequelize, tableName: 'usage_records', underscored: true });
