import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class MktCampaign extends Model {}
MktCampaign.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  type: { type: DataTypes.ENUM('email', 'sms', 'whatsapp', 'push', 'social', 'mixed'), defaultValue: 'email' },
  status: { type: DataTypes.ENUM('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'), defaultValue: 'draft' },
  target_audience: { type: DataTypes.JSONB, defaultValue: {} },
  content: { type: DataTypes.JSONB, defaultValue: {} },
  schedule: { type: DataTypes.JSONB, defaultValue: {} },
  budget: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  spent: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  metrics: { type: DataTypes.JSONB, defaultValue: {} },
  start_date: { type: DataTypes.DATE, allowNull: true },
  end_date: { type: DataTypes.DATE, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'mkt_campaigns', paranoid: true, underscored: true });

export class MktCampaignChannel extends Model {}
MktCampaignChannel.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  campaign_id: { type: DataTypes.INTEGER, allowNull: false },
  channel: { type: DataTypes.STRING(50), allowNull: false },
  content: { type: DataTypes.JSONB, defaultValue: {} },
  sent_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  delivered_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  opened_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  clicked_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  converted_count: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { sequelize, tableName: 'mkt_campaign_channels', underscored: true });

export class MktSegment extends Model {}
MktSegment.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  rules: { type: DataTypes.JSONB, defaultValue: [] },
  member_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_dynamic: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'mkt_segments', underscored: true });

export class MktPromotion extends Model {}
MktPromotion.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  campaign_id: { type: DataTypes.INTEGER, allowNull: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  type: { type: DataTypes.ENUM('discount', 'voucher', 'bundle', 'flash_sale', 'loyalty_bonus'), defaultValue: 'discount' },
  value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  conditions: { type: DataTypes.JSONB, defaultValue: {} },
  start_date: { type: DataTypes.DATE, allowNull: false },
  end_date: { type: DataTypes.DATE, allowNull: false },
  usage_limit: { type: DataTypes.INTEGER, allowNull: true },
  usage_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'mkt_promotions', underscored: true });

export class MktBudget extends Model {}
MktBudget.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  campaign_id: { type: DataTypes.INTEGER, allowNull: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  total_budget: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  spent_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  period_start: { type: DataTypes.DATEONLY, allowNull: false },
  period_end: { type: DataTypes.DATEONLY, allowNull: false },
}, { sequelize, tableName: 'mkt_budgets', underscored: true });
