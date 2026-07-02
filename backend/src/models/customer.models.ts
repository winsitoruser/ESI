import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Customer extends Model {}
Customer.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: true },
  code: { type: DataTypes.STRING(20), allowNull: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: true },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  city: { type: DataTypes.STRING(100), allowNull: true },
  province: { type: DataTypes.STRING(100), allowNull: true },
  postal_code: { type: DataTypes.STRING(10), allowNull: true },
  type: { type: DataTypes.ENUM('individual', 'corporate', 'vip', 'wholesale'), defaultValue: 'individual' },
  gender: { type: DataTypes.ENUM('male', 'female', 'other'), allowNull: true },
  birth_date: { type: DataTypes.DATEONLY, allowNull: true },
  npwp: { type: DataTypes.STRING(30), allowNull: true },
  company_name: { type: DataTypes.STRING(200), allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  tags: { type: DataTypes.JSONB, defaultValue: [] },
  total_spent: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total_transactions: { type: DataTypes.INTEGER, defaultValue: 0 },
  last_transaction_at: { type: DataTypes.DATE, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  sequelize, tableName: 'customers', paranoid: true, underscored: true,
  indexes: [
    { fields: ['tenant_id', 'phone'] },
    { fields: ['tenant_id', 'email'] },
  ],
});

export class CustomerLoyalty extends Model {}
CustomerLoyalty.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  customer_id: { type: DataTypes.INTEGER, allowNull: false },
  loyalty_program_id: { type: DataTypes.INTEGER, allowNull: false },
  tier_id: { type: DataTypes.INTEGER, allowNull: true },
  member_code: { type: DataTypes.STRING(50), allowNull: false },
  points_balance: { type: DataTypes.INTEGER, defaultValue: 0 },
  total_points_earned: { type: DataTypes.INTEGER, defaultValue: 0 },
  total_points_redeemed: { type: DataTypes.INTEGER, defaultValue: 0 },
  joined_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  tier_updated_at: { type: DataTypes.DATE, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'customer_loyalties', underscored: true });
