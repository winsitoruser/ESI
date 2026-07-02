import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class AuditLog extends Model {}
AuditLog.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: true },
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  action: { type: DataTypes.STRING(50), allowNull: false },
  entity_type: { type: DataTypes.STRING(100), allowNull: false },
  entity_id: { type: DataTypes.INTEGER, allowNull: true },
  old_values: { type: DataTypes.JSONB, allowNull: true },
  new_values: { type: DataTypes.JSONB, allowNull: true },
  ip_address: { type: DataTypes.STRING(50), allowNull: true },
  user_agent: { type: DataTypes.STRING(500), allowNull: true },
  metadata: { type: DataTypes.JSONB, defaultValue: {} },
}, { sequelize, tableName: 'audit_logs', underscored: true, updatedAt: false });

export class SystemBackup extends Model {}
SystemBackup.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: true },
  type: { type: DataTypes.ENUM('full', 'incremental', 'tenant'), defaultValue: 'full' },
  status: { type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'failed'), defaultValue: 'pending' },
  file_url: { type: DataTypes.STRING(500), allowNull: true },
  file_size: { type: DataTypes.BIGINT, allowNull: true },
  started_at: { type: DataTypes.DATE, allowNull: true },
  completed_at: { type: DataTypes.DATE, allowNull: true },
  error_message: { type: DataTypes.TEXT, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: true },
}, { sequelize, tableName: 'system_backups', underscored: true });

export class Notification extends Model {}
Notification.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.STRING(50), allowNull: false },
  title: { type: DataTypes.STRING(300), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: true },
  data: { type: DataTypes.JSONB, defaultValue: {} },
  channel: { type: DataTypes.ENUM('in_app', 'email', 'push', 'whatsapp', 'sms'), defaultValue: 'in_app' },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  read_at: { type: DataTypes.DATE, allowNull: true },
  sent_at: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'notifications', underscored: true });

export class NotificationSetting extends Model {}
NotificationSetting.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.STRING(50), allowNull: false },
  channels: { type: DataTypes.JSONB, defaultValue: { in_app: true, email: false, push: false } },
  is_enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'notification_settings', underscored: true });

export class SystemAlert extends Model {}
SystemAlert.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: true },
  type: { type: DataTypes.STRING(50), allowNull: false },
  severity: { type: DataTypes.ENUM('info', 'warning', 'error', 'critical'), defaultValue: 'info' },
  title: { type: DataTypes.STRING(300), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: true },
  source: { type: DataTypes.STRING(100), allowNull: true },
  entity_type: { type: DataTypes.STRING(50), allowNull: true },
  entity_id: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.ENUM('active', 'acknowledged', 'resolved', 'dismissed'), defaultValue: 'active' },
  acknowledged_by: { type: DataTypes.INTEGER, allowNull: true },
  acknowledged_at: { type: DataTypes.DATE, allowNull: true },
  resolved_at: { type: DataTypes.DATE, allowNull: true },
  metadata: { type: DataTypes.JSONB, defaultValue: {} },
}, { sequelize, tableName: 'system_alerts', underscored: true });

export class AlertSubscription extends Model {}
AlertSubscription.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  alert_type: { type: DataTypes.STRING(50), allowNull: false },
  channels: { type: DataTypes.JSONB, defaultValue: ['in_app'] },
  conditions: { type: DataTypes.JSONB, defaultValue: {} },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'alert_subscriptions', underscored: true });

export class Webhook extends Model {}
Webhook.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  url: { type: DataTypes.STRING(500), allowNull: false },
  secret: { type: DataTypes.STRING(255), allowNull: true },
  events: { type: DataTypes.JSONB, defaultValue: [] },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  last_triggered_at: { type: DataTypes.DATE, allowNull: true },
  failure_count: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { sequelize, tableName: 'webhooks', underscored: true });

export class StoreSetting extends Model {}
StoreSetting.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: true },
  category: { type: DataTypes.STRING(50), allowNull: false },
  key: { type: DataTypes.STRING(100), allowNull: false },
  value: { type: DataTypes.JSONB, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
}, {
  sequelize, tableName: 'store_settings', underscored: true,
  indexes: [{ unique: true, fields: ['tenant_id', 'branch_id', 'category', 'key'] }],
});

export class SyncLog extends Model {}
SyncLog.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: true },
  entity_type: { type: DataTypes.STRING(50), allowNull: false },
  direction: { type: DataTypes.ENUM('upload', 'download'), allowNull: false },
  records_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.ENUM('pending', 'syncing', 'completed', 'failed'), defaultValue: 'pending' },
  error_message: { type: DataTypes.TEXT, allowNull: true },
  started_at: { type: DataTypes.DATE, allowNull: true },
  completed_at: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'sync_logs', underscored: true });

export class IntegrationConfig extends Model {}
IntegrationConfig.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  provider: { type: DataTypes.STRING(50), allowNull: false },
  type: { type: DataTypes.ENUM('marketplace', 'payment', 'whatsapp', 'accounting', 'shipping', 'custom'), allowNull: false },
  credentials: { type: DataTypes.JSONB, defaultValue: {} },
  settings: { type: DataTypes.JSONB, defaultValue: {} },
  webhook_url: { type: DataTypes.STRING(500), allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: false },
  last_sync_at: { type: DataTypes.DATE, allowNull: true },
  status: { type: DataTypes.ENUM('disconnected', 'connected', 'error'), defaultValue: 'disconnected' },
}, { sequelize, tableName: 'integration_configs', underscored: true });

export class Announcement extends Model {}
Announcement.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: true },
  title: { type: DataTypes.STRING(300), allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.ENUM('info', 'warning', 'maintenance', 'feature'), defaultValue: 'info' },
  target: { type: DataTypes.ENUM('all', 'tenant', 'branch', 'role'), defaultValue: 'all' },
  target_ids: { type: DataTypes.JSONB, defaultValue: [] },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  start_date: { type: DataTypes.DATE, allowNull: true },
  end_date: { type: DataTypes.DATE, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'announcements', underscored: true });
