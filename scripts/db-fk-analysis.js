/**
 * DB FK Analysis Script
 * Menemukan:
 * 1. Kolom dengan pola _id yang seharusnya punya FK constraint
 * 2. Missing FK constraints
 * 3. Orphaned records
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.development' });
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  host: process.env.DB_HOST || process.env.POSTGRES_HOST || 'localhost',
  port: process.env.DB_PORT || process.env.POSTGRES_PORT || 5432,
  database: process.env.DB_NAME || process.env.POSTGRES_DB || 'bedagang_dev',
  user: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres',
});

// Mapping kolom ke tabel parent (berdasarkan konvensi penamaan)
// Format: child_table.column -> { parent_table, parent_column, on_delete }
const FK_MAPPING = {
  // POS Core
  'pos_transactions.store_id': { parent: 'stores', column: 'id', on_delete: 'CASCADE' },
  'pos_transactions.employee_id': { parent: 'users', column: 'id', on_delete: 'SET NULL' },
  'pos_transactions.customer_id': { parent: 'customers', column: 'id', on_delete: 'SET NULL' },
  'pos_transactions.shift_id': { parent: 'shifts', column: 'id', on_delete: 'SET NULL' },
  'pos_transaction_items.transaction_id': { parent: 'pos_transactions', column: 'id', on_delete: 'CASCADE' },
  'pos_transaction_items.product_id': { parent: 'products', column: 'id', on_delete: 'CASCADE' },
  'pos_transaction_items.variant_id': { parent: 'product_variants', column: 'id', on_delete: 'SET NULL' },
  
  // Orders
  'sales_orders.branch_id': { parent: 'branches', column: 'id', on_delete: 'CASCADE' },
  'sales_orders.store_id': { parent: 'stores', column: 'id', on_delete: 'CASCADE' },
  'sales_orders.customer_id': { parent: 'customers', column: 'id', on_delete: 'SET NULL' },
  'sales_orders.employee_id': { parent: 'users', column: 'id', on_delete: 'SET NULL' },
  'sales_order_items.order_id': { parent: 'sales_orders', column: 'id', on_delete: 'CASCADE' },
  'sales_order_items.product_id': { parent: 'products', column: 'id', on_delete: 'CASCADE' },
  'sales_order_items.variant_id': { parent: 'product_variants', column: 'id', on_delete: 'SET NULL' },
  
  // Purchase Orders
  'purchase_orders.supplier_id': { parent: 'suppliers', column: 'id', on_delete: 'CASCADE' },
  'purchase_orders.branch_id': { parent: 'branches', column: 'id', on_delete: 'CASCADE' },
  'purchase_order_items.purchase_order_id': { parent: 'purchase_orders', column: 'id', on_delete: 'CASCADE' },
  'purchase_order_items.product_id': { parent: 'products', column: 'id', on_delete: 'CASCADE' },
  
  // Inventory/Stock
  'stocks.product_id': { parent: 'products', column: 'id', on_delete: 'CASCADE' },
  'stocks.warehouse_id': { parent: 'warehouses', column: 'id', on_delete: 'CASCADE' },
  'stocks.branch_id': { parent: 'branches', column: 'id', on_delete: 'CASCADE' },
  'stock_movements.product_id': { parent: 'products', column: 'id', on_delete: 'CASCADE' },
  'stock_movements.warehouse_id': { parent: 'warehouses', column: 'id', on_delete: 'SET NULL' },
  'stock_movements.branch_id': { parent: 'branches', column: 'id', on_delete: 'CASCADE' },
  'stock_adjustments.branch_id': { parent: 'branches', column: 'id', on_delete: 'CASCADE' },
  'stock_adjustment_items.adjustment_id': { parent: 'stock_adjustments', column: 'id', on_delete: 'CASCADE' },
  'stock_adjustment_items.product_id': { parent: 'products', column: 'id', on_delete: 'CASCADE' },
  
  // Products
  'products.category_id': { parent: 'categories', column: 'id', on_delete: 'SET NULL' },
  'products.supplier_id': { parent: 'suppliers', column: 'id', on_delete: 'SET NULL' },
  'product_variants.product_id': { parent: 'products', column: 'id', on_delete: 'CASCADE' },
  'product_prices.product_id': { parent: 'products', column: 'id', on_delete: 'CASCADE' },
  
  // Tenants (semua tabel tenant-scoped)
  'branches.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'stores.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'users.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'products.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'customers.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'suppliers.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'categories.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'warehouses.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  
  // Employees
  'employees.branch_id': { parent: 'branches', column: 'id', on_delete: 'CASCADE' },
  'employees.user_id': { parent: 'users', column: 'id', on_delete: 'SET NULL' },
  
  // Kitchen
  'kitchen_orders.transaction_id': { parent: 'pos_transactions', column: 'id', on_delete: 'CASCADE' },
  'kitchen_order_items.kitchen_order_id': { parent: 'kitchen_orders', column: 'id', on_delete: 'CASCADE' },
  'kitchen_order_items.product_id': { parent: 'products', column: 'id', on_delete: 'CASCADE' },
  
  // Finance
  'finance_invoices.customer_id': { parent: 'customers', column: 'id', on_delete: 'SET NULL' },
  'finance_invoice_items.invoice_id': { parent: 'finance_invoices', column: 'id', on_delete: 'CASCADE' },
  'finance_invoice_items.product_id': { parent: 'products', column: 'id', on_delete: 'SET NULL' },
  'finance_payables.supplier_id': { parent: 'suppliers', column: 'id', on_delete: 'SET NULL' },
  'finance_receivables.customer_id': { parent: 'customers', column: 'id', on_delete: 'SET NULL' },
  'finance_transactions.invoice_id': { parent: 'finance_invoices', column: 'id', on_delete: 'SET NULL' },
  
  // Payments
  'payment_transactions.invoice_id': { parent: 'invoices', column: 'id', on_delete: 'SET NULL' },
  'payment_transactions.subscription_id': { parent: 'subscriptions', column: 'id', on_delete: 'SET NULL' },
  'payment_transactions.billing_cycle_id': { parent: 'billing_cycles', column: 'id', on_delete: 'SET NULL' },
  
  // Subscription/Billing
  'subscriptions.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'subscriptions.plan_id': { parent: 'plans', column: 'id', on_delete: 'SET NULL' },
  'billing_cycles.subscription_id': { parent: 'subscriptions', column: 'id', on_delete: 'CASCADE' },
  'invoices.billing_cycle_id': { parent: 'billing_cycles', column: 'id', on_delete: 'SET NULL' },
  'invoice_items.invoice_id': { parent: 'invoices', column: 'id', on_delete: 'CASCADE' },
  'plan_limits.plan_id': { parent: 'plans', column: 'id', on_delete: 'CASCADE' },
  
  // DMS
  'dms_files.folder_id': { parent: 'dms_folders', column: 'id', on_delete: 'SET NULL' },
  'dms_files.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'dms_folders.parent_id': { parent: 'dms_folders', column: 'id', on_delete: 'SET NULL' },
  'dms_folders.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'dms_mata_elang_shares.file_id': { parent: 'dms_files', column: 'id', on_delete: 'CASCADE' },
  'dms_access_logs.file_id': { parent: 'dms_files', column: 'id', on_delete: 'CASCADE' },
  'dms_signatures.file_id': { parent: 'dms_files', column: 'id', on_delete: 'CASCADE' },
  
  // SFA
  'sfa_leads.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'sfa_leads.customer_id': { parent: 'crm_customers', column: 'id', on_delete: 'SET NULL' },
  'sfa_opportunities.lead_id': { parent: 'sfa_leads', column: 'id', on_delete: 'SET NULL' },
  'sfa_opportunities.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'sfa_activities.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'sfa_visits.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'sfa_quotations.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'sfa_quotation_items.quotation_id': { parent: 'sfa_quotations', column: 'id', on_delete: 'CASCADE' },
  'sfa_team_members.team_id': { parent: 'sfa_teams', column: 'id', on_delete: 'CASCADE' },
  'sfa_target_assignments.target_group_id': { parent: 'sfa_target_groups', column: 'id', on_delete: 'CASCADE' },
  'sfa_achievement_details.achievement_id': { parent: 'sfa_achievements', column: 'id', on_delete: 'CASCADE' },
  'sfa_incentive_tiers.scheme_id': { parent: 'sfa_incentive_schemes', column: 'id', on_delete: 'CASCADE' },
  'sfa_plafon_usages.plafon_id': { parent: 'sfa_plafons', column: 'id', on_delete: 'CASCADE' },
  'sfa_coverage_assignments.plan_id': { parent: 'sfa_coverage_plans', column: 'id', on_delete: 'CASCADE' },
  'sfa_field_order_items.field_order_id': { parent: 'sfa_field_orders', column: 'id', on_delete: 'CASCADE' },
  'sfa_display_audit_items.audit_id': { parent: 'sfa_display_audits', column: 'id', on_delete: 'CASCADE' },
  'sfa_survey_questions.template_id': { parent: 'sfa_survey_templates', column: 'id', on_delete: 'CASCADE' },
  'sfa_survey_responses.template_id': { parent: 'sfa_survey_templates', column: 'id', on_delete: 'CASCADE' },
  'sfa_approval_steps.workflow_id': { parent: 'sfa_approval_workflows', column: 'id', on_delete: 'CASCADE' },
  'sfa_commission_group_products.group_id': { parent: 'sfa_commission_groups', column: 'id', on_delete: 'CASCADE' },
  
  // CRM
  'crm_customers.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'crm_contacts.customer_id': { parent: 'crm_customers', column: 'id', on_delete: 'CASCADE' },
  'crm_contacts.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'crm_interactions.customer_id': { parent: 'crm_customers', column: 'id', on_delete: 'CASCADE' },
  'crm_interactions.contact_id': { parent: 'crm_contacts', column: 'id', on_delete: 'SET NULL' },
  'crm_communications.customer_id': { parent: 'crm_customers', column: 'id', on_delete: 'SET NULL' },
  'crm_communications.contact_id': { parent: 'crm_contacts', column: 'id', on_delete: 'SET NULL' },
  'crm_communications.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'crm_customer_segments.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'crm_automation_rules.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'crm_automation_logs.rule_id': { parent: 'crm_automation_rules', column: 'id', on_delete: 'SET NULL' },
  'crm_calendar_events.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'crm_tasks.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  
  // Marketing
  'mkt_campaigns.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'mkt_campaign_channels.campaign_id': { parent: 'mkt_campaigns', column: 'id', on_delete: 'CASCADE' },
  'mkt_promotions.campaign_id': { parent: 'mkt_campaigns', column: 'id', on_delete: 'SET NULL' },
  'mkt_promotions.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'mkt_promotion_usages.promotion_id': { parent: 'mkt_promotions', column: 'id', on_delete: 'CASCADE' },
  'mkt_segments.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'mkt_segment_rules.segment_id': { parent: 'mkt_segments', column: 'id', on_delete: 'CASCADE' },
  
  // Manufacturing
  'mfg_boms.product_id': { parent: 'products', column: 'id', on_delete: 'CASCADE' },
  'mfg_bom_items.bom_id': { parent: 'mfg_boms', column: 'id', on_delete: 'CASCADE' },
  'mfg_bom_items.product_id': { parent: 'products', column: 'id', on_delete: 'CASCADE' },
  'mfg_work_orders.product_id': { parent: 'products', column: 'id', on_delete: 'CASCADE' },
  'mfg_work_orders.bom_id': { parent: 'mfg_boms', column: 'id', on_delete: 'SET NULL' },
  'mfg_wo_materials.work_order_id': { parent: 'mfg_work_orders', column: 'id', on_delete: 'CASCADE' },
  'mfg_wo_operations.work_order_id': { parent: 'mfg_work_orders', column: 'id', on_delete: 'CASCADE' },
  'mfg_wo_outputs.work_order_id': { parent: 'mfg_work_orders', column: 'id', on_delete: 'CASCADE' },
  'mfg_qc_inspections.template_id': { parent: 'mfg_qc_templates', column: 'id', on_delete: 'SET NULL' },
  'mfg_qc_results.inspection_id': { parent: 'mfg_qc_inspections', column: 'id', on_delete: 'CASCADE' },
  
  // Project Management
  'pjm_projects.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'pjm_tasks.project_id': { parent: 'pjm_projects', column: 'id', on_delete: 'CASCADE' },
  'pjm_milestones.project_id': { parent: 'pjm_projects', column: 'id', on_delete: 'CASCADE' },
  'pjm_resources.project_id': { parent: 'pjm_projects', column: 'id', on_delete: 'CASCADE' },
  'pjm_budgets.project_id': { parent: 'pjm_projects', column: 'id', on_delete: 'CASCADE' },
  'pjm_documents.project_id': { parent: 'pjm_projects', column: 'id', on_delete: 'CASCADE' },
  
  // HRIS
  'employees.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'employee_attendances.employee_id': { parent: 'employees', column: 'id', on_delete: 'CASCADE' },
  'employee_kpis.employee_id': { parent: 'employees', column: 'id', on_delete: 'CASCADE' },
  'employee_kpis.branch_id': { parent: 'branches', column: 'id', on_delete: 'CASCADE' },
  'leave_requests.employee_id': { parent: 'employees', column: 'id', on_delete: 'CASCADE' },
  'payroll_runs.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  
  // Fleet
  'fleet_vehicles.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'fleet_drivers.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'fleet_routes.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'fleet_gps_locations.vehicle_id': { parent: 'fleet_vehicles', column: 'id', on_delete: 'CASCADE' },
  'fleet_fuel_transactions.vehicle_id': { parent: 'fleet_vehicles', column: 'id', on_delete: 'CASCADE' },
  'fleet_fuel_transactions.driver_id': { parent: 'fleet_drivers', column: 'id', on_delete: 'SET NULL' },
  'fleet_maintenance_schedules.vehicle_id': { parent: 'fleet_vehicles', column: 'id', on_delete: 'CASCADE' },
  
  // Activation/Partners
  'activation_requests.partner_id': { parent: 'partners', column: 'id', on_delete: 'SET NULL' },
  'partner_subscriptions.partner_id': { parent: 'partners', column: 'id', on_delete: 'CASCADE' },
  'partner_outlets.partner_id': { parent: 'partners', column: 'id', on_delete: 'CASCADE' },
  'partner_users.partner_id': { parent: 'partners', column: 'id', on_delete: 'CASCADE' },
  
  // AI Models/Workflows
  'ai_models.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'ai_workflows.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'ai_workflows.ai_model_id': { parent: 'ai_models', column: 'id', on_delete: 'SET NULL' },
  'ai_executions.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'ai_executions.workflow_id': { parent: 'ai_workflows', column: 'id', on_delete: 'SET NULL' },
  'ai_executions.ai_model_id': { parent: 'ai_models', column: 'id', on_delete: 'SET NULL' },
  
  // Modules & Business Types
  'business_type_modules.business_type_id': { parent: 'business_types', column: 'id', on_delete: 'CASCADE' },
  'business_type_modules.module_id': { parent: 'modules', column: 'id', on_delete: 'CASCADE' },
  'tenant_modules.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'tenant_modules.module_id': { parent: 'modules', column: 'id', on_delete: 'CASCADE' },
  'module_dependencies.module_id': { parent: 'modules', column: 'id', on_delete: 'CASCADE' },
  'module_dependencies.depends_on_module_id': { parent: 'modules', column: 'id', on_delete: 'CASCADE' },
  'tenants.business_type_id': { parent: 'business_types', column: 'id', on_delete: 'SET NULL' },
  
  // Business Packages
  'business_packages.business_type_id': { parent: 'business_types', column: 'id', on_delete: 'SET NULL' },
  'package_features.package_id': { parent: 'business_packages', column: 'id', on_delete: 'CASCADE' },
  'package_modules.package_id': { parent: 'business_packages', column: 'id', on_delete: 'CASCADE' },
  'tenant_packages.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'tenant_packages.package_id': { parent: 'business_packages', column: 'id', on_delete: 'SET NULL' },
  
  // Recipes
  'recipes.product_id': { parent: 'products', column: 'id', on_delete: 'CASCADE' },
  'recipe_ingredients.recipe_id': { parent: 'recipes', column: 'id', on_delete: 'CASCADE' },
  'recipe_ingredients.product_id': { parent: 'products', column: 'id', on_delete: 'CASCADE' },
  'recipe_histories.recipe_id': { parent: 'recipes', column: 'id', on_delete: 'CASCADE' },
  
  // Production
  'productions.branch_id': { parent: 'branches', column: 'id', on_delete: 'CASCADE' },
  'productions.recipe_id': { parent: 'recipes', column: 'id', on_delete: 'SET NULL' },
  'production_materials.production_id': { parent: 'productions', column: 'id', on_delete: 'CASCADE' },
  'production_materials.product_id': { parent: 'products', column: 'id', on_delete: 'CASCADE' },
  'production_histories.production_id': { parent: 'productions', column: 'id', on_delete: 'CASCADE' },
  'production_wastes.production_id': { parent: 'productions', column: 'id', on_delete: 'CASCADE' },
  
  // Promo
  'promo_bundles.promo_id': { parent: 'promos', column: 'id', on_delete: 'CASCADE' },
  'promo_products.promo_id': { parent: 'promos', column: 'id', on_delete: 'CASCADE' },
  'promo_categories.promo_id': { parent: 'promos', column: 'id', on_delete: 'CASCADE' },
  
  // Audit Logs
  'audit_logs.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'audit_logs.user_id': { parent: 'users', column: 'id', on_delete: 'SET NULL' },
  
  // Assets
  'assets.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  'assets.category_id': { parent: 'asset_categories', column: 'id', on_delete: 'SET NULL' },
  'asset_licenses.asset_id': { parent: 'assets', column: 'id', on_delete: 'CASCADE' },
  'asset_movements.asset_id': { parent: 'assets', column: 'id', on_delete: 'CASCADE' },
  'asset_maintenance_schedules.asset_id': { parent: 'assets', column: 'id', on_delete: 'CASCADE' },
  'asset_tenancies.asset_id': { parent: 'assets', column: 'id', on_delete: 'CASCADE' },
  'asset_work_orders.asset_id': { parent: 'assets', column: 'id', on_delete: 'CASCADE' },
  
  // Warehouse & Locations
  'locations.warehouse_id': { parent: 'warehouses', column: 'id', on_delete: 'CASCADE' },
  'warehouses.branch_id': { parent: 'branches', column: 'id', on_delete: 'SET NULL' },
  'warehouses.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  
  // Stock Opname
  'stock_opnames.warehouse_id': { parent: 'warehouses', column: 'id', on_delete: 'CASCADE' },
  'stock_opnames.branch_id': { parent: 'branches', column: 'id', on_delete: 'CASCADE' },
  'stock_opname_items.opname_id': { parent: 'stock_opnames', column: 'id', on_delete: 'CASCADE' },
  'stock_opname_items.product_id': { parent: 'products', column: 'id', on_delete: 'CASCADE' },
  
  // Shifts
  'shift_handovers.shift_id': { parent: 'shifts', column: 'id', on_delete: 'CASCADE' },
  'shift_handovers.from_employee_id': { parent: 'employees', column: 'id', on_delete: 'SET NULL' },
  'shift_handovers.to_employee_id': { parent: 'employees', column: 'id', on_delete: 'SET NULL' },
  'shifts.branch_id': { parent: 'branches', column: 'id', on_delete: 'CASCADE' },
  'employee_schedules.employee_id': { parent: 'employees', column: 'id', on_delete: 'CASCADE' },
  'employee_schedules.shift_id': { parent: 'shifts', column: 'id', on_delete: 'SET NULL' },
  'shift_templates.branch_id': { parent: 'branches', column: 'id', on_delete: 'CASCADE' },
  
  // Loyalty
  'customer_loyalty.customer_id': { parent: 'customers', column: 'id', on_delete: 'CASCADE' },
  'customer_loyalty.tier_id': { parent: 'loyalty_tiers', column: 'id', on_delete: 'SET NULL' },
  'loyalty_tiers.loyalty_program_id': { parent: 'loyalty_programs', column: 'id', on_delete: 'CASCADE' },
  'loyalty_rewards.loyalty_program_id': { parent: 'loyalty_programs', column: 'id', on_delete: 'CASCADE' },
  'point_transactions.customer_loyalty_id': { parent: 'customer_loyalty', column: 'id', on_delete: 'CASCADE' },
  'reward_redemptions.customer_loyalty_id': { parent: 'customer_loyalty', column: 'id', on_delete: 'CASCADE' },
  'reward_redemptions.reward_id': { parent: 'loyalty_rewards', column: 'id', on_delete: 'SET NULL' },
  
  // Notifications
  'notification_settings.user_id': { parent: 'users', column: 'id', on_delete: 'CASCADE' },
  'notification_settings.tenant_id': { parent: 'tenants', column: 'id', on_delete: 'CASCADE' },
  
  // Dashboard Configurations
  'dashboard_configurations.business_type_id': { parent: 'business_types', column: 'id', on_delete: 'CASCADE' },
  
  // Good Receipt
  'goods_receipts.purchase_order_id': { parent: 'purchase_orders', column: 'id', on_delete: 'SET NULL' },
  'goods_receipts.branch_id': { parent: 'branches', column: 'id', on_delete: 'CASCADE' },
  'goods_receipt_items.goods_receipt_id': { parent: 'goods_receipts', column: 'id', on_delete: 'CASCADE' },
  'goods_receipt_items.product_id': { parent: 'products', column: 'id', on_delete: 'CASCADE' },
  
  // Sync
  'sync_logs.branch_id': { parent: 'branches', column: 'id', on_delete: 'CASCADE' },
  
  // Product Cost
  'product_cost_history.product_id': { parent: 'products', column: 'id', on_delete: 'CASCADE' },
  'product_cost_components.product_id': { parent: 'products', column: 'id', on_delete: 'CASCADE' },
  
  // Tables & Reservations
  'tables.branch_id': { parent: 'branches', column: 'id', on_delete: 'CASCADE' },
  'reservations.table_id': { parent: 'tables', column: 'id', on_delete: 'CASCADE' },
  'reservations.customer_id': { parent: 'customers', column: 'id', on_delete: 'SET NULL' },
  'table_sessions.table_id': { parent: 'tables', column: 'id', on_delete: 'SET NULL' },
  'table_sessions.transaction_id': { parent: 'pos_transactions', column: 'id', on_delete: 'SET NULL' },
  'held_transactions.branch_id': { parent: 'branches', column: 'id', on_delete: 'CASCADE' },
};

async function getExistingFKs() {
  const result = await client.query(`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      tc.constraint_name,
      rc.update_rule,
      rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu 
      ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints rc 
      ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    ORDER BY tc.table_name, kcu.column_name
  `);
  return result.rows;
}

async function getAllTables() {
  const result = await client.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  return result.rows.map(r => r.tablename);
}

async function getColumnsWithId(tableName) {
  const result = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = $1 
      AND schemaname = 'public'
      AND (column_name LIKE '%_id' OR column_name LIKE '%Id')
    ORDER BY column_name
  `, [tableName]);
  return result.rows;
}

async function checkOrphanedRecords(tableName, columnName, parentTable, parentColumn) {
  // Cek apakah tabel parent ada
  const parentExists = await client.query(`
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = $1 AND schemaname = 'public')
  `, [parentTable]);
  
  if (!parentExists.rows[0].exists) {
    return { error: `Parent table ${parentTable} does not exist`, count: null };
  }
  
  // Cek apakah kolom ada di tabel child
  const childColExists = await client.query(`
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2)
  `, [tableName, columnName]);
  
  if (!childColExists.rows[0].exists) {
    return { error: `Column ${tableName}.${columnName} does not exist`, count: null };
  }
  
  try {
    const result = await client.query(`
      SELECT COUNT(*) as count
      FROM "${tableName}" t
      WHERE t."${columnName}" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "${parentTable}" p WHERE p."${parentColumn}" = t."${columnName}"
        )
    `);
    return { count: parseInt(result.rows[0].count), error: null };
  } catch (err) {
    return { error: err.message, count: null };
  }
}

async function main() {
  console.log('🚀 DB FK Analysis - Bedagang ERP');
  console.log('==================================\n');
  
  try {
    await client.connect();
    console.log(`✅ Connected to: ${client.database} @ ${client.host}`);
    
    // 1. Dapatkan semua existing FKs
    const existingFKs = await getExistingFKs();
    console.log(`\n📊 Existing FK Constraints: ${existingFKs.length}`);
    
    const fkMap = new Map();
    existingFKs.forEach(fk => {
      const key = `${fk.table_name}.${fk.column_name}`;
      fkMap.set(key, fk);
    });
    
    // 2. Dapatkan semua tabel
    const allTables = await getAllTables();
    console.log(`📊 Total tables: ${allTables.length}`);
    
    // 3. Analisis: cari kolom _id yang TANPA FK constraint
    console.log('\n🔍 Scanning for potential missing FKs...\n');
    
    const missingFKs = [];
    const mappingFKs = [];
    const orphanedReport = [];
    
    // a. Cek berdasarkan mapping eksplisit
    for (const [childKey, mapping] of Object.entries(FK_MAPPING)) {
      const [tableName, columnName] = childKey.split('.');
      
      // Skip jika tabel tidak ada
      const tableExists = allTables.includes(tableName);
      const parentExists = allTables.includes(mapping.parent);
      
      if (!tableExists || !parentExists) continue;
      
      // Cek apakah sudah punya FK
      const hasFK = fkMap.has(childKey);
      
      if (!hasFK) {
        // Cek orphaned records
        const orphaned = await checkOrphanedRecords(
          tableName, columnName, mapping.parent, mapping.column
        );
        
        mappingFKs.push({
          table: tableName,
          column: columnName,
          parent_table: mapping.parent,
          parent_column: mapping.column,
          on_delete: mapping.on_delete,
          orphaned_count: orphaned.count,
          orphaned_error: orphaned.error
        });
        
        if (orphaned.count && orphaned.count > 0) {
          orphanedReport.push({
            table: tableName,
            column: columnName,
            parent: mapping.parent,
            count: orphaned.count
          });
        }
      }
    }
    
    // b. Cek kolom _id lain yang tidak ada di mapping
    for (const tableName of allTables) {
      if (tableName === 'SequelizeMeta') continue;
      
      const columns = await getColumnsWithId(tableName);
      
      for (const col of columns) {
        const key = `${tableName}.${col.column_name}`;
        
        // Skip jika sudah ada di mapping atau sudah punya FK
        if (FK_MAPPING[key] || fkMap.has(key)) continue;
        
        // Coba infer tabel parent berdasarkan nama kolom
        let inferredParent = null;
        
        // Konversi snake_case ke nama tabel
        // store_id -> stores, customer_id -> customers, dst.
        const baseName = col.column_name
          .replace(/_id$/, '')
          .replace(/Id$/, '');
        
        // Coba berbagai kemungkinan nama tabel
        const candidates = [
          baseName + 's',              // store -> stores
          baseName,                     // transaction -> transaction
          baseName.replace(/_/g, '_'),  // sama
        ];
        
        // Special cases
        if (baseName === 'tenant') candidates.push('tenants');
        if (baseName === 'user') candidates.push('users', 'employees');
        if (baseName === 'employee') candidates.push('employees', 'users');
        if (baseName === 'product') candidates.push('products');
        if (baseName === 'customer') candidates.push('customers', 'crm_customers');
        if (baseName === 'branch') candidates.push('branches');
        if (baseName === 'store') candidates.push('stores');
        if (baseName === 'invoice') candidates.push('invoices', 'finance_invoices');
        if (baseName === 'transaction') candidates.push('pos_transactions', 'finance_transactions');
        if (baseName === 'order') candidates.push('sales_orders', 'purchase_orders');
        
        for (const cand of candidates) {
          if (allTables.includes(cand)) {
            inferredParent = cand;
            break;
          }
        }
        
        missingFKs.push({
          table: tableName,
          column: col.column_name,
          data_type: col.data_type,
          nullable: col.is_nullable,
          inferred_parent: inferredParent
        });
      }
    }
    
    // 4. Generate Report
    console.log('\n' + '='.repeat(80));
    console.log('📋 REPORT - Missing FK Constraints (From Explicit Mapping)');
    console.log('='.repeat(80));
    
    if (mappingFKs.length === 0) {
      console.log('\n✅ Semua FK dari mapping sudah ada!');
    } else {
      console.log(`\n⚠️  ${mappingFKs.length} FK constraints missing dari mapping:\n`);
      
      mappingFKs.forEach((fk, i) => {
        const orphanNote = fk.orphaned_count !== null 
          ? ` (⚠️ ${fk.orphaned_count} orphaned records!)` 
          : fk.orphaned_error 
            ? ` (error: ${fk.orphaned_error})`
            : '';
        
        console.log(`${i + 1}. ${fk.table}.${fk.column} → ${fk.parent_table}.${fk.parent_column}`);
        console.log(`   ON DELETE: ${fk.on_delete}${orphanNote}`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🔍 Orphaned Records Report');
    console.log('='.repeat(80));
    
    if (orphanedReport.length === 0) {
      console.log('\n✅ Tidak ada orphaned records!');
    } else {
      console.log(`\n⚠️  ${orphanedReport.length} tabel dengan orphaned records:\n`);
      orphanedReport.forEach(r => {
        console.log(`  ${r.table}.${r.column} → ${r.parent}: ${r.count} records`);
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('❓ Other _id Columns Without FK (Need Review)');
    console.log('='.repeat(80));
    
    if (missingFKs.length === 0) {
      console.log('\n✅ Semua kolom _id sudah punya FK constraint!');
    } else {
      console.log(`\n⚠️  ${missingFKs.length} kolom _id tanpa FK constraint (butuh review):\n`);
      
      // Group by table
      const byTable = {};
      missingFKs.forEach(fk => {
        if (!byTable[fk.table]) byTable[fk.table] = [];
        byTable[fk.table].push(fk);
      });
      
      Object.keys(byTable).sort().forEach(table => {
        console.log(`📁 ${table}:`);
        byTable[table].forEach(fk => {
          const parentNote = fk.inferred_parent 
            ? ` (inferred parent: ${fk.inferred_parent})` 
            : ' (no parent inferred)';
          console.log(`   - ${fk.column} (${fk.data_type}, nullable: ${fk.nullable})${parentNote}`);
        });
      });
    }
    
    // 5. Generate Migration Script
    console.log('\n' + '='.repeat(80));
    console.log('🛠️  Suggested Migration Script');
    console.log('='.repeat(80));
    
    if (mappingFKs.length > 0) {
      console.log('\n📝 Buat migration file dengan isi berikut:\n');
      
      console.log("'use strict';\n");
      console.log("module.exports = {");
      console.log("  up: async (queryInterface, Sequelize) => {");
      
      mappingFKs.forEach(fk => {
        const constraintName = `${fk.table}_${fk.column}_fkey`;
        console.log(`    console.log('➕ Adding FK: ${fk.table}.${fk.column} → ${fk.parent_table}');`);
        console.log(`    await queryInterface.addConstraint('${fk.table}', {`);
        console.log(`      fields: ['${fk.column}'],`);
        console.log(`      type: 'foreign key',`);
        console.log(`      name: '${constraintName}',`);
        console.log(`      references: {`);
        console.log(`        table: '${fk.parent_table}',`);
        console.log(`        field: '${fk.parent_column}'`);
        console.log(`      },`);
        console.log(`      onUpdate: 'CASCADE',`);
        console.log(`      onDelete: '${fk.on_delete}'`);
        console.log(`    });`);
        console.log(``);
      });
      
      console.log("  },");
      console.log("");
      console.log("  down: async (queryInterface, Sequelize) => {");
      
      mappingFKs.slice().reverse().forEach(fk => {
        const constraintName = `${fk.table}_${fk.column}_fkey`;
        console.log(`    console.log('🗑️  Removing FK: ${constraintName}');`);
        console.log(`    await queryInterface.removeConstraint('${fk.table}', '${constraintName}');`);
        console.log(``);
      });
      
      console.log("  }");
      console.log("};");
    }
    
    // 6. Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`
  • Existing FK constraints: ${existingFKs.length}
  • Missing FKs (from mapping): ${mappingFKs.length}
  • Orphaned records found: ${orphanedReport.reduce((sum, r) => sum + r.count, 0)}
  • Other _id columns without FK: ${missingFKs.length}
`);
    
    if (orphanedReport.length > 0) {
      console.log('⚠️  PERINGATAN: Ada orphaned records! Bersihkan terlebih dahulu sebelum menambah FK constraint.');
    }
    
    await client.end();
    console.log('\n✅ Done!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    try { await client.end(); } catch(e) {}
    process.exit(1);
  }
}

main();
