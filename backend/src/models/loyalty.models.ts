import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class LoyaltyProgram extends Model {}
LoyaltyProgram.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  type: { type: DataTypes.ENUM('points', 'stamps', 'cashback'), defaultValue: 'points' },
  points_per_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 1 },
  amount_per_point: { type: DataTypes.DECIMAL(15, 2), defaultValue: 10000 },
  min_transaction: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  point_expiry_days: { type: DataTypes.INTEGER, allowNull: true },
  rules: { type: DataTypes.JSONB, defaultValue: {} },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'loyalty_programs', underscored: true });

export class LoyaltyTier extends Model {}
LoyaltyTier.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  program_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  min_points: { type: DataTypes.INTEGER, defaultValue: 0 },
  multiplier: { type: DataTypes.DECIMAL(5, 2), defaultValue: 1 },
  benefits: { type: DataTypes.JSONB, defaultValue: {} },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { sequelize, tableName: 'loyalty_tiers', underscored: true });

export class LoyaltyReward extends Model {}
LoyaltyReward.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  program_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  type: { type: DataTypes.ENUM('discount', 'free_item', 'voucher', 'cashback'), defaultValue: 'discount' },
  points_required: { type: DataTypes.INTEGER, allowNull: false },
  value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  product_id: { type: DataTypes.INTEGER, allowNull: true },
  max_redemptions: { type: DataTypes.INTEGER, allowNull: true },
  total_redeemed: { type: DataTypes.INTEGER, defaultValue: 0 },
  start_date: { type: DataTypes.DATEONLY, allowNull: true },
  end_date: { type: DataTypes.DATEONLY, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'loyalty_rewards', underscored: true });

export class PointTransaction extends Model {}
PointTransaction.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  customer_id: { type: DataTypes.INTEGER, allowNull: false },
  loyalty_id: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.ENUM('earn', 'redeem', 'expire', 'adjust', 'bonus'), allowNull: false },
  points: { type: DataTypes.INTEGER, allowNull: false },
  balance_after: { type: DataTypes.INTEGER, defaultValue: 0 },
  reference_type: { type: DataTypes.STRING(50), allowNull: true },
  reference_id: { type: DataTypes.INTEGER, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  expires_at: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'point_transactions', underscored: true });

export class RewardRedemption extends Model {}
RewardRedemption.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  customer_id: { type: DataTypes.INTEGER, allowNull: false },
  reward_id: { type: DataTypes.INTEGER, allowNull: false },
  points_used: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'completed', 'cancelled'), defaultValue: 'pending' },
  redeemed_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  transaction_id: { type: DataTypes.INTEGER, allowNull: true },
}, { sequelize, tableName: 'reward_redemptions', underscored: true });
