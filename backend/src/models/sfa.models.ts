import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class SfaTeam extends Model {}
SfaTeam.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  leader_id: { type: DataTypes.INTEGER, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'sfa_teams', underscored: true });

export class SfaTeamMember extends Model {}
SfaTeamMember.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  team_id: { type: DataTypes.INTEGER, allowNull: false },
  employee_id: { type: DataTypes.INTEGER, allowNull: false },
  role: { type: DataTypes.ENUM('leader', 'member', 'supervisor'), defaultValue: 'member' },
}, { sequelize, tableName: 'sfa_team_members', underscored: true });

export class SfaTerritory extends Model {}
SfaTerritory.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  parent_id: { type: DataTypes.INTEGER, allowNull: true },
  boundary: { type: DataTypes.JSONB, allowNull: true },
  assigned_team_id: { type: DataTypes.INTEGER, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'sfa_territories', underscored: true });

export class SfaVisit extends Model {}
SfaVisit.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  salesperson_id: { type: DataTypes.INTEGER, allowNull: false },
  customer_id: { type: DataTypes.INTEGER, allowNull: true },
  outlet_name: { type: DataTypes.STRING(200), allowNull: true },
  visit_date: { type: DataTypes.DATEONLY, allowNull: false },
  check_in_time: { type: DataTypes.DATE, allowNull: true },
  check_out_time: { type: DataTypes.DATE, allowNull: true },
  check_in_lat: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  check_in_lng: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  check_in_photo: { type: DataTypes.STRING(500), allowNull: true },
  check_out_photo: { type: DataTypes.STRING(500), allowNull: true },
  purpose: { type: DataTypes.STRING(200), allowNull: true },
  outcome: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('planned', 'checked_in', 'completed', 'cancelled', 'missed'), defaultValue: 'planned' },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { sequelize, tableName: 'sfa_visits', underscored: true });

export class SfaLead extends Model {}
SfaLead.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  company: { type: DataTypes.STRING(200), allowNull: true },
  email: { type: DataTypes.STRING(255), allowNull: true },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  source: { type: DataTypes.STRING(50), allowNull: true },
  status: { type: DataTypes.ENUM('new', 'contacted', 'qualified', 'converted', 'lost'), defaultValue: 'new' },
  assigned_to: { type: DataTypes.INTEGER, allowNull: true },
  estimated_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  notes: { type: DataTypes.TEXT, allowNull: true },
  converted_at: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'sfa_leads', paranoid: true, underscored: true });

export class SfaOpportunity extends Model {}
SfaOpportunity.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  lead_id: { type: DataTypes.INTEGER, allowNull: true },
  customer_id: { type: DataTypes.INTEGER, allowNull: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  probability: { type: DataTypes.INTEGER, defaultValue: 50 },
  stage: { type: DataTypes.ENUM('prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'), defaultValue: 'prospecting' },
  expected_close_date: { type: DataTypes.DATEONLY, allowNull: true },
  assigned_to: { type: DataTypes.INTEGER, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  closed_at: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'sfa_opportunities', paranoid: true, underscored: true });

export class SfaFieldOrder extends Model {}
SfaFieldOrder.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  order_no: { type: DataTypes.STRING(50), allowNull: false },
  salesperson_id: { type: DataTypes.INTEGER, allowNull: false },
  customer_id: { type: DataTypes.INTEGER, allowNull: false },
  visit_id: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.ENUM('draft', 'submitted', 'approved', 'processing', 'shipped', 'delivered', 'cancelled'), defaultValue: 'draft' },
  subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  discount_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  delivery_date: { type: DataTypes.DATEONLY, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { sequelize, tableName: 'sfa_field_orders', paranoid: true, underscored: true });

export class SfaFieldOrderItem extends Model {}
SfaFieldOrderItem.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  field_order_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  quantity: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
  unit_price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  discount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  subtotal: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
}, { sequelize, tableName: 'sfa_field_order_items', underscored: true });

export class SfaTarget extends Model {}
SfaTarget.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  type: { type: DataTypes.ENUM('revenue', 'quantity', 'visits', 'new_customers'), defaultValue: 'revenue' },
  period_start: { type: DataTypes.DATEONLY, allowNull: false },
  period_end: { type: DataTypes.DATEONLY, allowNull: false },
  target_value: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  actual_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  achievement_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
}, { sequelize, tableName: 'sfa_targets', underscored: true });

export class SfaTargetAssignment extends Model {}
SfaTargetAssignment.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  target_id: { type: DataTypes.INTEGER, allowNull: false },
  salesperson_id: { type: DataTypes.INTEGER, allowNull: false },
  target_value: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  actual_value: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  achievement_pct: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
}, { sequelize, tableName: 'sfa_target_assignments', underscored: true });

export class SfaIncentiveScheme extends Model {}
SfaIncentiveScheme.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  type: { type: DataTypes.ENUM('commission', 'bonus', 'tiered'), defaultValue: 'commission' },
  rules: { type: DataTypes.JSONB, defaultValue: [] },
  period_start: { type: DataTypes.DATEONLY, allowNull: false },
  period_end: { type: DataTypes.DATEONLY, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, tableName: 'sfa_incentive_schemes', underscored: true });

export class SfaQuotation extends Model {}
SfaQuotation.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  quotation_no: { type: DataTypes.STRING(50), allowNull: false },
  customer_id: { type: DataTypes.INTEGER, allowNull: false },
  opportunity_id: { type: DataTypes.INTEGER, allowNull: true },
  salesperson_id: { type: DataTypes.INTEGER, allowNull: false },
  valid_until: { type: DataTypes.DATEONLY, allowNull: true },
  subtotal: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  discount_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('draft', 'sent', 'accepted', 'rejected', 'expired'), defaultValue: 'draft' },
  terms: { type: DataTypes.TEXT, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
}, { sequelize, tableName: 'sfa_quotations', paranoid: true, underscored: true });
