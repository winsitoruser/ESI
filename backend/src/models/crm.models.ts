import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class CrmCustomer extends Model {}
CrmCustomer.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  customer_id: { type: DataTypes.INTEGER, allowNull: true },
  source: { type: DataTypes.ENUM('manual', 'pos', 'website', 'marketplace', 'referral', 'campaign'), defaultValue: 'manual' },
  lifecycle_stage: { type: DataTypes.ENUM('lead', 'prospect', 'customer', 'loyal', 'churned', 'inactive'), defaultValue: 'lead' },
  score: { type: DataTypes.INTEGER, defaultValue: 0 },
  assigned_to: { type: DataTypes.INTEGER, allowNull: true },
  custom_fields: { type: DataTypes.JSONB, defaultValue: {} },
  last_activity_at: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'crm_customers', paranoid: true, underscored: true });

export class CrmContact extends Model {}
CrmContact.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  crm_customer_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  title: { type: DataTypes.STRING(100), allowNull: true },
  email: { type: DataTypes.STRING(255), allowNull: true },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  is_primary: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { sequelize, tableName: 'crm_contacts', underscored: true });

export class CrmInteraction extends Model {}
CrmInteraction.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  crm_customer_id: { type: DataTypes.INTEGER, allowNull: false },
  type: { type: DataTypes.ENUM('call', 'email', 'meeting', 'note', 'whatsapp', 'visit'), allowNull: false },
  subject: { type: DataTypes.STRING(300), allowNull: true },
  content: { type: DataTypes.TEXT, allowNull: true },
  outcome: { type: DataTypes.STRING(100), allowNull: true },
  duration_minutes: { type: DataTypes.INTEGER, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'crm_interactions', underscored: true });

export class CrmTicket extends Model {}
CrmTicket.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  ticket_no: { type: DataTypes.STRING(50), allowNull: false },
  crm_customer_id: { type: DataTypes.INTEGER, allowNull: false },
  subject: { type: DataTypes.STRING(300), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  category: { type: DataTypes.STRING(50), allowNull: true },
  priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'), defaultValue: 'medium' },
  status: { type: DataTypes.ENUM('open', 'in_progress', 'waiting', 'resolved', 'closed'), defaultValue: 'open' },
  assigned_to: { type: DataTypes.INTEGER, allowNull: true },
  sla_due_at: { type: DataTypes.DATE, allowNull: true },
  resolved_at: { type: DataTypes.DATE, allowNull: true },
  satisfaction_score: { type: DataTypes.INTEGER, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'crm_tickets', paranoid: true, underscored: true });

export class CrmTicketComment extends Model {}
CrmTicketComment.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  ticket_id: { type: DataTypes.INTEGER, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  is_internal: { type: DataTypes.BOOLEAN, defaultValue: false },
  attachments: { type: DataTypes.JSONB, defaultValue: [] },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'crm_ticket_comments', underscored: true });

export class CrmForecast extends Model {}
CrmForecast.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  period_start: { type: DataTypes.DATEONLY, allowNull: false },
  period_end: { type: DataTypes.DATEONLY, allowNull: false },
  target_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  forecast_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  actual_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('draft', 'active', 'closed'), defaultValue: 'draft' },
  created_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'crm_forecasts', underscored: true });

export class CrmAutomationRule extends Model {}
CrmAutomationRule.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  trigger_event: { type: DataTypes.STRING(100), allowNull: false },
  conditions: { type: DataTypes.JSONB, defaultValue: {} },
  actions: { type: DataTypes.JSONB, defaultValue: [] },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  execution_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  last_executed_at: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'crm_automation_rules', underscored: true });

export class CrmDocument extends Model {}
CrmDocument.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  crm_customer_id: { type: DataTypes.INTEGER, allowNull: true },
  name: { type: DataTypes.STRING(300), allowNull: false },
  type: { type: DataTypes.STRING(50), allowNull: true },
  file_url: { type: DataTypes.STRING(500), allowNull: false },
  file_size: { type: DataTypes.INTEGER, allowNull: true },
  uploaded_by: { type: DataTypes.INTEGER, allowNull: false },
}, { sequelize, tableName: 'crm_documents', underscored: true });

export class CrmSegment extends Model {}
CrmSegment.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  rules: { type: DataTypes.JSONB, defaultValue: [] },
  member_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  is_dynamic: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'crm_segments', underscored: true });
