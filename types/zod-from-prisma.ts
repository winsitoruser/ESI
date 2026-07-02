// ============================================================
// ZOD SCHEMAS FROM PRISMA INTROSPECTION
// ============================================================
// Auto-generated from prisma/schema.prisma
// Generated: 2026-06-27T17:38:05.154Z
// Generator: scripts/generate-zod-from-prisma.js
//
// These schemas are derived from the database introspection via Prisma.
// More complete than Sequelize-based static parsing.
//
// Models: 212
// Enums: 49
// ============================================================

import { z } from 'zod';

// ============================================================
// ENUMS
// ============================================================

export const enum_Customers_customerTypeSchema = z.enum(["individual", "corporate"]);
export type enum_Customers_customerType = z.infer<typeof enum_Customers_customerTypeSchema>;

export const enum_billing_cycles_statusSchema = z.enum(["pending", "processing", "paid", "failed", "cancelled"]);
export type enum_billing_cycles_status = z.infer<typeof enum_billing_cycles_statusSchema>;

export const enum_branches_sync_statusSchema = z.enum(["synced", "pending", "failed", "never"]);
export type enum_branches_sync_status = z.infer<typeof enum_branches_sync_statusSchema>;

export const enum_branches_typeSchema = z.enum(["main", "branch", "warehouse", "kiosk"]);
export type enum_branches_type = z.infer<typeof enum_branches_typeSchema>;

export const enum_customers_customerTypeSchema = z.enum(["individual", "corporate"]);
export type enum_customers_customerType = z.infer<typeof enum_customers_customerTypeSchema>;

export const enum_customers_genderSchema = z.enum(["male", "female", "other"]);
export type enum_customers_gender = z.infer<typeof enum_customers_genderSchema>;

export const enum_customers_membershipLevelSchema = z.enum(["Bronze", "Silver", "Gold", "Platinum"]);
export type enum_customers_membershipLevel = z.infer<typeof enum_customers_membershipLevelSchema>;

export const enum_customers_statusSchema = z.enum(["active", "inactive", "blocked"]);
export type enum_customers_status = z.infer<typeof enum_customers_statusSchema>;

export const enum_customers_typeSchema = z.enum(["walk_in @map(\"walk-in\")", "member", "vip"]);
export type enum_customers_type = z.infer<typeof enum_customers_typeSchema>;

export const enum_employees_departmentSchema = z.enum(["MANAGEMENT", "OPERATIONS", "SALES", "FINANCE", "ADMINISTRATION", "WAREHOUSE", "KITCHEN", "CUSTOMER_SERVICE", "IT", "HR", "CLINICAL", "PHARMACY", "MARKETING", "LOGISTICS", "PRODUCTION"]);
export type enum_employees_department = z.infer<typeof enum_employees_departmentSchema>;

export const enum_employees_maritalStatusSchema = z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]);
export type enum_employees_maritalStatus = z.infer<typeof enum_employees_maritalStatusSchema>;

export const enum_employees_roleSchema = z.enum(["ADMIN", "MANAGER", "SUPERVISOR", "STAFF", "CASHIER", "INVENTORY_MANAGER", "WAREHOUSE_STAFF", "DRIVER", "CHEF", "WAITER", "DOCTOR", "NURSE", "PHARMACIST", "RECEPTIONIST", "SALES_REP"]);
export type enum_employees_role = z.infer<typeof enum_employees_roleSchema>;

export const enum_employees_statusSchema = z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"]);
export type enum_employees_status = z.infer<typeof enum_employees_statusSchema>;

export const enum_employees_workLocationSchema = z.enum(["MAIN_STORE", "WAREHOUSE", "CASHIER_FRONT", "KITCHEN", "FRONT_DESK", "ADMIN_OFFICE", "FINANCE_DEPT", "FIELD", "MAIN_PHARMACY", "CLINIC_PHARMACY", "CASHIER_PHARMACY", "GENERAL_CLINIC", "SPECIALIST_CLINIC", "REGISTRATION", "LAB_SECTION", "INVENTORY", "MULTIPLE", "REMOTE"]);
export type enum_employees_workLocation = z.infer<typeof enum_employees_workLocationSchema>;

export const enum_finance_accounts_accountTypeSchema = z.enum(["asset", "liability", "equity", "revenue", "expense"]);
export type enum_finance_accounts_accountType = z.infer<typeof enum_finance_accounts_accountTypeSchema>;

export const enum_finance_budgets_budgetPeriodSchema = z.enum(["monthly", "quarterly", "yearly"]);
export type enum_finance_budgets_budgetPeriod = z.infer<typeof enum_finance_budgets_budgetPeriodSchema>;

export const enum_finance_budgets_statusSchema = z.enum(["active", "completed", "exceeded", "cancelled"]);
export type enum_finance_budgets_status = z.infer<typeof enum_finance_budgets_statusSchema>;

export const enum_finance_invoices_inventoryStatusSchema = z.enum(["pending", "partial", "complete"]);
export type enum_finance_invoices_inventoryStatus = z.infer<typeof enum_finance_invoices_inventoryStatusSchema>;

export const enum_finance_invoices_paymentStatusSchema = z.enum(["unpaid", "partial", "paid"]);
export type enum_finance_invoices_paymentStatus = z.infer<typeof enum_finance_invoices_paymentStatusSchema>;

export const enum_finance_invoices_statusSchema = z.enum(["pending", "received", "delivered", "cancelled"]);
export type enum_finance_invoices_status = z.infer<typeof enum_finance_invoices_statusSchema>;

export const enum_finance_invoices_typeSchema = z.enum(["supplier", "customer"]);
export type enum_finance_invoices_type = z.infer<typeof enum_finance_invoices_typeSchema>;

export const enum_finance_payables_statusSchema = z.enum(["unpaid", "partial", "paid", "overdue"]);
export type enum_finance_payables_status = z.infer<typeof enum_finance_payables_statusSchema>;

export const enum_finance_receivables_statusSchema = z.enum(["unpaid", "partial", "paid", "overdue"]);
export type enum_finance_receivables_status = z.infer<typeof enum_finance_receivables_statusSchema>;

export const enum_finance_transactions_paymentMethodSchema = z.enum(["cash", "bank_transfer", "credit_card", "debit_card", "e_wallet", "other"]);
export type enum_finance_transactions_paymentMethod = z.infer<typeof enum_finance_transactions_paymentMethodSchema>;

export const enum_finance_transactions_referenceTypeSchema = z.enum(["invoice", "bill", "order", "manual", "other"]);
export type enum_finance_transactions_referenceType = z.infer<typeof enum_finance_transactions_referenceTypeSchema>;

export const enum_finance_transactions_statusSchema = z.enum(["pending", "completed", "cancelled"]);
export type enum_finance_transactions_status = z.infer<typeof enum_finance_transactions_statusSchema>;

export const enum_finance_transactions_transactionTypeSchema = z.enum(["income", "expense", "transfer"]);
export type enum_finance_transactions_transactionType = z.infer<typeof enum_finance_transactions_transactionTypeSchema>;

export const enum_invoices_statusSchema = z.enum(["draft", "sent", "paid", "overdue", "cancelled", "refunded"]);
export type enum_invoices_status = z.infer<typeof enum_invoices_statusSchema>;

export const enum_kitchen_inventory_items_statusSchema = z.enum(["good", "low", "critical", "overstock"]);
export type enum_kitchen_inventory_items_status = z.infer<typeof enum_kitchen_inventory_items_statusSchema>;

export const enum_kitchen_inventory_transactions_transaction_typeSchema = z.enum(["in", "out", "adjustment", "waste", "transfer"]);
export type enum_kitchen_inventory_transactions_transaction_type = z.infer<typeof enum_kitchen_inventory_transactions_transaction_typeSchema>;

export const enum_kitchen_order_items_statusSchema = z.enum(["pending", "preparing", "ready"]);
export type enum_kitchen_order_items_status = z.infer<typeof enum_kitchen_order_items_statusSchema>;

export const enum_kitchen_orders_order_typeSchema = z.enum(["dine_in  @map(\"dine-in\")", "takeaway", "delivery"]);
export type enum_kitchen_orders_order_type = z.infer<typeof enum_kitchen_orders_order_typeSchema>;

export const enum_kitchen_orders_prioritySchema = z.enum(["normal", "urgent"]);
export type enum_kitchen_orders_priority = z.infer<typeof enum_kitchen_orders_prioritySchema>;

export const enum_kitchen_orders_statusSchema = z.enum(["new", "preparing", "ready", "served", "cancelled"]);
export type enum_kitchen_orders_status = z.infer<typeof enum_kitchen_orders_statusSchema>;

export const enum_loyalty_rewards_rewardTypeSchema = z.enum(["discount", "product", "shipping", "voucher", "service"]);
export type enum_loyalty_rewards_rewardType = z.infer<typeof enum_loyalty_rewards_rewardTypeSchema>;

export const enum_payment_transactions_statusSchema = z.enum(["pending", "processing", "completed", "failed", "refunded"]);
export type enum_payment_transactions_status = z.infer<typeof enum_payment_transactions_statusSchema>;

export const enum_plans_billing_intervalSchema = z.enum(["monthly", "yearly"]);
export type enum_plans_billing_interval = z.infer<typeof enum_plans_billing_intervalSchema>;

export const enum_point_transactions_referenceTypeSchema = z.enum(["pos_transaction", "reward_redemption", "manual", "expiry", "refund"]);
export type enum_point_transactions_referenceType = z.infer<typeof enum_point_transactions_referenceTypeSchema>;

export const enum_point_transactions_transactionTypeSchema = z.enum(["earn", "redeem", "expire", "adjust", "refund"]);
export type enum_point_transactions_transactionType = z.infer<typeof enum_point_transactions_transactionTypeSchema>;

export const enum_pos_transactions_order_typeSchema = z.enum(["dine_in  @map(\"dine-in\")", "takeaway", "delivery"]);
export type enum_pos_transactions_order_type = z.infer<typeof enum_pos_transactions_order_typeSchema>;

export const enum_pos_transactions_payment_methodSchema = z.enum(["cash", "card", "transfer", "ewallet", "mixed"]);
export type enum_pos_transactions_payment_method = z.infer<typeof enum_pos_transactions_payment_methodSchema>;

export const enum_pos_transactions_payment_statusSchema = z.enum(["pending", "paid", "refunded", "void"]);
export type enum_pos_transactions_payment_status = z.infer<typeof enum_pos_transactions_payment_statusSchema>;

export const enum_pos_transactions_statusSchema = z.enum(["open", "closed", "void"]);
export type enum_pos_transactions_status = z.infer<typeof enum_pos_transactions_statusSchema>;

export const enum_subscriptions_statusSchema = z.enum(["trial", "active", "past_due", "cancelled", "expired"]);
export type enum_subscriptions_status = z.infer<typeof enum_subscriptions_statusSchema>;

export const enum_sync_logs_directionSchema = z.enum(["hq_to_branch", "branch_to_hq"]);
export type enum_sync_logs_direction = z.infer<typeof enum_sync_logs_directionSchema>;

export const enum_sync_logs_statusSchema = z.enum(["pending", "in_progress", "completed", "failed"]);
export type enum_sync_logs_status = z.infer<typeof enum_sync_logs_statusSchema>;

export const enum_sync_logs_sync_typeSchema = z.enum(["products", "prices", "promotions", "settings", "inventory", "full"]);
export type enum_sync_logs_sync_type = z.infer<typeof enum_sync_logs_sync_typeSchema>;

export const enum_tenants_statusSchema = z.enum(["active", "inactive", "suspended", "trial"]);
export type enum_tenants_status = z.infer<typeof enum_tenants_statusSchema>;

export const enum_users_roleSchema = z.enum(["super_admin", "owner", "admin", "manager", "cashier", "staff"]);
export type enum_users_role = z.infer<typeof enum_users_roleSchema>;


// ============================================================
// MODEL SCHEMAS
// ============================================================

export const CustomersSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  createdAt: z.coerce.date().nullish(),
  updatedAt: z.coerce.date().nullish(),
  customerType: z.enum(["individual", "corporate"]),
  companyName: z.string().nullish(),
  picName: z.string().nullish(),
  picPosition: z.string().nullish(),
  contact1: z.string().nullish(),
  contact2: z.string().nullish(),
  companyEmail: z.string().nullish(),
  companyAddress: z.string().nullish(),
  taxId: z.string().nullish(),
  customer_loyalty: z.string().nullish(),
  finance_receivables: z.string()
});

export const CustomersCreateSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  customerType: z.enum(["individual", "corporate"]).optional(),
  companyName: z.string().optional(),
  picName: z.string().optional(),
  picPosition: z.string().optional(),
  contact1: z.string().optional(),
  contact2: z.string().optional(),
  companyEmail: z.string().optional(),
  companyAddress: z.string().optional(),
  taxId: z.string().optional(),
  customer_loyalty: z.string().optional(),
  finance_receivables: z.string()
});

export const CustomersUpdateSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  customerType: z.enum(["individual", "corporate"]).optional(),
  companyName: z.string().optional(),
  picName: z.string().optional(),
  picPosition: z.string().optional(),
  contact1: z.string().optional(),
  contact2: z.string().optional(),
  companyEmail: z.string().optional(),
  companyAddress: z.string().optional(),
  taxId: z.string().optional(),
  customer_loyalty: z.string().optional(),
  finance_receivables: z.string().optional()
});

export const SequelizeMetaSchema = z.object({
  name: z.string()
});

export const SequelizeMetaCreateSchema = z.object({
  name: z.string()
});

export const SequelizeMetaUpdateSchema = z.object({
  name: z.string().optional()
});

export const activation_requestsSchema = z.object({
  id: z.string().uuid(),
  partner_id: z.string().uuid().nullish(),
  package_id: z.string().uuid().nullish(),
  business_documents: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  notes: z.string().nullish(),
  status: z.string().nullish(),
  reviewed_by: z.string().uuid().nullish(),
  reviewed_at: z.coerce.date().nullish(),
  review_notes: z.string().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const activation_requestsCreateSchema = z.object({
  partner_id: z.string().uuid().optional(),
  package_id: z.string().uuid().optional(),
  business_documents: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
  reviewed_by: z.string().uuid().optional(),
  reviewed_at: z.coerce.date().optional(),
  review_notes: z.string().optional()
});

export const activation_requestsUpdateSchema = z.object({
  partner_id: z.string().uuid().optional(),
  package_id: z.string().uuid().optional(),
  business_documents: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
  reviewed_by: z.string().uuid().optional(),
  reviewed_at: z.coerce.date().optional(),
  review_notes: z.string().optional()
});

export const ai_executionsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  workflow_id: z.string().uuid().nullish(),
  ai_model_id: z.string().uuid().nullish(),
  triggered_by: z.number().int().nullish(),
  trigger_type: z.string().nullish(),
  status: z.string().nullish(),
  input_data: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  output_data: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  error_message: z.string().nullish(),
  input_tokens: z.number().int().nullish(),
  output_tokens: z.number().int().nullish(),
  total_cost: z.number().nullish(),
  execution_time_ms: z.number().int().nullish(),
  entity_type: z.string().nullish(),
  entity_id: z.string().nullish(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const ai_executionsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  workflow_id: z.string().uuid().optional(),
  ai_model_id: z.string().uuid().optional(),
  triggered_by: z.number().int().optional(),
  trigger_type: z.string().optional(),
  status: z.string().optional(),
  input_data: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  output_data: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  error_message: z.string().optional(),
  input_tokens: z.number().int().optional(),
  output_tokens: z.number().int().optional(),
  total_cost: z.number().optional(),
  execution_time_ms: z.number().int().optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const ai_executionsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  workflow_id: z.string().uuid().optional(),
  ai_model_id: z.string().uuid().optional(),
  triggered_by: z.number().int().optional(),
  trigger_type: z.string().optional(),
  status: z.string().optional(),
  input_data: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  output_data: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  error_message: z.string().optional(),
  input_tokens: z.number().int().optional(),
  output_tokens: z.number().int().optional(),
  total_cost: z.number().optional(),
  execution_time_ms: z.number().int().optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const ai_modelsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  code: z.string(),
  name: z.string(),
  provider: z.string(),
  model_id: z.string(),
  description: z.string().nullish(),
  capabilities: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  config: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const ai_modelsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string(),
  name: z.string(),
  provider: z.string(),
  model_id: z.string(),
  description: z.string().optional(),
  capabilities: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  config: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const ai_modelsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  provider: z.string().optional(),
  model_id: z.string().optional(),
  description: z.string().optional(),
  capabilities: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  config: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const ai_workflowsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  category: z.string().nullish(),
  module: z.string().nullish(),
  ai_model_id: z.string().uuid().nullish(),
  system_prompt: z.string().nullish(),
  user_prompt_template: z.string().nullish(),
  input_schema: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const ai_workflowsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  module: z.string().optional(),
  ai_model_id: z.string().uuid().optional(),
  system_prompt: z.string().optional(),
  user_prompt_template: z.string().optional(),
  input_schema: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const ai_workflowsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  module: z.string().optional(),
  ai_model_id: z.string().uuid().optional(),
  system_prompt: z.string().optional(),
  user_prompt_template: z.string().optional(),
  input_schema: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const billing_cyclesSchema = z.object({
  id: z.string().uuid(),
  subscription_id: z.string().uuid(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  base_amount: z.number(),
  overage_amount: z.number(),
  discount_amount: z.number(),
  tax_amount: z.number(),
  total_amount: z.number(),
  currency: z.string(),
  status: z.enum(["pending", "processing", "paid", "failed", "cancelled"]),
  processed_at: z.coerce.date().nullish(),
  due_date: z.coerce.date(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  invoices: z.string(),
  payment_transactions: z.string()
});

export const billing_cyclesCreateSchema = z.object({
  subscription_id: z.string().uuid(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  base_amount: z.number().optional(),
  overage_amount: z.number().optional(),
  discount_amount: z.number().optional(),
  tax_amount: z.number().optional(),
  total_amount: z.number().optional(),
  currency: z.string().optional(),
  status: z.enum(["pending", "processing", "paid", "failed", "cancelled"]).optional(),
  processed_at: z.coerce.date().optional(),
  due_date: z.coerce.date(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  invoices: z.string(),
  payment_transactions: z.string()
});

export const billing_cyclesUpdateSchema = z.object({
  subscription_id: z.string().uuid().optional(),
  period_start: z.coerce.date().optional(),
  period_end: z.coerce.date().optional(),
  base_amount: z.number().optional(),
  overage_amount: z.number().optional(),
  discount_amount: z.number().optional(),
  tax_amount: z.number().optional(),
  total_amount: z.number().optional(),
  currency: z.string().optional(),
  status: z.enum(["pending", "processing", "paid", "failed", "cancelled"]).optional(),
  processed_at: z.coerce.date().optional(),
  due_date: z.coerce.date().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  invoices: z.string().optional(),
  payment_transactions: z.string().optional()
});

export const branchesSchema = z.object({
  id: z.string().uuid(),
  store_id: z.string().uuid().nullish(),
  code: z.string(),
  name: z.string(),
  type: z.enum(["main", "branch", "warehouse", "kiosk"]).nullish(),
  address: z.string().nullish(),
  city: z.string().nullish(),
  province: z.string().nullish(),
  postal_code: z.string().nullish(),
  phone: z.string().nullish(),
  email: z.string().nullish(),
  manager_id: z.number().int().nullish(),
  operating_hours: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  is_active: z.boolean().nullish(),
  settings: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const branchesCreateSchema = z.object({
  store_id: z.string().uuid().optional(),
  code: z.string(),
  name: z.string(),
  type: z.enum(["main", "branch", "warehouse", "kiosk"]).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  manager_id: z.number().int().optional(),
  operating_hours: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  is_active: z.boolean().optional(),
  settings: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const branchesUpdateSchema = z.object({
  store_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  type: z.enum(["main", "branch", "warehouse", "kiosk"]).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  manager_id: z.number().int().optional(),
  operating_hours: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  is_active: z.boolean().optional(),
  settings: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const business_packagesSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  industry_type: z.string().nullish(),
  business_type_id: z.string().uuid().nullish(),
  category: z.string().nullish(),
  icon: z.string().nullish(),
  color: z.string().nullish(),
  pricing_tier: z.string().nullish(),
  base_price: z.number().nullish(),
  is_active: z.boolean().nullish(),
  is_featured: z.boolean().nullish(),
  sort_order: z.number().int().nullish(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const business_packagesCreateSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  industry_type: z.string().optional(),
  business_type_id: z.string().uuid().optional(),
  category: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  pricing_tier: z.string().optional(),
  base_price: z.number().optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const business_packagesUpdateSchema = z.object({
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  industry_type: z.string().optional(),
  business_type_id: z.string().uuid().optional(),
  category: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  pricing_tier: z.string().optional(),
  base_price: z.number().optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const business_type_modulesSchema = z.object({
  id: z.string().uuid(),
  business_type_id: z.string().uuid(),
  module_id: z.string().uuid(),
  is_default: z.boolean().nullish(),
  is_optional: z.boolean().nullish(),
  created_at: z.coerce.date().nullish()
});

export const business_type_modulesCreateSchema = z.object({
  business_type_id: z.string().uuid(),
  module_id: z.string().uuid(),
  is_default: z.boolean().optional(),
  is_optional: z.boolean().optional()
});

export const business_type_modulesUpdateSchema = z.object({
  business_type_id: z.string().uuid().optional(),
  module_id: z.string().uuid().optional(),
  is_default: z.boolean().optional(),
  is_optional: z.boolean().optional()
});

export const business_typesSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  icon: z.string().nullish(),
  is_active: z.boolean().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  business_packages: z.string(),
  business_type_modules: z.string(),
  dashboard_configurations: z.string(),
  tenants: z.string()
});

export const business_typesCreateSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  is_active: z.boolean().optional(),
  business_packages: z.string(),
  business_type_modules: z.string(),
  dashboard_configurations: z.string(),
  tenants: z.string()
});

export const business_typesUpdateSchema = z.object({
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  is_active: z.boolean().optional(),
  business_packages: z.string().optional(),
  business_type_modules: z.string().optional(),
  dashboard_configurations: z.string().optional(),
  tenants: z.string().optional()
});

export const crm_automation_logsSchema = z.object({
  id: z.string().uuid(),
  rule_id: z.string().uuid().nullish(),
  trigger_event: z.string().nullish(),
  entity_type: z.string().nullish(),
  entity_id: z.string().uuid().nullish(),
  status: z.string().nullish(),
  actions_executed: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  error_message: z.string().nullish(),
  execution_time_ms: z.number().int().nullish(),
  created_at: z.coerce.date().nullish()
});

export const crm_automation_logsCreateSchema = z.object({
  rule_id: z.string().uuid().optional(),
  trigger_event: z.string().optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().uuid().optional(),
  status: z.string().optional(),
  actions_executed: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  error_message: z.string().optional(),
  execution_time_ms: z.number().int().optional()
});

export const crm_automation_logsUpdateSchema = z.object({
  rule_id: z.string().uuid().optional(),
  trigger_event: z.string().optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().uuid().optional(),
  status: z.string().optional(),
  actions_executed: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  error_message: z.string().optional(),
  execution_time_ms: z.number().int().optional()
});

export const crm_automation_rulesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  name: z.string(),
  description: z.string().nullish(),
  rule_type: z.string().nullish(),
  trigger_event: z.string().nullish(),
  trigger_entity: z.string().nullish(),
  trigger_conditions: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  actions: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  schedule_cron: z.string().nullish(),
  is_active: z.boolean().nullish(),
  execution_count: z.number().int().nullish(),
  last_executed_at: z.coerce.date().nullish(),
  error_count: z.number().int().nullish(),
  priority: z.number().int().nullish(),
  stop_on_match: z.boolean().nullish(),
  created_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  crm_automation_logs: z.string()
});

export const crm_automation_rulesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string(),
  description: z.string().optional(),
  rule_type: z.string().optional(),
  trigger_event: z.string().optional(),
  trigger_entity: z.string().optional(),
  trigger_conditions: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  actions: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  schedule_cron: z.string().optional(),
  is_active: z.boolean().optional(),
  execution_count: z.number().int().optional(),
  last_executed_at: z.coerce.date().optional(),
  error_count: z.number().int().optional(),
  priority: z.number().int().optional(),
  stop_on_match: z.boolean().optional(),
  created_by: z.number().int().optional(),
  crm_automation_logs: z.string()
});

export const crm_automation_rulesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  rule_type: z.string().optional(),
  trigger_event: z.string().optional(),
  trigger_entity: z.string().optional(),
  trigger_conditions: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  actions: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  schedule_cron: z.string().optional(),
  is_active: z.boolean().optional(),
  execution_count: z.number().int().optional(),
  last_executed_at: z.coerce.date().optional(),
  error_count: z.number().int().optional(),
  priority: z.number().int().optional(),
  stop_on_match: z.boolean().optional(),
  created_by: z.number().int().optional(),
  crm_automation_logs: z.string().optional()
});

export const crm_calendar_eventsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  title: z.string(),
  description: z.string().nullish(),
  event_type: z.string().nullish(),
  status: z.string().nullish(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  all_day: z.boolean().nullish(),
  timezone: z.string().nullish(),
  location: z.string().nullish(),
  is_virtual: z.boolean().nullish(),
  meeting_url: z.string().nullish(),
  customer_id: z.string().uuid().nullish(),
  contact_id: z.string().uuid().nullish(),
  opportunity_id: z.string().uuid().nullish(),
  task_id: z.string().uuid().nullish(),
  organizer_id: z.number().int().nullish(),
  attendees: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  is_recurring: z.boolean().nullish(),
  recurrence_rule: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  reminders: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const crm_calendar_eventsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  title: z.string(),
  description: z.string().optional(),
  event_type: z.string().optional(),
  status: z.string().optional(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  all_day: z.boolean().optional(),
  timezone: z.string().optional(),
  location: z.string().optional(),
  is_virtual: z.boolean().optional(),
  meeting_url: z.string().optional(),
  customer_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  task_id: z.string().uuid().optional(),
  organizer_id: z.number().int().optional(),
  attendees: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  is_recurring: z.boolean().optional(),
  recurrence_rule: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  reminders: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const crm_calendar_eventsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  event_type: z.string().optional(),
  status: z.string().optional(),
  start_time: z.coerce.date().optional(),
  end_time: z.coerce.date().optional(),
  all_day: z.boolean().optional(),
  timezone: z.string().optional(),
  location: z.string().optional(),
  is_virtual: z.boolean().optional(),
  meeting_url: z.string().optional(),
  customer_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  task_id: z.string().uuid().optional(),
  organizer_id: z.number().int().optional(),
  attendees: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  is_recurring: z.boolean().optional(),
  recurrence_rule: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  reminders: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const crm_comm_campaignsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  name: z.string(),
  campaign_type: z.string().nullish(),
  status: z.string().nullish(),
  template_id: z.string().uuid().nullish(),
  segment_id: z.string().uuid().nullish(),
  scheduled_start: z.coerce.date().nullish(),
  scheduled_end: z.coerce.date().nullish(),
  total_recipients: z.number().int().nullish(),
  total_sent: z.number().int().nullish(),
  total_opened: z.number().int().nullish(),
  total_clicked: z.number().int().nullish(),
  total_replied: z.number().int().nullish(),
  total_bounced: z.number().int().nullish(),
  settings: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const crm_comm_campaignsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string(),
  campaign_type: z.string().optional(),
  status: z.string().optional(),
  template_id: z.string().uuid().optional(),
  segment_id: z.string().uuid().optional(),
  scheduled_start: z.coerce.date().optional(),
  scheduled_end: z.coerce.date().optional(),
  total_recipients: z.number().int().optional(),
  total_sent: z.number().int().optional(),
  total_opened: z.number().int().optional(),
  total_clicked: z.number().int().optional(),
  total_replied: z.number().int().optional(),
  total_bounced: z.number().int().optional(),
  settings: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const crm_comm_campaignsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string().optional(),
  campaign_type: z.string().optional(),
  status: z.string().optional(),
  template_id: z.string().uuid().optional(),
  segment_id: z.string().uuid().optional(),
  scheduled_start: z.coerce.date().optional(),
  scheduled_end: z.coerce.date().optional(),
  total_recipients: z.number().int().optional(),
  total_sent: z.number().int().optional(),
  total_opened: z.number().int().optional(),
  total_clicked: z.number().int().optional(),
  total_replied: z.number().int().optional(),
  total_bounced: z.number().int().optional(),
  settings: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const crm_communicationsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  comm_number: z.string().nullish(),
  customer_id: z.string().uuid().nullish(),
  contact_id: z.string().uuid().nullish(),
  comm_type: z.string(),
  direction: z.string().nullish(),
  status: z.string().nullish(),
  subject: z.string().nullish(),
  body: z.string().nullish(),
  call_duration: z.number().int().nullish(),
  call_recording_url: z.string().nullish(),
  email_from: z.string().nullish(),
  email_to: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  email_cc: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  email_opened: z.boolean().nullish(),
  email_clicked: z.boolean().nullish(),
  meeting_location: z.string().nullish(),
  meeting_start: z.coerce.date().nullish(),
  meeting_end: z.coerce.date().nullish(),
  meeting_attendees: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  lead_id: z.string().uuid().nullish(),
  opportunity_id: z.string().uuid().nullish(),
  campaign_id: z.string().uuid().nullish(),
  template_id: z.string().uuid().nullish(),
  outcome: z.string().nullish(),
  next_action: z.string().nullish(),
  attachments: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const crm_communicationsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  comm_number: z.string().optional(),
  customer_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  comm_type: z.string(),
  direction: z.string().optional(),
  status: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  call_duration: z.number().int().optional(),
  call_recording_url: z.string().optional(),
  email_from: z.string().optional(),
  email_to: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  email_cc: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  email_opened: z.boolean().optional(),
  email_clicked: z.boolean().optional(),
  meeting_location: z.string().optional(),
  meeting_start: z.coerce.date().optional(),
  meeting_end: z.coerce.date().optional(),
  meeting_attendees: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  lead_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional(),
  template_id: z.string().uuid().optional(),
  outcome: z.string().optional(),
  next_action: z.string().optional(),
  attachments: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const crm_communicationsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  comm_number: z.string().optional(),
  customer_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  comm_type: z.string().optional(),
  direction: z.string().optional(),
  status: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  call_duration: z.number().int().optional(),
  call_recording_url: z.string().optional(),
  email_from: z.string().optional(),
  email_to: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  email_cc: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  email_opened: z.boolean().optional(),
  email_clicked: z.boolean().optional(),
  meeting_location: z.string().optional(),
  meeting_start: z.coerce.date().optional(),
  meeting_end: z.coerce.date().optional(),
  meeting_attendees: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  lead_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional(),
  template_id: z.string().uuid().optional(),
  outcome: z.string().optional(),
  next_action: z.string().optional(),
  attachments: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const crm_contactsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  customer_id: z.string().uuid().nullish(),
  first_name: z.string(),
  last_name: z.string().nullish(),
  title: z.string().nullish(),
  department: z.string().nullish(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  mobile: z.string().nullish(),
  whatsapp: z.string().nullish(),
  is_primary: z.boolean().nullish(),
  is_decision_maker: z.boolean().nullish(),
  role_in_deal: z.string().nullish(),
  communication_preference: z.string().nullish(),
  birthday: z.coerce.date().nullish(),
  social_linkedin: z.string().nullish(),
  notes: z.string().nullish(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  is_active: z.boolean().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  crm_communications: z.string(),
  crm_interactions: z.string()
});

export const crm_contactsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  first_name: z.string(),
  last_name: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  whatsapp: z.string().optional(),
  is_primary: z.boolean().optional(),
  is_decision_maker: z.boolean().optional(),
  role_in_deal: z.string().optional(),
  communication_preference: z.string().optional(),
  birthday: z.coerce.date().optional(),
  social_linkedin: z.string().optional(),
  notes: z.string().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  is_active: z.boolean().optional(),
  crm_communications: z.string(),
  crm_interactions: z.string()
});

export const crm_contactsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  whatsapp: z.string().optional(),
  is_primary: z.boolean().optional(),
  is_decision_maker: z.boolean().optional(),
  role_in_deal: z.string().optional(),
  communication_preference: z.string().optional(),
  birthday: z.coerce.date().optional(),
  social_linkedin: z.string().optional(),
  notes: z.string().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  is_active: z.boolean().optional(),
  crm_communications: z.string().optional(),
  crm_interactions: z.string().optional()
});

export const crm_custom_dashboardsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  name: z.string(),
  description: z.string().nullish(),
  layout: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  is_default: z.boolean().nullish(),
  is_public: z.boolean().nullish(),
  owner_id: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const crm_custom_dashboardsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string(),
  description: z.string().optional(),
  layout: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  is_default: z.boolean().optional(),
  is_public: z.boolean().optional(),
  owner_id: z.number().int().optional()
});

export const crm_custom_dashboardsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  layout: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  is_default: z.boolean().optional(),
  is_public: z.boolean().optional(),
  owner_id: z.number().int().optional()
});

export const crm_customer_segmentsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  name: z.string(),
  code: z.string().nullish(),
  description: z.string().nullish(),
  segment_type: z.string().nullish(),
  rules: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const crm_customer_segmentsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string(),
  code: z.string().optional(),
  description: z.string().optional(),
  segment_type: z.string().optional(),
  rules: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const crm_customer_segmentsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string().optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  segment_type: z.string().optional(),
  rules: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const crm_customer_tagsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  name: z.string(),
  color: z.string().nullish(),
  category: z.string().nullish(),
  usage_count: z.number().int().nullish(),
  created_at: z.coerce.date().nullish()
});

export const crm_customer_tagsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string(),
  color: z.string().optional(),
  category: z.string().optional(),
  usage_count: z.number().int().optional()
});

export const crm_customer_tagsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string().optional(),
  color: z.string().optional(),
  category: z.string().optional(),
  usage_count: z.number().int().optional()
});

export const crm_customersSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  customer_number: z.string().nullish(),
  company_name: z.string().nullish(),
  display_name: z.string(),
  customer_type: z.string().nullish(),
  industry: z.string().nullish(),
  company_size: z.string().nullish(),
  website: z.string().nullish(),
  address: z.string().nullish(),
  city: z.string().nullish(),
  province: z.string().nullish(),
  postal_code: z.string().nullish(),
  country: z.string().nullish(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
  lifecycle_stage: z.string().nullish(),
  customer_status: z.string().nullish(),
  acquisition_source: z.string().nullish(),
  acquisition_date: z.coerce.date().nullish(),
  health_score: z.number().int().nullish(),
  engagement_score: z.number().int().nullish(),
  ltv: z.number().nullish(),
  segment: z.string().nullish(),
  tier: z.string().nullish(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  custom_fields: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const crm_customersCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  customer_number: z.string().optional(),
  company_name: z.string().optional(),
  display_name: z.string(),
  customer_type: z.string().optional(),
  industry: z.string().optional(),
  company_size: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  lifecycle_stage: z.string().optional(),
  customer_status: z.string().optional(),
  acquisition_source: z.string().optional(),
  acquisition_date: z.coerce.date().optional(),
  health_score: z.number().int().optional(),
  engagement_score: z.number().int().optional(),
  ltv: z.number().optional(),
  segment: z.string().optional(),
  tier: z.string().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  custom_fields: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const crm_customersUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  customer_number: z.string().optional(),
  company_name: z.string().optional(),
  display_name: z.string().optional(),
  customer_type: z.string().optional(),
  industry: z.string().optional(),
  company_size: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  lifecycle_stage: z.string().optional(),
  customer_status: z.string().optional(),
  acquisition_source: z.string().optional(),
  acquisition_date: z.coerce.date().optional(),
  health_score: z.number().int().optional(),
  engagement_score: z.number().int().optional(),
  ltv: z.number().optional(),
  segment: z.string().optional(),
  tier: z.string().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  custom_fields: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const crm_deal_scoresSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  opportunity_id: z.string().uuid().nullish(),
  customer_id: z.string().uuid().nullish(),
  engagement_score: z.number().int().nullish(),
  fit_score: z.number().int().nullish(),
  behavior_score: z.number().int().nullish(),
  timing_score: z.number().int().nullish(),
  overall_score: z.number().int().nullish(),
  positive_signals: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  negative_signals: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  recommendations: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  win_probability: z.number().nullish(),
  risk_level: z.string().nullish(),
  risk_factors: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  score_date: z.coerce.date().nullish(),
  created_at: z.coerce.date().nullish()
});

export const crm_deal_scoresCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  engagement_score: z.number().int().optional(),
  fit_score: z.number().int().optional(),
  behavior_score: z.number().int().optional(),
  timing_score: z.number().int().optional(),
  overall_score: z.number().int().optional(),
  positive_signals: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  negative_signals: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  recommendations: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  win_probability: z.number().optional(),
  risk_level: z.string().optional(),
  risk_factors: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  score_date: z.coerce.date().optional()
});

export const crm_deal_scoresUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  engagement_score: z.number().int().optional(),
  fit_score: z.number().int().optional(),
  behavior_score: z.number().int().optional(),
  timing_score: z.number().int().optional(),
  overall_score: z.number().int().optional(),
  positive_signals: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  negative_signals: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  recommendations: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  win_probability: z.number().optional(),
  risk_level: z.string().optional(),
  risk_factors: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  score_date: z.coerce.date().optional()
});

export const crm_document_templatesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  name: z.string(),
  document_type: z.string().nullish(),
  content_html: z.string().nullish(),
  variables: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  is_active: z.boolean().nullish(),
  usage_count: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const crm_document_templatesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string(),
  document_type: z.string().optional(),
  content_html: z.string().optional(),
  variables: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  is_active: z.boolean().optional(),
  usage_count: z.number().int().optional()
});

export const crm_document_templatesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string().optional(),
  document_type: z.string().optional(),
  content_html: z.string().optional(),
  variables: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  is_active: z.boolean().optional(),
  usage_count: z.number().int().optional()
});

export const crm_documentsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  document_number: z.string().nullish(),
  title: z.string(),
  document_type: z.string().nullish(),
  status: z.string().nullish(),
  version: z.number().int().nullish(),
  file_url: z.string().nullish(),
  file_size: z.number().int().nullish(),
  file_type: z.string().nullish(),
  content_html: z.string().nullish(),
  customer_id: z.string().uuid().nullish(),
  opportunity_id: z.string().uuid().nullish(),
  template_id: z.string().uuid().nullish(),
  sent_at: z.coerce.date().nullish(),
  viewed_at: z.coerce.date().nullish(),
  signed_at: z.coerce.date().nullish(),
  expires_at: z.coerce.date().nullish(),
  view_count: z.number().int().nullish(),
  total_value: z.number().nullish(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const crm_documentsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  document_number: z.string().optional(),
  title: z.string(),
  document_type: z.string().optional(),
  status: z.string().optional(),
  version: z.number().int().optional(),
  file_url: z.string().optional(),
  file_size: z.number().int().optional(),
  file_type: z.string().optional(),
  content_html: z.string().optional(),
  customer_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  template_id: z.string().uuid().optional(),
  sent_at: z.coerce.date().optional(),
  viewed_at: z.coerce.date().optional(),
  signed_at: z.coerce.date().optional(),
  expires_at: z.coerce.date().optional(),
  view_count: z.number().int().optional(),
  total_value: z.number().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const crm_documentsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  document_number: z.string().optional(),
  title: z.string().optional(),
  document_type: z.string().optional(),
  status: z.string().optional(),
  version: z.number().int().optional(),
  file_url: z.string().optional(),
  file_size: z.number().int().optional(),
  file_type: z.string().optional(),
  content_html: z.string().optional(),
  customer_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  template_id: z.string().uuid().optional(),
  sent_at: z.coerce.date().optional(),
  viewed_at: z.coerce.date().optional(),
  signed_at: z.coerce.date().optional(),
  expires_at: z.coerce.date().optional(),
  view_count: z.number().int().optional(),
  total_value: z.number().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const crm_email_templatesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  name: z.string(),
  category: z.string().nullish(),
  subject: z.string().nullish(),
  body_html: z.string().nullish(),
  body_text: z.string().nullish(),
  variables: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  channel: z.string().nullish(),
  usage_count: z.number().int().nullish(),
  open_rate: z.number().nullish(),
  click_rate: z.number().nullish(),
  is_active: z.boolean().nullish(),
  created_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const crm_email_templatesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string(),
  category: z.string().optional(),
  subject: z.string().optional(),
  body_html: z.string().optional(),
  body_text: z.string().optional(),
  variables: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  channel: z.string().optional(),
  usage_count: z.number().int().optional(),
  open_rate: z.number().optional(),
  click_rate: z.number().optional(),
  is_active: z.boolean().optional(),
  created_by: z.number().int().optional()
});

export const crm_email_templatesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string().optional(),
  category: z.string().optional(),
  subject: z.string().optional(),
  body_html: z.string().optional(),
  body_text: z.string().optional(),
  variables: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  channel: z.string().optional(),
  usage_count: z.number().int().optional(),
  open_rate: z.number().optional(),
  click_rate: z.number().optional(),
  is_active: z.boolean().optional(),
  created_by: z.number().int().optional()
});

export const crm_follow_upsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  customer_id: z.string().uuid().nullish(),
  contact_id: z.string().uuid().nullish(),
  title: z.string(),
  description: z.string().nullish(),
  follow_up_type: z.string().nullish(),
  priority: z.string().nullish(),
  status: z.string().nullish(),
  due_date: z.coerce.date(),
  completed_date: z.coerce.date().nullish(),
  lead_id: z.string().uuid().nullish(),
  opportunity_id: z.string().uuid().nullish(),
  communication_id: z.string().uuid().nullish(),
  assigned_to: z.number().int().nullish(),
  reminder_sent: z.boolean().nullish(),
  reminder_minutes_before: z.number().int().nullish(),
  notes: z.string().nullish(),
  created_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const crm_follow_upsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  title: z.string(),
  description: z.string().optional(),
  follow_up_type: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  due_date: z.coerce.date(),
  completed_date: z.coerce.date().optional(),
  lead_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  communication_id: z.string().uuid().optional(),
  assigned_to: z.number().int().optional(),
  reminder_sent: z.boolean().optional(),
  reminder_minutes_before: z.number().int().optional(),
  notes: z.string().optional(),
  created_by: z.number().int().optional()
});

export const crm_follow_upsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  follow_up_type: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  due_date: z.coerce.date().optional(),
  completed_date: z.coerce.date().optional(),
  lead_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  communication_id: z.string().uuid().optional(),
  assigned_to: z.number().int().optional(),
  reminder_sent: z.boolean().optional(),
  reminder_minutes_before: z.number().int().optional(),
  notes: z.string().optional(),
  created_by: z.number().int().optional()
});

export const crm_forecast_itemsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  forecast_id: z.string().uuid().nullish(),
  opportunity_id: z.string().uuid().nullish(),
  customer_id: z.string().uuid().nullish(),
  description: z.string().nullish(),
  forecast_category: z.string().nullish(),
  amount: z.number().nullish(),
  probability: z.number().int().nullish(),
  weighted_amount: z.number().nullish(),
  expected_close_date: z.coerce.date().nullish(),
  stage: z.string().nullish(),
  notes: z.string().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const crm_forecast_itemsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  forecast_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  description: z.string().optional(),
  forecast_category: z.string().optional(),
  amount: z.number().optional(),
  probability: z.number().int().optional(),
  weighted_amount: z.number().optional(),
  expected_close_date: z.coerce.date().optional(),
  stage: z.string().optional(),
  notes: z.string().optional()
});

export const crm_forecast_itemsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  forecast_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  description: z.string().optional(),
  forecast_category: z.string().optional(),
  amount: z.number().optional(),
  probability: z.number().int().optional(),
  weighted_amount: z.number().optional(),
  expected_close_date: z.coerce.date().optional(),
  stage: z.string().optional(),
  notes: z.string().optional()
});

export const crm_forecastsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  name: z.string(),
  forecast_period: z.string().nullish(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  status: z.string().nullish(),
  target_revenue: z.number().nullish(),
  target_deals: z.number().int().nullish(),
  target_new_customers: z.number().int().nullish(),
  actual_revenue: z.number().nullish(),
  actual_deals: z.number().int().nullish(),
  actual_new_customers: z.number().int().nullish(),
  best_case: z.number().nullish(),
  most_likely: z.number().nullish(),
  worst_case: z.number().nullish(),
  accuracy_score: z.number().nullish(),
  owner_id: z.number().int().nullish(),
  team_id: z.string().uuid().nullish(),
  notes: z.string().nullish(),
  created_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  crm_forecast_items: z.string()
});

export const crm_forecastsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string(),
  forecast_period: z.string().optional(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  status: z.string().optional(),
  target_revenue: z.number().optional(),
  target_deals: z.number().int().optional(),
  target_new_customers: z.number().int().optional(),
  actual_revenue: z.number().optional(),
  actual_deals: z.number().int().optional(),
  actual_new_customers: z.number().int().optional(),
  best_case: z.number().optional(),
  most_likely: z.number().optional(),
  worst_case: z.number().optional(),
  accuracy_score: z.number().optional(),
  owner_id: z.number().int().optional(),
  team_id: z.string().uuid().optional(),
  notes: z.string().optional(),
  created_by: z.number().int().optional(),
  crm_forecast_items: z.string()
});

export const crm_forecastsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string().optional(),
  forecast_period: z.string().optional(),
  period_start: z.coerce.date().optional(),
  period_end: z.coerce.date().optional(),
  status: z.string().optional(),
  target_revenue: z.number().optional(),
  target_deals: z.number().int().optional(),
  target_new_customers: z.number().int().optional(),
  actual_revenue: z.number().optional(),
  actual_deals: z.number().int().optional(),
  actual_new_customers: z.number().int().optional(),
  best_case: z.number().optional(),
  most_likely: z.number().optional(),
  worst_case: z.number().optional(),
  accuracy_score: z.number().optional(),
  owner_id: z.number().int().optional(),
  team_id: z.string().uuid().optional(),
  notes: z.string().optional(),
  created_by: z.number().int().optional(),
  crm_forecast_items: z.string().optional()
});

export const crm_interactionsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  customer_id: z.string().uuid().nullish(),
  contact_id: z.string().uuid().nullish(),
  interaction_type: z.string(),
  direction: z.string().nullish(),
  subject: z.string().nullish(),
  description: z.string().nullish(),
  outcome: z.string().nullish(),
  duration_minutes: z.number().int().nullish(),
  interaction_date: z.coerce.date().nullish(),
  lead_id: z.string().uuid().nullish(),
  opportunity_id: z.string().uuid().nullish(),
  ticket_id: z.string().uuid().nullish(),
  sentiment: z.string().nullish(),
  sentiment_score: z.number().nullish(),
  channel: z.string().nullish(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const crm_interactionsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  interaction_type: z.string(),
  direction: z.string().optional(),
  subject: z.string().optional(),
  description: z.string().optional(),
  outcome: z.string().optional(),
  duration_minutes: z.number().int().optional(),
  interaction_date: z.coerce.date().optional(),
  lead_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  ticket_id: z.string().uuid().optional(),
  sentiment: z.string().optional(),
  sentiment_score: z.number().optional(),
  channel: z.string().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const crm_interactionsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  interaction_type: z.string().optional(),
  direction: z.string().optional(),
  subject: z.string().optional(),
  description: z.string().optional(),
  outcome: z.string().optional(),
  duration_minutes: z.number().int().optional(),
  interaction_date: z.coerce.date().optional(),
  lead_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  ticket_id: z.string().uuid().optional(),
  sentiment: z.string().optional(),
  sentiment_score: z.number().optional(),
  channel: z.string().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const crm_satisfactionSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  customer_id: z.string().uuid().nullish(),
  survey_type: z.string(),
  score: z.number().int(),
  comment: z.string().nullish(),
  trigger_event: z.string().nullish(),
  related_ticket_id: z.string().uuid().nullish(),
  related_order_id: z.string().uuid().nullish(),
  channel: z.string().nullish(),
  response_date: z.coerce.date().nullish(),
  created_at: z.coerce.date().nullish()
});

export const crm_satisfactionCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  survey_type: z.string(),
  score: z.number().int(),
  comment: z.string().optional(),
  trigger_event: z.string().optional(),
  related_ticket_id: z.string().uuid().optional(),
  related_order_id: z.string().uuid().optional(),
  channel: z.string().optional(),
  response_date: z.coerce.date().optional()
});

export const crm_satisfactionUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  survey_type: z.string().optional(),
  score: z.number().int().optional(),
  comment: z.string().optional(),
  trigger_event: z.string().optional(),
  related_ticket_id: z.string().uuid().optional(),
  related_order_id: z.string().uuid().optional(),
  channel: z.string().optional(),
  response_date: z.coerce.date().optional()
});

export const crm_saved_reportsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  name: z.string(),
  report_type: z.string().nullish(),
  description: z.string().nullish(),
  config: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const crm_saved_reportsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string(),
  report_type: z.string().optional(),
  description: z.string().optional(),
  config: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const crm_saved_reportsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string().optional(),
  report_type: z.string().optional(),
  description: z.string().optional(),
  config: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const crm_sla_policiesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  name: z.string(),
  description: z.string().nullish(),
  first_response_critical: z.number().int().nullish(),
  first_response_major: z.number().int().nullish(),
  first_response_minor: z.number().int().nullish(),
  resolution_critical: z.number().int().nullish(),
  resolution_major: z.number().int().nullish(),
  resolution_minor: z.number().int().nullish(),
  escalation_rules: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  business_hours: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const crm_sla_policiesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string(),
  description: z.string().optional(),
  first_response_critical: z.number().int().optional(),
  first_response_major: z.number().int().optional(),
  first_response_minor: z.number().int().optional(),
  resolution_critical: z.number().int().optional(),
  resolution_major: z.number().int().optional(),
  resolution_minor: z.number().int().optional(),
  escalation_rules: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  business_hours: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const crm_sla_policiesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  first_response_critical: z.number().int().optional(),
  first_response_major: z.number().int().optional(),
  first_response_minor: z.number().int().optional(),
  resolution_critical: z.number().int().optional(),
  resolution_major: z.number().int().optional(),
  resolution_minor: z.number().int().optional(),
  escalation_rules: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  business_hours: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const crm_task_templatesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  name: z.string(),
  description: z.string().nullish(),
  task_type: z.string().nullish(),
  default_priority: z.string().nullish(),
  due_days_offset: z.number().int().nullish(),
  checklist_template: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  auto_assign_role: z.string().nullish(),
  is_active: z.boolean().nullish(),
  usage_count: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const crm_task_templatesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string(),
  description: z.string().optional(),
  task_type: z.string().optional(),
  default_priority: z.string().optional(),
  due_days_offset: z.number().int().optional(),
  checklist_template: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  auto_assign_role: z.string().optional(),
  is_active: z.boolean().optional(),
  usage_count: z.number().int().optional()
});

export const crm_task_templatesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  task_type: z.string().optional(),
  default_priority: z.string().optional(),
  due_days_offset: z.number().int().optional(),
  checklist_template: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  auto_assign_role: z.string().optional(),
  is_active: z.boolean().optional(),
  usage_count: z.number().int().optional()
});

export const crm_tasksSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  task_number: z.string().nullish(),
  title: z.string(),
  description: z.string().nullish(),
  task_type: z.string().nullish(),
  priority: z.string().nullish(),
  status: z.string().nullish(),
  due_date: z.coerce.date().nullish(),
  start_date: z.coerce.date().nullish(),
  completed_date: z.coerce.date().nullish(),
  customer_id: z.string().uuid().nullish(),
  contact_id: z.string().uuid().nullish(),
  lead_id: z.string().uuid().nullish(),
  opportunity_id: z.string().uuid().nullish(),
  ticket_id: z.string().uuid().nullish(),
  assigned_to: z.number().int().nullish(),
  assigned_team: z.string().uuid().nullish(),
  is_recurring: z.boolean().nullish(),
  recurrence_pattern: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  parent_task_id: z.string().uuid().nullish(),
  estimated_hours: z.number().nullish(),
  actual_hours: z.number().nullish(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  checklist: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  result: z.string().nullish(),
  created_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const crm_tasksCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  task_number: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  task_type: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  due_date: z.coerce.date().optional(),
  start_date: z.coerce.date().optional(),
  completed_date: z.coerce.date().optional(),
  customer_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  ticket_id: z.string().uuid().optional(),
  assigned_to: z.number().int().optional(),
  assigned_team: z.string().uuid().optional(),
  is_recurring: z.boolean().optional(),
  recurrence_pattern: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  parent_task_id: z.string().uuid().optional(),
  estimated_hours: z.number().optional(),
  actual_hours: z.number().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  checklist: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  result: z.string().optional(),
  created_by: z.number().int().optional()
});

export const crm_tasksUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  task_number: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  task_type: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  due_date: z.coerce.date().optional(),
  start_date: z.coerce.date().optional(),
  completed_date: z.coerce.date().optional(),
  customer_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  ticket_id: z.string().uuid().optional(),
  assigned_to: z.number().int().optional(),
  assigned_team: z.string().uuid().optional(),
  is_recurring: z.boolean().optional(),
  recurrence_pattern: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  parent_task_id: z.string().uuid().optional(),
  estimated_hours: z.number().optional(),
  actual_hours: z.number().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  checklist: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  result: z.string().optional(),
  created_by: z.number().int().optional()
});

export const crm_ticket_commentsSchema = z.object({
  id: z.string().uuid(),
  ticket_id: z.string().uuid().nullish(),
  comment_type: z.string().nullish(),
  body: z.string(),
  is_public: z.boolean().nullish(),
  attachments: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  created_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish()
});

export const crm_ticket_commentsCreateSchema = z.object({
  ticket_id: z.string().uuid().optional(),
  comment_type: z.string().optional(),
  body: z.string(),
  is_public: z.boolean().optional(),
  attachments: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  created_by: z.number().int().optional()
});

export const crm_ticket_commentsUpdateSchema = z.object({
  ticket_id: z.string().uuid().optional(),
  comment_type: z.string().optional(),
  body: z.string().optional(),
  is_public: z.boolean().optional(),
  attachments: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  created_by: z.number().int().optional()
});

export const crm_ticketsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  ticket_number: z.string().nullish(),
  customer_id: z.string().uuid().nullish(),
  contact_id: z.string().uuid().nullish(),
  subject: z.string(),
  description: z.string().nullish(),
  category: z.string().nullish(),
  subcategory: z.string().nullish(),
  priority: z.string().nullish(),
  status: z.string().nullish(),
  severity: z.string().nullish(),
  source_channel: z.string().nullish(),
  assigned_to: z.number().int().nullish(),
  assigned_team: z.string().uuid().nullish(),
  escalation_level: z.number().int().nullish(),
  sla_policy_id: z.string().uuid().nullish(),
  first_response_due: z.coerce.date().nullish(),
  first_response_at: z.coerce.date().nullish(),
  resolution_due: z.coerce.date().nullish(),
  resolved_at: z.coerce.date().nullish(),
  sla_breached: z.boolean().nullish(),
  resolution: z.string().nullish(),
  resolution_type: z.string().nullish(),
  satisfaction_rating: z.number().int().nullish(),
  satisfaction_comment: z.string().nullish(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  attachments: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  related_ticket_id: z.string().uuid().nullish(),
  created_by: z.number().int().nullish(),
  closed_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  crm_ticket_comments: z.string()
});

export const crm_ticketsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  ticket_number: z.string().optional(),
  customer_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  subject: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  severity: z.string().optional(),
  source_channel: z.string().optional(),
  assigned_to: z.number().int().optional(),
  assigned_team: z.string().uuid().optional(),
  escalation_level: z.number().int().optional(),
  sla_policy_id: z.string().uuid().optional(),
  first_response_due: z.coerce.date().optional(),
  first_response_at: z.coerce.date().optional(),
  resolution_due: z.coerce.date().optional(),
  resolved_at: z.coerce.date().optional(),
  sla_breached: z.boolean().optional(),
  resolution: z.string().optional(),
  resolution_type: z.string().optional(),
  satisfaction_rating: z.number().int().optional(),
  satisfaction_comment: z.string().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  attachments: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  related_ticket_id: z.string().uuid().optional(),
  created_by: z.number().int().optional(),
  closed_by: z.number().int().optional(),
  crm_ticket_comments: z.string()
});

export const crm_ticketsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  ticket_number: z.string().optional(),
  customer_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  subject: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  severity: z.string().optional(),
  source_channel: z.string().optional(),
  assigned_to: z.number().int().optional(),
  assigned_team: z.string().uuid().optional(),
  escalation_level: z.number().int().optional(),
  sla_policy_id: z.string().uuid().optional(),
  first_response_due: z.coerce.date().optional(),
  first_response_at: z.coerce.date().optional(),
  resolution_due: z.coerce.date().optional(),
  resolved_at: z.coerce.date().optional(),
  sla_breached: z.boolean().optional(),
  resolution: z.string().optional(),
  resolution_type: z.string().optional(),
  satisfaction_rating: z.number().int().optional(),
  satisfaction_comment: z.string().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  attachments: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  related_ticket_id: z.string().uuid().optional(),
  created_by: z.number().int().optional(),
  closed_by: z.number().int().optional(),
  crm_ticket_comments: z.string().optional()
});

export const customer_loyaltySchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  programId: z.string().uuid(),
  currentTierId: z.string().uuid().nullish(),
  totalPoints: z.number().int(),
  availablePoints: z.number().int(),
  lifetimePoints: z.number().int(),
  totalSpending: z.number(),
  enrollmentDate: z.coerce.date(),
  lastActivityDate: z.coerce.date().nullish(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const customer_loyaltyCreateSchema = z.object({
  customerId: z.string().uuid(),
  programId: z.string().uuid(),
  currentTierId: z.string().uuid().optional(),
  totalPoints: z.number().int().optional(),
  availablePoints: z.number().int().optional(),
  lifetimePoints: z.number().int().optional(),
  totalSpending: z.number().optional(),
  enrollmentDate: z.coerce.date(),
  lastActivityDate: z.coerce.date().optional(),
  isActive: z.boolean().optional()
});

export const customer_loyaltyUpdateSchema = z.object({
  customerId: z.string().uuid().optional(),
  programId: z.string().uuid().optional(),
  currentTierId: z.string().uuid().optional(),
  totalPoints: z.number().int().optional(),
  availablePoints: z.number().int().optional(),
  lifetimePoints: z.number().int().optional(),
  totalSpending: z.number().optional(),
  enrollmentDate: z.coerce.date().optional(),
  lastActivityDate: z.coerce.date().optional(),
  isActive: z.boolean().optional()
});

export const customersSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  phone: z.string().nullish(),
  email: z.string().nullish(),
  address: z.string().nullish(),
  city: z.string().nullish(),
  province: z.string().nullish(),
  postalCode: z.string().nullish(),
  type: z.enum(["walk_in @map(\"walk-in\")", "member", "vip"]).nullish(),
  customerType: z.enum(["individual", "corporate"]),
  companyName: z.string().nullish(),
  picName: z.string().nullish(),
  picPosition: z.string().nullish(),
  contact1: z.string().nullish(),
  contact2: z.string().nullish(),
  companyEmail: z.string().nullish(),
  companyAddress: z.string().nullish(),
  taxId: z.string().nullish(),
  status: z.enum(["active", "inactive", "blocked"]).nullish(),
  membershipLevel: z.enum(["Bronze", "Silver", "Gold", "Platinum"]).nullish(),
  points: z.number().int().nullish(),
  discount: z.number().nullish(),
  totalPurchases: z.number().int().nullish(),
  totalSpent: z.number().nullish(),
  lastVisit: z.coerce.date().nullish(),
  birthDate: z.coerce.date().nullish(),
  gender: z.enum(["male", "female", "other"]).nullish(),
  notes: z.string().nullish(),
  isActive: z.boolean().nullish(),
  partnerId: z.string().uuid().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const customersCreateSchema = z.object({
  name: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  type: z.enum(["walk_in @map(\"walk-in\")", "member", "vip"]).optional(),
  customerType: z.enum(["individual", "corporate"]).optional(),
  companyName: z.string().optional(),
  picName: z.string().optional(),
  picPosition: z.string().optional(),
  contact1: z.string().optional(),
  contact2: z.string().optional(),
  companyEmail: z.string().optional(),
  companyAddress: z.string().optional(),
  taxId: z.string().optional(),
  status: z.enum(["active", "inactive", "blocked"]).optional(),
  membershipLevel: z.enum(["Bronze", "Silver", "Gold", "Platinum"]).optional(),
  points: z.number().int().optional(),
  discount: z.number().optional(),
  totalPurchases: z.number().int().optional(),
  totalSpent: z.number().optional(),
  lastVisit: z.coerce.date().optional(),
  birthDate: z.coerce.date().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  partnerId: z.string().uuid().optional()
});

export const customersUpdateSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  type: z.enum(["walk_in @map(\"walk-in\")", "member", "vip"]).optional(),
  customerType: z.enum(["individual", "corporate"]).optional(),
  companyName: z.string().optional(),
  picName: z.string().optional(),
  picPosition: z.string().optional(),
  contact1: z.string().optional(),
  contact2: z.string().optional(),
  companyEmail: z.string().optional(),
  companyAddress: z.string().optional(),
  taxId: z.string().optional(),
  status: z.enum(["active", "inactive", "blocked"]).optional(),
  membershipLevel: z.enum(["Bronze", "Silver", "Gold", "Platinum"]).optional(),
  points: z.number().int().optional(),
  discount: z.number().optional(),
  totalPurchases: z.number().int().optional(),
  totalSpent: z.number().optional(),
  lastVisit: z.coerce.date().optional(),
  birthDate: z.coerce.date().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  partnerId: z.string().uuid().optional()
});

export const dashboard_configurationsSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  industry_type: z.string().nullish(),
  business_type_id: z.string().uuid().nullish(),
  layout_type: z.string().nullish(),
  widgets: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  theme: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const dashboard_configurationsCreateSchema = z.object({
  code: z.string(),
  name: z.string(),
  industry_type: z.string().optional(),
  business_type_id: z.string().uuid().optional(),
  layout_type: z.string().optional(),
  widgets: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  theme: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const dashboard_configurationsUpdateSchema = z.object({
  code: z.string().optional(),
  name: z.string().optional(),
  industry_type: z.string().optional(),
  business_type_id: z.string().uuid().optional(),
  layout_type: z.string().optional(),
  widgets: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  theme: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const employee_attendancesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  employee_id: z.number().int().nullish(),
  branch_id: z.string().uuid().nullish(),
  attendance_date: z.coerce.date(),
  check_in: z.coerce.date().nullish(),
  check_out: z.coerce.date().nullish(),
  status: z.string().nullish(),
  late_minutes: z.number().int().nullish(),
  early_leave_minutes: z.number().int().nullish(),
  overtime_minutes: z.number().int().nullish(),
  shift_type: z.string().nullish(),
  notes: z.string().nullish(),
  check_in_location: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  check_out_location: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const employee_attendancesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  branch_id: z.string().uuid().optional(),
  attendance_date: z.coerce.date(),
  check_in: z.coerce.date().optional(),
  check_out: z.coerce.date().optional(),
  status: z.string().optional(),
  late_minutes: z.number().int().optional(),
  early_leave_minutes: z.number().int().optional(),
  overtime_minutes: z.number().int().optional(),
  shift_type: z.string().optional(),
  notes: z.string().optional(),
  check_in_location: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  check_out_location: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const employee_attendancesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  branch_id: z.string().uuid().optional(),
  attendance_date: z.coerce.date().optional(),
  check_in: z.coerce.date().optional(),
  check_out: z.coerce.date().optional(),
  status: z.string().optional(),
  late_minutes: z.number().int().optional(),
  early_leave_minutes: z.number().int().optional(),
  overtime_minutes: z.number().int().optional(),
  shift_type: z.string().optional(),
  notes: z.string().optional(),
  check_in_location: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  check_out_location: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const employee_certificationsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  employee_id: z.number().int(),
  name: z.string(),
  issuing_organization: z.string().nullish(),
  credential_id: z.string().nullish(),
  issue_date: z.coerce.date().nullish(),
  expiry_date: z.coerce.date().nullish(),
  is_active: z.boolean().nullish(),
  document_url: z.string().nullish(),
  notes: z.string().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const employee_certificationsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int(),
  name: z.string(),
  issuing_organization: z.string().optional(),
  credential_id: z.string().optional(),
  issue_date: z.coerce.date().optional(),
  expiry_date: z.coerce.date().optional(),
  is_active: z.boolean().optional(),
  document_url: z.string().optional(),
  notes: z.string().optional()
});

export const employee_certificationsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  name: z.string().optional(),
  issuing_organization: z.string().optional(),
  credential_id: z.string().optional(),
  issue_date: z.coerce.date().optional(),
  expiry_date: z.coerce.date().optional(),
  is_active: z.boolean().optional(),
  document_url: z.string().optional(),
  notes: z.string().optional()
});

export const employee_claimsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  employee_id: z.number().int(),
  claim_number: z.string().nullish(),
  claim_type: z.string(),
  amount: z.number(),
  approved_amount: z.number().nullish(),
  currency: z.string().nullish(),
  claim_date: z.coerce.date(),
  description: z.string().nullish(),
  receipt_url: z.string().nullish(),
  receipt_number: z.string().nullish(),
  status: z.string().nullish(),
  current_approval_step: z.number().int().nullish(),
  paid_date: z.coerce.date().nullish(),
  notes: z.string().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const employee_claimsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int(),
  claim_number: z.string().optional(),
  claim_type: z.string(),
  amount: z.number().optional(),
  approved_amount: z.number().optional(),
  currency: z.string().optional(),
  claim_date: z.coerce.date(),
  description: z.string().optional(),
  receipt_url: z.string().optional(),
  receipt_number: z.string().optional(),
  status: z.string().optional(),
  current_approval_step: z.number().int().optional(),
  paid_date: z.coerce.date().optional(),
  notes: z.string().optional()
});

export const employee_claimsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  claim_number: z.string().optional(),
  claim_type: z.string().optional(),
  amount: z.number().optional(),
  approved_amount: z.number().optional(),
  currency: z.string().optional(),
  claim_date: z.coerce.date().optional(),
  description: z.string().optional(),
  receipt_url: z.string().optional(),
  receipt_number: z.string().optional(),
  status: z.string().optional(),
  current_approval_step: z.number().int().optional(),
  paid_date: z.coerce.date().optional(),
  notes: z.string().optional()
});

export const employee_contractsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  employee_id: z.number().int(),
  contract_type: z.string(),
  contract_number: z.string().nullish(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date().nullish(),
  probation_end: z.coerce.date().nullish(),
  status: z.string().nullish(),
  salary: z.number().nullish(),
  position: z.string().nullish(),
  department: z.string().nullish(),
  branch_id: z.string().uuid().nullish(),
  renewal_count: z.number().int().nullish(),
  previous_contract_id: z.string().uuid().nullish(),
  termination_date: z.coerce.date().nullish(),
  termination_reason: z.string().nullish(),
  notes: z.string().nullish(),
  created_by: z.string().uuid().nullish(),
  approved_by: z.string().uuid().nullish(),
  approved_at: z.coerce.date().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const employee_contractsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int(),
  contract_type: z.string().optional(),
  contract_number: z.string().optional(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date().optional(),
  probation_end: z.coerce.date().optional(),
  status: z.string().optional(),
  salary: z.number().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  branch_id: z.string().uuid().optional(),
  renewal_count: z.number().int().optional(),
  previous_contract_id: z.string().uuid().optional(),
  termination_date: z.coerce.date().optional(),
  termination_reason: z.string().optional(),
  notes: z.string().optional(),
  created_by: z.string().uuid().optional(),
  approved_by: z.string().uuid().optional(),
  approved_at: z.coerce.date().optional()
});

export const employee_contractsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  contract_type: z.string().optional(),
  contract_number: z.string().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  probation_end: z.coerce.date().optional(),
  status: z.string().optional(),
  salary: z.number().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  branch_id: z.string().uuid().optional(),
  renewal_count: z.number().int().optional(),
  previous_contract_id: z.string().uuid().optional(),
  termination_date: z.coerce.date().optional(),
  termination_reason: z.string().optional(),
  notes: z.string().optional(),
  created_by: z.string().uuid().optional(),
  approved_by: z.string().uuid().optional(),
  approved_at: z.coerce.date().optional()
});

export const employee_documentsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  employee_id: z.number().int(),
  document_type: z.string(),
  document_number: z.string().nullish(),
  title: z.string(),
  description: z.string().nullish(),
  file_url: z.string().nullish(),
  file_name: z.string().nullish(),
  file_size: z.number().int().nullish(),
  mime_type: z.string().nullish(),
  issue_date: z.coerce.date().nullish(),
  expiry_date: z.coerce.date().nullish(),
  is_active: z.boolean().nullish(),
  status: z.string().nullish(),
  signed_by: z.string().nullish(),
  signed_date: z.coerce.date().nullish(),
  version: z.number().int().nullish(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const employee_documentsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int(),
  document_type: z.string(),
  document_number: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  file_url: z.string().optional(),
  file_name: z.string().optional(),
  file_size: z.number().int().optional(),
  mime_type: z.string().optional(),
  issue_date: z.coerce.date().optional(),
  expiry_date: z.coerce.date().optional(),
  is_active: z.boolean().optional(),
  status: z.string().optional(),
  signed_by: z.string().optional(),
  signed_date: z.coerce.date().optional(),
  version: z.number().int().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const employee_documentsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  document_type: z.string().optional(),
  document_number: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  file_url: z.string().optional(),
  file_name: z.string().optional(),
  file_size: z.number().int().optional(),
  mime_type: z.string().optional(),
  issue_date: z.coerce.date().optional(),
  expiry_date: z.coerce.date().optional(),
  is_active: z.boolean().optional(),
  status: z.string().optional(),
  signed_by: z.string().optional(),
  signed_date: z.coerce.date().optional(),
  version: z.number().int().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const employee_educationsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  employee_id: z.number().int(),
  level: z.string(),
  institution: z.string(),
  major: z.string().nullish(),
  degree: z.string().nullish(),
  start_year: z.number().int().nullish(),
  end_year: z.number().int().nullish(),
  gpa: z.number().nullish(),
  is_highest: z.boolean().nullish(),
  certificate_number: z.string().nullish(),
  notes: z.string().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const employee_educationsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int(),
  level: z.string(),
  institution: z.string(),
  major: z.string().optional(),
  degree: z.string().optional(),
  start_year: z.number().int().optional(),
  end_year: z.number().int().optional(),
  gpa: z.number().optional(),
  is_highest: z.boolean().optional(),
  certificate_number: z.string().optional(),
  notes: z.string().optional()
});

export const employee_educationsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  level: z.string().optional(),
  institution: z.string().optional(),
  major: z.string().optional(),
  degree: z.string().optional(),
  start_year: z.number().int().optional(),
  end_year: z.number().int().optional(),
  gpa: z.number().optional(),
  is_highest: z.boolean().optional(),
  certificate_number: z.string().optional(),
  notes: z.string().optional()
});

export const employee_familiesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  employee_id: z.number().int(),
  name: z.string(),
  relationship: z.string(),
  gender: z.string().nullish(),
  date_of_birth: z.coerce.date().nullish(),
  place_of_birth: z.string().nullish(),
  national_id: z.string().nullish(),
  phone_number: z.string().nullish(),
  occupation: z.string().nullish(),
  is_emergency_contact: z.boolean().nullish(),
  is_dependent: z.boolean().nullish(),
  notes: z.string().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const employee_familiesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int(),
  name: z.string(),
  relationship: z.string(),
  gender: z.string().optional(),
  date_of_birth: z.coerce.date().optional(),
  place_of_birth: z.string().optional(),
  national_id: z.string().optional(),
  phone_number: z.string().optional(),
  occupation: z.string().optional(),
  is_emergency_contact: z.boolean().optional(),
  is_dependent: z.boolean().optional(),
  notes: z.string().optional()
});

export const employee_familiesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  name: z.string().optional(),
  relationship: z.string().optional(),
  gender: z.string().optional(),
  date_of_birth: z.coerce.date().optional(),
  place_of_birth: z.string().optional(),
  national_id: z.string().optional(),
  phone_number: z.string().optional(),
  occupation: z.string().optional(),
  is_emergency_contact: z.boolean().optional(),
  is_dependent: z.boolean().optional(),
  notes: z.string().optional()
});

export const employee_kpisSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  employee_id: z.number().int().nullish(),
  branch_id: z.string().uuid().nullish(),
  period: z.string(),
  metric_name: z.string(),
  category: z.string().nullish(),
  target: z.number(),
  actual: z.number().nullish(),
  unit: z.string().nullish(),
  weight: z.number().int().nullish(),
  status: z.string().nullish(),
  notes: z.string().nullish(),
  reviewed_by: z.string().uuid().nullish(),
  reviewed_at: z.coerce.date().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const employee_kpisCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  branch_id: z.string().uuid().optional(),
  period: z.string(),
  metric_name: z.string(),
  category: z.string().optional(),
  target: z.number(),
  actual: z.number().optional(),
  unit: z.string().optional(),
  weight: z.number().int().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  reviewed_by: z.string().uuid().optional(),
  reviewed_at: z.coerce.date().optional()
});

export const employee_kpisUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  branch_id: z.string().uuid().optional(),
  period: z.string().optional(),
  metric_name: z.string().optional(),
  category: z.string().optional(),
  target: z.number().optional(),
  actual: z.number().optional(),
  unit: z.string().optional(),
  weight: z.number().int().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  reviewed_by: z.string().uuid().optional(),
  reviewed_at: z.coerce.date().optional()
});

export const employee_mutationsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  employee_id: z.number().int(),
  mutation_type: z.string(),
  mutation_number: z.string().nullish(),
  effective_date: z.coerce.date(),
  status: z.string().nullish(),
  from_branch_id: z.string().uuid().nullish(),
  from_department: z.string().nullish(),
  from_position: z.string().nullish(),
  to_branch_id: z.string().uuid().nullish(),
  to_department: z.string().nullish(),
  to_position: z.string().nullish(),
  salary_change: z.number().nullish(),
  new_salary: z.number().nullish(),
  reason: z.string().nullish(),
  notes: z.string().nullish(),
  document_url: z.string().nullish(),
  requested_by: z.string().uuid().nullish(),
  current_approval_step: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const employee_mutationsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int(),
  mutation_type: z.string().optional(),
  mutation_number: z.string().optional(),
  effective_date: z.coerce.date(),
  status: z.string().optional(),
  from_branch_id: z.string().uuid().optional(),
  from_department: z.string().optional(),
  from_position: z.string().optional(),
  to_branch_id: z.string().uuid().optional(),
  to_department: z.string().optional(),
  to_position: z.string().optional(),
  salary_change: z.number().optional(),
  new_salary: z.number().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  document_url: z.string().optional(),
  requested_by: z.string().uuid().optional(),
  current_approval_step: z.number().int().optional()
});

export const employee_mutationsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  mutation_type: z.string().optional(),
  mutation_number: z.string().optional(),
  effective_date: z.coerce.date().optional(),
  status: z.string().optional(),
  from_branch_id: z.string().uuid().optional(),
  from_department: z.string().optional(),
  from_position: z.string().optional(),
  to_branch_id: z.string().uuid().optional(),
  to_department: z.string().optional(),
  to_position: z.string().optional(),
  salary_change: z.number().optional(),
  new_salary: z.number().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  document_url: z.string().optional(),
  requested_by: z.string().uuid().optional(),
  current_approval_step: z.number().int().optional()
});

export const employee_salariesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  employee_id: z.number().int().nullish(),
  pay_type: z.string().nullish(),
  base_salary: z.number().nullish(),
  hourly_rate: z.number().nullish(),
  daily_rate: z.number().nullish(),
  weekly_hours: z.number().int().nullish(),
  overtime_rate_multiplier: z.number().nullish(),
  overtime_holiday_multiplier: z.number().nullish(),
  tax_status: z.string().nullish(),
  tax_method: z.string().nullish(),
  bank_name: z.string().nullish(),
  bank_account_number: z.string().nullish(),
  bank_account_name: z.string().nullish(),
  bpjs_kesehatan_number: z.string().nullish(),
  bpjs_ketenagakerjaan_number: z.string().nullish(),
  npwp: z.string().nullish(),
  is_active: z.boolean().nullish(),
  start_date: z.coerce.date().nullish(),
  end_date: z.coerce.date().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  employee_salary_components: z.string()
});

export const employee_salariesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  pay_type: z.string().optional(),
  base_salary: z.number().optional(),
  hourly_rate: z.number().optional(),
  daily_rate: z.number().optional(),
  weekly_hours: z.number().int().optional(),
  overtime_rate_multiplier: z.number().optional(),
  overtime_holiday_multiplier: z.number().optional(),
  tax_status: z.string().optional(),
  tax_method: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_account_name: z.string().optional(),
  bpjs_kesehatan_number: z.string().optional(),
  bpjs_ketenagakerjaan_number: z.string().optional(),
  npwp: z.string().optional(),
  is_active: z.boolean().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  employee_salary_components: z.string()
});

export const employee_salariesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  pay_type: z.string().optional(),
  base_salary: z.number().optional(),
  hourly_rate: z.number().optional(),
  daily_rate: z.number().optional(),
  weekly_hours: z.number().int().optional(),
  overtime_rate_multiplier: z.number().optional(),
  overtime_holiday_multiplier: z.number().optional(),
  tax_status: z.string().optional(),
  tax_method: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_account_name: z.string().optional(),
  bpjs_kesehatan_number: z.string().optional(),
  bpjs_ketenagakerjaan_number: z.string().optional(),
  npwp: z.string().optional(),
  is_active: z.boolean().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  employee_salary_components: z.string().optional()
});

export const employee_salary_componentsSchema = z.object({
  id: z.string().uuid(),
  employee_salary_id: z.string().uuid().nullish(),
  component_id: z.string().uuid().nullish(),
  amount: z.number().nullish(),
  percentage: z.number().nullish(),
  is_active: z.boolean().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const employee_salary_componentsCreateSchema = z.object({
  employee_salary_id: z.string().uuid().optional(),
  component_id: z.string().uuid().optional(),
  amount: z.number().optional(),
  percentage: z.number().optional(),
  is_active: z.boolean().optional()
});

export const employee_salary_componentsUpdateSchema = z.object({
  employee_salary_id: z.string().uuid().optional(),
  component_id: z.string().uuid().optional(),
  amount: z.number().optional(),
  percentage: z.number().optional(),
  is_active: z.boolean().optional()
});

export const employee_skillsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  employee_id: z.number().int(),
  name: z.string(),
  category: z.string().nullish(),
  proficiency_level: z.string().nullish(),
  years_experience: z.number().int().nullish(),
  notes: z.string().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const employee_skillsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int(),
  name: z.string(),
  category: z.string().optional(),
  proficiency_level: z.string().optional(),
  years_experience: z.number().int().optional(),
  notes: z.string().optional()
});

export const employee_skillsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  name: z.string().optional(),
  category: z.string().optional(),
  proficiency_level: z.string().optional(),
  years_experience: z.number().int().optional(),
  notes: z.string().optional()
});

export const employee_work_experiencesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  employee_id: z.number().int(),
  company_name: z.string(),
  position: z.string(),
  department: z.string().nullish(),
  start_date: z.coerce.date().nullish(),
  end_date: z.coerce.date().nullish(),
  is_current: z.boolean().nullish(),
  salary: z.number().nullish(),
  reason_leaving: z.string().nullish(),
  description: z.string().nullish(),
  reference_name: z.string().nullish(),
  reference_phone: z.string().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const employee_work_experiencesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int(),
  company_name: z.string(),
  position: z.string(),
  department: z.string().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  is_current: z.boolean().optional(),
  salary: z.number().optional(),
  reason_leaving: z.string().optional(),
  description: z.string().optional(),
  reference_name: z.string().optional(),
  reference_phone: z.string().optional()
});

export const employee_work_experiencesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  company_name: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  is_current: z.boolean().optional(),
  salary: z.number().optional(),
  reason_leaving: z.string().optional(),
  description: z.string().optional(),
  reference_name: z.string().optional(),
  reference_phone: z.string().optional()
});

export const employeesSchema = z.object({
  id: z.number().int(),
  employee_id: z.string(),
  user_id: z.number().int().nullish(),
  name: z.string(),
  email: z.string(),
  phone_number: z.string().nullish(),
  address: z.string().nullish(),
  date_of_birth: z.coerce.date().nullish(),
  place_of_birth: z.string().nullish(),
  national_id: z.string().nullish(),
  religion: z.string().nullish(),
  marital_status: z.string().nullish(),
  gender: z.string().nullish(),
  blood_type: z.string().nullish(),
  nationality: z.string().nullish(),
  identity_type: z.string().nullish(),
  identity_expiry: z.coerce.date().nullish(),
  tax_id: z.string().nullish(),
  bpjs_kesehatan: z.string().nullish(),
  bpjs_ketenagakerjaan: z.string().nullish(),
  position: z.string(),
  department: z.string(),
  branch_id: z.string().uuid().nullish(),
  work_location: z.string().nullish(),
  role: z.string().nullish(),
  status: z.string().nullish(),
  join_date: z.coerce.date().nullish(),
  end_date: z.coerce.date().nullish(),
  contract_type: z.string().nullish(),
  contract_start: z.coerce.date().nullish(),
  contract_end: z.coerce.date().nullish(),
  contract_number: z.string().nullish(),
  job_grade_id: z.string().uuid().nullish(),
  org_structure_id: z.string().uuid().nullish(),
  supervisor_id: z.string().uuid().nullish(),
  specialization: z.string().nullish(),
  license_number: z.string().nullish(),
  biography: z.string().nullish(),
  photo_url: z.string().nullish(),
  base_salary: z.number().nullish(),
  salary_grade: z.string().nullish(),
  emergency_contact_name: z.string().nullish(),
  emergency_contact_relationship: z.string().nullish(),
  emergency_contact_phone: z.string().nullish(),
  tenant_id: z.string().uuid().nullish(),
  is_active: z.boolean().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  employee_attendances: z.string(),
  employee_certifications: z.string(),
  employee_claims: z.string(),
  employee_contracts: z.string(),
  employee_documents: z.string(),
  employee_educations: z.string(),
  employee_families: z.string(),
  employee_kpis: z.string(),
  employee_mutations: z.string(),
  employee_salaries: z.string(),
  employee_skills: z.string(),
  employee_work_experiences: z.string(),
  hris_certifications: z.string(),
  hris_training_enrollments: z.string(),
  leave_balances: z.string(),
  leave_requests: z.string(),
  payroll_items: z.string(),
  performance_reviews: z.string()
});

export const employeesCreateSchema = z.object({
  employee_id: z.string(),
  user_id: z.number().int().optional(),
  name: z.string(),
  email: z.string(),
  phone_number: z.string().optional(),
  address: z.string().optional(),
  date_of_birth: z.coerce.date().optional(),
  place_of_birth: z.string().optional(),
  national_id: z.string().optional(),
  religion: z.string().optional(),
  marital_status: z.string().optional(),
  gender: z.string().optional(),
  blood_type: z.string().optional(),
  nationality: z.string().optional(),
  identity_type: z.string().optional(),
  identity_expiry: z.coerce.date().optional(),
  tax_id: z.string().optional(),
  bpjs_kesehatan: z.string().optional(),
  bpjs_ketenagakerjaan: z.string().optional(),
  position: z.string(),
  department: z.string(),
  branch_id: z.string().uuid().optional(),
  work_location: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  join_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  contract_type: z.string().optional(),
  contract_start: z.coerce.date().optional(),
  contract_end: z.coerce.date().optional(),
  contract_number: z.string().optional(),
  job_grade_id: z.string().uuid().optional(),
  org_structure_id: z.string().uuid().optional(),
  supervisor_id: z.string().uuid().optional(),
  specialization: z.string().optional(),
  license_number: z.string().optional(),
  biography: z.string().optional(),
  photo_url: z.string().optional(),
  base_salary: z.number().optional(),
  salary_grade: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  tenant_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
  employee_attendances: z.string(),
  employee_certifications: z.string(),
  employee_claims: z.string(),
  employee_contracts: z.string(),
  employee_documents: z.string(),
  employee_educations: z.string(),
  employee_families: z.string(),
  employee_kpis: z.string(),
  employee_mutations: z.string(),
  employee_salaries: z.string(),
  employee_skills: z.string(),
  employee_work_experiences: z.string(),
  hris_certifications: z.string(),
  hris_training_enrollments: z.string(),
  leave_balances: z.string(),
  leave_requests: z.string(),
  payroll_items: z.string(),
  performance_reviews: z.string()
});

export const employeesUpdateSchema = z.object({
  employee_id: z.string().optional(),
  user_id: z.number().int().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  phone_number: z.string().optional(),
  address: z.string().optional(),
  date_of_birth: z.coerce.date().optional(),
  place_of_birth: z.string().optional(),
  national_id: z.string().optional(),
  religion: z.string().optional(),
  marital_status: z.string().optional(),
  gender: z.string().optional(),
  blood_type: z.string().optional(),
  nationality: z.string().optional(),
  identity_type: z.string().optional(),
  identity_expiry: z.coerce.date().optional(),
  tax_id: z.string().optional(),
  bpjs_kesehatan: z.string().optional(),
  bpjs_ketenagakerjaan: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  branch_id: z.string().uuid().optional(),
  work_location: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  join_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  contract_type: z.string().optional(),
  contract_start: z.coerce.date().optional(),
  contract_end: z.coerce.date().optional(),
  contract_number: z.string().optional(),
  job_grade_id: z.string().uuid().optional(),
  org_structure_id: z.string().uuid().optional(),
  supervisor_id: z.string().uuid().optional(),
  specialization: z.string().optional(),
  license_number: z.string().optional(),
  biography: z.string().optional(),
  photo_url: z.string().optional(),
  base_salary: z.number().optional(),
  salary_grade: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  tenant_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
  employee_attendances: z.string().optional(),
  employee_certifications: z.string().optional(),
  employee_claims: z.string().optional(),
  employee_contracts: z.string().optional(),
  employee_documents: z.string().optional(),
  employee_educations: z.string().optional(),
  employee_families: z.string().optional(),
  employee_kpis: z.string().optional(),
  employee_mutations: z.string().optional(),
  employee_salaries: z.string().optional(),
  employee_skills: z.string().optional(),
  employee_work_experiences: z.string().optional(),
  hris_certifications: z.string().optional(),
  hris_training_enrollments: z.string().optional(),
  leave_balances: z.string().optional(),
  leave_requests: z.string().optional(),
  payroll_items: z.string().optional(),
  performance_reviews: z.string().optional()
});

export const finance_accountsSchema = z.object({
  id: z.string().uuid(),
  accountNumber: z.string(),
  accountName: z.string(),
  accountType: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  category: z.string().nullish(),
  parentAccountId: z.string().uuid().nullish(),
  balance: z.number(),
  currency: z.string(),
  description: z.string().nullish(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  finance_budgets: z.string(),
  finance_transactions: z.string()
});

export const finance_accountsCreateSchema = z.object({
  accountNumber: z.string(),
  accountName: z.string(),
  accountType: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
  category: z.string().optional(),
  parentAccountId: z.string().uuid().optional(),
  balance: z.number().optional(),
  currency: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  finance_budgets: z.string(),
  finance_transactions: z.string()
});

export const finance_accountsUpdateSchema = z.object({
  accountNumber: z.string().optional(),
  accountName: z.string().optional(),
  accountType: z.enum(["asset", "liability", "equity", "revenue", "expense"]).optional(),
  category: z.string().optional(),
  parentAccountId: z.string().uuid().optional(),
  balance: z.number().optional(),
  currency: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  finance_budgets: z.string().optional(),
  finance_transactions: z.string().optional()
});

export const finance_budgetsSchema = z.object({
  id: z.string().uuid(),
  budgetName: z.string(),
  budgetPeriod: z.enum(["monthly", "quarterly", "yearly"]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  category: z.string(),
  accountId: z.string().uuid().nullish(),
  budgetAmount: z.number(),
  spentAmount: z.number(),
  remainingAmount: z.number(),
  alertThreshold: z.number().int(),
  description: z.string().nullish(),
  status: z.enum(["active", "completed", "exceeded", "cancelled"]),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const finance_budgetsCreateSchema = z.object({
  budgetName: z.string(),
  budgetPeriod: z.enum(["monthly", "quarterly", "yearly"]),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  category: z.string(),
  accountId: z.string().uuid().optional(),
  budgetAmount: z.number(),
  spentAmount: z.number().optional(),
  remainingAmount: z.number().optional(),
  alertThreshold: z.number().int().optional(),
  description: z.string().optional(),
  status: z.enum(["active", "completed", "exceeded", "cancelled"]).optional(),
  isActive: z.boolean().optional()
});

export const finance_budgetsUpdateSchema = z.object({
  budgetName: z.string().optional(),
  budgetPeriod: z.enum(["monthly", "quarterly", "yearly"]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  category: z.string().optional(),
  accountId: z.string().uuid().optional(),
  budgetAmount: z.number().optional(),
  spentAmount: z.number().optional(),
  remainingAmount: z.number().optional(),
  alertThreshold: z.number().int().optional(),
  description: z.string().optional(),
  status: z.enum(["active", "completed", "exceeded", "cancelled"]).optional(),
  isActive: z.boolean().optional()
});

export const finance_invoice_itemsSchema = z.object({
  id: z.string().uuid(),
  invoiceId: z.string().uuid(),
  productId: z.number().int().nullish(),
  productName: z.string(),
  quantity: z.number().int(),
  price: z.number(),
  total: z.number(),
  receivedQuantity: z.number().int().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const finance_invoice_itemsCreateSchema = z.object({
  invoiceId: z.string().uuid(),
  productId: z.number().int().optional(),
  productName: z.string(),
  quantity: z.number().int(),
  price: z.number(),
  total: z.number(),
  receivedQuantity: z.number().int().optional()
});

export const finance_invoice_itemsUpdateSchema = z.object({
  invoiceId: z.string().uuid().optional(),
  productId: z.number().int().optional(),
  productName: z.string().optional(),
  quantity: z.number().int().optional(),
  price: z.number().optional(),
  total: z.number().optional(),
  receivedQuantity: z.number().int().optional()
});

export const finance_invoice_paymentsSchema = z.object({
  id: z.string().uuid(),
  invoiceId: z.string().uuid(),
  paymentDate: z.coerce.date(),
  amount: z.number(),
  paymentMethod: z.string(),
  reference: z.string().nullish(),
  receivedBy: z.string().nullish(),
  notes: z.string().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const finance_invoice_paymentsCreateSchema = z.object({
  invoiceId: z.string().uuid(),
  paymentDate: z.coerce.date(),
  amount: z.number(),
  paymentMethod: z.string(),
  reference: z.string().optional(),
  receivedBy: z.string().optional(),
  notes: z.string().optional()
});

export const finance_invoice_paymentsUpdateSchema = z.object({
  invoiceId: z.string().uuid().optional(),
  paymentDate: z.coerce.date().optional(),
  amount: z.number().optional(),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  receivedBy: z.string().optional(),
  notes: z.string().optional()
});

export const finance_invoicesSchema = z.object({
  id: z.string().uuid(),
  invoiceNumber: z.string(),
  type: z.enum(["supplier", "customer"]),
  supplierId: z.string().uuid().nullish(),
  supplierName: z.string().nullish(),
  customerId: z.string().uuid().nullish(),
  customerName: z.string().nullish(),
  purchaseOrderId: z.string().uuid().nullish(),
  purchaseOrderNumber: z.string().nullish(),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  totalAmount: z.number(),
  paidAmount: z.number().nullish(),
  remainingAmount: z.number(),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]).nullish(),
  inventoryStatus: z.enum(["pending", "partial", "complete"]).nullish(),
  status: z.enum(["pending", "received", "delivered", "cancelled"]).nullish(),
  paymentTerms: z.string().nullish(),
  notes: z.string().nullish(),
  isActive: z.boolean().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  finance_invoice_items: z.string(),
  finance_invoice_payments: z.string()
});

export const finance_invoicesCreateSchema = z.object({
  invoiceNumber: z.string(),
  type: z.enum(["supplier", "customer"]),
  supplierId: z.string().uuid().optional(),
  supplierName: z.string().optional(),
  customerId: z.string().uuid().optional(),
  customerName: z.string().optional(),
  purchaseOrderId: z.string().uuid().optional(),
  purchaseOrderNumber: z.string().optional(),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  totalAmount: z.number(),
  paidAmount: z.number().optional(),
  remainingAmount: z.number(),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]).optional(),
  inventoryStatus: z.enum(["pending", "partial", "complete"]).optional(),
  status: z.enum(["pending", "received", "delivered", "cancelled"]).optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  finance_invoice_items: z.string(),
  finance_invoice_payments: z.string()
});

export const finance_invoicesUpdateSchema = z.object({
  invoiceNumber: z.string().optional(),
  type: z.enum(["supplier", "customer"]).optional(),
  supplierId: z.string().uuid().optional(),
  supplierName: z.string().optional(),
  customerId: z.string().uuid().optional(),
  customerName: z.string().optional(),
  purchaseOrderId: z.string().uuid().optional(),
  purchaseOrderNumber: z.string().optional(),
  invoiceDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  totalAmount: z.number().optional(),
  paidAmount: z.number().optional(),
  remainingAmount: z.number().optional(),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]).optional(),
  inventoryStatus: z.enum(["pending", "partial", "complete"]).optional(),
  status: z.enum(["pending", "received", "delivered", "cancelled"]).optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  finance_invoice_items: z.string().optional(),
  finance_invoice_payments: z.string().optional()
});

export const finance_payable_paymentsSchema = z.object({
  id: z.string().uuid(),
  payableId: z.string().uuid(),
  paymentDate: z.coerce.date(),
  amount: z.number(),
  paymentMethod: z.string(),
  reference: z.string().nullish(),
  paidBy: z.string().nullish(),
  notes: z.string().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const finance_payable_paymentsCreateSchema = z.object({
  payableId: z.string().uuid(),
  paymentDate: z.coerce.date(),
  amount: z.number(),
  paymentMethod: z.string(),
  reference: z.string().optional(),
  paidBy: z.string().optional(),
  notes: z.string().optional()
});

export const finance_payable_paymentsUpdateSchema = z.object({
  payableId: z.string().uuid().optional(),
  paymentDate: z.coerce.date().optional(),
  amount: z.number().optional(),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  paidBy: z.string().optional(),
  notes: z.string().optional()
});

export const finance_payablesSchema = z.object({
  id: z.string().uuid(),
  supplierId: z.string().uuid().nullish(),
  supplierName: z.string(),
  supplierPhone: z.string().nullish(),
  invoiceNumber: z.string(),
  purchaseOrderNumber: z.string().nullish(),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  totalAmount: z.number(),
  paidAmount: z.number().nullish(),
  remainingAmount: z.number(),
  status: z.enum(["unpaid", "partial", "paid", "overdue"]).nullish(),
  paymentTerms: z.string().nullish(),
  daysPastDue: z.number().int().nullish(),
  notes: z.string().nullish(),
  isActive: z.boolean().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  finance_payable_payments: z.string()
});

export const finance_payablesCreateSchema = z.object({
  supplierId: z.string().uuid().optional(),
  supplierName: z.string(),
  supplierPhone: z.string().optional(),
  invoiceNumber: z.string(),
  purchaseOrderNumber: z.string().optional(),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  totalAmount: z.number(),
  paidAmount: z.number().optional(),
  remainingAmount: z.number(),
  status: z.enum(["unpaid", "partial", "paid", "overdue"]).optional(),
  paymentTerms: z.string().optional(),
  daysPastDue: z.number().int().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  finance_payable_payments: z.string()
});

export const finance_payablesUpdateSchema = z.object({
  supplierId: z.string().uuid().optional(),
  supplierName: z.string().optional(),
  supplierPhone: z.string().optional(),
  invoiceNumber: z.string().optional(),
  purchaseOrderNumber: z.string().optional(),
  invoiceDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  totalAmount: z.number().optional(),
  paidAmount: z.number().optional(),
  remainingAmount: z.number().optional(),
  status: z.enum(["unpaid", "partial", "paid", "overdue"]).optional(),
  paymentTerms: z.string().optional(),
  daysPastDue: z.number().int().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  finance_payable_payments: z.string().optional()
});

export const finance_receivable_paymentsSchema = z.object({
  id: z.string().uuid(),
  receivableId: z.string().uuid(),
  paymentDate: z.coerce.date(),
  amount: z.number(),
  paymentMethod: z.string(),
  reference: z.string().nullish(),
  receivedBy: z.string().nullish(),
  notes: z.string().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const finance_receivable_paymentsCreateSchema = z.object({
  receivableId: z.string().uuid(),
  paymentDate: z.coerce.date(),
  amount: z.number(),
  paymentMethod: z.string(),
  reference: z.string().optional(),
  receivedBy: z.string().optional(),
  notes: z.string().optional()
});

export const finance_receivable_paymentsUpdateSchema = z.object({
  receivableId: z.string().uuid().optional(),
  paymentDate: z.coerce.date().optional(),
  amount: z.number().optional(),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  receivedBy: z.string().optional(),
  notes: z.string().optional()
});

export const finance_receivablesSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid().nullish(),
  customerName: z.string(),
  customerPhone: z.string().nullish(),
  invoiceId: z.string().uuid().nullish(),
  invoiceNumber: z.string(),
  salesOrderNumber: z.string().nullish(),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  totalAmount: z.number(),
  paidAmount: z.number().nullish(),
  remainingAmount: z.number(),
  status: z.enum(["unpaid", "partial", "paid", "overdue"]).nullish(),
  paymentTerms: z.string().nullish(),
  daysPastDue: z.number().int().nullish(),
  notes: z.string().nullish(),
  isActive: z.boolean().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  finance_receivable_payments: z.string()
});

export const finance_receivablesCreateSchema = z.object({
  customerId: z.string().uuid().optional(),
  customerName: z.string(),
  customerPhone: z.string().optional(),
  invoiceId: z.string().uuid().optional(),
  invoiceNumber: z.string(),
  salesOrderNumber: z.string().optional(),
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  totalAmount: z.number(),
  paidAmount: z.number().optional(),
  remainingAmount: z.number(),
  status: z.enum(["unpaid", "partial", "paid", "overdue"]).optional(),
  paymentTerms: z.string().optional(),
  daysPastDue: z.number().int().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  finance_receivable_payments: z.string()
});

export const finance_receivablesUpdateSchema = z.object({
  customerId: z.string().uuid().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  invoiceId: z.string().uuid().optional(),
  invoiceNumber: z.string().optional(),
  salesOrderNumber: z.string().optional(),
  invoiceDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  totalAmount: z.number().optional(),
  paidAmount: z.number().optional(),
  remainingAmount: z.number().optional(),
  status: z.enum(["unpaid", "partial", "paid", "overdue"]).optional(),
  paymentTerms: z.string().optional(),
  daysPastDue: z.number().int().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
  finance_receivable_payments: z.string().optional()
});

export const finance_transactionsSchema = z.object({
  id: z.string().uuid(),
  transactionNumber: z.string(),
  transactionDate: z.coerce.date(),
  transactionType: z.enum(["income", "expense", "transfer"]),
  accountId: z.string().uuid(),
  category: z.string(),
  subcategory: z.string().nullish(),
  amount: z.number(),
  description: z.string().nullish(),
  referenceType: z.enum(["invoice", "bill", "order", "manual", "other"]).nullish(),
  referenceId: z.string().uuid().nullish(),
  paymentMethod: z.enum(["cash", "bank_transfer", "credit_card", "debit_card", "e_wallet", "other"]).nullish(),
  contactId: z.string().uuid().nullish(),
  contactName: z.string().nullish(),
  attachments: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  notes: z.string().nullish(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  status: z.enum(["pending", "completed", "cancelled"]),
  createdBy: z.string().uuid().nullish(),
  isRecurring: z.boolean(),
  recurringPattern: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const finance_transactionsCreateSchema = z.object({
  transactionNumber: z.string(),
  transactionDate: z.coerce.date(),
  transactionType: z.enum(["income", "expense", "transfer"]),
  accountId: z.string().uuid(),
  category: z.string(),
  subcategory: z.string().optional(),
  amount: z.number(),
  description: z.string().optional(),
  referenceType: z.enum(["invoice", "bill", "order", "manual", "other"]).optional(),
  referenceId: z.string().uuid().optional(),
  paymentMethod: z.enum(["cash", "bank_transfer", "credit_card", "debit_card", "e_wallet", "other"]).optional(),
  contactId: z.string().uuid().optional(),
  contactName: z.string().optional(),
  attachments: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  notes: z.string().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  status: z.enum(["pending", "completed", "cancelled"]).optional(),
  createdBy: z.string().uuid().optional(),
  isRecurring: z.boolean().optional(),
  recurringPattern: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  isActive: z.boolean().optional()
});

export const finance_transactionsUpdateSchema = z.object({
  transactionNumber: z.string().optional(),
  transactionDate: z.coerce.date().optional(),
  transactionType: z.enum(["income", "expense", "transfer"]).optional(),
  accountId: z.string().uuid().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  amount: z.number().optional(),
  description: z.string().optional(),
  referenceType: z.enum(["invoice", "bill", "order", "manual", "other"]).optional(),
  referenceId: z.string().uuid().optional(),
  paymentMethod: z.enum(["cash", "bank_transfer", "credit_card", "debit_card", "e_wallet", "other"]).optional(),
  contactId: z.string().uuid().optional(),
  contactName: z.string().optional(),
  attachments: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  notes: z.string().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  status: z.enum(["pending", "completed", "cancelled"]).optional(),
  createdBy: z.string().uuid().optional(),
  isRecurring: z.boolean().optional(),
  recurringPattern: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  isActive: z.boolean().optional()
});

export const fms_cost_recordsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid().nullish(),
  cost_category: z.string(),
  cost_subcategory: z.string().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.string().uuid().nullish(),
  cost_date: z.coerce.date(),
  amount: z.number().nullish(),
  description: z.string().nullish(),
  receipt_number: z.string().nullish(),
  receipt_url: z.string().nullish(),
  is_reimbursable: z.boolean().nullish(),
  reimbursement_status: z.string().nullish(),
  created_by: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const fms_cost_recordsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid().optional(),
  cost_category: z.string(),
  cost_subcategory: z.string().optional(),
  reference_type: z.string().optional(),
  reference_id: z.string().uuid().optional(),
  cost_date: z.coerce.date(),
  amount: z.number().optional(),
  description: z.string().optional(),
  receipt_number: z.string().optional(),
  receipt_url: z.string().optional(),
  is_reimbursable: z.boolean().optional(),
  reimbursement_status: z.string().optional(),
  created_by: z.string().optional()
});

export const fms_cost_recordsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  cost_category: z.string().optional(),
  cost_subcategory: z.string().optional(),
  reference_type: z.string().optional(),
  reference_id: z.string().uuid().optional(),
  cost_date: z.coerce.date().optional(),
  amount: z.number().optional(),
  description: z.string().optional(),
  receipt_number: z.string().optional(),
  receipt_url: z.string().optional(),
  is_reimbursable: z.boolean().optional(),
  reimbursement_status: z.string().optional(),
  created_by: z.string().optional()
});

export const fms_documentsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  entity_type: z.string(),
  entity_id: z.string().uuid(),
  document_type: z.string(),
  document_number: z.string().nullish(),
  issued_date: z.coerce.date().nullish(),
  expiry_date: z.coerce.date().nullish(),
  issuing_authority: z.string().nullish(),
  file_url: z.string().nullish(),
  reminder_days: z.number().int().nullish(),
  status: z.string().nullish(),
  notes: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const fms_documentsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  entity_type: z.string(),
  entity_id: z.string().uuid(),
  document_type: z.string(),
  document_number: z.string().optional(),
  issued_date: z.coerce.date().optional(),
  expiry_date: z.coerce.date().optional(),
  issuing_authority: z.string().optional(),
  file_url: z.string().optional(),
  reminder_days: z.number().int().optional(),
  status: z.string().optional(),
  notes: z.string().optional()
});

export const fms_documentsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().uuid().optional(),
  document_type: z.string().optional(),
  document_number: z.string().optional(),
  issued_date: z.coerce.date().optional(),
  expiry_date: z.coerce.date().optional(),
  issuing_authority: z.string().optional(),
  file_url: z.string().optional(),
  reminder_days: z.number().int().optional(),
  status: z.string().optional(),
  notes: z.string().optional()
});

export const fms_driver_violationsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  vehicle_id: z.string().uuid().nullish(),
  trip_id: z.string().uuid().nullish(),
  violation_type: z.string(),
  violation_date: z.coerce.date(),
  location: z.string().nullish(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
  speed_kmh: z.number().nullish(),
  speed_limit_kmh: z.number().int().nullish(),
  severity: z.string().nullish(),
  deduction_points: z.number().int().nullish(),
  fine_amount: z.number().nullish(),
  description: z.string().nullish(),
  evidence_url: z.string().nullish(),
  status: z.string().nullish(),
  reviewed_by: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const fms_driver_violationsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  vehicle_id: z.string().uuid().optional(),
  trip_id: z.string().uuid().optional(),
  violation_type: z.string(),
  violation_date: z.coerce.date(),
  location: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  speed_kmh: z.number().optional(),
  speed_limit_kmh: z.number().int().optional(),
  severity: z.string().optional(),
  deduction_points: z.number().int().optional(),
  fine_amount: z.number().optional(),
  description: z.string().optional(),
  evidence_url: z.string().optional(),
  status: z.string().optional(),
  reviewed_by: z.string().optional()
});

export const fms_driver_violationsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid().optional(),
  trip_id: z.string().uuid().optional(),
  violation_type: z.string().optional(),
  violation_date: z.coerce.date().optional(),
  location: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  speed_kmh: z.number().optional(),
  speed_limit_kmh: z.number().int().optional(),
  severity: z.string().optional(),
  deduction_points: z.number().int().optional(),
  fine_amount: z.number().optional(),
  description: z.string().optional(),
  evidence_url: z.string().optional(),
  status: z.string().optional(),
  reviewed_by: z.string().optional()
});

export const fms_driversSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  driver_code: z.string(),
  full_name: z.string(),
  phone: z.string().nullish(),
  email: z.string().nullish(),
  address: z.string().nullish(),
  date_of_birth: z.coerce.date().nullish(),
  blood_type: z.string().nullish(),
  emergency_contact_name: z.string().nullish(),
  emergency_contact_phone: z.string().nullish(),
  license_number: z.string().nullish(),
  license_type: z.string().nullish(),
  license_issue_date: z.coerce.date().nullish(),
  license_expiry_date: z.coerce.date().nullish(),
  employment_type: z.string().nullish(),
  hire_date: z.coerce.date().nullish(),
  termination_date: z.coerce.date().nullish(),
  base_salary: z.number().nullish(),
  allowance_per_trip: z.number().nullish(),
  allowance_per_km: z.number().nullish(),
  assigned_branch_id: z.string().uuid().nullish(),
  assigned_vehicle_id: z.string().uuid().nullish(),
  total_trips: z.number().int().nullish(),
  total_distance_km: z.number().nullish(),
  on_time_rate: z.number().nullish(),
  safety_score: z.number().nullish(),
  customer_rating: z.number().nullish(),
  violations_count: z.number().int().nullish(),
  status: z.string().nullish(),
  availability: z.string().nullish(),
  photo_url: z.string().nullish(),
  license_photo_url: z.string().nullish(),
  notes: z.string().nullish(),
  is_active: z.boolean().nullish(),
  created_by: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const fms_driversCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  driver_code: z.string(),
  full_name: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  date_of_birth: z.coerce.date().optional(),
  blood_type: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  license_number: z.string().optional(),
  license_type: z.string().optional(),
  license_issue_date: z.coerce.date().optional(),
  license_expiry_date: z.coerce.date().optional(),
  employment_type: z.string().optional(),
  hire_date: z.coerce.date().optional(),
  termination_date: z.coerce.date().optional(),
  base_salary: z.number().optional(),
  allowance_per_trip: z.number().optional(),
  allowance_per_km: z.number().optional(),
  assigned_branch_id: z.string().uuid().optional(),
  assigned_vehicle_id: z.string().uuid().optional(),
  total_trips: z.number().int().optional(),
  total_distance_km: z.number().optional(),
  on_time_rate: z.number().optional(),
  safety_score: z.number().optional(),
  customer_rating: z.number().optional(),
  violations_count: z.number().int().optional(),
  status: z.string().optional(),
  availability: z.string().optional(),
  photo_url: z.string().optional(),
  license_photo_url: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().optional(),
  created_by: z.string().optional()
});

export const fms_driversUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  driver_code: z.string().optional(),
  full_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  date_of_birth: z.coerce.date().optional(),
  blood_type: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  license_number: z.string().optional(),
  license_type: z.string().optional(),
  license_issue_date: z.coerce.date().optional(),
  license_expiry_date: z.coerce.date().optional(),
  employment_type: z.string().optional(),
  hire_date: z.coerce.date().optional(),
  termination_date: z.coerce.date().optional(),
  base_salary: z.number().optional(),
  allowance_per_trip: z.number().optional(),
  allowance_per_km: z.number().optional(),
  assigned_branch_id: z.string().uuid().optional(),
  assigned_vehicle_id: z.string().uuid().optional(),
  total_trips: z.number().int().optional(),
  total_distance_km: z.number().optional(),
  on_time_rate: z.number().optional(),
  safety_score: z.number().optional(),
  customer_rating: z.number().optional(),
  violations_count: z.number().int().optional(),
  status: z.string().optional(),
  availability: z.string().optional(),
  photo_url: z.string().optional(),
  license_photo_url: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().optional(),
  created_by: z.string().optional()
});

export const fms_fleet_kpiSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  kpi_date: z.coerce.date(),
  total_vehicles: z.number().int().nullish(),
  active_vehicles: z.number().int().nullish(),
  utilization_rate: z.number().nullish(),
  in_maintenance: z.number().int().nullish(),
  total_drivers: z.number().int().nullish(),
  active_drivers: z.number().int().nullish(),
  total_trips: z.number().int().nullish(),
  total_distance_km: z.number().nullish(),
  total_fuel_liters: z.number().nullish(),
  total_fuel_cost: z.number().nullish(),
  avg_fuel_consumption: z.number().nullish(),
  total_maintenance_cost: z.number().nullish(),
  total_operational_cost: z.number().nullish(),
  cost_per_km: z.number().nullish(),
  total_incidents: z.number().int().nullish(),
  total_violations: z.number().int().nullish(),
  on_time_delivery_rate: z.number().nullish(),
  avg_safety_score: z.number().nullish(),
  created_at: z.coerce.date()
});

export const fms_fleet_kpiCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  kpi_date: z.coerce.date(),
  total_vehicles: z.number().int().optional(),
  active_vehicles: z.number().int().optional(),
  utilization_rate: z.number().optional(),
  in_maintenance: z.number().int().optional(),
  total_drivers: z.number().int().optional(),
  active_drivers: z.number().int().optional(),
  total_trips: z.number().int().optional(),
  total_distance_km: z.number().optional(),
  total_fuel_liters: z.number().optional(),
  total_fuel_cost: z.number().optional(),
  avg_fuel_consumption: z.number().optional(),
  total_maintenance_cost: z.number().optional(),
  total_operational_cost: z.number().optional(),
  cost_per_km: z.number().optional(),
  total_incidents: z.number().int().optional(),
  total_violations: z.number().int().optional(),
  on_time_delivery_rate: z.number().optional(),
  avg_safety_score: z.number().optional()
});

export const fms_fleet_kpiUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  kpi_date: z.coerce.date().optional(),
  total_vehicles: z.number().int().optional(),
  active_vehicles: z.number().int().optional(),
  utilization_rate: z.number().optional(),
  in_maintenance: z.number().int().optional(),
  total_drivers: z.number().int().optional(),
  active_drivers: z.number().int().optional(),
  total_trips: z.number().int().optional(),
  total_distance_km: z.number().optional(),
  total_fuel_liters: z.number().optional(),
  total_fuel_cost: z.number().optional(),
  avg_fuel_consumption: z.number().optional(),
  total_maintenance_cost: z.number().optional(),
  total_operational_cost: z.number().optional(),
  cost_per_km: z.number().optional(),
  total_incidents: z.number().int().optional(),
  total_violations: z.number().int().optional(),
  on_time_delivery_rate: z.number().optional(),
  avg_safety_score: z.number().optional()
});

export const fms_fuel_recordsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid().nullish(),
  trip_id: z.string().uuid().nullish(),
  fill_date: z.coerce.date(),
  fuel_type: z.string().nullish(),
  quantity_liters: z.number().nullish(),
  price_per_liter: z.number().nullish(),
  total_cost: z.number().nullish(),
  odometer_reading: z.number().nullish(),
  fill_type: z.string().nullish(),
  station_name: z.string().nullish(),
  station_location: z.string().nullish(),
  payment_method: z.string().nullish(),
  fuel_card_number: z.string().nullish(),
  receipt_number: z.string().nullish(),
  receipt_photo_url: z.string().nullish(),
  consumption_rate: z.number().nullish(),
  notes: z.string().nullish(),
  created_by: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const fms_fuel_recordsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid().optional(),
  trip_id: z.string().uuid().optional(),
  fill_date: z.coerce.date(),
  fuel_type: z.string().optional(),
  quantity_liters: z.number().optional(),
  price_per_liter: z.number().optional(),
  total_cost: z.number().optional(),
  odometer_reading: z.number().optional(),
  fill_type: z.string().optional(),
  station_name: z.string().optional(),
  station_location: z.string().optional(),
  payment_method: z.string().optional(),
  fuel_card_number: z.string().optional(),
  receipt_number: z.string().optional(),
  receipt_photo_url: z.string().optional(),
  consumption_rate: z.number().optional(),
  notes: z.string().optional(),
  created_by: z.string().optional()
});

export const fms_fuel_recordsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  trip_id: z.string().uuid().optional(),
  fill_date: z.coerce.date().optional(),
  fuel_type: z.string().optional(),
  quantity_liters: z.number().optional(),
  price_per_liter: z.number().optional(),
  total_cost: z.number().optional(),
  odometer_reading: z.number().optional(),
  fill_type: z.string().optional(),
  station_name: z.string().optional(),
  station_location: z.string().optional(),
  payment_method: z.string().optional(),
  fuel_card_number: z.string().optional(),
  receipt_number: z.string().optional(),
  receipt_photo_url: z.string().optional(),
  consumption_rate: z.number().optional(),
  notes: z.string().optional(),
  created_by: z.string().optional()
});

export const fms_geofence_eventsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  geofence_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid().nullish(),
  event_type: z.string(),
  event_time: z.coerce.date(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
  speed_kmh: z.number().nullish(),
  duration_minutes: z.number().nullish(),
  is_violation: z.boolean().nullish(),
  acknowledged: z.boolean().nullish(),
  acknowledged_by: z.string().nullish(),
  notes: z.string().nullish(),
  created_at: z.coerce.date()
});

export const fms_geofence_eventsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  geofence_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid().optional(),
  event_type: z.string(),
  event_time: z.coerce.date(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  speed_kmh: z.number().optional(),
  duration_minutes: z.number().optional(),
  is_violation: z.boolean().optional(),
  acknowledged: z.boolean().optional(),
  acknowledged_by: z.string().optional(),
  notes: z.string().optional()
});

export const fms_geofence_eventsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  geofence_id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  event_type: z.string().optional(),
  event_time: z.coerce.date().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  speed_kmh: z.number().optional(),
  duration_minutes: z.number().optional(),
  is_violation: z.boolean().optional(),
  acknowledged: z.boolean().optional(),
  acknowledged_by: z.string().optional(),
  notes: z.string().optional()
});

export const fms_geofencesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  fence_code: z.string(),
  fence_name: z.string(),
  fence_type: z.string().nullish(),
  center_lat: z.number().nullish(),
  center_lng: z.number().nullish(),
  radius_m: z.number().nullish(),
  polygon_points: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  category: z.string().nullish(),
  speed_limit_kmh: z.number().int().nullish(),
  alert_on_enter: z.boolean().nullish(),
  alert_on_exit: z.boolean().nullish(),
  alert_on_speeding: z.boolean().nullish(),
  active_hours_start: z.string().nullish(),
  active_hours_end: z.string().nullish(),
  assigned_vehicles: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  color: z.string().nullish(),
  is_active: z.boolean().nullish(),
  created_by: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const fms_geofencesCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  fence_code: z.string(),
  fence_name: z.string(),
  fence_type: z.string().optional(),
  center_lat: z.number().optional(),
  center_lng: z.number().optional(),
  radius_m: z.number().optional(),
  polygon_points: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  category: z.string().optional(),
  speed_limit_kmh: z.number().int().optional(),
  alert_on_enter: z.boolean().optional(),
  alert_on_exit: z.boolean().optional(),
  alert_on_speeding: z.boolean().optional(),
  active_hours_start: z.string().optional(),
  active_hours_end: z.string().optional(),
  assigned_vehicles: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  color: z.string().optional(),
  is_active: z.boolean().optional(),
  created_by: z.string().optional()
});

export const fms_geofencesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  fence_code: z.string().optional(),
  fence_name: z.string().optional(),
  fence_type: z.string().optional(),
  center_lat: z.number().optional(),
  center_lng: z.number().optional(),
  radius_m: z.number().optional(),
  polygon_points: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  category: z.string().optional(),
  speed_limit_kmh: z.number().int().optional(),
  alert_on_enter: z.boolean().optional(),
  alert_on_exit: z.boolean().optional(),
  alert_on_speeding: z.boolean().optional(),
  active_hours_start: z.string().optional(),
  active_hours_end: z.string().optional(),
  assigned_vehicles: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  color: z.string().optional(),
  is_active: z.boolean().optional(),
  created_by: z.string().optional()
});

export const fms_gps_trackingSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid().nullish(),
  recorded_at: z.coerce.date(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
  speed_kmh: z.number().nullish(),
  heading: z.number().nullish(),
  altitude_m: z.number().nullish(),
  odometer: z.number().nullish(),
  engine_status: z.string().nullish(),
  fuel_level: z.number().nullish(),
  event_type: z.string().nullish(),
  address: z.string().nullish(),
  created_at: z.coerce.date()
});

export const fms_gps_trackingCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid().optional(),
  recorded_at: z.coerce.date(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  speed_kmh: z.number().optional(),
  heading: z.number().optional(),
  altitude_m: z.number().optional(),
  odometer: z.number().optional(),
  engine_status: z.string().optional(),
  fuel_level: z.number().optional(),
  event_type: z.string().optional(),
  address: z.string().optional()
});

export const fms_gps_trackingUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  recorded_at: z.coerce.date().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  speed_kmh: z.number().optional(),
  heading: z.number().optional(),
  altitude_m: z.number().optional(),
  odometer: z.number().optional(),
  engine_status: z.string().optional(),
  fuel_level: z.number().optional(),
  event_type: z.string().optional(),
  address: z.string().optional()
});

export const fms_incidentsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  incident_number: z.string(),
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid().nullish(),
  trip_id: z.string().uuid().nullish(),
  incident_type: z.string(),
  severity: z.string().nullish(),
  incident_date: z.coerce.date(),
  location: z.string().nullish(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
  description: z.string().nullish(),
  police_report_number: z.string().nullish(),
  insurance_claim_number: z.string().nullish(),
  insurance_claim_status: z.string().nullish(),
  insurance_claim_amount: z.number().nullish(),
  insurance_paid_amount: z.number().nullish(),
  repair_cost: z.number().nullish(),
  other_cost: z.number().nullish(),
  total_cost: z.number().nullish(),
  third_party_involved: z.boolean().nullish(),
  third_party_details: z.string().nullish(),
  injuries: z.boolean().nullish(),
  injury_details: z.string().nullish(),
  photos: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  root_cause: z.string().nullish(),
  corrective_action: z.string().nullish(),
  status: z.string().nullish(),
  created_by: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const fms_incidentsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  incident_number: z.string(),
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid().optional(),
  trip_id: z.string().uuid().optional(),
  incident_type: z.string(),
  severity: z.string().optional(),
  incident_date: z.coerce.date(),
  location: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  description: z.string().optional(),
  police_report_number: z.string().optional(),
  insurance_claim_number: z.string().optional(),
  insurance_claim_status: z.string().optional(),
  insurance_claim_amount: z.number().optional(),
  insurance_paid_amount: z.number().optional(),
  repair_cost: z.number().optional(),
  other_cost: z.number().optional(),
  total_cost: z.number().optional(),
  third_party_involved: z.boolean().optional(),
  third_party_details: z.string().optional(),
  injuries: z.boolean().optional(),
  injury_details: z.string().optional(),
  photos: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  root_cause: z.string().optional(),
  corrective_action: z.string().optional(),
  status: z.string().optional(),
  created_by: z.string().optional()
});

export const fms_incidentsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  incident_number: z.string().optional(),
  vehicle_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  trip_id: z.string().uuid().optional(),
  incident_type: z.string().optional(),
  severity: z.string().optional(),
  incident_date: z.coerce.date().optional(),
  location: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  description: z.string().optional(),
  police_report_number: z.string().optional(),
  insurance_claim_number: z.string().optional(),
  insurance_claim_status: z.string().optional(),
  insurance_claim_amount: z.number().optional(),
  insurance_paid_amount: z.number().optional(),
  repair_cost: z.number().optional(),
  other_cost: z.number().optional(),
  total_cost: z.number().optional(),
  third_party_involved: z.boolean().optional(),
  third_party_details: z.string().optional(),
  injuries: z.boolean().optional(),
  injury_details: z.string().optional(),
  photos: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  root_cause: z.string().optional(),
  corrective_action: z.string().optional(),
  status: z.string().optional(),
  created_by: z.string().optional()
});

export const fms_inspectionsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid().nullish(),
  inspection_type: z.string(),
  inspection_date: z.coerce.date(),
  odometer_reading: z.number().nullish(),
  overall_status: z.string().nullish(),
  overall_score: z.number().int().nullish(),
  items_checked: z.number().int().nullish(),
  items_passed: z.number().int().nullish(),
  items_failed: z.number().int().nullish(),
  checklist_data: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  defects_found: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  photos: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  inspector_name: z.string().nullish(),
  inspector_signature: z.string().nullish(),
  driver_signature: z.string().nullish(),
  follow_up_required: z.boolean().nullish(),
  follow_up_notes: z.string().nullish(),
  notes: z.string().nullish(),
  created_by: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const fms_inspectionsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid().optional(),
  inspection_type: z.string(),
  inspection_date: z.coerce.date(),
  odometer_reading: z.number().optional(),
  overall_status: z.string().optional(),
  overall_score: z.number().int().optional(),
  items_checked: z.number().int().optional(),
  items_passed: z.number().int().optional(),
  items_failed: z.number().int().optional(),
  checklist_data: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  defects_found: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  photos: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  inspector_name: z.string().optional(),
  inspector_signature: z.string().optional(),
  driver_signature: z.string().optional(),
  follow_up_required: z.boolean().optional(),
  follow_up_notes: z.string().optional(),
  notes: z.string().optional(),
  created_by: z.string().optional()
});

export const fms_inspectionsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  inspection_type: z.string().optional(),
  inspection_date: z.coerce.date().optional(),
  odometer_reading: z.number().optional(),
  overall_status: z.string().optional(),
  overall_score: z.number().int().optional(),
  items_checked: z.number().int().optional(),
  items_passed: z.number().int().optional(),
  items_failed: z.number().int().optional(),
  checklist_data: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  defects_found: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  photos: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  inspector_name: z.string().optional(),
  inspector_signature: z.string().optional(),
  driver_signature: z.string().optional(),
  follow_up_required: z.boolean().optional(),
  follow_up_notes: z.string().optional(),
  notes: z.string().optional(),
  created_by: z.string().optional()
});

export const fms_maintenance_recordsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  schedule_id: z.string().uuid().nullish(),
  work_order_number: z.string(),
  maintenance_type: z.string(),
  category: z.string().nullish(),
  priority: z.string().nullish(),
  description: z.string().nullish(),
  vendor_name: z.string().nullish(),
  vendor_contact: z.string().nullish(),
  odometer_at_service: z.number().nullish(),
  hour_meter_at_service: z.number().nullish(),
  started_at: z.coerce.date().nullish(),
  completed_at: z.coerce.date().nullish(),
  parts_cost: z.number().nullish(),
  labor_cost: z.number().nullish(),
  other_cost: z.number().nullish(),
  total_cost: z.number().nullish(),
  warranty_claim: z.boolean().nullish(),
  warranty_amount: z.number().nullish(),
  downtime_hours: z.number().nullish(),
  technician_name: z.string().nullish(),
  status: z.string().nullish(),
  approval_status: z.string().nullish(),
  approved_by: z.string().nullish(),
  photos: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  notes: z.string().nullish(),
  created_by: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const fms_maintenance_recordsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  schedule_id: z.string().uuid().optional(),
  work_order_number: z.string(),
  maintenance_type: z.string(),
  category: z.string().optional(),
  priority: z.string().optional(),
  description: z.string().optional(),
  vendor_name: z.string().optional(),
  vendor_contact: z.string().optional(),
  odometer_at_service: z.number().optional(),
  hour_meter_at_service: z.number().optional(),
  started_at: z.coerce.date().optional(),
  completed_at: z.coerce.date().optional(),
  parts_cost: z.number().optional(),
  labor_cost: z.number().optional(),
  other_cost: z.number().optional(),
  total_cost: z.number().optional(),
  warranty_claim: z.boolean().optional(),
  warranty_amount: z.number().optional(),
  downtime_hours: z.number().optional(),
  technician_name: z.string().optional(),
  status: z.string().optional(),
  approval_status: z.string().optional(),
  approved_by: z.string().optional(),
  photos: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  notes: z.string().optional(),
  created_by: z.string().optional()
});

export const fms_maintenance_recordsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid().optional(),
  schedule_id: z.string().uuid().optional(),
  work_order_number: z.string().optional(),
  maintenance_type: z.string().optional(),
  category: z.string().optional(),
  priority: z.string().optional(),
  description: z.string().optional(),
  vendor_name: z.string().optional(),
  vendor_contact: z.string().optional(),
  odometer_at_service: z.number().optional(),
  hour_meter_at_service: z.number().optional(),
  started_at: z.coerce.date().optional(),
  completed_at: z.coerce.date().optional(),
  parts_cost: z.number().optional(),
  labor_cost: z.number().optional(),
  other_cost: z.number().optional(),
  total_cost: z.number().optional(),
  warranty_claim: z.boolean().optional(),
  warranty_amount: z.number().optional(),
  downtime_hours: z.number().optional(),
  technician_name: z.string().optional(),
  status: z.string().optional(),
  approval_status: z.string().optional(),
  approved_by: z.string().optional(),
  photos: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  notes: z.string().optional(),
  created_by: z.string().optional()
});

export const fms_maintenance_schedulesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  schedule_type: z.string(),
  maintenance_type: z.string(),
  description: z.string().nullish(),
  interval_km: z.number().int().nullish(),
  interval_days: z.number().int().nullish(),
  interval_hours: z.number().int().nullish(),
  last_done_at: z.coerce.date().nullish(),
  last_done_km: z.number().nullish(),
  next_due_at: z.coerce.date().nullish(),
  next_due_km: z.number().nullish(),
  alert_before_days: z.number().int().nullish(),
  alert_before_km: z.number().int().nullish(),
  estimated_cost: z.number().nullish(),
  vendor: z.string().nullish(),
  is_active: z.boolean().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const fms_maintenance_schedulesCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  schedule_type: z.string(),
  maintenance_type: z.string(),
  description: z.string().optional(),
  interval_km: z.number().int().optional(),
  interval_days: z.number().int().optional(),
  interval_hours: z.number().int().optional(),
  last_done_at: z.coerce.date().optional(),
  last_done_km: z.number().optional(),
  next_due_at: z.coerce.date().optional(),
  next_due_km: z.number().optional(),
  alert_before_days: z.number().int().optional(),
  alert_before_km: z.number().int().optional(),
  estimated_cost: z.number().optional(),
  vendor: z.string().optional(),
  is_active: z.boolean().optional()
});

export const fms_maintenance_schedulesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid().optional(),
  schedule_type: z.string().optional(),
  maintenance_type: z.string().optional(),
  description: z.string().optional(),
  interval_km: z.number().int().optional(),
  interval_days: z.number().int().optional(),
  interval_hours: z.number().int().optional(),
  last_done_at: z.coerce.date().optional(),
  last_done_km: z.number().optional(),
  next_due_at: z.coerce.date().optional(),
  next_due_km: z.number().optional(),
  alert_before_days: z.number().int().optional(),
  alert_before_km: z.number().int().optional(),
  estimated_cost: z.number().optional(),
  vendor: z.string().optional(),
  is_active: z.boolean().optional()
});

export const fms_remindersSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  reminder_type: z.string(),
  entity_type: z.string().nullish(),
  entity_id: z.string().uuid().nullish(),
  title: z.string(),
  description: z.string().nullish(),
  due_date: z.coerce.date(),
  days_before: z.number().int().nullish(),
  priority: z.string().nullish(),
  status: z.string().nullish(),
  notify_email: z.boolean().nullish(),
  notify_sms: z.boolean().nullish(),
  notify_push: z.boolean().nullish(),
  assigned_to: z.string().nullish(),
  resolved_at: z.coerce.date().nullish(),
  resolved_by: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const fms_remindersCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  reminder_type: z.string(),
  entity_type: z.string().optional(),
  entity_id: z.string().uuid().optional(),
  title: z.string(),
  description: z.string().optional(),
  due_date: z.coerce.date(),
  days_before: z.number().int().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  notify_email: z.boolean().optional(),
  notify_sms: z.boolean().optional(),
  notify_push: z.boolean().optional(),
  assigned_to: z.string().optional(),
  resolved_at: z.coerce.date().optional(),
  resolved_by: z.string().optional()
});

export const fms_remindersUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  reminder_type: z.string().optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().uuid().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  due_date: z.coerce.date().optional(),
  days_before: z.number().int().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  notify_email: z.boolean().optional(),
  notify_sms: z.boolean().optional(),
  notify_push: z.boolean().optional(),
  assigned_to: z.string().optional(),
  resolved_at: z.coerce.date().optional(),
  resolved_by: z.string().optional()
});

export const fms_rental_paymentsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  rental_id: z.string().uuid(),
  payment_number: z.string().nullish(),
  payment_date: z.coerce.date(),
  amount: z.number().nullish(),
  payment_method: z.string().nullish(),
  reference_number: z.string().nullish(),
  payment_type: z.string().nullish(),
  notes: z.string().nullish(),
  created_by: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const fms_rental_paymentsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  rental_id: z.string().uuid(),
  payment_number: z.string().optional(),
  payment_date: z.coerce.date(),
  amount: z.number().optional(),
  payment_method: z.string().optional(),
  reference_number: z.string().optional(),
  payment_type: z.string().optional(),
  notes: z.string().optional(),
  created_by: z.string().optional()
});

export const fms_rental_paymentsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  rental_id: z.string().uuid().optional(),
  payment_number: z.string().optional(),
  payment_date: z.coerce.date().optional(),
  amount: z.number().optional(),
  payment_method: z.string().optional(),
  reference_number: z.string().optional(),
  payment_type: z.string().optional(),
  notes: z.string().optional(),
  created_by: z.string().optional()
});

export const fms_rentalsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  rental_number: z.string(),
  rental_type: z.string(),
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid().nullish(),
  customer_name: z.string().nullish(),
  customer_phone: z.string().nullish(),
  customer_email: z.string().nullish(),
  customer_company: z.string().nullish(),
  customer_id_number: z.string().nullish(),
  vendor_name: z.string().nullish(),
  contract_type: z.string().nullish(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  actual_return_date: z.coerce.date().nullish(),
  pickup_location: z.string().nullish(),
  return_location: z.string().nullish(),
  start_odometer: z.number().nullish(),
  end_odometer: z.number().nullish(),
  rate_type: z.string().nullish(),
  rate_amount: z.number().nullish(),
  min_km: z.number().nullish(),
  max_km: z.number().nullish(),
  overage_rate: z.number().nullish(),
  include_driver: z.boolean().nullish(),
  include_fuel: z.boolean().nullish(),
  deposit_amount: z.number().nullish(),
  deposit_status: z.string().nullish(),
  subtotal: z.number().nullish(),
  tax_amount: z.number().nullish(),
  discount_amount: z.number().nullish(),
  total_amount: z.number().nullish(),
  penalty_amount: z.number().nullish(),
  payment_status: z.string().nullish(),
  status: z.string().nullish(),
  terms_conditions: z.string().nullish(),
  notes: z.string().nullish(),
  created_by: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const fms_rentalsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  rental_number: z.string(),
  rental_type: z.string(),
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_email: z.string().optional(),
  customer_company: z.string().optional(),
  customer_id_number: z.string().optional(),
  vendor_name: z.string().optional(),
  contract_type: z.string().optional(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  actual_return_date: z.coerce.date().optional(),
  pickup_location: z.string().optional(),
  return_location: z.string().optional(),
  start_odometer: z.number().optional(),
  end_odometer: z.number().optional(),
  rate_type: z.string().optional(),
  rate_amount: z.number().optional(),
  min_km: z.number().optional(),
  max_km: z.number().optional(),
  overage_rate: z.number().optional(),
  include_driver: z.boolean().optional(),
  include_fuel: z.boolean().optional(),
  deposit_amount: z.number().optional(),
  deposit_status: z.string().optional(),
  subtotal: z.number().optional(),
  tax_amount: z.number().optional(),
  discount_amount: z.number().optional(),
  total_amount: z.number().optional(),
  penalty_amount: z.number().optional(),
  payment_status: z.string().optional(),
  status: z.string().optional(),
  terms_conditions: z.string().optional(),
  notes: z.string().optional(),
  created_by: z.string().optional()
});

export const fms_rentalsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  rental_number: z.string().optional(),
  rental_type: z.string().optional(),
  vehicle_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_email: z.string().optional(),
  customer_company: z.string().optional(),
  customer_id_number: z.string().optional(),
  vendor_name: z.string().optional(),
  contract_type: z.string().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  actual_return_date: z.coerce.date().optional(),
  pickup_location: z.string().optional(),
  return_location: z.string().optional(),
  start_odometer: z.number().optional(),
  end_odometer: z.number().optional(),
  rate_type: z.string().optional(),
  rate_amount: z.number().optional(),
  min_km: z.number().optional(),
  max_km: z.number().optional(),
  overage_rate: z.number().optional(),
  include_driver: z.boolean().optional(),
  include_fuel: z.boolean().optional(),
  deposit_amount: z.number().optional(),
  deposit_status: z.string().optional(),
  subtotal: z.number().optional(),
  tax_amount: z.number().optional(),
  discount_amount: z.number().optional(),
  total_amount: z.number().optional(),
  penalty_amount: z.number().optional(),
  payment_status: z.string().optional(),
  status: z.string().optional(),
  terms_conditions: z.string().optional(),
  notes: z.string().optional(),
  created_by: z.string().optional()
});

export const fms_settingsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  setting_key: z.string(),
  setting_value: z.string().nullish(),
  setting_type: z.string().nullish(),
  category: z.string().nullish(),
  label: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const fms_settingsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  setting_key: z.string(),
  setting_value: z.string().optional(),
  setting_type: z.string().optional(),
  category: z.string().optional(),
  label: z.string().optional()
});

export const fms_settingsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  setting_key: z.string().optional(),
  setting_value: z.string().optional(),
  setting_type: z.string().optional(),
  category: z.string().optional(),
  label: z.string().optional()
});

export const fms_tiresSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  tire_serial: z.string(),
  vehicle_id: z.string().uuid().nullish(),
  position: z.string().nullish(),
  brand: z.string().nullish(),
  model: z.string().nullish(),
  size: z.string().nullish(),
  type: z.string().nullish(),
  purchase_date: z.coerce.date().nullish(),
  purchase_price: z.number().nullish(),
  install_date: z.coerce.date().nullish(),
  install_odometer: z.number().nullish(),
  max_km: z.number().nullish(),
  current_tread_depth: z.number().nullish(),
  min_tread_depth: z.number().nullish(),
  retread_count: z.number().int().nullish(),
  status: z.string().nullish(),
  notes: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const fms_tiresCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  tire_serial: z.string(),
  vehicle_id: z.string().uuid().optional(),
  position: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  size: z.string().optional(),
  type: z.string().optional(),
  purchase_date: z.coerce.date().optional(),
  purchase_price: z.number().optional(),
  install_date: z.coerce.date().optional(),
  install_odometer: z.number().optional(),
  max_km: z.number().optional(),
  current_tread_depth: z.number().optional(),
  min_tread_depth: z.number().optional(),
  retread_count: z.number().int().optional(),
  status: z.string().optional(),
  notes: z.string().optional()
});

export const fms_tiresUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  tire_serial: z.string().optional(),
  vehicle_id: z.string().uuid().optional(),
  position: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  size: z.string().optional(),
  type: z.string().optional(),
  purchase_date: z.coerce.date().optional(),
  purchase_price: z.number().optional(),
  install_date: z.coerce.date().optional(),
  install_odometer: z.number().optional(),
  max_km: z.number().optional(),
  current_tread_depth: z.number().optional(),
  min_tread_depth: z.number().optional(),
  retread_count: z.number().int().optional(),
  status: z.string().optional(),
  notes: z.string().optional()
});

export const fms_vehicle_assignmentsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  assigned_date: z.coerce.date(),
  released_date: z.coerce.date().nullish(),
  start_odometer: z.number().nullish(),
  end_odometer: z.number().nullish(),
  reason: z.string().nullish(),
  status: z.string().nullish(),
  created_by: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const fms_vehicle_assignmentsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  assigned_date: z.coerce.date(),
  released_date: z.coerce.date().optional(),
  start_odometer: z.number().optional(),
  end_odometer: z.number().optional(),
  reason: z.string().optional(),
  status: z.string().optional(),
  created_by: z.string().optional()
});

export const fms_vehicle_assignmentsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  assigned_date: z.coerce.date().optional(),
  released_date: z.coerce.date().optional(),
  start_odometer: z.number().optional(),
  end_odometer: z.number().optional(),
  reason: z.string().optional(),
  status: z.string().optional(),
  created_by: z.string().optional()
});

export const fms_vehiclesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  vehicle_code: z.string(),
  license_plate: z.string(),
  vehicle_type: z.string(),
  vehicle_category: z.string().nullish(),
  brand: z.string().nullish(),
  model: z.string().nullish(),
  year: z.number().int().nullish(),
  color: z.string().nullish(),
  vin_number: z.string().nullish(),
  engine_number: z.string().nullish(),
  chassis_number: z.string().nullish(),
  engine_type: z.string().nullish(),
  transmission: z.string().nullish(),
  fuel_type: z.string().nullish(),
  seating_capacity: z.number().int().nullish(),
  max_weight_kg: z.number().nullish(),
  max_volume_m3: z.number().nullish(),
  fuel_tank_capacity_l: z.number().nullish(),
  avg_fuel_consumption: z.number().nullish(),
  ownership_type: z.string().nullish(),
  purchase_date: z.coerce.date().nullish(),
  purchase_price: z.number().nullish(),
  depreciation_rate: z.number().nullish(),
  current_value: z.number().nullish(),
  salvage_value: z.number().nullish(),
  lease_vendor: z.string().nullish(),
  lease_start: z.coerce.date().nullish(),
  lease_end: z.coerce.date().nullish(),
  lease_monthly: z.number().nullish(),
  registration_number: z.string().nullish(),
  registration_expiry: z.coerce.date().nullish(),
  bpkb_number: z.string().nullish(),
  kir_number: z.string().nullish(),
  kir_expiry: z.coerce.date().nullish(),
  insurance_provider: z.string().nullish(),
  insurance_policy: z.string().nullish(),
  insurance_type: z.string().nullish(),
  insurance_start: z.coerce.date().nullish(),
  insurance_expiry: z.coerce.date().nullish(),
  insurance_premium: z.number().nullish(),
  gps_device_id: z.string().nullish(),
  gps_imei: z.string().nullish(),
  current_odometer_km: z.number().nullish(),
  last_odometer_date: z.coerce.date().nullish(),
  current_hour_meter: z.number().nullish(),
  status: z.string().nullish(),
  condition_rating: z.number().int().nullish(),
  assigned_branch_id: z.string().uuid().nullish(),
  assigned_driver_id: z.string().uuid().nullish(),
  current_lat: z.number().nullish(),
  current_lng: z.number().nullish(),
  current_location: z.string().nullish(),
  photo_url: z.string().nullish(),
  notes: z.string().nullish(),
  is_active: z.boolean().nullish(),
  created_by: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const fms_vehiclesCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  vehicle_code: z.string(),
  license_plate: z.string(),
  vehicle_type: z.string(),
  vehicle_category: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().optional(),
  color: z.string().optional(),
  vin_number: z.string().optional(),
  engine_number: z.string().optional(),
  chassis_number: z.string().optional(),
  engine_type: z.string().optional(),
  transmission: z.string().optional(),
  fuel_type: z.string().optional(),
  seating_capacity: z.number().int().optional(),
  max_weight_kg: z.number().optional(),
  max_volume_m3: z.number().optional(),
  fuel_tank_capacity_l: z.number().optional(),
  avg_fuel_consumption: z.number().optional(),
  ownership_type: z.string().optional(),
  purchase_date: z.coerce.date().optional(),
  purchase_price: z.number().optional(),
  depreciation_rate: z.number().optional(),
  current_value: z.number().optional(),
  salvage_value: z.number().optional(),
  lease_vendor: z.string().optional(),
  lease_start: z.coerce.date().optional(),
  lease_end: z.coerce.date().optional(),
  lease_monthly: z.number().optional(),
  registration_number: z.string().optional(),
  registration_expiry: z.coerce.date().optional(),
  bpkb_number: z.string().optional(),
  kir_number: z.string().optional(),
  kir_expiry: z.coerce.date().optional(),
  insurance_provider: z.string().optional(),
  insurance_policy: z.string().optional(),
  insurance_type: z.string().optional(),
  insurance_start: z.coerce.date().optional(),
  insurance_expiry: z.coerce.date().optional(),
  insurance_premium: z.number().optional(),
  gps_device_id: z.string().optional(),
  gps_imei: z.string().optional(),
  current_odometer_km: z.number().optional(),
  last_odometer_date: z.coerce.date().optional(),
  current_hour_meter: z.number().optional(),
  status: z.string().optional(),
  condition_rating: z.number().int().optional(),
  assigned_branch_id: z.string().uuid().optional(),
  assigned_driver_id: z.string().uuid().optional(),
  current_lat: z.number().optional(),
  current_lng: z.number().optional(),
  current_location: z.string().optional(),
  photo_url: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().optional(),
  created_by: z.string().optional()
});

export const fms_vehiclesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  vehicle_code: z.string().optional(),
  license_plate: z.string().optional(),
  vehicle_type: z.string().optional(),
  vehicle_category: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().optional(),
  color: z.string().optional(),
  vin_number: z.string().optional(),
  engine_number: z.string().optional(),
  chassis_number: z.string().optional(),
  engine_type: z.string().optional(),
  transmission: z.string().optional(),
  fuel_type: z.string().optional(),
  seating_capacity: z.number().int().optional(),
  max_weight_kg: z.number().optional(),
  max_volume_m3: z.number().optional(),
  fuel_tank_capacity_l: z.number().optional(),
  avg_fuel_consumption: z.number().optional(),
  ownership_type: z.string().optional(),
  purchase_date: z.coerce.date().optional(),
  purchase_price: z.number().optional(),
  depreciation_rate: z.number().optional(),
  current_value: z.number().optional(),
  salvage_value: z.number().optional(),
  lease_vendor: z.string().optional(),
  lease_start: z.coerce.date().optional(),
  lease_end: z.coerce.date().optional(),
  lease_monthly: z.number().optional(),
  registration_number: z.string().optional(),
  registration_expiry: z.coerce.date().optional(),
  bpkb_number: z.string().optional(),
  kir_number: z.string().optional(),
  kir_expiry: z.coerce.date().optional(),
  insurance_provider: z.string().optional(),
  insurance_policy: z.string().optional(),
  insurance_type: z.string().optional(),
  insurance_start: z.coerce.date().optional(),
  insurance_expiry: z.coerce.date().optional(),
  insurance_premium: z.number().optional(),
  gps_device_id: z.string().optional(),
  gps_imei: z.string().optional(),
  current_odometer_km: z.number().optional(),
  last_odometer_date: z.coerce.date().optional(),
  current_hour_meter: z.number().optional(),
  status: z.string().optional(),
  condition_rating: z.number().int().optional(),
  assigned_branch_id: z.string().uuid().optional(),
  assigned_driver_id: z.string().uuid().optional(),
  current_lat: z.number().optional(),
  current_lng: z.number().optional(),
  current_location: z.string().optional(),
  photo_url: z.string().optional(),
  notes: z.string().optional(),
  is_active: z.boolean().optional(),
  created_by: z.string().optional()
});

export const hris_candidatesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  job_opening_id: z.string().uuid().nullish(),
  full_name: z.string(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  current_stage: z.string().nullish(),
  status: z.string().nullish(),
  source: z.string().nullish(),
  rating: z.number().int().nullish(),
  experience_summary: z.string().nullish(),
  education_level: z.string().nullish(),
  applied_date: z.coerce.date().nullish(),
  notes: z.string().nullish(),
  resume_url: z.string().nullish(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const hris_candidatesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  job_opening_id: z.string().uuid().optional(),
  full_name: z.string(),
  email: z.string().optional(),
  phone: z.string().optional(),
  current_stage: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  rating: z.number().int().optional(),
  experience_summary: z.string().optional(),
  education_level: z.string().optional(),
  applied_date: z.coerce.date().optional(),
  notes: z.string().optional(),
  resume_url: z.string().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const hris_candidatesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  job_opening_id: z.string().uuid().optional(),
  full_name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  current_stage: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  rating: z.number().int().optional(),
  experience_summary: z.string().optional(),
  education_level: z.string().optional(),
  applied_date: z.coerce.date().optional(),
  notes: z.string().optional(),
  resume_url: z.string().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const hris_certificationsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  employee_id: z.number().int().nullish(),
  certification_name: z.string(),
  issuing_organization: z.string().nullish(),
  issued_date: z.coerce.date().nullish(),
  expiry_date: z.coerce.date().nullish(),
  status: z.string().nullish(),
  credential_id: z.string().nullish(),
  document_url: z.string().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const hris_certificationsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  certification_name: z.string(),
  issuing_organization: z.string().optional(),
  issued_date: z.coerce.date().optional(),
  expiry_date: z.coerce.date().optional(),
  status: z.string().optional(),
  credential_id: z.string().optional(),
  document_url: z.string().optional()
});

export const hris_certificationsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  certification_name: z.string().optional(),
  issuing_organization: z.string().optional(),
  issued_date: z.coerce.date().optional(),
  expiry_date: z.coerce.date().optional(),
  status: z.string().optional(),
  credential_id: z.string().optional(),
  document_url: z.string().optional()
});

export const hris_job_openingsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  branch_id: z.string().uuid().nullish(),
  title: z.string(),
  department: z.string(),
  location: z.string().nullish(),
  employment_type: z.string().nullish(),
  status: z.string().nullish(),
  priority: z.string().nullish(),
  salary_min: z.number().nullish(),
  salary_max: z.number().nullish(),
  applicants: z.number().int().nullish(),
  description: z.string().nullish(),
  requirements: z.string().nullish(),
  posted_date: z.coerce.date().nullish(),
  deadline: z.coerce.date().nullish(),
  created_by: z.string().uuid().nullish(),
  updated_by: z.string().uuid().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  hris_candidates: z.string()
});

export const hris_job_openingsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  title: z.string(),
  department: z.string(),
  location: z.string().optional(),
  employment_type: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
  applicants: z.number().int().optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  posted_date: z.coerce.date().optional(),
  deadline: z.coerce.date().optional(),
  created_by: z.string().uuid().optional(),
  updated_by: z.string().uuid().optional(),
  hris_candidates: z.string()
});

export const hris_job_openingsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  employment_type: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  salary_min: z.number().optional(),
  salary_max: z.number().optional(),
  applicants: z.number().int().optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  posted_date: z.coerce.date().optional(),
  deadline: z.coerce.date().optional(),
  created_by: z.string().uuid().optional(),
  updated_by: z.string().uuid().optional(),
  hris_candidates: z.string().optional()
});

export const hris_training_enrollmentsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  training_program_id: z.string().uuid().nullish(),
  employee_id: z.number().int().nullish(),
  status: z.string().nullish(),
  enrolled_at: z.coerce.date().nullish(),
  completion_date: z.coerce.date().nullish(),
  score: z.number().nullish(),
  feedback: z.string().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const hris_training_enrollmentsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  training_program_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  status: z.string().optional(),
  enrolled_at: z.coerce.date().optional(),
  completion_date: z.coerce.date().optional(),
  score: z.number().optional(),
  feedback: z.string().optional()
});

export const hris_training_enrollmentsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  training_program_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  status: z.string().optional(),
  enrolled_at: z.coerce.date().optional(),
  completion_date: z.coerce.date().optional(),
  score: z.number().optional(),
  feedback: z.string().optional()
});

export const hris_training_programsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  title: z.string(),
  category: z.string().nullish(),
  training_type: z.string().nullish(),
  trainer_name: z.string().nullish(),
  location: z.string().nullish(),
  status: z.string().nullish(),
  start_date: z.coerce.date().nullish(),
  end_date: z.coerce.date().nullish(),
  max_participants: z.number().int().nullish(),
  current_participants: z.number().int().nullish(),
  cost_per_person: z.number().nullish(),
  rating: z.number().nullish(),
  description: z.string().nullish(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const hris_training_programsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  title: z.string(),
  category: z.string().optional(),
  training_type: z.string().optional(),
  trainer_name: z.string().optional(),
  location: z.string().optional(),
  status: z.string().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  max_participants: z.number().int().optional(),
  current_participants: z.number().int().optional(),
  cost_per_person: z.number().optional(),
  rating: z.number().optional(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const hris_training_programsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  title: z.string().optional(),
  category: z.string().optional(),
  training_type: z.string().optional(),
  trainer_name: z.string().optional(),
  location: z.string().optional(),
  status: z.string().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  max_participants: z.number().int().optional(),
  current_participants: z.number().int().optional(),
  cost_per_person: z.number().optional(),
  rating: z.number().optional(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const invoice_itemsSchema = z.object({
  id: z.string().uuid(),
  invoice_id: z.string().uuid(),
  description: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  amount: z.number(),
  type: z.string(),
  reference_type: z.string().nullish(),
  reference_id: z.string().uuid().nullish(),
  created_at: z.coerce.date()
});

export const invoice_itemsCreateSchema = z.object({
  invoice_id: z.string().uuid(),
  description: z.string(),
  quantity: z.number().optional(),
  unit_price: z.number(),
  amount: z.number(),
  type: z.string(),
  reference_type: z.string().optional(),
  reference_id: z.string().uuid().optional()
});

export const invoice_itemsUpdateSchema = z.object({
  invoice_id: z.string().uuid().optional(),
  description: z.string().optional(),
  quantity: z.number().optional(),
  unit_price: z.number().optional(),
  amount: z.number().optional(),
  type: z.string().optional(),
  reference_type: z.string().optional(),
  reference_id: z.string().uuid().optional()
});

export const invoicesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  billing_cycle_id: z.string().uuid().nullish(),
  subscription_id: z.string().uuid().nullish(),
  invoice_number: z.string(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled", "refunded"]),
  issued_date: z.coerce.date(),
  due_date: z.coerce.date(),
  paid_date: z.coerce.date().nullish(),
  subtotal: z.number(),
  tax_amount: z.number(),
  discount_amount: z.number(),
  total_amount: z.number(),
  currency: z.string(),
  payment_provider: z.string().nullish(),
  payment_method: z.string().nullish(),
  external_id: z.string().nullish(),
  payment_fee: z.number(),
  customer_name: z.string().nullish(),
  customer_email: z.string().nullish(),
  customer_phone: z.string().nullish(),
  customer_address: z.string().nullish(),
  notes: z.string().nullish(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  invoice_items: z.string(),
  payment_transactions: z.string()
});

export const invoicesCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  billing_cycle_id: z.string().uuid().optional(),
  subscription_id: z.string().uuid().optional(),
  invoice_number: z.string(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled", "refunded"]).optional(),
  issued_date: z.coerce.date(),
  due_date: z.coerce.date(),
  paid_date: z.coerce.date().optional(),
  subtotal: z.number().optional(),
  tax_amount: z.number().optional(),
  discount_amount: z.number().optional(),
  total_amount: z.number().optional(),
  currency: z.string().optional(),
  payment_provider: z.string().optional(),
  payment_method: z.string().optional(),
  external_id: z.string().optional(),
  payment_fee: z.number().optional(),
  customer_name: z.string().optional(),
  customer_email: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_address: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  invoice_items: z.string(),
  payment_transactions: z.string()
});

export const invoicesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  billing_cycle_id: z.string().uuid().optional(),
  subscription_id: z.string().uuid().optional(),
  invoice_number: z.string().optional(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled", "refunded"]).optional(),
  issued_date: z.coerce.date().optional(),
  due_date: z.coerce.date().optional(),
  paid_date: z.coerce.date().optional(),
  subtotal: z.number().optional(),
  tax_amount: z.number().optional(),
  discount_amount: z.number().optional(),
  total_amount: z.number().optional(),
  currency: z.string().optional(),
  payment_provider: z.string().optional(),
  payment_method: z.string().optional(),
  external_id: z.string().optional(),
  payment_fee: z.number().optional(),
  customer_name: z.string().optional(),
  customer_email: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_address: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  invoice_items: z.string().optional(),
  payment_transactions: z.string().optional()
});

export const job_gradesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  code: z.string(),
  name: z.string(),
  level: z.number().int(),
  min_salary: z.number().nullish(),
  max_salary: z.number().nullish(),
  benefits: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  leave_quota: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const job_gradesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string(),
  name: z.string(),
  level: z.number().int().optional(),
  min_salary: z.number().optional(),
  max_salary: z.number().optional(),
  benefits: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  leave_quota: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const job_gradesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  level: z.number().int().optional(),
  min_salary: z.number().optional(),
  max_salary: z.number().optional(),
  benefits: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  leave_quota: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const kitchen_inventory_itemsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  product_id: z.string().uuid().nullish(),
  name: z.string(),
  category: z.string().nullish(),
  current_stock: z.number(),
  unit: z.string(),
  min_stock: z.number(),
  max_stock: z.number(),
  reorder_point: z.number(),
  unit_cost: z.number().nullish(),
  total_value: z.number().nullish(),
  last_restocked: z.coerce.date().nullish(),
  status: z.enum(["good", "low", "critical", "overstock"]),
  warehouse_id: z.string().uuid().nullish(),
  location_id: z.string().uuid().nullish(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const kitchen_inventory_itemsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  product_id: z.string().uuid().optional(),
  name: z.string(),
  category: z.string().optional(),
  current_stock: z.number().optional(),
  unit: z.string(),
  min_stock: z.number().optional(),
  max_stock: z.number().optional(),
  reorder_point: z.number().optional(),
  unit_cost: z.number().optional(),
  total_value: z.number().optional(),
  last_restocked: z.coerce.date().optional(),
  status: z.enum(["good", "low", "critical", "overstock"]).optional(),
  warehouse_id: z.string().uuid().optional(),
  location_id: z.string().uuid().optional(),
  is_active: z.boolean().optional()
});

export const kitchen_inventory_itemsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  name: z.string().optional(),
  category: z.string().optional(),
  current_stock: z.number().optional(),
  unit: z.string().optional(),
  min_stock: z.number().optional(),
  max_stock: z.number().optional(),
  reorder_point: z.number().optional(),
  unit_cost: z.number().optional(),
  total_value: z.number().optional(),
  last_restocked: z.coerce.date().optional(),
  status: z.enum(["good", "low", "critical", "overstock"]).optional(),
  warehouse_id: z.string().uuid().optional(),
  location_id: z.string().uuid().optional(),
  is_active: z.boolean().optional()
});

export const kitchen_inventory_transactionsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  inventory_item_id: z.string().uuid(),
  transaction_type: z.enum(["in", "out", "adjustment", "waste", "transfer"]),
  quantity: z.number(),
  unit: z.string(),
  previous_stock: z.number().nullish(),
  new_stock: z.number().nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.string().uuid().nullish(),
  notes: z.string().nullish(),
  performed_by: z.string().uuid().nullish(),
  transaction_date: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const kitchen_inventory_transactionsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  inventory_item_id: z.string().uuid(),
  transaction_type: z.enum(["in", "out", "adjustment", "waste", "transfer"]),
  quantity: z.number(),
  unit: z.string(),
  previous_stock: z.number().optional(),
  new_stock: z.number().optional(),
  reference_type: z.string().optional(),
  reference_id: z.string().uuid().optional(),
  notes: z.string().optional(),
  performed_by: z.string().uuid().optional(),
  transaction_date: z.coerce.date()
});

export const kitchen_inventory_transactionsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  inventory_item_id: z.string().uuid().optional(),
  transaction_type: z.enum(["in", "out", "adjustment", "waste", "transfer"]).optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  previous_stock: z.number().optional(),
  new_stock: z.number().optional(),
  reference_type: z.string().optional(),
  reference_id: z.string().uuid().optional(),
  notes: z.string().optional(),
  performed_by: z.string().uuid().optional(),
  transaction_date: z.coerce.date().optional()
});

export const kitchen_order_itemsSchema = z.object({
  id: z.string().uuid(),
  kitchen_order_id: z.string().uuid(),
  product_id: z.string().uuid(),
  recipe_id: z.string().uuid().nullish(),
  name: z.string(),
  quantity: z.number().int(),
  notes: z.string().nullish(),
  modifiers: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  status: z.enum(["pending", "preparing", "ready"]),
  prepared_by: z.string().uuid().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const kitchen_order_itemsCreateSchema = z.object({
  kitchen_order_id: z.string().uuid(),
  product_id: z.string().uuid(),
  recipe_id: z.string().uuid().optional(),
  name: z.string(),
  quantity: z.number().int().optional(),
  notes: z.string().optional(),
  modifiers: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  status: z.enum(["pending", "preparing", "ready"]).optional(),
  prepared_by: z.string().uuid().optional()
});

export const kitchen_order_itemsUpdateSchema = z.object({
  kitchen_order_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  recipe_id: z.string().uuid().optional(),
  name: z.string().optional(),
  quantity: z.number().int().optional(),
  notes: z.string().optional(),
  modifiers: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  status: z.enum(["pending", "preparing", "ready"]).optional(),
  prepared_by: z.string().uuid().optional()
});

export const kitchen_ordersSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  order_number: z.string(),
  pos_transaction_id: z.string().uuid().nullish(),
  table_number: z.string().nullish(),
  order_type: z.enum(["dine_in  @map(\"dine-in\")", "takeaway", "delivery"]),
  customer_name: z.string().nullish(),
  status: z.enum(["new", "preparing", "ready", "served", "cancelled"]),
  priority: z.enum(["normal", "urgent"]),
  received_at: z.coerce.date(),
  started_at: z.coerce.date().nullish(),
  completed_at: z.coerce.date().nullish(),
  served_at: z.coerce.date().nullish(),
  estimated_time: z.number().int().nullish(),
  actual_prep_time: z.number().int().nullish(),
  assigned_chef_id: z.string().uuid().nullish(),
  notes: z.string().nullish(),
  total_amount: z.number().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const kitchen_ordersCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  order_number: z.string(),
  pos_transaction_id: z.string().uuid().optional(),
  table_number: z.string().optional(),
  order_type: z.enum(["dine_in  @map(\"dine-in\")", "takeaway", "delivery"]).optional(),
  customer_name: z.string().optional(),
  status: z.enum(["new", "preparing", "ready", "served", "cancelled"]).optional(),
  priority: z.enum(["normal", "urgent"]).optional(),
  received_at: z.coerce.date(),
  started_at: z.coerce.date().optional(),
  completed_at: z.coerce.date().optional(),
  served_at: z.coerce.date().optional(),
  estimated_time: z.number().int().optional(),
  actual_prep_time: z.number().int().optional(),
  assigned_chef_id: z.string().uuid().optional(),
  notes: z.string().optional(),
  total_amount: z.number().optional()
});

export const kitchen_ordersUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  order_number: z.string().optional(),
  pos_transaction_id: z.string().uuid().optional(),
  table_number: z.string().optional(),
  order_type: z.enum(["dine_in  @map(\"dine-in\")", "takeaway", "delivery"]).optional(),
  customer_name: z.string().optional(),
  status: z.enum(["new", "preparing", "ready", "served", "cancelled"]).optional(),
  priority: z.enum(["normal", "urgent"]).optional(),
  received_at: z.coerce.date().optional(),
  started_at: z.coerce.date().optional(),
  completed_at: z.coerce.date().optional(),
  served_at: z.coerce.date().optional(),
  estimated_time: z.number().int().optional(),
  actual_prep_time: z.number().int().optional(),
  assigned_chef_id: z.string().uuid().optional(),
  notes: z.string().optional(),
  total_amount: z.number().optional()
});

export const kpi_templatesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  code: z.string(),
  name: z.string(),
  category: z.string().nullish(),
  unit: z.string().nullish(),
  data_type: z.string().nullish(),
  formula_type: z.string().nullish(),
  formula: z.string().nullish(),
  default_weight: z.number().int().nullish(),
  measurement_frequency: z.string().nullish(),
  is_active: z.boolean().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const kpi_templatesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string(),
  name: z.string(),
  category: z.string().optional(),
  unit: z.string().optional(),
  data_type: z.string().optional(),
  formula_type: z.string().optional(),
  formula: z.string().optional(),
  default_weight: z.number().int().optional(),
  measurement_frequency: z.string().optional(),
  is_active: z.boolean().optional()
});

export const kpi_templatesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().optional(),
  data_type: z.string().optional(),
  formula_type: z.string().optional(),
  formula: z.string().optional(),
  default_weight: z.number().int().optional(),
  measurement_frequency: z.string().optional(),
  is_active: z.boolean().optional()
});

export const kyb_applicationsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  user_id: z.number().int(),
  business_name: z.string(),
  business_category: z.string().nullish(),
  business_subcategory: z.string().nullish(),
  business_duration: z.string().nullish(),
  business_description: z.string().nullish(),
  employee_count: z.string().nullish(),
  annual_revenue: z.string().nullish(),
  legal_entity_type: z.string().nullish(),
  legal_entity_name: z.string().nullish(),
  nib_number: z.string().nullish(),
  siup_number: z.string().nullish(),
  npwp_number: z.string().nullish(),
  ktp_number: z.string().nullish(),
  ktp_name: z.string().nullish(),
  pic_name: z.string().nullish(),
  pic_phone: z.string().nullish(),
  pic_email: z.string().nullish(),
  pic_position: z.string().nullish(),
  business_address: z.string().nullish(),
  business_city: z.string().nullish(),
  business_province: z.string().nullish(),
  business_postal_code: z.string().nullish(),
  business_district: z.string().nullish(),
  business_coordinates: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  business_structure: z.string().nullish(),
  planned_branch_count: z.number().int().nullish(),
  branch_locations: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  additional_notes: z.string().nullish(),
  referral_source: z.string().nullish(),
  expected_start_date: z.coerce.date().nullish(),
  status: z.string().nullish(),
  submitted_at: z.coerce.date().nullish(),
  current_step: z.number().int().nullish(),
  completion_percentage: z.number().int().nullish(),
  reviewed_by: z.string().uuid().nullish(),
  reviewed_at: z.coerce.date().nullish(),
  review_notes: z.string().nullish(),
  rejection_reason: z.string().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  kyb_documents: z.string()
});

export const kyb_applicationsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  user_id: z.number().int(),
  business_name: z.string(),
  business_category: z.string().optional(),
  business_subcategory: z.string().optional(),
  business_duration: z.string().optional(),
  business_description: z.string().optional(),
  employee_count: z.string().optional(),
  annual_revenue: z.string().optional(),
  legal_entity_type: z.string().optional(),
  legal_entity_name: z.string().optional(),
  nib_number: z.string().optional(),
  siup_number: z.string().optional(),
  npwp_number: z.string().optional(),
  ktp_number: z.string().optional(),
  ktp_name: z.string().optional(),
  pic_name: z.string().optional(),
  pic_phone: z.string().optional(),
  pic_email: z.string().optional(),
  pic_position: z.string().optional(),
  business_address: z.string().optional(),
  business_city: z.string().optional(),
  business_province: z.string().optional(),
  business_postal_code: z.string().optional(),
  business_district: z.string().optional(),
  business_coordinates: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  business_structure: z.string().optional(),
  planned_branch_count: z.number().int().optional(),
  branch_locations: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  additional_notes: z.string().optional(),
  referral_source: z.string().optional(),
  expected_start_date: z.coerce.date().optional(),
  status: z.string().optional(),
  submitted_at: z.coerce.date().optional(),
  current_step: z.number().int().optional(),
  completion_percentage: z.number().int().optional(),
  reviewed_by: z.string().uuid().optional(),
  reviewed_at: z.coerce.date().optional(),
  review_notes: z.string().optional(),
  rejection_reason: z.string().optional(),
  kyb_documents: z.string()
});

export const kyb_applicationsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  user_id: z.number().int().optional(),
  business_name: z.string().optional(),
  business_category: z.string().optional(),
  business_subcategory: z.string().optional(),
  business_duration: z.string().optional(),
  business_description: z.string().optional(),
  employee_count: z.string().optional(),
  annual_revenue: z.string().optional(),
  legal_entity_type: z.string().optional(),
  legal_entity_name: z.string().optional(),
  nib_number: z.string().optional(),
  siup_number: z.string().optional(),
  npwp_number: z.string().optional(),
  ktp_number: z.string().optional(),
  ktp_name: z.string().optional(),
  pic_name: z.string().optional(),
  pic_phone: z.string().optional(),
  pic_email: z.string().optional(),
  pic_position: z.string().optional(),
  business_address: z.string().optional(),
  business_city: z.string().optional(),
  business_province: z.string().optional(),
  business_postal_code: z.string().optional(),
  business_district: z.string().optional(),
  business_coordinates: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  business_structure: z.string().optional(),
  planned_branch_count: z.number().int().optional(),
  branch_locations: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  additional_notes: z.string().optional(),
  referral_source: z.string().optional(),
  expected_start_date: z.coerce.date().optional(),
  status: z.string().optional(),
  submitted_at: z.coerce.date().optional(),
  current_step: z.number().int().optional(),
  completion_percentage: z.number().int().optional(),
  reviewed_by: z.string().uuid().optional(),
  reviewed_at: z.coerce.date().optional(),
  review_notes: z.string().optional(),
  rejection_reason: z.string().optional(),
  kyb_documents: z.string().optional()
});

export const kyb_documentsSchema = z.object({
  id: z.string().uuid(),
  kyb_application_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  document_type: z.string(),
  document_name: z.string(),
  file_url: z.string(),
  file_size: z.number().int().nullish(),
  mime_type: z.string().nullish(),
  verification_status: z.string().nullish(),
  verified_by: z.string().uuid().nullish(),
  verified_at: z.coerce.date().nullish(),
  verification_notes: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const kyb_documentsCreateSchema = z.object({
  kyb_application_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  document_type: z.string(),
  document_name: z.string(),
  file_url: z.string(),
  file_size: z.number().int().optional(),
  mime_type: z.string().optional(),
  verification_status: z.string().optional(),
  verified_by: z.string().uuid().optional(),
  verified_at: z.coerce.date().optional(),
  verification_notes: z.string().optional()
});

export const kyb_documentsUpdateSchema = z.object({
  kyb_application_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  document_type: z.string().optional(),
  document_name: z.string().optional(),
  file_url: z.string().optional(),
  file_size: z.number().int().optional(),
  mime_type: z.string().optional(),
  verification_status: z.string().optional(),
  verified_by: z.string().uuid().optional(),
  verified_at: z.coerce.date().optional(),
  verification_notes: z.string().optional()
});

export const leave_approval_configsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  name: z.string(),
  description: z.string().nullish(),
  department: z.string().nullish(),
  division: z.string().nullish(),
  branch_id: z.string().uuid().nullish(),
  leave_type_code: z.string().nullish(),
  min_days_trigger: z.number().int().nullish(),
  max_auto_approve_days: z.number().int().nullish(),
  approval_levels: z.record(z.string(), z.any()).or(z.array(z.any())),
  escalation_hours: z.number().int().nullish(),
  notify_hr: z.boolean().nullish(),
  notify_manager: z.boolean().nullish(),
  is_active: z.boolean().nullish(),
  priority: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const leave_approval_configsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string(),
  description: z.string().optional(),
  department: z.string().optional(),
  division: z.string().optional(),
  branch_id: z.string().uuid().optional(),
  leave_type_code: z.string().optional(),
  min_days_trigger: z.number().int().optional(),
  max_auto_approve_days: z.number().int().optional(),
  approval_levels: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  escalation_hours: z.number().int().optional(),
  notify_hr: z.boolean().optional(),
  notify_manager: z.boolean().optional(),
  is_active: z.boolean().optional(),
  priority: z.number().int().optional()
});

export const leave_approval_configsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  department: z.string().optional(),
  division: z.string().optional(),
  branch_id: z.string().uuid().optional(),
  leave_type_code: z.string().optional(),
  min_days_trigger: z.number().int().optional(),
  max_auto_approve_days: z.number().int().optional(),
  approval_levels: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  escalation_hours: z.number().int().optional(),
  notify_hr: z.boolean().optional(),
  notify_manager: z.boolean().optional(),
  is_active: z.boolean().optional(),
  priority: z.number().int().optional()
});

export const leave_approval_stepsSchema = z.object({
  id: z.string().uuid(),
  leave_request_id: z.string().uuid(),
  step_order: z.number().int(),
  approver_role: z.string().nullish(),
  approver_id: z.string().uuid().nullish(),
  approver_name: z.string().nullish(),
  status: z.string().nullish(),
  comments: z.string().nullish(),
  action_date: z.coerce.date().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const leave_approval_stepsCreateSchema = z.object({
  leave_request_id: z.string().uuid(),
  step_order: z.number().int().optional(),
  approver_role: z.string().optional(),
  approver_id: z.string().uuid().optional(),
  approver_name: z.string().optional(),
  status: z.string().optional(),
  comments: z.string().optional(),
  action_date: z.coerce.date().optional()
});

export const leave_approval_stepsUpdateSchema = z.object({
  leave_request_id: z.string().uuid().optional(),
  step_order: z.number().int().optional(),
  approver_role: z.string().optional(),
  approver_id: z.string().uuid().optional(),
  approver_name: z.string().optional(),
  status: z.string().optional(),
  comments: z.string().optional(),
  action_date: z.coerce.date().optional()
});

export const leave_balancesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  employee_id: z.number().int().nullish(),
  leave_type_id: z.string().uuid().nullish(),
  year: z.number().int(),
  entitled_days: z.number().nullish(),
  used_days: z.number().nullish(),
  pending_days: z.number().nullish(),
  carry_forward_days: z.number().nullish(),
  adjustment_days: z.number().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const leave_balancesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  leave_type_id: z.string().uuid().optional(),
  year: z.number().int(),
  entitled_days: z.number().optional(),
  used_days: z.number().optional(),
  pending_days: z.number().optional(),
  carry_forward_days: z.number().optional(),
  adjustment_days: z.number().optional()
});

export const leave_balancesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  leave_type_id: z.string().uuid().optional(),
  year: z.number().int().optional(),
  entitled_days: z.number().optional(),
  used_days: z.number().optional(),
  pending_days: z.number().optional(),
  carry_forward_days: z.number().optional(),
  adjustment_days: z.number().optional()
});

export const leave_requestsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  employee_id: z.number().int().nullish(),
  branch_id: z.string().uuid().nullish(),
  leave_type: z.string(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  total_days: z.number(),
  reason: z.string().nullish(),
  attachment_url: z.string().nullish(),
  status: z.string().nullish(),
  rejection_reason: z.string().nullish(),
  approval_config_id: z.string().uuid().nullish(),
  current_approval_step: z.number().int().nullish(),
  total_approval_steps: z.number().int().nullish(),
  half_day: z.boolean().nullish(),
  half_day_type: z.string().nullish(),
  delegate_to: z.string().uuid().nullish(),
  approved_at: z.coerce.date().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  leave_approval_steps: z.string()
});

export const leave_requestsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  branch_id: z.string().uuid().optional(),
  leave_type: z.string(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  total_days: z.number(),
  reason: z.string().optional(),
  attachment_url: z.string().optional(),
  status: z.string().optional(),
  rejection_reason: z.string().optional(),
  approval_config_id: z.string().uuid().optional(),
  current_approval_step: z.number().int().optional(),
  total_approval_steps: z.number().int().optional(),
  half_day: z.boolean().optional(),
  half_day_type: z.string().optional(),
  delegate_to: z.string().uuid().optional(),
  approved_at: z.coerce.date().optional(),
  leave_approval_steps: z.string()
});

export const leave_requestsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  branch_id: z.string().uuid().optional(),
  leave_type: z.string().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  total_days: z.number().optional(),
  reason: z.string().optional(),
  attachment_url: z.string().optional(),
  status: z.string().optional(),
  rejection_reason: z.string().optional(),
  approval_config_id: z.string().uuid().optional(),
  current_approval_step: z.number().int().optional(),
  total_approval_steps: z.number().int().optional(),
  half_day: z.boolean().optional(),
  half_day_type: z.string().optional(),
  delegate_to: z.string().uuid().optional(),
  approved_at: z.coerce.date().optional(),
  leave_approval_steps: z.string().optional()
});

export const leave_typesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  category: z.string().nullish(),
  max_days_per_year: z.number().int().nullish(),
  min_days_per_request: z.number().int().nullish(),
  max_days_per_request: z.number().int().nullish(),
  carry_forward: z.boolean().nullish(),
  max_carry_forward_days: z.number().int().nullish(),
  requires_attachment: z.boolean().nullish(),
  requires_medical_cert: z.boolean().nullish(),
  is_paid: z.boolean().nullish(),
  salary_deduction_percent: z.number().nullish(),
  applicable_gender: z.string().nullish(),
  min_service_months: z.number().int().nullish(),
  applicable_departments: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  applicable_positions: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  color: z.string().nullish(),
  icon: z.string().nullish(),
  is_active: z.boolean().nullish(),
  sort_order: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  leave_balances: z.string()
});

export const leave_typesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  max_days_per_year: z.number().int().optional(),
  min_days_per_request: z.number().int().optional(),
  max_days_per_request: z.number().int().optional(),
  carry_forward: z.boolean().optional(),
  max_carry_forward_days: z.number().int().optional(),
  requires_attachment: z.boolean().optional(),
  requires_medical_cert: z.boolean().optional(),
  is_paid: z.boolean().optional(),
  salary_deduction_percent: z.number().optional(),
  applicable_gender: z.string().optional(),
  min_service_months: z.number().int().optional(),
  applicable_departments: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  applicable_positions: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  leave_balances: z.string()
});

export const leave_typesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  max_days_per_year: z.number().int().optional(),
  min_days_per_request: z.number().int().optional(),
  max_days_per_request: z.number().int().optional(),
  carry_forward: z.boolean().optional(),
  max_carry_forward_days: z.number().int().optional(),
  requires_attachment: z.boolean().optional(),
  requires_medical_cert: z.boolean().optional(),
  is_paid: z.boolean().optional(),
  salary_deduction_percent: z.number().optional(),
  applicable_gender: z.string().optional(),
  min_service_months: z.number().int().optional(),
  applicable_departments: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  applicable_positions: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  leave_balances: z.string().optional()
});

export const lookup_optionsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  category: z.string(),
  value: z.string(),
  label: z.string(),
  color: z.string().nullish(),
  icon: z.string().nullish(),
  description: z.string().nullish(),
  is_default: z.boolean().nullish(),
  is_system: z.boolean().nullish(),
  is_active: z.boolean().nullish(),
  sort_order: z.number().int().nullish(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const lookup_optionsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  category: z.string(),
  value: z.string(),
  label: z.string(),
  color: z.string().optional(),
  icon: z.string().optional(),
  description: z.string().optional(),
  is_default: z.boolean().optional(),
  is_system: z.boolean().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const lookup_optionsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  category: z.string().optional(),
  value: z.string().optional(),
  label: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  description: z.string().optional(),
  is_default: z.boolean().optional(),
  is_system: z.boolean().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const loyalty_programsSchema = z.object({
  id: z.string().uuid(),
  programName: z.string(),
  description: z.string().nullish(),
  isActive: z.boolean(),
  pointsPerRupiah: z.number(),
  minimumPurchase: z.number(),
  pointsExpiry: z.number().int(),
  autoEnroll: z.boolean(),
  startDate: z.coerce.date().nullish(),
  endDate: z.coerce.date().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  customer_loyalty: z.string(),
  loyalty_rewards: z.string(),
  loyalty_tiers: z.string()
});

export const loyalty_programsCreateSchema = z.object({
  programName: z.string(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  pointsPerRupiah: z.number().optional(),
  minimumPurchase: z.number().optional(),
  pointsExpiry: z.number().int().optional(),
  autoEnroll: z.boolean().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  customer_loyalty: z.string(),
  loyalty_rewards: z.string(),
  loyalty_tiers: z.string()
});

export const loyalty_programsUpdateSchema = z.object({
  programName: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  pointsPerRupiah: z.number().optional(),
  minimumPurchase: z.number().optional(),
  pointsExpiry: z.number().int().optional(),
  autoEnroll: z.boolean().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  customer_loyalty: z.string().optional(),
  loyalty_rewards: z.string().optional(),
  loyalty_tiers: z.string().optional()
});

export const loyalty_rewardsSchema = z.object({
  id: z.string().uuid(),
  programId: z.string().uuid(),
  rewardName: z.string(),
  description: z.string().nullish(),
  pointsRequired: z.number().int(),
  rewardType: z.enum(["discount", "product", "shipping", "voucher", "service"]),
  rewardValue: z.number().nullish(),
  productId: z.number().int().nullish(),
  quantity: z.number().int().nullish(),
  validityDays: z.number().int().nullish(),
  maxRedemptions: z.number().int().nullish(),
  currentRedemptions: z.number().int(),
  isActive: z.boolean(),
  startDate: z.coerce.date().nullish(),
  endDate: z.coerce.date().nullish(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

export const loyalty_rewardsCreateSchema = z.object({
  programId: z.string().uuid(),
  rewardName: z.string(),
  description: z.string().optional(),
  pointsRequired: z.number().int(),
  rewardType: z.enum(["discount", "product", "shipping", "voucher", "service"]),
  rewardValue: z.number().optional(),
  productId: z.number().int().optional(),
  quantity: z.number().int().optional(),
  validityDays: z.number().int().optional(),
  maxRedemptions: z.number().int().optional(),
  currentRedemptions: z.number().int().optional(),
  isActive: z.boolean().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional()
});

export const loyalty_rewardsUpdateSchema = z.object({
  programId: z.string().uuid().optional(),
  rewardName: z.string().optional(),
  description: z.string().optional(),
  pointsRequired: z.number().int().optional(),
  rewardType: z.enum(["discount", "product", "shipping", "voucher", "service"]).optional(),
  rewardValue: z.number().optional(),
  productId: z.number().int().optional(),
  quantity: z.number().int().optional(),
  validityDays: z.number().int().optional(),
  maxRedemptions: z.number().int().optional(),
  currentRedemptions: z.number().int().optional(),
  isActive: z.boolean().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional()
});

export const loyalty_tiersSchema = z.object({
  id: z.string().uuid(),
  programId: z.string().uuid(),
  tierName: z.string(),
  tierLevel: z.number().int(),
  minSpending: z.number(),
  pointMultiplier: z.number(),
  discountPercentage: z.number(),
  benefits: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  color: z.string().nullish(),
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  customer_loyalty: z.string()
});

export const loyalty_tiersCreateSchema = z.object({
  programId: z.string().uuid(),
  tierName: z.string(),
  tierLevel: z.number().int(),
  minSpending: z.number().optional(),
  pointMultiplier: z.number().optional(),
  discountPercentage: z.number().optional(),
  benefits: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
  customer_loyalty: z.string()
});

export const loyalty_tiersUpdateSchema = z.object({
  programId: z.string().uuid().optional(),
  tierName: z.string().optional(),
  tierLevel: z.number().int().optional(),
  minSpending: z.number().optional(),
  pointMultiplier: z.number().optional(),
  discountPercentage: z.number().optional(),
  benefits: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  color: z.string().optional(),
  isActive: z.boolean().optional(),
  customer_loyalty: z.string().optional()
});

export const mkt_budget_itemsSchema = z.object({
  id: z.string().uuid(),
  budget_id: z.string().uuid(),
  campaign_id: z.string().uuid().nullish(),
  category: z.string(),
  description: z.string().nullish(),
  planned_amount: z.number().nullish(),
  actual_amount: z.number().nullish(),
  variance: z.number().nullish(),
  status: z.string().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const mkt_budget_itemsCreateSchema = z.object({
  budget_id: z.string().uuid(),
  campaign_id: z.string().uuid().optional(),
  category: z.string(),
  description: z.string().optional(),
  planned_amount: z.number().optional(),
  actual_amount: z.number().optional(),
  variance: z.number().optional(),
  status: z.string().optional()
});

export const mkt_budget_itemsUpdateSchema = z.object({
  budget_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  planned_amount: z.number().optional(),
  actual_amount: z.number().optional(),
  variance: z.number().optional(),
  status: z.string().optional()
});

export const mkt_budgetsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  name: z.string(),
  period_type: z.string().nullish(),
  period: z.string(),
  total_budget: z.number(),
  allocated: z.number().nullish(),
  spent: z.number().nullish(),
  remaining: z.number().nullish(),
  status: z.string().nullish(),
  notes: z.string().nullish(),
  approved_by: z.string().uuid().nullish(),
  approved_at: z.coerce.date().nullish(),
  created_by: z.string().uuid().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  mkt_budget_items: z.string()
});

export const mkt_budgetsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string(),
  period_type: z.string().optional(),
  period: z.string(),
  total_budget: z.number().optional(),
  allocated: z.number().optional(),
  spent: z.number().optional(),
  remaining: z.number().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  approved_by: z.string().uuid().optional(),
  approved_at: z.coerce.date().optional(),
  created_by: z.string().uuid().optional(),
  mkt_budget_items: z.string()
});

export const mkt_budgetsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string().optional(),
  period_type: z.string().optional(),
  period: z.string().optional(),
  total_budget: z.number().optional(),
  allocated: z.number().optional(),
  spent: z.number().optional(),
  remaining: z.number().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  approved_by: z.string().uuid().optional(),
  approved_at: z.coerce.date().optional(),
  created_by: z.string().uuid().optional(),
  mkt_budget_items: z.string().optional()
});

export const mkt_campaign_audiencesSchema = z.object({
  id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  segment_id: z.string().uuid().nullish(),
  customer_id: z.number().int().nullish(),
  status: z.string().nullish(),
  reached_at: z.coerce.date().nullish(),
  converted_at: z.coerce.date().nullish(),
  conversion_value: z.number().nullish(),
  channel: z.string().nullish(),
  created_at: z.coerce.date().nullish()
});

export const mkt_campaign_audiencesCreateSchema = z.object({
  campaign_id: z.string().uuid(),
  segment_id: z.string().uuid().optional(),
  customer_id: z.number().int().optional(),
  status: z.string().optional(),
  reached_at: z.coerce.date().optional(),
  converted_at: z.coerce.date().optional(),
  conversion_value: z.number().optional(),
  channel: z.string().optional()
});

export const mkt_campaign_audiencesUpdateSchema = z.object({
  campaign_id: z.string().uuid().optional(),
  segment_id: z.string().uuid().optional(),
  customer_id: z.number().int().optional(),
  status: z.string().optional(),
  reached_at: z.coerce.date().optional(),
  converted_at: z.coerce.date().optional(),
  conversion_value: z.number().optional(),
  channel: z.string().optional()
});

export const mkt_campaign_channelsSchema = z.object({
  id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  channel_type: z.string(),
  channel_name: z.string().nullish(),
  status: z.string().nullish(),
  budget_allocated: z.number().nullish(),
  spent: z.number().nullish(),
  impressions: z.number().int().nullish(),
  clicks: z.number().int().nullish(),
  conversions: z.number().int().nullish(),
  revenue_generated: z.number().nullish(),
  ctr: z.number().nullish(),
  cpc: z.number().nullish(),
  cpa: z.number().nullish(),
  content: z.string().nullish(),
  content_url: z.string().nullish(),
  schedule: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const mkt_campaign_channelsCreateSchema = z.object({
  campaign_id: z.string().uuid(),
  channel_type: z.string(),
  channel_name: z.string().optional(),
  status: z.string().optional(),
  budget_allocated: z.number().optional(),
  spent: z.number().optional(),
  impressions: z.number().int().optional(),
  clicks: z.number().int().optional(),
  conversions: z.number().int().optional(),
  revenue_generated: z.number().optional(),
  ctr: z.number().optional(),
  cpc: z.number().optional(),
  cpa: z.number().optional(),
  content: z.string().optional(),
  content_url: z.string().optional(),
  schedule: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const mkt_campaign_channelsUpdateSchema = z.object({
  campaign_id: z.string().uuid().optional(),
  channel_type: z.string().optional(),
  channel_name: z.string().optional(),
  status: z.string().optional(),
  budget_allocated: z.number().optional(),
  spent: z.number().optional(),
  impressions: z.number().int().optional(),
  clicks: z.number().int().optional(),
  conversions: z.number().int().optional(),
  revenue_generated: z.number().optional(),
  ctr: z.number().optional(),
  cpc: z.number().optional(),
  cpa: z.number().optional(),
  content: z.string().optional(),
  content_url: z.string().optional(),
  schedule: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const mkt_campaignsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  campaign_number: z.string().nullish(),
  name: z.string(),
  description: z.string().nullish(),
  objective: z.string().nullish(),
  campaign_type: z.string().nullish(),
  status: z.string().nullish(),
  priority: z.string().nullish(),
  start_date: z.coerce.date().nullish(),
  end_date: z.coerce.date().nullish(),
  budget: z.number().nullish(),
  spent: z.number().nullish(),
  currency: z.string().nullish(),
  target_audience: z.string().nullish(),
  target_segment_id: z.string().uuid().nullish(),
  target_reach: z.number().int().nullish(),
  actual_reach: z.number().int().nullish(),
  target_conversions: z.number().int().nullish(),
  actual_conversions: z.number().int().nullish(),
  target_revenue: z.number().nullish(),
  actual_revenue: z.number().nullish(),
  roi: z.number().nullish(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  custom_fields: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const mkt_campaignsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  campaign_number: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  objective: z.string().optional(),
  campaign_type: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  budget: z.number().optional(),
  spent: z.number().optional(),
  currency: z.string().optional(),
  target_audience: z.string().optional(),
  target_segment_id: z.string().uuid().optional(),
  target_reach: z.number().int().optional(),
  actual_reach: z.number().int().optional(),
  target_conversions: z.number().int().optional(),
  actual_conversions: z.number().int().optional(),
  target_revenue: z.number().optional(),
  actual_revenue: z.number().optional(),
  roi: z.number().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  custom_fields: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const mkt_campaignsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  campaign_number: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  objective: z.string().optional(),
  campaign_type: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  budget: z.number().optional(),
  spent: z.number().optional(),
  currency: z.string().optional(),
  target_audience: z.string().optional(),
  target_segment_id: z.string().uuid().optional(),
  target_reach: z.number().int().optional(),
  actual_reach: z.number().int().optional(),
  target_conversions: z.number().int().optional(),
  actual_conversions: z.number().int().optional(),
  target_revenue: z.number().optional(),
  actual_revenue: z.number().optional(),
  roi: z.number().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  custom_fields: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const mkt_content_assetsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  campaign_id: z.string().uuid().nullish(),
  title: z.string(),
  asset_type: z.string(),
  file_url: z.string().nullish(),
  file_name: z.string().nullish(),
  file_size: z.number().int().nullish(),
  mime_type: z.string().nullish(),
  thumbnail_url: z.string().nullish(),
  description: z.string().nullish(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  status: z.string().nullish(),
  usage_count: z.number().int().nullish(),
  created_by: z.string().uuid().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const mkt_content_assetsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional(),
  title: z.string(),
  asset_type: z.string().optional(),
  file_url: z.string().optional(),
  file_name: z.string().optional(),
  file_size: z.number().int().optional(),
  mime_type: z.string().optional(),
  thumbnail_url: z.string().optional(),
  description: z.string().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  status: z.string().optional(),
  usage_count: z.number().int().optional(),
  created_by: z.string().uuid().optional()
});

export const mkt_content_assetsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional(),
  title: z.string().optional(),
  asset_type: z.string().optional(),
  file_url: z.string().optional(),
  file_name: z.string().optional(),
  file_size: z.number().int().optional(),
  mime_type: z.string().optional(),
  thumbnail_url: z.string().optional(),
  description: z.string().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  status: z.string().optional(),
  usage_count: z.number().int().optional(),
  created_by: z.string().uuid().optional()
});

export const mkt_promotion_usageSchema = z.object({
  id: z.string().uuid(),
  promotion_id: z.string().uuid(),
  customer_id: z.number().int().nullish(),
  order_id: z.string().uuid().nullish(),
  branch_id: z.string().uuid().nullish(),
  discount_applied: z.number().nullish(),
  order_total: z.number().nullish(),
  used_at: z.coerce.date().nullish()
});

export const mkt_promotion_usageCreateSchema = z.object({
  promotion_id: z.string().uuid(),
  customer_id: z.number().int().optional(),
  order_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  discount_applied: z.number().optional(),
  order_total: z.number().optional(),
  used_at: z.coerce.date().optional()
});

export const mkt_promotion_usageUpdateSchema = z.object({
  promotion_id: z.string().uuid().optional(),
  customer_id: z.number().int().optional(),
  order_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  discount_applied: z.number().optional(),
  order_total: z.number().optional(),
  used_at: z.coerce.date().optional()
});

export const mkt_promotionsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  campaign_id: z.string().uuid().nullish(),
  promo_code: z.string().nullish(),
  name: z.string(),
  description: z.string().nullish(),
  promo_type: z.string(),
  discount_type: z.string().nullish(),
  discount_value: z.number().nullish(),
  min_purchase: z.number().nullish(),
  max_discount: z.number().nullish(),
  buy_quantity: z.number().int().nullish(),
  get_quantity: z.number().int().nullish(),
  free_product_id: z.string().uuid().nullish(),
  status: z.string().nullish(),
  start_date: z.coerce.date().nullish(),
  end_date: z.coerce.date().nullish(),
  usage_limit: z.number().int().nullish(),
  usage_count: z.number().int().nullish(),
  per_customer_limit: z.number().int().nullish(),
  applicable_branches: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  applicable_segments: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  applicable_products: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  applicable_categories: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  exclude_products: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  terms: z.string().nullish(),
  is_stackable: z.boolean().nullish(),
  priority: z.number().int().nullish(),
  auto_apply: z.boolean().nullish(),
  created_by: z.string().uuid().nullish(),
  updated_by: z.string().uuid().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  mkt_promotion_usage: z.string()
});

export const mkt_promotionsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional(),
  promo_code: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  promo_type: z.string().optional(),
  discount_type: z.string().optional(),
  discount_value: z.number().optional(),
  min_purchase: z.number().optional(),
  max_discount: z.number().optional(),
  buy_quantity: z.number().int().optional(),
  get_quantity: z.number().int().optional(),
  free_product_id: z.string().uuid().optional(),
  status: z.string().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  usage_limit: z.number().int().optional(),
  usage_count: z.number().int().optional(),
  per_customer_limit: z.number().int().optional(),
  applicable_branches: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  applicable_segments: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  applicable_products: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  applicable_categories: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  exclude_products: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  terms: z.string().optional(),
  is_stackable: z.boolean().optional(),
  priority: z.number().int().optional(),
  auto_apply: z.boolean().optional(),
  created_by: z.string().uuid().optional(),
  updated_by: z.string().uuid().optional(),
  mkt_promotion_usage: z.string()
});

export const mkt_promotionsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  campaign_id: z.string().uuid().optional(),
  promo_code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  promo_type: z.string().optional(),
  discount_type: z.string().optional(),
  discount_value: z.number().optional(),
  min_purchase: z.number().optional(),
  max_discount: z.number().optional(),
  buy_quantity: z.number().int().optional(),
  get_quantity: z.number().int().optional(),
  free_product_id: z.string().uuid().optional(),
  status: z.string().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  usage_limit: z.number().int().optional(),
  usage_count: z.number().int().optional(),
  per_customer_limit: z.number().int().optional(),
  applicable_branches: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  applicable_segments: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  applicable_products: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  applicable_categories: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  exclude_products: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  terms: z.string().optional(),
  is_stackable: z.boolean().optional(),
  priority: z.number().int().optional(),
  auto_apply: z.boolean().optional(),
  created_by: z.string().uuid().optional(),
  updated_by: z.string().uuid().optional(),
  mkt_promotion_usage: z.string().optional()
});

export const mkt_segment_rulesSchema = z.object({
  id: z.string().uuid(),
  segment_id: z.string().uuid(),
  rule_group: z.number().int().nullish(),
  field: z.string(),
  operator: z.string(),
  value: z.string().nullish(),
  value_type: z.string().nullish(),
  logic_operator: z.string().nullish(),
  sort_order: z.number().int().nullish(),
  created_at: z.coerce.date().nullish()
});

export const mkt_segment_rulesCreateSchema = z.object({
  segment_id: z.string().uuid(),
  rule_group: z.number().int().optional(),
  field: z.string(),
  operator: z.string(),
  value: z.string().optional(),
  value_type: z.string().optional(),
  logic_operator: z.string().optional(),
  sort_order: z.number().int().optional()
});

export const mkt_segment_rulesUpdateSchema = z.object({
  segment_id: z.string().uuid().optional(),
  rule_group: z.number().int().optional(),
  field: z.string().optional(),
  operator: z.string().optional(),
  value: z.string().optional(),
  value_type: z.string().optional(),
  logic_operator: z.string().optional(),
  sort_order: z.number().int().optional()
});

export const mkt_segmentsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  segment_type: z.string().nullish(),
  status: z.string().nullish(),
  customer_count: z.number().int().nullish(),
  criteria: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const mkt_segmentsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  segment_type: z.string().optional(),
  status: z.string().optional(),
  customer_count: z.number().int().optional(),
  criteria: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const mkt_segmentsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  segment_type: z.string().optional(),
  status: z.string().optional(),
  customer_count: z.number().int().optional(),
  criteria: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const module_dependenciesSchema = z.object({
  id: z.string().uuid(),
  module_id: z.string().uuid(),
  depends_on_module_id: z.string().uuid(),
  dependency_type: z.string(),
  is_required: z.boolean().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const module_dependenciesCreateSchema = z.object({
  module_id: z.string().uuid(),
  depends_on_module_id: z.string().uuid(),
  dependency_type: z.string().optional(),
  is_required: z.boolean().optional()
});

export const module_dependenciesUpdateSchema = z.object({
  module_id: z.string().uuid().optional(),
  depends_on_module_id: z.string().uuid().optional(),
  dependency_type: z.string().optional(),
  is_required: z.boolean().optional()
});

export const module_featuresSchema = z.object({
  id: z.string().uuid(),
  module_id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  is_default: z.boolean().nullish(),
  business_types: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  configuration: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  is_active: z.boolean().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const module_featuresCreateSchema = z.object({
  module_id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  is_default: z.boolean().optional(),
  business_types: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  configuration: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  is_active: z.boolean().optional()
});

export const module_featuresUpdateSchema = z.object({
  module_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  is_default: z.boolean().optional(),
  business_types: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  configuration: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  is_active: z.boolean().optional()
});

export const modulesSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  icon: z.string().nullish(),
  route: z.string().nullish(),
  parent_module_id: z.string().uuid().nullish(),
  sort_order: z.number().int().nullish(),
  is_core: z.boolean().nullish(),
  is_active: z.boolean().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  category: z.string().nullish(),
  version: z.string().nullish(),
  features: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  pricing_tier: z.string().nullish(),
  setup_complexity: z.string().nullish(),
  color: z.string().nullish(),
  preview_image: z.string().nullish(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  business_type_modules: z.string(),
  module_features: z.string(),
  package_modules: z.string(),
  tenant_modules: z.string()
});

export const modulesCreateSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  route: z.string().optional(),
  parent_module_id: z.string().uuid().optional(),
  sort_order: z.number().int().optional(),
  is_core: z.boolean().optional(),
  is_active: z.boolean().optional(),
  category: z.string().optional(),
  version: z.string().optional(),
  features: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  pricing_tier: z.string().optional(),
  setup_complexity: z.string().optional(),
  color: z.string().optional(),
  preview_image: z.string().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  business_type_modules: z.string(),
  module_features: z.string(),
  package_modules: z.string(),
  tenant_modules: z.string()
});

export const modulesUpdateSchema = z.object({
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  route: z.string().optional(),
  parent_module_id: z.string().uuid().optional(),
  sort_order: z.number().int().optional(),
  is_core: z.boolean().optional(),
  is_active: z.boolean().optional(),
  category: z.string().optional(),
  version: z.string().optional(),
  features: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  pricing_tier: z.string().optional(),
  setup_complexity: z.string().optional(),
  color: z.string().optional(),
  preview_image: z.string().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  business_type_modules: z.string().optional(),
  module_features: z.string().optional(),
  package_modules: z.string().optional(),
  tenant_modules: z.string().optional()
});

export const org_structuresSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  name: z.string(),
  code: z.string().nullish(),
  parent_id: z.string().uuid().nullish(),
  level: z.number().int().nullish(),
  sort_order: z.number().int().nullish(),
  head_employee_id: z.string().uuid().nullish(),
  description: z.string().nullish(),
  is_active: z.boolean().nullish(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const org_structuresCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string(),
  code: z.string().optional(),
  parent_id: z.string().uuid().optional(),
  level: z.number().int().optional(),
  sort_order: z.number().int().optional(),
  head_employee_id: z.string().uuid().optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const org_structuresUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string().optional(),
  code: z.string().optional(),
  parent_id: z.string().uuid().optional(),
  level: z.number().int().optional(),
  sort_order: z.number().int().optional(),
  head_employee_id: z.string().uuid().optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const package_featuresSchema = z.object({
  id: z.string().uuid(),
  package_id: z.string().uuid(),
  feature_code: z.string(),
  feature_name: z.string(),
  is_enabled: z.boolean().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const package_featuresCreateSchema = z.object({
  package_id: z.string().uuid(),
  feature_code: z.string(),
  feature_name: z.string(),
  is_enabled: z.boolean().optional()
});

export const package_featuresUpdateSchema = z.object({
  package_id: z.string().uuid().optional(),
  feature_code: z.string().optional(),
  feature_name: z.string().optional(),
  is_enabled: z.boolean().optional()
});

export const package_modulesSchema = z.object({
  id: z.string().uuid(),
  package_id: z.string().uuid(),
  module_id: z.string().uuid(),
  is_required: z.boolean().nullish(),
  is_default_enabled: z.boolean().nullish(),
  configuration: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const package_modulesCreateSchema = z.object({
  package_id: z.string().uuid(),
  module_id: z.string().uuid(),
  is_required: z.boolean().optional(),
  is_default_enabled: z.boolean().optional(),
  configuration: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const package_modulesUpdateSchema = z.object({
  package_id: z.string().uuid().optional(),
  module_id: z.string().uuid().optional(),
  is_required: z.boolean().optional(),
  is_default_enabled: z.boolean().optional(),
  configuration: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const partnersSchema = z.object({
  id: z.string().uuid(),
  business_name: z.string(),
  business_type: z.string().nullish(),
  owner_name: z.string(),
  email: z.string(),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  city: z.string().nullish(),
  province: z.string().nullish(),
  postal_code: z.string().nullish(),
  tax_id: z.string().nullish(),
  status: z.string().nullish(),
  activation_status: z.string().nullish(),
  activation_requested_at: z.coerce.date().nullish(),
  activation_approved_at: z.coerce.date().nullish(),
  activation_approved_by: z.string().uuid().nullish(),
  rejection_reason: z.string().nullish(),
  logo_url: z.string().nullish(),
  website: z.string().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  activation_requests: z.string()
});

export const partnersCreateSchema = z.object({
  business_name: z.string(),
  business_type: z.string().optional(),
  owner_name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  tax_id: z.string().optional(),
  status: z.string().optional(),
  activation_status: z.string().optional(),
  activation_requested_at: z.coerce.date().optional(),
  activation_approved_at: z.coerce.date().optional(),
  activation_approved_by: z.string().uuid().optional(),
  rejection_reason: z.string().optional(),
  logo_url: z.string().optional(),
  website: z.string().optional(),
  activation_requests: z.string()
});

export const partnersUpdateSchema = z.object({
  business_name: z.string().optional(),
  business_type: z.string().optional(),
  owner_name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  tax_id: z.string().optional(),
  status: z.string().optional(),
  activation_status: z.string().optional(),
  activation_requested_at: z.coerce.date().optional(),
  activation_approved_at: z.coerce.date().optional(),
  activation_approved_by: z.string().uuid().optional(),
  rejection_reason: z.string().optional(),
  logo_url: z.string().optional(),
  website: z.string().optional(),
  activation_requests: z.string().optional()
});

export const payment_transactionsSchema = z.object({
  id: z.string().uuid(),
  invoice_id: z.string().uuid(),
  billing_cycle_id: z.string().uuid().nullish(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum(["pending", "processing", "completed", "failed", "refunded"]),
  provider: z.string(),
  provider_transaction_id: z.string().nullish(),
  payment_method: z.string().nullish(),
  failure_reason: z.string().nullish(),
  processed_at: z.coerce.date().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const payment_transactionsCreateSchema = z.object({
  invoice_id: z.string().uuid(),
  billing_cycle_id: z.string().uuid().optional(),
  amount: z.number(),
  currency: z.string().optional(),
  status: z.enum(["pending", "processing", "completed", "failed", "refunded"]).optional(),
  provider: z.string(),
  provider_transaction_id: z.string().optional(),
  payment_method: z.string().optional(),
  failure_reason: z.string().optional(),
  processed_at: z.coerce.date().optional()
});

export const payment_transactionsUpdateSchema = z.object({
  invoice_id: z.string().uuid().optional(),
  billing_cycle_id: z.string().uuid().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  status: z.enum(["pending", "processing", "completed", "failed", "refunded"]).optional(),
  provider: z.string().optional(),
  provider_transaction_id: z.string().optional(),
  payment_method: z.string().optional(),
  failure_reason: z.string().optional(),
  processed_at: z.coerce.date().optional()
});

export const payroll_componentsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  type: z.string(),
  category: z.string().nullish(),
  calculation_type: z.string().nullish(),
  default_amount: z.number().nullish(),
  percentage_base: z.string().nullish(),
  percentage_value: z.number().nullish(),
  formula: z.string().nullish(),
  is_taxable: z.boolean().nullish(),
  is_mandatory: z.boolean().nullish(),
  applies_to_pay_types: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  applicable_departments: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  sort_order: z.number().int().nullish(),
  is_active: z.boolean().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  employee_salary_components: z.string()
});

export const payroll_componentsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  calculation_type: z.string().optional(),
  default_amount: z.number().optional(),
  percentage_base: z.string().optional(),
  percentage_value: z.number().optional(),
  formula: z.string().optional(),
  is_taxable: z.boolean().optional(),
  is_mandatory: z.boolean().optional(),
  applies_to_pay_types: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  applicable_departments: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
  employee_salary_components: z.string()
});

export const payroll_componentsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  calculation_type: z.string().optional(),
  default_amount: z.number().optional(),
  percentage_base: z.string().optional(),
  percentage_value: z.number().optional(),
  formula: z.string().optional(),
  is_taxable: z.boolean().optional(),
  is_mandatory: z.boolean().optional(),
  applies_to_pay_types: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  applicable_departments: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
  employee_salary_components: z.string().optional()
});

export const payroll_itemsSchema = z.object({
  id: z.string().uuid(),
  payroll_run_id: z.string().uuid().nullish(),
  employee_id: z.number().int().nullish(),
  employee_salary_id: z.string().uuid().nullish(),
  working_days: z.number().int().nullish(),
  present_days: z.number().int().nullish(),
  absent_days: z.number().int().nullish(),
  overtime_hours: z.number().nullish(),
  base_salary: z.number().nullish(),
  total_allowances: z.number().nullish(),
  total_deductions: z.number().nullish(),
  overtime_amount: z.number().nullish(),
  gross_salary: z.number().nullish(),
  tax_amount: z.number().nullish(),
  net_salary: z.number().nullish(),
  components: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  status: z.string().nullish(),
  notes: z.string().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const payroll_itemsCreateSchema = z.object({
  payroll_run_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  employee_salary_id: z.string().uuid().optional(),
  working_days: z.number().int().optional(),
  present_days: z.number().int().optional(),
  absent_days: z.number().int().optional(),
  overtime_hours: z.number().optional(),
  base_salary: z.number().optional(),
  total_allowances: z.number().optional(),
  total_deductions: z.number().optional(),
  overtime_amount: z.number().optional(),
  gross_salary: z.number().optional(),
  tax_amount: z.number().optional(),
  net_salary: z.number().optional(),
  components: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  status: z.string().optional(),
  notes: z.string().optional()
});

export const payroll_itemsUpdateSchema = z.object({
  payroll_run_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  employee_salary_id: z.string().uuid().optional(),
  working_days: z.number().int().optional(),
  present_days: z.number().int().optional(),
  absent_days: z.number().int().optional(),
  overtime_hours: z.number().optional(),
  base_salary: z.number().optional(),
  total_allowances: z.number().optional(),
  total_deductions: z.number().optional(),
  overtime_amount: z.number().optional(),
  gross_salary: z.number().optional(),
  tax_amount: z.number().optional(),
  net_salary: z.number().optional(),
  components: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  status: z.string().optional(),
  notes: z.string().optional()
});

export const payroll_runsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  run_code: z.string(),
  name: z.string().nullish(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  pay_date: z.coerce.date().nullish(),
  pay_type: z.string().nullish(),
  branch_id: z.string().uuid().nullish(),
  department: z.string().nullish(),
  status: z.string().nullish(),
  total_gross: z.number().nullish(),
  total_deductions: z.number().nullish(),
  total_net: z.number().nullish(),
  employee_count: z.number().int().nullish(),
  approved_by: z.string().uuid().nullish(),
  approved_at: z.coerce.date().nullish(),
  created_by: z.string().uuid().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  payroll_items: z.string()
});

export const payroll_runsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  run_code: z.string(),
  name: z.string().optional(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  pay_date: z.coerce.date().optional(),
  pay_type: z.string().optional(),
  branch_id: z.string().uuid().optional(),
  department: z.string().optional(),
  status: z.string().optional(),
  total_gross: z.number().optional(),
  total_deductions: z.number().optional(),
  total_net: z.number().optional(),
  employee_count: z.number().int().optional(),
  approved_by: z.string().uuid().optional(),
  approved_at: z.coerce.date().optional(),
  created_by: z.string().uuid().optional(),
  payroll_items: z.string()
});

export const payroll_runsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  run_code: z.string().optional(),
  name: z.string().optional(),
  period_start: z.coerce.date().optional(),
  period_end: z.coerce.date().optional(),
  pay_date: z.coerce.date().optional(),
  pay_type: z.string().optional(),
  branch_id: z.string().uuid().optional(),
  department: z.string().optional(),
  status: z.string().optional(),
  total_gross: z.number().optional(),
  total_deductions: z.number().optional(),
  total_net: z.number().optional(),
  employee_count: z.number().int().optional(),
  approved_by: z.string().uuid().optional(),
  approved_at: z.coerce.date().optional(),
  created_by: z.string().uuid().optional(),
  payroll_items: z.string().optional()
});

export const performance_reviewsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  employee_id: z.number().int().nullish(),
  reviewer_id: z.number().int().nullish(),
  period: z.string(),
  overall_score: z.number().nullish(),
  status: z.string().nullish(),
  strengths: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  areas_for_improvement: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  goals: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  comments: z.string().nullish(),
  submitted_at: z.coerce.date().nullish(),
  reviewed_at: z.coerce.date().nullish(),
  acknowledged_at: z.coerce.date().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const performance_reviewsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  reviewer_id: z.number().int().optional(),
  period: z.string(),
  overall_score: z.number().optional(),
  status: z.string().optional(),
  strengths: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  areas_for_improvement: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  goals: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  comments: z.string().optional(),
  submitted_at: z.coerce.date().optional(),
  reviewed_at: z.coerce.date().optional(),
  acknowledged_at: z.coerce.date().optional()
});

export const performance_reviewsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  employee_id: z.number().int().optional(),
  reviewer_id: z.number().int().optional(),
  period: z.string().optional(),
  overall_score: z.number().optional(),
  status: z.string().optional(),
  strengths: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  areas_for_improvement: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  goals: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  comments: z.string().optional(),
  submitted_at: z.coerce.date().optional(),
  reviewed_at: z.coerce.date().optional(),
  acknowledged_at: z.coerce.date().optional()
});

export const plan_limitsSchema = z.object({
  id: z.string().uuid(),
  plan_id: z.string().uuid(),
  metric_name: z.string(),
  max_value: z.number().int(),
  unit: z.string().nullish(),
  is_soft_limit: z.boolean().nullish(),
  overage_rate: z.number().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const plan_limitsCreateSchema = z.object({
  plan_id: z.string().uuid(),
  metric_name: z.string(),
  max_value: z.number().int(),
  unit: z.string().optional(),
  is_soft_limit: z.boolean().optional(),
  overage_rate: z.number().optional()
});

export const plan_limitsUpdateSchema = z.object({
  plan_id: z.string().uuid().optional(),
  metric_name: z.string().optional(),
  max_value: z.number().int().optional(),
  unit: z.string().optional(),
  is_soft_limit: z.boolean().optional(),
  overage_rate: z.number().optional()
});

export const plansSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullish(),
  price: z.number(),
  billing_interval: z.enum(["monthly", "yearly"]),
  currency: z.string(),
  is_active: z.boolean().nullish(),
  features: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  sort_order: z.number().int().nullish(),
  trial_days: z.number().int().nullish(),
  max_users: z.number().int().nullish(),
  max_branches: z.number().int().nullish(),
  max_products: z.number().int().nullish(),
  max_transactions: z.number().int().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  plan_limits: z.string(),
  subscriptions: z.string()
});

export const plansCreateSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  price: z.number(),
  billing_interval: z.enum(["monthly", "yearly"]).optional(),
  currency: z.string().optional(),
  is_active: z.boolean().optional(),
  features: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  sort_order: z.number().int().optional(),
  trial_days: z.number().int().optional(),
  max_users: z.number().int().optional(),
  max_branches: z.number().int().optional(),
  max_products: z.number().int().optional(),
  max_transactions: z.number().int().optional(),
  plan_limits: z.string(),
  subscriptions: z.string()
});

export const plansUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  price: z.number().optional(),
  billing_interval: z.enum(["monthly", "yearly"]).optional(),
  currency: z.string().optional(),
  is_active: z.boolean().optional(),
  features: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  sort_order: z.number().int().optional(),
  trial_days: z.number().int().optional(),
  max_users: z.number().int().optional(),
  max_branches: z.number().int().optional(),
  max_products: z.number().int().optional(),
  max_transactions: z.number().int().optional(),
  plan_limits: z.string().optional(),
  subscriptions: z.string().optional()
});

export const pos_transaction_itemsSchema = z.object({
  id: z.string().uuid(),
  pos_transaction_id: z.string().uuid(),
  product_id: z.string().uuid(),
  product_name: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  total_price: z.number(),
  discount_amount: z.number(),
  notes: z.string().nullish(),
  modifiers: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const pos_transaction_itemsCreateSchema = z.object({
  pos_transaction_id: z.string().uuid(),
  product_id: z.string().uuid(),
  product_name: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  total_price: z.number(),
  discount_amount: z.number().optional(),
  notes: z.string().optional(),
  modifiers: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const pos_transaction_itemsUpdateSchema = z.object({
  pos_transaction_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  product_name: z.string().optional(),
  quantity: z.number().optional(),
  unit_price: z.number().optional(),
  total_price: z.number().optional(),
  discount_amount: z.number().optional(),
  notes: z.string().optional(),
  modifiers: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const pos_transactionsSchema = z.object({
  id: z.string().uuid(),
  transaction_number: z.string(),
  shift_id: z.string().uuid().nullish(),
  customer_id: z.string().uuid().nullish(),
  customer_name: z.string().nullish(),
  cashier_id: z.string().uuid(),
  transaction_date: z.coerce.date(),
  subtotal: z.number(),
  tax_amount: z.number(),
  discount_amount: z.number(),
  service_charge: z.number(),
  total_amount: z.number(),
  payment_method: z.enum(["cash", "card", "transfer", "ewallet", "mixed"]),
  payment_status: z.enum(["pending", "paid", "refunded", "void"]),
  table_number: z.string().nullish(),
  order_type: z.enum(["dine_in  @map(\"dine-in\")", "takeaway", "delivery"]),
  status: z.enum(["open", "closed", "void"]),
  notes: z.string().nullish(),
  kitchen_order_id: z.string().uuid().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  kitchen_orders: z.string(),
  pos_transaction_items: z.string()
});

export const pos_transactionsCreateSchema = z.object({
  transaction_number: z.string(),
  shift_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  cashier_id: z.string().uuid(),
  transaction_date: z.coerce.date(),
  subtotal: z.number(),
  tax_amount: z.number().optional(),
  discount_amount: z.number().optional(),
  service_charge: z.number().optional(),
  total_amount: z.number(),
  payment_method: z.enum(["cash", "card", "transfer", "ewallet", "mixed"]),
  payment_status: z.enum(["pending", "paid", "refunded", "void"]).optional(),
  table_number: z.string().optional(),
  order_type: z.enum(["dine_in  @map(\"dine-in\")", "takeaway", "delivery"]).optional(),
  status: z.enum(["open", "closed", "void"]).optional(),
  notes: z.string().optional(),
  kitchen_order_id: z.string().uuid().optional(),
  kitchen_orders: z.string(),
  pos_transaction_items: z.string()
});

export const pos_transactionsUpdateSchema = z.object({
  transaction_number: z.string().optional(),
  shift_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  cashier_id: z.string().uuid().optional(),
  transaction_date: z.coerce.date().optional(),
  subtotal: z.number().optional(),
  tax_amount: z.number().optional(),
  discount_amount: z.number().optional(),
  service_charge: z.number().optional(),
  total_amount: z.number().optional(),
  payment_method: z.enum(["cash", "card", "transfer", "ewallet", "mixed"]).optional(),
  payment_status: z.enum(["pending", "paid", "refunded", "void"]).optional(),
  table_number: z.string().optional(),
  order_type: z.enum(["dine_in  @map(\"dine-in\")", "takeaway", "delivery"]).optional(),
  status: z.enum(["open", "closed", "void"]).optional(),
  notes: z.string().optional(),
  kitchen_order_id: z.string().uuid().optional(),
  kitchen_orders: z.string().optional(),
  pos_transaction_items: z.string().optional()
});

export const productsSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  sku: z.string(),
  category: z.string().nullish(),
  description: z.string().nullish(),
  unit: z.string(),
  price: z.number(),
  cost: z.number().nullish(),
  stock: z.number(),
  min_stock: z.number().nullish(),
  max_stock: z.number().nullish(),
  barcode: z.string().nullish(),
  image_url: z.string().nullish(),
  is_active: z.boolean().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  loyalty_rewards: z.string()
});

export const productsCreateSchema = z.object({
  name: z.string(),
  sku: z.string(),
  category: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
  price: z.number().optional(),
  cost: z.number().optional(),
  stock: z.number().optional(),
  min_stock: z.number().optional(),
  max_stock: z.number().optional(),
  barcode: z.string().optional(),
  image_url: z.string().optional(),
  is_active: z.boolean().optional(),
  loyalty_rewards: z.string()
});

export const productsUpdateSchema = z.object({
  name: z.string().optional(),
  sku: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
  price: z.number().optional(),
  cost: z.number().optional(),
  stock: z.number().optional(),
  min_stock: z.number().optional(),
  max_stock: z.number().optional(),
  barcode: z.string().optional(),
  image_url: z.string().optional(),
  is_active: z.boolean().optional(),
  loyalty_rewards: z.string().optional()
});

export const sfa_achievement_detailsSchema = z.object({
  id: z.string().uuid(),
  achievement_id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  detail_type: z.string(),
  reference_id: z.string().uuid().nullish(),
  reference_type: z.string().nullish(),
  product_id: z.string().uuid().nullish(),
  product_name: z.string().nullish(),
  category_id: z.string().uuid().nullish(),
  category_name: z.string().nullish(),
  customer_id: z.string().uuid().nullish(),
  customer_name: z.string().nullish(),
  transaction_date: z.coerce.date().nullish(),
  revenue_amount: z.number().nullish(),
  volume_amount: z.number().nullish(),
  volume_unit: z.string().nullish(),
  description: z.string().nullish(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const sfa_achievement_detailsCreateSchema = z.object({
  achievement_id: z.string().uuid(),
  tenant_id: z.string().uuid().optional(),
  detail_type: z.string(),
  reference_id: z.string().uuid().optional(),
  reference_type: z.string().optional(),
  product_id: z.string().uuid().optional(),
  product_name: z.string().optional(),
  category_id: z.string().uuid().optional(),
  category_name: z.string().optional(),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  transaction_date: z.coerce.date().optional(),
  revenue_amount: z.number().optional(),
  volume_amount: z.number().optional(),
  volume_unit: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_achievement_detailsUpdateSchema = z.object({
  achievement_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  detail_type: z.string().optional(),
  reference_id: z.string().uuid().optional(),
  reference_type: z.string().optional(),
  product_id: z.string().uuid().optional(),
  product_name: z.string().optional(),
  category_id: z.string().uuid().optional(),
  category_name: z.string().optional(),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  transaction_date: z.coerce.date().optional(),
  revenue_amount: z.number().optional(),
  volume_amount: z.number().optional(),
  volume_unit: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_achievementsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  target_assignment_id: z.string().uuid().nullish(),
  target_group_id: z.string().uuid().nullish(),
  user_id: z.number().int().nullish(),
  team_id: z.string().uuid().nullish(),
  period: z.string(),
  year: z.number().int(),
  total_revenue: z.number().nullish(),
  total_volume: z.number().nullish(),
  total_visits: z.number().int().nullish(),
  completed_visits: z.number().int().nullish(),
  effective_calls: z.number().int().nullish(),
  new_customers: z.number().int().nullish(),
  total_orders: z.number().int().nullish(),
  total_collections: z.number().nullish(),
  revenue_pct: z.number().nullish(),
  volume_pct: z.number().nullish(),
  visit_pct: z.number().nullish(),
  new_customer_pct: z.number().nullish(),
  effective_call_pct: z.number().nullish(),
  collection_pct: z.number().nullish(),
  weighted_pct: z.number().nullish(),
  rating: z.string().nullish(),
  rank_in_team: z.number().int().nullish(),
  rank_in_company: z.number().int().nullish(),
  calculated_at: z.coerce.date().nullish(),
  locked: z.boolean().nullish(),
  notes: z.string().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  sfa_achievement_details: z.string(),
  sfa_incentive_calculations: z.string()
});

export const sfa_achievementsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  target_assignment_id: z.string().uuid().optional(),
  target_group_id: z.string().uuid().optional(),
  user_id: z.number().int().optional(),
  team_id: z.string().uuid().optional(),
  period: z.string(),
  year: z.number().int(),
  total_revenue: z.number().optional(),
  total_volume: z.number().optional(),
  total_visits: z.number().int().optional(),
  completed_visits: z.number().int().optional(),
  effective_calls: z.number().int().optional(),
  new_customers: z.number().int().optional(),
  total_orders: z.number().int().optional(),
  total_collections: z.number().optional(),
  revenue_pct: z.number().optional(),
  volume_pct: z.number().optional(),
  visit_pct: z.number().optional(),
  new_customer_pct: z.number().optional(),
  effective_call_pct: z.number().optional(),
  collection_pct: z.number().optional(),
  weighted_pct: z.number().optional(),
  rating: z.string().optional(),
  rank_in_team: z.number().int().optional(),
  rank_in_company: z.number().int().optional(),
  calculated_at: z.coerce.date().optional(),
  locked: z.boolean().optional(),
  notes: z.string().optional(),
  sfa_achievement_details: z.string(),
  sfa_incentive_calculations: z.string()
});

export const sfa_achievementsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  target_assignment_id: z.string().uuid().optional(),
  target_group_id: z.string().uuid().optional(),
  user_id: z.number().int().optional(),
  team_id: z.string().uuid().optional(),
  period: z.string().optional(),
  year: z.number().int().optional(),
  total_revenue: z.number().optional(),
  total_volume: z.number().optional(),
  total_visits: z.number().int().optional(),
  completed_visits: z.number().int().optional(),
  effective_calls: z.number().int().optional(),
  new_customers: z.number().int().optional(),
  total_orders: z.number().int().optional(),
  total_collections: z.number().optional(),
  revenue_pct: z.number().optional(),
  volume_pct: z.number().optional(),
  visit_pct: z.number().optional(),
  new_customer_pct: z.number().optional(),
  effective_call_pct: z.number().optional(),
  collection_pct: z.number().optional(),
  weighted_pct: z.number().optional(),
  rating: z.string().optional(),
  rank_in_team: z.number().int().optional(),
  rank_in_company: z.number().int().optional(),
  calculated_at: z.coerce.date().optional(),
  locked: z.boolean().optional(),
  notes: z.string().optional(),
  sfa_achievement_details: z.string().optional(),
  sfa_incentive_calculations: z.string().optional()
});

export const sfa_activitiesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  branch_id: z.string().uuid().nullish(),
  lead_id: z.string().uuid().nullish(),
  opportunity_id: z.string().uuid().nullish(),
  activity_type: z.string(),
  subject: z.string(),
  description: z.string().nullish(),
  status: z.string().nullish(),
  priority: z.string().nullish(),
  assigned_to: z.number().int().nullish(),
  activity_date: z.coerce.date(),
  duration_minutes: z.number().int().nullish(),
  location: z.string().nullish(),
  outcome: z.string().nullish(),
  outcome_notes: z.string().nullish(),
  contact_name: z.string().nullish(),
  contact_phone: z.string().nullish(),
  related_entity_type: z.string().nullish(),
  related_entity_id: z.string().uuid().nullish(),
  reminder_at: z.coerce.date().nullish(),
  completed_at: z.coerce.date().nullish(),
  created_by: z.number().int().nullish(),
  updated_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const sfa_activitiesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  activity_type: z.string().optional(),
  subject: z.string(),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assigned_to: z.number().int().optional(),
  activity_date: z.coerce.date(),
  duration_minutes: z.number().int().optional(),
  location: z.string().optional(),
  outcome: z.string().optional(),
  outcome_notes: z.string().optional(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  related_entity_type: z.string().optional(),
  related_entity_id: z.string().uuid().optional(),
  reminder_at: z.coerce.date().optional(),
  completed_at: z.coerce.date().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional()
});

export const sfa_activitiesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  activity_type: z.string().optional(),
  subject: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assigned_to: z.number().int().optional(),
  activity_date: z.coerce.date().optional(),
  duration_minutes: z.number().int().optional(),
  location: z.string().optional(),
  outcome: z.string().optional(),
  outcome_notes: z.string().optional(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  related_entity_type: z.string().optional(),
  related_entity_id: z.string().uuid().optional(),
  reminder_at: z.coerce.date().optional(),
  completed_at: z.coerce.date().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional()
});

export const sfa_approval_requestsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  workflow_id: z.string().uuid().nullish(),
  entity_type: z.string(),
  entity_id: z.string().uuid(),
  entity_number: z.string().nullish(),
  entity_summary: z.string().nullish(),
  requested_by: z.number().int().nullish(),
  requested_at: z.coerce.date().nullish(),
  current_step: z.number().int().nullish(),
  total_steps: z.number().int().nullish(),
  status: z.string().nullish(),
  approval_history: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  current_approver_id: z.number().int().nullish(),
  current_approver_role: z.string().nullish(),
  final_status: z.string().nullish(),
  completed_at: z.coerce.date().nullish(),
  rejected_by: z.number().int().nullish(),
  rejected_reason: z.string().nullish(),
  amount: z.number().nullish(),
  priority: z.string().nullish(),
  due_date: z.coerce.date().nullish(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const sfa_approval_requestsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  workflow_id: z.string().uuid().optional(),
  entity_type: z.string(),
  entity_id: z.string().uuid(),
  entity_number: z.string().optional(),
  entity_summary: z.string().optional(),
  requested_by: z.number().int().optional(),
  requested_at: z.coerce.date().optional(),
  current_step: z.number().int().optional(),
  total_steps: z.number().int().optional(),
  status: z.string().optional(),
  approval_history: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  current_approver_id: z.number().int().optional(),
  current_approver_role: z.string().optional(),
  final_status: z.string().optional(),
  completed_at: z.coerce.date().optional(),
  rejected_by: z.number().int().optional(),
  rejected_reason: z.string().optional(),
  amount: z.number().optional(),
  priority: z.string().optional(),
  due_date: z.coerce.date().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_approval_requestsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  workflow_id: z.string().uuid().optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().uuid().optional(),
  entity_number: z.string().optional(),
  entity_summary: z.string().optional(),
  requested_by: z.number().int().optional(),
  requested_at: z.coerce.date().optional(),
  current_step: z.number().int().optional(),
  total_steps: z.number().int().optional(),
  status: z.string().optional(),
  approval_history: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  current_approver_id: z.number().int().optional(),
  current_approver_role: z.string().optional(),
  final_status: z.string().optional(),
  completed_at: z.coerce.date().optional(),
  rejected_by: z.number().int().optional(),
  rejected_reason: z.string().optional(),
  amount: z.number().optional(),
  priority: z.string().optional(),
  due_date: z.coerce.date().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_approval_stepsSchema = z.object({
  id: z.string().uuid(),
  workflow_id: z.string().uuid(),
  step_number: z.number().int(),
  step_name: z.string().nullish(),
  approver_type: z.string().nullish(),
  approver_role: z.string().nullish(),
  approver_user_id: z.number().int().nullish(),
  auto_approve_after_hours: z.number().int().nullish(),
  can_reject: z.boolean().nullish(),
  can_delegate: z.boolean().nullish(),
  notify_on_pending: z.boolean().nullish(),
  notify_channels: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  sort_order: z.number().int().nullish(),
  created_at: z.coerce.date().nullish()
});

export const sfa_approval_stepsCreateSchema = z.object({
  workflow_id: z.string().uuid(),
  step_number: z.number().int().optional(),
  step_name: z.string().optional(),
  approver_type: z.string().optional(),
  approver_role: z.string().optional(),
  approver_user_id: z.number().int().optional(),
  auto_approve_after_hours: z.number().int().optional(),
  can_reject: z.boolean().optional(),
  can_delegate: z.boolean().optional(),
  notify_on_pending: z.boolean().optional(),
  notify_channels: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  sort_order: z.number().int().optional()
});

export const sfa_approval_stepsUpdateSchema = z.object({
  workflow_id: z.string().uuid().optional(),
  step_number: z.number().int().optional(),
  step_name: z.string().optional(),
  approver_type: z.string().optional(),
  approver_role: z.string().optional(),
  approver_user_id: z.number().int().optional(),
  auto_approve_after_hours: z.number().int().optional(),
  can_reject: z.boolean().optional(),
  can_delegate: z.boolean().optional(),
  notify_on_pending: z.boolean().optional(),
  notify_channels: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  sort_order: z.number().int().optional()
});

export const sfa_approval_workflowsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  entity_type: z.string(),
  condition_rules: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const sfa_approval_workflowsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  entity_type: z.string(),
  condition_rules: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_approval_workflowsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  entity_type: z.string().optional(),
  condition_rules: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_business_settingsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  category: z.string(),
  setting_key: z.string(),
  setting_value: z.string().nullish(),
  setting_type: z.string().nullish(),
  label: z.string().nullish(),
  description: z.string().nullish(),
  is_system: z.boolean().nullish(),
  updated_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const sfa_business_settingsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  category: z.string(),
  setting_key: z.string(),
  setting_value: z.string().optional(),
  setting_type: z.string().optional(),
  label: z.string().optional(),
  description: z.string().optional(),
  is_system: z.boolean().optional(),
  updated_by: z.number().int().optional()
});

export const sfa_business_settingsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  category: z.string().optional(),
  setting_key: z.string().optional(),
  setting_value: z.string().optional(),
  setting_type: z.string().optional(),
  label: z.string().optional(),
  description: z.string().optional(),
  is_system: z.boolean().optional(),
  updated_by: z.number().int().optional()
});

export const sfa_commission_group_productsSchema = z.object({
  id: z.string().uuid(),
  group_id: z.string().uuid().nullish(),
  product_id: z.number().int().nullish(),
  product_name: z.string().nullish(),
  product_sku: z.string().nullish(),
  min_quantity: z.number().int().nullish(),
  weight: z.number().nullish(),
  sort_order: z.number().int().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const sfa_commission_group_productsCreateSchema = z.object({
  group_id: z.string().uuid().optional(),
  product_id: z.number().int().optional(),
  product_name: z.string().optional(),
  product_sku: z.string().optional(),
  min_quantity: z.number().int().optional(),
  weight: z.number().optional(),
  sort_order: z.number().int().optional()
});

export const sfa_commission_group_productsUpdateSchema = z.object({
  group_id: z.string().uuid().optional(),
  product_id: z.number().int().optional(),
  product_name: z.string().optional(),
  product_sku: z.string().optional(),
  min_quantity: z.number().int().optional(),
  weight: z.number().optional(),
  sort_order: z.number().int().optional()
});

export const sfa_commission_groupsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  code: z.string().nullish(),
  name: z.string().nullish(),
  description: z.string().nullish(),
  group_type: z.string().nullish(),
  calculation_method: z.string().nullish(),
  bonus_amount: z.number().nullish(),
  bonus_percentage: z.number().nullish(),
  min_total_quantity: z.number().int().nullish(),
  min_total_value: z.number().nullish(),
  period_type: z.string().nullish(),
  effective_from: z.coerce.date().nullish(),
  effective_to: z.coerce.date().nullish(),
  is_active: z.boolean().nullish(),
  priority: z.number().int().nullish(),
  notes: z.string().nullish(),
  created_by: z.number().int().nullish(),
  updated_by: z.number().int().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  sfa_commission_group_products: z.string()
});

export const sfa_commission_groupsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  group_type: z.string().optional(),
  calculation_method: z.string().optional(),
  bonus_amount: z.number().optional(),
  bonus_percentage: z.number().optional(),
  min_total_quantity: z.number().int().optional(),
  min_total_value: z.number().optional(),
  period_type: z.string().optional(),
  effective_from: z.coerce.date().optional(),
  effective_to: z.coerce.date().optional(),
  is_active: z.boolean().optional(),
  priority: z.number().int().optional(),
  notes: z.string().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional(),
  sfa_commission_group_products: z.string()
});

export const sfa_commission_groupsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  group_type: z.string().optional(),
  calculation_method: z.string().optional(),
  bonus_amount: z.number().optional(),
  bonus_percentage: z.number().optional(),
  min_total_quantity: z.number().int().optional(),
  min_total_value: z.number().optional(),
  period_type: z.string().optional(),
  effective_from: z.coerce.date().optional(),
  effective_to: z.coerce.date().optional(),
  is_active: z.boolean().optional(),
  priority: z.number().int().optional(),
  notes: z.string().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional(),
  sfa_commission_group_products: z.string().optional()
});

export const sfa_competitor_activitiesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  visit_id: z.string().uuid().nullish(),
  customer_id: z.string().uuid().nullish(),
  customer_name: z.string().nullish(),
  salesperson_id: z.number().int().nullish(),
  territory_id: z.string().uuid().nullish(),
  reported_date: z.coerce.date().nullish(),
  competitor_name: z.string(),
  competitor_brand: z.string().nullish(),
  activity_type: z.string(),
  product_category: z.string().nullish(),
  description: z.string().nullish(),
  competitor_price: z.number().nullish(),
  our_price: z.number().nullish(),
  price_difference: z.number().nullish(),
  promo_type: z.string().nullish(),
  promo_detail: z.string().nullish(),
  display_quality: z.string().nullish(),
  stock_availability: z.string().nullish(),
  estimated_market_share: z.number().nullish(),
  photo_url: z.string().nullish(),
  impact_level: z.string().nullish(),
  action_required: z.string().nullish(),
  action_taken: z.string().nullish(),
  resolved: z.boolean().nullish(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  created_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const sfa_competitor_activitiesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  visit_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  salesperson_id: z.number().int().optional(),
  territory_id: z.string().uuid().optional(),
  reported_date: z.coerce.date().optional(),
  competitor_name: z.string(),
  competitor_brand: z.string().optional(),
  activity_type: z.string().optional(),
  product_category: z.string().optional(),
  description: z.string().optional(),
  competitor_price: z.number().optional(),
  our_price: z.number().optional(),
  price_difference: z.number().optional(),
  promo_type: z.string().optional(),
  promo_detail: z.string().optional(),
  display_quality: z.string().optional(),
  stock_availability: z.string().optional(),
  estimated_market_share: z.number().optional(),
  photo_url: z.string().optional(),
  impact_level: z.string().optional(),
  action_required: z.string().optional(),
  action_taken: z.string().optional(),
  resolved: z.boolean().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  created_by: z.number().int().optional()
});

export const sfa_competitor_activitiesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  visit_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  salesperson_id: z.number().int().optional(),
  territory_id: z.string().uuid().optional(),
  reported_date: z.coerce.date().optional(),
  competitor_name: z.string().optional(),
  competitor_brand: z.string().optional(),
  activity_type: z.string().optional(),
  product_category: z.string().optional(),
  description: z.string().optional(),
  competitor_price: z.number().optional(),
  our_price: z.number().optional(),
  price_difference: z.number().optional(),
  promo_type: z.string().optional(),
  promo_detail: z.string().optional(),
  display_quality: z.string().optional(),
  stock_availability: z.string().optional(),
  estimated_market_share: z.number().optional(),
  photo_url: z.string().optional(),
  impact_level: z.string().optional(),
  action_required: z.string().optional(),
  action_taken: z.string().optional(),
  resolved: z.boolean().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  created_by: z.number().int().optional()
});

export const sfa_coverage_assignmentsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  coverage_plan_id: z.string().uuid().nullish(),
  customer_id: z.string().uuid().nullish(),
  customer_name: z.string().nullish(),
  customer_class: z.string().nullish(),
  assigned_to: z.number().int().nullish(),
  team_id: z.string().uuid().nullish(),
  territory_id: z.string().uuid().nullish(),
  visit_day: z.string().nullish(),
  visit_week: z.number().int().nullish(),
  visit_frequency: z.string().nullish(),
  last_visit_date: z.coerce.date().nullish(),
  next_planned_visit: z.coerce.date().nullish(),
  total_visits_planned: z.number().int().nullish(),
  total_visits_actual: z.number().int().nullish(),
  compliance_pct: z.number().nullish(),
  customer_address: z.string().nullish(),
  customer_lat: z.number().nullish(),
  customer_lng: z.number().nullish(),
  status: z.string().nullish(),
  notes: z.string().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const sfa_coverage_assignmentsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  coverage_plan_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  customer_class: z.string().optional(),
  assigned_to: z.number().int().optional(),
  team_id: z.string().uuid().optional(),
  territory_id: z.string().uuid().optional(),
  visit_day: z.string().optional(),
  visit_week: z.number().int().optional(),
  visit_frequency: z.string().optional(),
  last_visit_date: z.coerce.date().optional(),
  next_planned_visit: z.coerce.date().optional(),
  total_visits_planned: z.number().int().optional(),
  total_visits_actual: z.number().int().optional(),
  compliance_pct: z.number().optional(),
  customer_address: z.string().optional(),
  customer_lat: z.number().optional(),
  customer_lng: z.number().optional(),
  status: z.string().optional(),
  notes: z.string().optional()
});

export const sfa_coverage_assignmentsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  coverage_plan_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  customer_class: z.string().optional(),
  assigned_to: z.number().int().optional(),
  team_id: z.string().uuid().optional(),
  territory_id: z.string().uuid().optional(),
  visit_day: z.string().optional(),
  visit_week: z.number().int().optional(),
  visit_frequency: z.string().optional(),
  last_visit_date: z.coerce.date().optional(),
  next_planned_visit: z.coerce.date().optional(),
  total_visits_planned: z.number().int().optional(),
  total_visits_actual: z.number().int().optional(),
  compliance_pct: z.number().optional(),
  customer_address: z.string().optional(),
  customer_lat: z.number().optional(),
  customer_lng: z.number().optional(),
  status: z.string().optional(),
  notes: z.string().optional()
});

export const sfa_coverage_plansSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  customer_class: z.string(),
  visit_frequency: z.string().nullish(),
  visits_per_period: z.number().int().nullish(),
  min_visit_duration: z.number().int().nullish(),
  required_activities: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  priority: z.number().int().nullish(),
  is_active: z.boolean().nullish(),
  created_by: z.number().int().nullish(),
  updated_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  sfa_coverage_assignments: z.string()
});

export const sfa_coverage_plansCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  customer_class: z.string().optional(),
  visit_frequency: z.string().optional(),
  visits_per_period: z.number().int().optional(),
  min_visit_duration: z.number().int().optional(),
  required_activities: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  priority: z.number().int().optional(),
  is_active: z.boolean().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional(),
  sfa_coverage_assignments: z.string()
});

export const sfa_coverage_plansUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  customer_class: z.string().optional(),
  visit_frequency: z.string().optional(),
  visits_per_period: z.number().int().optional(),
  min_visit_duration: z.number().int().optional(),
  required_activities: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  priority: z.number().int().optional(),
  is_active: z.boolean().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional(),
  sfa_coverage_assignments: z.string().optional()
});

export const sfa_currenciesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  code: z.string(),
  name: z.string(),
  symbol: z.string().nullish(),
  decimal_places: z.number().int().nullish(),
  thousand_separator: z.string().nullish(),
  decimal_separator: z.string().nullish(),
  symbol_position: z.string().nullish(),
  is_default: z.boolean().nullish(),
  is_active: z.boolean().nullish(),
  sort_order: z.number().int().nullish(),
  created_by: z.number().int().nullish(),
  updated_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const sfa_currenciesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string(),
  name: z.string(),
  symbol: z.string().optional(),
  decimal_places: z.number().int().optional(),
  thousand_separator: z.string().optional(),
  decimal_separator: z.string().optional(),
  symbol_position: z.string().optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional()
});

export const sfa_currenciesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  symbol: z.string().optional(),
  decimal_places: z.number().int().optional(),
  thousand_separator: z.string().optional(),
  decimal_separator: z.string().optional(),
  symbol_position: z.string().optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional()
});

export const sfa_display_auditsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  visit_id: z.string().uuid().nullish(),
  customer_id: z.string().uuid().nullish(),
  customer_name: z.string().nullish(),
  salesperson_id: z.number().int().nullish(),
  audit_date: z.coerce.date().nullish(),
  store_type: z.string().nullish(),
  overall_score: z.number().nullish(),
  compliance_pct: z.number().nullish(),
  total_items: z.number().int().nullish(),
  compliant_items: z.number().int().nullish(),
  photo_before_url: z.string().nullish(),
  photo_after_url: z.string().nullish(),
  notes: z.string().nullish(),
  status: z.string().nullish(),
  reviewed_by: z.number().int().nullish(),
  reviewed_at: z.coerce.date().nullish(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
  created_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  sfa_display_items: z.string()
});

export const sfa_display_auditsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  visit_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  salesperson_id: z.number().int().optional(),
  audit_date: z.coerce.date().optional(),
  store_type: z.string().optional(),
  overall_score: z.number().optional(),
  compliance_pct: z.number().optional(),
  total_items: z.number().int().optional(),
  compliant_items: z.number().int().optional(),
  photo_before_url: z.string().optional(),
  photo_after_url: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
  reviewed_by: z.number().int().optional(),
  reviewed_at: z.coerce.date().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  created_by: z.number().int().optional(),
  sfa_display_items: z.string()
});

export const sfa_display_auditsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  visit_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  salesperson_id: z.number().int().optional(),
  audit_date: z.coerce.date().optional(),
  store_type: z.string().optional(),
  overall_score: z.number().optional(),
  compliance_pct: z.number().optional(),
  total_items: z.number().int().optional(),
  compliant_items: z.number().int().optional(),
  photo_before_url: z.string().optional(),
  photo_after_url: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
  reviewed_by: z.number().int().optional(),
  reviewed_at: z.coerce.date().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  created_by: z.number().int().optional(),
  sfa_display_items: z.string().optional()
});

export const sfa_display_itemsSchema = z.object({
  id: z.string().uuid(),
  audit_id: z.string().uuid(),
  category: z.string().nullish(),
  check_item: z.string(),
  is_compliant: z.boolean().nullish(),
  score: z.number().nullish(),
  max_score: z.number().nullish(),
  facing_count: z.number().int().nullish(),
  shelf_position: z.string().nullish(),
  photo_url: z.string().nullish(),
  notes: z.string().nullish(),
  sort_order: z.number().int().nullish(),
  created_at: z.coerce.date().nullish()
});

export const sfa_display_itemsCreateSchema = z.object({
  audit_id: z.string().uuid(),
  category: z.string().optional(),
  check_item: z.string(),
  is_compliant: z.boolean().optional(),
  score: z.number().optional(),
  max_score: z.number().optional(),
  facing_count: z.number().int().optional(),
  shelf_position: z.string().optional(),
  photo_url: z.string().optional(),
  notes: z.string().optional(),
  sort_order: z.number().int().optional()
});

export const sfa_display_itemsUpdateSchema = z.object({
  audit_id: z.string().uuid().optional(),
  category: z.string().optional(),
  check_item: z.string().optional(),
  is_compliant: z.boolean().optional(),
  score: z.number().optional(),
  max_score: z.number().optional(),
  facing_count: z.number().int().optional(),
  shelf_position: z.string().optional(),
  photo_url: z.string().optional(),
  notes: z.string().optional(),
  sort_order: z.number().int().optional()
});

export const sfa_exchange_ratesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  from_currency: z.string(),
  to_currency: z.string(),
  rate: z.number(),
  effective_date: z.coerce.date(),
  expiry_date: z.coerce.date().nullish(),
  source: z.string().nullish(),
  is_active: z.boolean().nullish(),
  notes: z.string().nullish(),
  created_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const sfa_exchange_ratesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  from_currency: z.string(),
  to_currency: z.string(),
  rate: z.number(),
  effective_date: z.coerce.date(),
  expiry_date: z.coerce.date().optional(),
  source: z.string().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().optional(),
  created_by: z.number().int().optional()
});

export const sfa_exchange_ratesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  from_currency: z.string().optional(),
  to_currency: z.string().optional(),
  rate: z.number().optional(),
  effective_date: z.coerce.date().optional(),
  expiry_date: z.coerce.date().optional(),
  source: z.string().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().optional(),
  created_by: z.number().int().optional()
});

export const sfa_field_order_itemsSchema = z.object({
  id: z.string().uuid(),
  field_order_id: z.string().uuid(),
  product_id: z.string().uuid().nullish(),
  product_name: z.string(),
  product_sku: z.string().nullish(),
  category_name: z.string().nullish(),
  quantity: z.number().nullish(),
  unit: z.string().nullish(),
  unit_price: z.number().nullish(),
  discount_pct: z.number().nullish(),
  discount_amount: z.number().nullish(),
  tax_pct: z.number().nullish(),
  subtotal: z.number().nullish(),
  commission_rate: z.number().nullish(),
  commission_amount: z.number().nullish(),
  notes: z.string().nullish(),
  sort_order: z.number().int().nullish(),
  created_at: z.coerce.date().nullish()
});

export const sfa_field_order_itemsCreateSchema = z.object({
  field_order_id: z.string().uuid(),
  product_id: z.string().uuid().optional(),
  product_name: z.string(),
  product_sku: z.string().optional(),
  category_name: z.string().optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  unit_price: z.number().optional(),
  discount_pct: z.number().optional(),
  discount_amount: z.number().optional(),
  tax_pct: z.number().optional(),
  subtotal: z.number().optional(),
  commission_rate: z.number().optional(),
  commission_amount: z.number().optional(),
  notes: z.string().optional(),
  sort_order: z.number().int().optional()
});

export const sfa_field_order_itemsUpdateSchema = z.object({
  field_order_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  product_name: z.string().optional(),
  product_sku: z.string().optional(),
  category_name: z.string().optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  unit_price: z.number().optional(),
  discount_pct: z.number().optional(),
  discount_amount: z.number().optional(),
  tax_pct: z.number().optional(),
  subtotal: z.number().optional(),
  commission_rate: z.number().optional(),
  commission_amount: z.number().optional(),
  notes: z.string().optional(),
  sort_order: z.number().int().optional()
});

export const sfa_field_ordersSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  order_number: z.string(),
  visit_id: z.string().uuid().nullish(),
  customer_id: z.string().uuid().nullish(),
  customer_name: z.string(),
  customer_address: z.string().nullish(),
  salesperson_id: z.number().int().nullish(),
  team_id: z.string().uuid().nullish(),
  territory_id: z.string().uuid().nullish(),
  order_date: z.coerce.date().nullish(),
  delivery_date: z.coerce.date().nullish(),
  status: z.string().nullish(),
  payment_method: z.string().nullish(),
  payment_terms: z.number().int().nullish(),
  subtotal: z.number().nullish(),
  discount_type: z.string().nullish(),
  discount_value: z.number().nullish(),
  discount_amount: z.number().nullish(),
  tax_amount: z.number().nullish(),
  total: z.number().nullish(),
  notes: z.string().nullish(),
  signature_url: z.string().nullish(),
  photo_url: z.string().nullish(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
  synced_to_so: z.boolean().nullish(),
  so_reference: z.string().nullish(),
  approved_by: z.number().int().nullish(),
  approved_at: z.coerce.date().nullish(),
  rejected_reason: z.string().nullish(),
  created_by: z.number().int().nullish(),
  updated_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  sfa_field_order_items: z.string()
});

export const sfa_field_ordersCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  order_number: z.string(),
  visit_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string(),
  customer_address: z.string().optional(),
  salesperson_id: z.number().int().optional(),
  team_id: z.string().uuid().optional(),
  territory_id: z.string().uuid().optional(),
  order_date: z.coerce.date().optional(),
  delivery_date: z.coerce.date().optional(),
  status: z.string().optional(),
  payment_method: z.string().optional(),
  payment_terms: z.number().int().optional(),
  subtotal: z.number().optional(),
  discount_type: z.string().optional(),
  discount_value: z.number().optional(),
  discount_amount: z.number().optional(),
  tax_amount: z.number().optional(),
  total: z.number().optional(),
  notes: z.string().optional(),
  signature_url: z.string().optional(),
  photo_url: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  synced_to_so: z.boolean().optional(),
  so_reference: z.string().optional(),
  approved_by: z.number().int().optional(),
  approved_at: z.coerce.date().optional(),
  rejected_reason: z.string().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional(),
  sfa_field_order_items: z.string()
});

export const sfa_field_ordersUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  order_number: z.string().optional(),
  visit_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  customer_address: z.string().optional(),
  salesperson_id: z.number().int().optional(),
  team_id: z.string().uuid().optional(),
  territory_id: z.string().uuid().optional(),
  order_date: z.coerce.date().optional(),
  delivery_date: z.coerce.date().optional(),
  status: z.string().optional(),
  payment_method: z.string().optional(),
  payment_terms: z.number().int().optional(),
  subtotal: z.number().optional(),
  discount_type: z.string().optional(),
  discount_value: z.number().optional(),
  discount_amount: z.number().optional(),
  tax_amount: z.number().optional(),
  total: z.number().optional(),
  notes: z.string().optional(),
  signature_url: z.string().optional(),
  photo_url: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  synced_to_so: z.boolean().optional(),
  so_reference: z.string().optional(),
  approved_by: z.number().int().optional(),
  approved_at: z.coerce.date().optional(),
  rejected_reason: z.string().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional(),
  sfa_field_order_items: z.string().optional()
});

export const sfa_geofencesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  name: z.string(),
  description: z.string().nullish(),
  fence_type: z.string().nullish(),
  center_lat: z.number(),
  center_lng: z.number(),
  radius_meters: z.number().int().nullish(),
  polygon_coords: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  reference_type: z.string().nullish(),
  reference_id: z.string().uuid().nullish(),
  customer_id: z.string().uuid().nullish(),
  territory_id: z.string().uuid().nullish(),
  is_active: z.boolean().nullish(),
  alert_on_enter: z.boolean().nullish(),
  alert_on_exit: z.boolean().nullish(),
  created_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const sfa_geofencesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string(),
  description: z.string().optional(),
  fence_type: z.string().optional(),
  center_lat: z.number(),
  center_lng: z.number(),
  radius_meters: z.number().int().optional(),
  polygon_coords: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  reference_type: z.string().optional(),
  reference_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  territory_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
  alert_on_enter: z.boolean().optional(),
  alert_on_exit: z.boolean().optional(),
  created_by: z.number().int().optional()
});

export const sfa_geofencesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  fence_type: z.string().optional(),
  center_lat: z.number().optional(),
  center_lng: z.number().optional(),
  radius_meters: z.number().int().optional(),
  polygon_coords: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  reference_type: z.string().optional(),
  reference_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  territory_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
  alert_on_enter: z.boolean().optional(),
  alert_on_exit: z.boolean().optional(),
  created_by: z.number().int().optional()
});

export const sfa_incentive_calculationsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  scheme_id: z.string().uuid().nullish(),
  achievement_id: z.string().uuid().nullish(),
  user_id: z.number().int().nullish(),
  team_id: z.string().uuid().nullish(),
  period: z.string(),
  year: z.number().int(),
  achievement_pct: z.number().nullish(),
  tier_name: z.string().nullish(),
  base_incentive: z.number().nullish(),
  achievement_incentive: z.number().nullish(),
  product_incentive: z.number().nullish(),
  new_customer_bonus: z.number().nullish(),
  visit_bonus: z.number().nullish(),
  collection_bonus: z.number().nullish(),
  overachievement_bonus: z.number().nullish(),
  special_bonus: z.number().nullish(),
  penalty_amount: z.number().nullish(),
  gross_incentive: z.number().nullish(),
  deductions: z.number().nullish(),
  net_incentive: z.number().nullish(),
  status: z.string().nullish(),
  calculated_at: z.coerce.date().nullish(),
  approved_by: z.number().int().nullish(),
  approved_at: z.coerce.date().nullish(),
  paid_at: z.coerce.date().nullish(),
  payment_reference: z.string().nullish(),
  calculation_detail: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const sfa_incentive_calculationsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  scheme_id: z.string().uuid().optional(),
  achievement_id: z.string().uuid().optional(),
  user_id: z.number().int().optional(),
  team_id: z.string().uuid().optional(),
  period: z.string(),
  year: z.number().int(),
  achievement_pct: z.number().optional(),
  tier_name: z.string().optional(),
  base_incentive: z.number().optional(),
  achievement_incentive: z.number().optional(),
  product_incentive: z.number().optional(),
  new_customer_bonus: z.number().optional(),
  visit_bonus: z.number().optional(),
  collection_bonus: z.number().optional(),
  overachievement_bonus: z.number().optional(),
  special_bonus: z.number().optional(),
  penalty_amount: z.number().optional(),
  gross_incentive: z.number().optional(),
  deductions: z.number().optional(),
  net_incentive: z.number().optional(),
  status: z.string().optional(),
  calculated_at: z.coerce.date().optional(),
  approved_by: z.number().int().optional(),
  approved_at: z.coerce.date().optional(),
  paid_at: z.coerce.date().optional(),
  payment_reference: z.string().optional(),
  calculation_detail: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_incentive_calculationsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  scheme_id: z.string().uuid().optional(),
  achievement_id: z.string().uuid().optional(),
  user_id: z.number().int().optional(),
  team_id: z.string().uuid().optional(),
  period: z.string().optional(),
  year: z.number().int().optional(),
  achievement_pct: z.number().optional(),
  tier_name: z.string().optional(),
  base_incentive: z.number().optional(),
  achievement_incentive: z.number().optional(),
  product_incentive: z.number().optional(),
  new_customer_bonus: z.number().optional(),
  visit_bonus: z.number().optional(),
  collection_bonus: z.number().optional(),
  overachievement_bonus: z.number().optional(),
  special_bonus: z.number().optional(),
  penalty_amount: z.number().optional(),
  gross_incentive: z.number().optional(),
  deductions: z.number().optional(),
  net_incentive: z.number().optional(),
  status: z.string().optional(),
  calculated_at: z.coerce.date().optional(),
  approved_by: z.number().int().optional(),
  approved_at: z.coerce.date().optional(),
  paid_at: z.coerce.date().optional(),
  payment_reference: z.string().optional(),
  calculation_detail: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_incentive_schemesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  scheme_type: z.string().nullish(),
  calculation_basis: z.string().nullish(),
  applicable_roles: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  applicable_teams: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  applicable_territories: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  period_type: z.string().nullish(),
  base_salary_component: z.boolean().nullish(),
  base_amount: z.number().nullish(),
  currency: z.string().nullish(),
  min_achievement_pct: z.number().nullish(),
  max_cap: z.number().nullish(),
  overachievement_multiplier: z.number().nullish(),
  underachievement_penalty: z.boolean().nullish(),
  has_product_incentive: z.boolean().nullish(),
  product_incentive_config: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const sfa_incentive_schemesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  scheme_type: z.string().optional(),
  calculation_basis: z.string().optional(),
  applicable_roles: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  applicable_teams: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  applicable_territories: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  period_type: z.string().optional(),
  base_salary_component: z.boolean().optional(),
  base_amount: z.number().optional(),
  currency: z.string().optional(),
  min_achievement_pct: z.number().optional(),
  max_cap: z.number().optional(),
  overachievement_multiplier: z.number().optional(),
  underachievement_penalty: z.boolean().optional(),
  has_product_incentive: z.boolean().optional(),
  product_incentive_config: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_incentive_schemesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  scheme_type: z.string().optional(),
  calculation_basis: z.string().optional(),
  applicable_roles: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  applicable_teams: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  applicable_territories: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  period_type: z.string().optional(),
  base_salary_component: z.boolean().optional(),
  base_amount: z.number().optional(),
  currency: z.string().optional(),
  min_achievement_pct: z.number().optional(),
  max_cap: z.number().optional(),
  overachievement_multiplier: z.number().optional(),
  underachievement_penalty: z.boolean().optional(),
  has_product_incentive: z.boolean().optional(),
  product_incentive_config: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_incentive_tiersSchema = z.object({
  id: z.string().uuid(),
  scheme_id: z.string().uuid(),
  tier_name: z.string().nullish(),
  min_achievement: z.number(),
  max_achievement: z.number().nullish(),
  incentive_type: z.string().nullish(),
  incentive_value: z.number().nullish(),
  flat_amount: z.number().nullish(),
  multiplier: z.number().nullish(),
  bonus_amount: z.number().nullish(),
  bonus_description: z.string().nullish(),
  sort_order: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const sfa_incentive_tiersCreateSchema = z.object({
  scheme_id: z.string().uuid(),
  tier_name: z.string().optional(),
  min_achievement: z.number().optional(),
  max_achievement: z.number().optional(),
  incentive_type: z.string().optional(),
  incentive_value: z.number().optional(),
  flat_amount: z.number().optional(),
  multiplier: z.number().optional(),
  bonus_amount: z.number().optional(),
  bonus_description: z.string().optional(),
  sort_order: z.number().int().optional()
});

export const sfa_incentive_tiersUpdateSchema = z.object({
  scheme_id: z.string().uuid().optional(),
  tier_name: z.string().optional(),
  min_achievement: z.number().optional(),
  max_achievement: z.number().optional(),
  incentive_type: z.string().optional(),
  incentive_value: z.number().optional(),
  flat_amount: z.number().optional(),
  multiplier: z.number().optional(),
  bonus_amount: z.number().optional(),
  bonus_description: z.string().optional(),
  sort_order: z.number().int().optional()
});

export const sfa_leadsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  branch_id: z.string().uuid().nullish(),
  territory_id: z.string().uuid().nullish(),
  lead_number: z.string().nullish(),
  company_name: z.string().nullish(),
  contact_name: z.string(),
  contact_email: z.string().nullish(),
  contact_phone: z.string().nullish(),
  contact_title: z.string().nullish(),
  industry: z.string().nullish(),
  company_size: z.string().nullish(),
  source: z.string().nullish(),
  source_detail: z.string().nullish(),
  status: z.string().nullish(),
  priority: z.string().nullish(),
  score: z.number().int().nullish(),
  estimated_value: z.number().nullish(),
  assigned_to: z.number().int().nullish(),
  assigned_at: z.coerce.date().nullish(),
  address: z.string().nullish(),
  city: z.string().nullish(),
  province: z.string().nullish(),
  postal_code: z.string().nullish(),
  country: z.string().nullish(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
  notes: z.string().nullish(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  custom_fields: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const sfa_leadsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  territory_id: z.string().uuid().optional(),
  lead_number: z.string().optional(),
  company_name: z.string().optional(),
  contact_name: z.string(),
  contact_email: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_title: z.string().optional(),
  industry: z.string().optional(),
  company_size: z.string().optional(),
  source: z.string().optional(),
  source_detail: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  score: z.number().int().optional(),
  estimated_value: z.number().optional(),
  assigned_to: z.number().int().optional(),
  assigned_at: z.coerce.date().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  custom_fields: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_leadsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  territory_id: z.string().uuid().optional(),
  lead_number: z.string().optional(),
  company_name: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_title: z.string().optional(),
  industry: z.string().optional(),
  company_size: z.string().optional(),
  source: z.string().optional(),
  source_detail: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  score: z.number().int().optional(),
  estimated_value: z.number().optional(),
  assigned_to: z.number().int().optional(),
  assigned_at: z.coerce.date().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  notes: z.string().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  custom_fields: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_numbering_formatsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  entity_type: z.string(),
  prefix: z.string().nullish(),
  suffix: z.string().nullish(),
  separator: z.string().nullish(),
  date_format: z.string().nullish(),
  counter_length: z.number().int().nullish(),
  current_counter: z.number().int().nullish(),
  reset_period: z.string().nullish(),
  last_reset_date: z.coerce.date().nullish(),
  sample_output: z.string().nullish(),
  is_active: z.boolean().nullish(),
  created_by: z.number().int().nullish(),
  updated_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const sfa_numbering_formatsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  entity_type: z.string(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  separator: z.string().optional(),
  date_format: z.string().optional(),
  counter_length: z.number().int().optional(),
  current_counter: z.number().int().optional(),
  reset_period: z.string().optional(),
  last_reset_date: z.coerce.date().optional(),
  sample_output: z.string().optional(),
  is_active: z.boolean().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional()
});

export const sfa_numbering_formatsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  entity_type: z.string().optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  separator: z.string().optional(),
  date_format: z.string().optional(),
  counter_length: z.number().int().optional(),
  current_counter: z.number().int().optional(),
  reset_period: z.string().optional(),
  last_reset_date: z.coerce.date().optional(),
  sample_output: z.string().optional(),
  is_active: z.boolean().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional()
});

export const sfa_opportunitiesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  branch_id: z.string().uuid().nullish(),
  territory_id: z.string().uuid().nullish(),
  lead_id: z.string().uuid().nullish(),
  opportunity_number: z.string().nullish(),
  title: z.string(),
  customer_name: z.string().nullish(),
  customer_id: z.number().int().nullish(),
  contact_name: z.string().nullish(),
  contact_email: z.string().nullish(),
  contact_phone: z.string().nullish(),
  stage: z.string().nullish(),
  status: z.string().nullish(),
  priority: z.string().nullish(),
  probability: z.number().int().nullish(),
  expected_value: z.number().nullish(),
  actual_value: z.number().nullish(),
  currency: z.string().nullish(),
  expected_close_date: z.coerce.date().nullish(),
  actual_close_date: z.coerce.date().nullish(),
  assigned_to: z.number().int().nullish(),
  product_interest: z.string().nullish(),
  competitor_info: z.string().nullish(),
  pain_points: z.string().nullish(),
  solution_proposed: z.string().nullish(),
  notes: z.string().nullish(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  custom_fields: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const sfa_opportunitiesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  territory_id: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  opportunity_number: z.string().optional(),
  title: z.string(),
  customer_name: z.string().optional(),
  customer_id: z.number().int().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().optional(),
  contact_phone: z.string().optional(),
  stage: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  probability: z.number().int().optional(),
  expected_value: z.number().optional(),
  actual_value: z.number().optional(),
  currency: z.string().optional(),
  expected_close_date: z.coerce.date().optional(),
  actual_close_date: z.coerce.date().optional(),
  assigned_to: z.number().int().optional(),
  product_interest: z.string().optional(),
  competitor_info: z.string().optional(),
  pain_points: z.string().optional(),
  solution_proposed: z.string().optional(),
  notes: z.string().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  custom_fields: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_opportunitiesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  territory_id: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  opportunity_number: z.string().optional(),
  title: z.string().optional(),
  customer_name: z.string().optional(),
  customer_id: z.number().int().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().optional(),
  contact_phone: z.string().optional(),
  stage: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  probability: z.number().int().optional(),
  expected_value: z.number().optional(),
  actual_value: z.number().optional(),
  currency: z.string().optional(),
  expected_close_date: z.coerce.date().optional(),
  actual_close_date: z.coerce.date().optional(),
  assigned_to: z.number().int().optional(),
  product_interest: z.string().optional(),
  competitor_info: z.string().optional(),
  pain_points: z.string().optional(),
  solution_proposed: z.string().optional(),
  notes: z.string().optional(),
  tags: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  custom_fields: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_outlet_targetsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  code: z.string().nullish(),
  name: z.string().nullish(),
  product_id: z.number().int().nullish(),
  product_name: z.string().nullish(),
  product_sku: z.string().nullish(),
  target_type: z.string().nullish(),
  target_value: z.number().int().nullish(),
  achieved_value: z.number().int().nullish(),
  achievement_pct: z.number().nullish(),
  period_type: z.string().nullish(),
  period: z.string().nullish(),
  year: z.number().int().nullish(),
  bronze_threshold_pct: z.number().nullish(),
  silver_threshold_pct: z.number().nullish(),
  gold_threshold_pct: z.number().nullish(),
  platinum_threshold_pct: z.number().nullish(),
  bronze_bonus: z.number().nullish(),
  silver_bonus: z.number().nullish(),
  gold_bonus: z.number().nullish(),
  platinum_bonus: z.number().nullish(),
  assigned_to: z.number().int().nullish(),
  team_id: z.string().uuid().nullish(),
  is_active: z.boolean().nullish(),
  notes: z.string().nullish(),
  created_by: z.number().int().nullish(),
  updated_by: z.number().int().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const sfa_outlet_targetsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  product_id: z.number().int().optional(),
  product_name: z.string().optional(),
  product_sku: z.string().optional(),
  target_type: z.string().optional(),
  target_value: z.number().int().optional(),
  achieved_value: z.number().int().optional(),
  achievement_pct: z.number().optional(),
  period_type: z.string().optional(),
  period: z.string().optional(),
  year: z.number().int().optional(),
  bronze_threshold_pct: z.number().optional(),
  silver_threshold_pct: z.number().optional(),
  gold_threshold_pct: z.number().optional(),
  platinum_threshold_pct: z.number().optional(),
  bronze_bonus: z.number().optional(),
  silver_bonus: z.number().optional(),
  gold_bonus: z.number().optional(),
  platinum_bonus: z.number().optional(),
  assigned_to: z.number().int().optional(),
  team_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional()
});

export const sfa_outlet_targetsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  product_id: z.number().int().optional(),
  product_name: z.string().optional(),
  product_sku: z.string().optional(),
  target_type: z.string().optional(),
  target_value: z.number().int().optional(),
  achieved_value: z.number().int().optional(),
  achievement_pct: z.number().optional(),
  period_type: z.string().optional(),
  period: z.string().optional(),
  year: z.number().int().optional(),
  bronze_threshold_pct: z.number().optional(),
  silver_threshold_pct: z.number().optional(),
  gold_threshold_pct: z.number().optional(),
  platinum_threshold_pct: z.number().optional(),
  bronze_bonus: z.number().optional(),
  silver_bonus: z.number().optional(),
  gold_bonus: z.number().optional(),
  platinum_bonus: z.number().optional(),
  assigned_to: z.number().int().optional(),
  team_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional()
});

export const sfa_parametersSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  category: z.string(),
  param_key: z.string(),
  param_value: z.string().nullish(),
  value_type: z.string().nullish(),
  label: z.string().nullish(),
  description: z.string().nullish(),
  is_editable: z.boolean().nullish(),
  display_order: z.number().int().nullish(),
  options: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  created_by: z.number().int().nullish(),
  updated_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const sfa_parametersCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  category: z.string(),
  param_key: z.string(),
  param_value: z.string().optional(),
  value_type: z.string().optional(),
  label: z.string().optional(),
  description: z.string().optional(),
  is_editable: z.boolean().optional(),
  display_order: z.number().int().optional(),
  options: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional()
});

export const sfa_parametersUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  category: z.string().optional(),
  param_key: z.string().optional(),
  param_value: z.string().optional(),
  value_type: z.string().optional(),
  label: z.string().optional(),
  description: z.string().optional(),
  is_editable: z.boolean().optional(),
  display_order: z.number().int().optional(),
  options: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional()
});

export const sfa_payment_termsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  days_due: z.number().int().nullish(),
  discount_days: z.number().int().nullish(),
  discount_percentage: z.number().nullish(),
  late_fee_type: z.string().nullish(),
  late_fee_value: z.number().nullish(),
  is_default: z.boolean().nullish(),
  is_active: z.boolean().nullish(),
  sort_order: z.number().int().nullish(),
  created_by: z.number().int().nullish(),
  updated_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const sfa_payment_termsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  days_due: z.number().int().optional(),
  discount_days: z.number().int().optional(),
  discount_percentage: z.number().optional(),
  late_fee_type: z.string().optional(),
  late_fee_value: z.number().optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional()
});

export const sfa_payment_termsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  days_due: z.number().int().optional(),
  discount_days: z.number().int().optional(),
  discount_percentage: z.number().optional(),
  late_fee_type: z.string().optional(),
  late_fee_value: z.number().optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional()
});

export const sfa_plafonSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  plafon_type: z.string(),
  customer_id: z.string().uuid().nullish(),
  customer_name: z.string().nullish(),
  user_id: z.number().int().nullish(),
  team_id: z.string().uuid().nullish(),
  territory_id: z.string().uuid().nullish(),
  credit_limit: z.number().nullish(),
  used_amount: z.number().nullish(),
  available_amount: z.number().nullish(),
  currency: z.string().nullish(),
  payment_terms: z.number().int().nullish(),
  max_overdue_days: z.number().int().nullish(),
  max_outstanding_invoices: z.number().int().nullish(),
  risk_level: z.string().nullish(),
  risk_score: z.number().nullish(),
  status: z.string().nullish(),
  effective_from: z.coerce.date().nullish(),
  effective_to: z.coerce.date().nullish(),
  last_reviewed_at: z.coerce.date().nullish(),
  reviewed_by: z.number().int().nullish(),
  auto_adjust: z.boolean().nullish(),
  auto_adjust_config: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const sfa_plafonCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  plafon_type: z.string().optional(),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  user_id: z.number().int().optional(),
  team_id: z.string().uuid().optional(),
  territory_id: z.string().uuid().optional(),
  credit_limit: z.number().optional(),
  used_amount: z.number().optional(),
  available_amount: z.number().optional(),
  currency: z.string().optional(),
  payment_terms: z.number().int().optional(),
  max_overdue_days: z.number().int().optional(),
  max_outstanding_invoices: z.number().int().optional(),
  risk_level: z.string().optional(),
  risk_score: z.number().optional(),
  status: z.string().optional(),
  effective_from: z.coerce.date().optional(),
  effective_to: z.coerce.date().optional(),
  last_reviewed_at: z.coerce.date().optional(),
  reviewed_by: z.number().int().optional(),
  auto_adjust: z.boolean().optional(),
  auto_adjust_config: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_plafonUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  plafon_type: z.string().optional(),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  user_id: z.number().int().optional(),
  team_id: z.string().uuid().optional(),
  territory_id: z.string().uuid().optional(),
  credit_limit: z.number().optional(),
  used_amount: z.number().optional(),
  available_amount: z.number().optional(),
  currency: z.string().optional(),
  payment_terms: z.number().int().optional(),
  max_overdue_days: z.number().int().optional(),
  max_outstanding_invoices: z.number().int().optional(),
  risk_level: z.string().optional(),
  risk_score: z.number().optional(),
  status: z.string().optional(),
  effective_from: z.coerce.date().optional(),
  effective_to: z.coerce.date().optional(),
  last_reviewed_at: z.coerce.date().optional(),
  reviewed_by: z.number().int().optional(),
  auto_adjust: z.boolean().optional(),
  auto_adjust_config: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_plafon_usageSchema = z.object({
  id: z.string().uuid(),
  plafon_id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  transaction_type: z.string(),
  reference_id: z.string().uuid().nullish(),
  reference_number: z.string().nullish(),
  amount: z.number(),
  running_balance: z.number().nullish(),
  description: z.string().nullish(),
  transaction_date: z.coerce.date().nullish(),
  due_date: z.coerce.date().nullish(),
  is_overdue: z.boolean().nullish(),
  paid_at: z.coerce.date().nullish(),
  created_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish()
});

export const sfa_plafon_usageCreateSchema = z.object({
  plafon_id: z.string().uuid(),
  tenant_id: z.string().uuid().optional(),
  transaction_type: z.string(),
  reference_id: z.string().uuid().optional(),
  reference_number: z.string().optional(),
  amount: z.number().optional(),
  running_balance: z.number().optional(),
  description: z.string().optional(),
  transaction_date: z.coerce.date().optional(),
  due_date: z.coerce.date().optional(),
  is_overdue: z.boolean().optional(),
  paid_at: z.coerce.date().optional(),
  created_by: z.number().int().optional()
});

export const sfa_plafon_usageUpdateSchema = z.object({
  plafon_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  transaction_type: z.string().optional(),
  reference_id: z.string().uuid().optional(),
  reference_number: z.string().optional(),
  amount: z.number().optional(),
  running_balance: z.number().optional(),
  description: z.string().optional(),
  transaction_date: z.coerce.date().optional(),
  due_date: z.coerce.date().optional(),
  is_overdue: z.boolean().optional(),
  paid_at: z.coerce.date().optional(),
  created_by: z.number().int().optional()
});

export const sfa_product_commissionsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  product_id: z.string().uuid().nullish(),
  product_name: z.string().nullish(),
  product_sku: z.string().nullish(),
  category_id: z.string().uuid().nullish(),
  category_name: z.string().nullish(),
  commission_type: z.string().nullish(),
  commission_rate: z.number().nullish(),
  flat_amount: z.number().nullish(),
  min_quantity: z.number().nullish(),
  bonus_rate: z.number().nullish(),
  bonus_threshold: z.number().nullish(),
  applicable_teams: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  applicable_roles: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  effective_from: z.coerce.date().nullish(),
  effective_to: z.coerce.date().nullish(),
  is_active: z.boolean().nullish(),
  priority: z.number().int().nullish(),
  notes: z.string().nullish(),
  created_by: z.number().int().nullish(),
  updated_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const sfa_product_commissionsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  product_name: z.string().optional(),
  product_sku: z.string().optional(),
  category_id: z.string().uuid().optional(),
  category_name: z.string().optional(),
  commission_type: z.string().optional(),
  commission_rate: z.number().optional(),
  flat_amount: z.number().optional(),
  min_quantity: z.number().optional(),
  bonus_rate: z.number().optional(),
  bonus_threshold: z.number().optional(),
  applicable_teams: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  applicable_roles: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  effective_from: z.coerce.date().optional(),
  effective_to: z.coerce.date().optional(),
  is_active: z.boolean().optional(),
  priority: z.number().int().optional(),
  notes: z.string().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional()
});

export const sfa_product_commissionsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  product_name: z.string().optional(),
  product_sku: z.string().optional(),
  category_id: z.string().uuid().optional(),
  category_name: z.string().optional(),
  commission_type: z.string().optional(),
  commission_rate: z.number().optional(),
  flat_amount: z.number().optional(),
  min_quantity: z.number().optional(),
  bonus_rate: z.number().optional(),
  bonus_threshold: z.number().optional(),
  applicable_teams: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  applicable_roles: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  effective_from: z.coerce.date().optional(),
  effective_to: z.coerce.date().optional(),
  is_active: z.boolean().optional(),
  priority: z.number().int().optional(),
  notes: z.string().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional()
});

export const sfa_quotation_itemsSchema = z.object({
  id: z.string().uuid(),
  quotation_id: z.string().uuid(),
  product_id: z.string().uuid().nullish(),
  product_name: z.string(),
  product_sku: z.string().nullish(),
  description: z.string().nullish(),
  quantity: z.number(),
  unit: z.string().nullish(),
  unit_price: z.number(),
  discount_pct: z.number().nullish(),
  discount_amount: z.number().nullish(),
  tax_pct: z.number().nullish(),
  tax_amount: z.number().nullish(),
  subtotal: z.number().nullish(),
  sort_order: z.number().int().nullish(),
  created_at: z.coerce.date().nullish()
});

export const sfa_quotation_itemsCreateSchema = z.object({
  quotation_id: z.string().uuid(),
  product_id: z.string().uuid().optional(),
  product_name: z.string(),
  product_sku: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  unit_price: z.number().optional(),
  discount_pct: z.number().optional(),
  discount_amount: z.number().optional(),
  tax_pct: z.number().optional(),
  tax_amount: z.number().optional(),
  subtotal: z.number().optional(),
  sort_order: z.number().int().optional()
});

export const sfa_quotation_itemsUpdateSchema = z.object({
  quotation_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  product_name: z.string().optional(),
  product_sku: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  unit_price: z.number().optional(),
  discount_pct: z.number().optional(),
  discount_amount: z.number().optional(),
  tax_pct: z.number().optional(),
  tax_amount: z.number().optional(),
  subtotal: z.number().optional(),
  sort_order: z.number().int().optional()
});

export const sfa_quotationsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  branch_id: z.string().uuid().nullish(),
  quotation_number: z.string(),
  opportunity_id: z.string().uuid().nullish(),
  lead_id: z.string().uuid().nullish(),
  customer_id: z.number().int().nullish(),
  customer_name: z.string(),
  customer_email: z.string().nullish(),
  customer_phone: z.string().nullish(),
  customer_address: z.string().nullish(),
  salesperson_id: z.number().int().nullish(),
  status: z.string().nullish(),
  valid_until: z.coerce.date().nullish(),
  subtotal: z.number().nullish(),
  discount_type: z.string().nullish(),
  discount_value: z.number().nullish(),
  discount_amount: z.number().nullish(),
  tax_amount: z.number().nullish(),
  total: z.number().nullish(),
  currency: z.string().nullish(),
  terms_conditions: z.string().nullish(),
  notes: z.string().nullish(),
  converted_to_order: z.boolean().nullish(),
  order_id: z.string().uuid().nullish(),
  approved_by: z.string().uuid().nullish(),
  approved_at: z.coerce.date().nullish(),
  rejected_reason: z.string().nullish(),
  sent_at: z.coerce.date().nullish(),
  created_by: z.number().int().nullish(),
  updated_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  sfa_quotation_items: z.string()
});

export const sfa_quotationsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  quotation_number: z.string(),
  opportunity_id: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  customer_id: z.number().int().optional(),
  customer_name: z.string(),
  customer_email: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_address: z.string().optional(),
  salesperson_id: z.number().int().optional(),
  status: z.string().optional(),
  valid_until: z.coerce.date().optional(),
  subtotal: z.number().optional(),
  discount_type: z.string().optional(),
  discount_value: z.number().optional(),
  discount_amount: z.number().optional(),
  tax_amount: z.number().optional(),
  total: z.number().optional(),
  currency: z.string().optional(),
  terms_conditions: z.string().optional(),
  notes: z.string().optional(),
  converted_to_order: z.boolean().optional(),
  order_id: z.string().uuid().optional(),
  approved_by: z.string().uuid().optional(),
  approved_at: z.coerce.date().optional(),
  rejected_reason: z.string().optional(),
  sent_at: z.coerce.date().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional(),
  sfa_quotation_items: z.string()
});

export const sfa_quotationsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  quotation_number: z.string().optional(),
  opportunity_id: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  customer_id: z.number().int().optional(),
  customer_name: z.string().optional(),
  customer_email: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_address: z.string().optional(),
  salesperson_id: z.number().int().optional(),
  status: z.string().optional(),
  valid_until: z.coerce.date().optional(),
  subtotal: z.number().optional(),
  discount_type: z.string().optional(),
  discount_value: z.number().optional(),
  discount_amount: z.number().optional(),
  tax_amount: z.number().optional(),
  total: z.number().optional(),
  currency: z.string().optional(),
  terms_conditions: z.string().optional(),
  notes: z.string().optional(),
  converted_to_order: z.boolean().optional(),
  order_id: z.string().uuid().optional(),
  approved_by: z.string().uuid().optional(),
  approved_at: z.coerce.date().optional(),
  rejected_reason: z.string().optional(),
  sent_at: z.coerce.date().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional(),
  sfa_quotation_items: z.string().optional()
});

export const sfa_route_plansSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  salesperson_id: z.number().int(),
  territory_id: z.string().uuid().nullish(),
  name: z.string(),
  description: z.string().nullish(),
  day_of_week: z.number().int().nullish(),
  frequency: z.string().nullish(),
  route_stops: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  total_stops: z.number().int().nullish(),
  estimated_duration_minutes: z.number().int().nullish(),
  estimated_distance_km: z.number().nullish(),
  is_active: z.boolean().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const sfa_route_plansCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  salesperson_id: z.number().int(),
  territory_id: z.string().uuid().optional(),
  name: z.string(),
  description: z.string().optional(),
  day_of_week: z.number().int().optional(),
  frequency: z.string().optional(),
  route_stops: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  total_stops: z.number().int().optional(),
  estimated_duration_minutes: z.number().int().optional(),
  estimated_distance_km: z.number().optional(),
  is_active: z.boolean().optional()
});

export const sfa_route_plansUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  salesperson_id: z.number().int().optional(),
  territory_id: z.string().uuid().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  day_of_week: z.number().int().optional(),
  frequency: z.string().optional(),
  route_stops: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  total_stops: z.number().int().optional(),
  estimated_duration_minutes: z.number().int().optional(),
  estimated_distance_km: z.number().optional(),
  is_active: z.boolean().optional()
});

export const sfa_sales_strategiesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  code: z.string().nullish(),
  name: z.string().nullish(),
  description: z.string().nullish(),
  strategy_type: z.string().nullish(),
  period_type: z.string().nullish(),
  period: z.string().nullish(),
  year: z.number().int().nullish(),
  status: z.string().nullish(),
  total_weight: z.number().nullish(),
  overall_target: z.number().nullish(),
  overall_achieved: z.number().nullish(),
  overall_score: z.number().nullish(),
  kpi_count: z.number().int().nullish(),
  assigned_teams: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  assigned_users: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  is_active: z.boolean().nullish(),
  notes: z.string().nullish(),
  created_by: z.number().int().nullish(),
  updated_by: z.number().int().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  sfa_strategy_kpis: z.string()
});

export const sfa_sales_strategiesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  strategy_type: z.string().optional(),
  period_type: z.string().optional(),
  period: z.string().optional(),
  year: z.number().int().optional(),
  status: z.string().optional(),
  total_weight: z.number().optional(),
  overall_target: z.number().optional(),
  overall_achieved: z.number().optional(),
  overall_score: z.number().optional(),
  kpi_count: z.number().int().optional(),
  assigned_teams: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  assigned_users: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  is_active: z.boolean().optional(),
  notes: z.string().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional(),
  sfa_strategy_kpis: z.string()
});

export const sfa_sales_strategiesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  strategy_type: z.string().optional(),
  period_type: z.string().optional(),
  period: z.string().optional(),
  year: z.number().int().optional(),
  status: z.string().optional(),
  total_weight: z.number().optional(),
  overall_target: z.number().optional(),
  overall_achieved: z.number().optional(),
  overall_score: z.number().optional(),
  kpi_count: z.number().int().optional(),
  assigned_teams: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  assigned_users: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  is_active: z.boolean().optional(),
  notes: z.string().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional(),
  sfa_strategy_kpis: z.string().optional()
});

export const sfa_strategy_kpisSchema = z.object({
  id: z.string().uuid(),
  strategy_id: z.string().uuid().nullish(),
  tenant_id: z.string().uuid().nullish(),
  kpi_code: z.string().nullish(),
  kpi_name: z.string().nullish(),
  description: z.string().nullish(),
  kpi_type: z.string().nullish(),
  target_value: z.number().nullish(),
  achieved_value: z.number().nullish(),
  achievement_pct: z.number().nullish(),
  unit: z.string().nullish(),
  weight: z.number().nullish(),
  scoring_method: z.string().nullish(),
  threshold_bronze: z.number().nullish(),
  threshold_silver: z.number().nullish(),
  threshold_gold: z.number().nullish(),
  threshold_platinum: z.number().nullish(),
  multiplier_bronze: z.number().nullish(),
  multiplier_silver: z.number().nullish(),
  multiplier_gold: z.number().nullish(),
  multiplier_platinum: z.number().nullish(),
  is_active: z.boolean().nullish(),
  sort_order: z.number().int().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const sfa_strategy_kpisCreateSchema = z.object({
  strategy_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  kpi_code: z.string().optional(),
  kpi_name: z.string().optional(),
  description: z.string().optional(),
  kpi_type: z.string().optional(),
  target_value: z.number().optional(),
  achieved_value: z.number().optional(),
  achievement_pct: z.number().optional(),
  unit: z.string().optional(),
  weight: z.number().optional(),
  scoring_method: z.string().optional(),
  threshold_bronze: z.number().optional(),
  threshold_silver: z.number().optional(),
  threshold_gold: z.number().optional(),
  threshold_platinum: z.number().optional(),
  multiplier_bronze: z.number().optional(),
  multiplier_silver: z.number().optional(),
  multiplier_gold: z.number().optional(),
  multiplier_platinum: z.number().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional()
});

export const sfa_strategy_kpisUpdateSchema = z.object({
  strategy_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  kpi_code: z.string().optional(),
  kpi_name: z.string().optional(),
  description: z.string().optional(),
  kpi_type: z.string().optional(),
  target_value: z.number().optional(),
  achieved_value: z.number().optional(),
  achievement_pct: z.number().optional(),
  unit: z.string().optional(),
  weight: z.number().optional(),
  scoring_method: z.string().optional(),
  threshold_bronze: z.number().optional(),
  threshold_silver: z.number().optional(),
  threshold_gold: z.number().optional(),
  threshold_platinum: z.number().optional(),
  multiplier_bronze: z.number().optional(),
  multiplier_silver: z.number().optional(),
  multiplier_gold: z.number().optional(),
  multiplier_platinum: z.number().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional()
});

export const sfa_survey_questionsSchema = z.object({
  id: z.string().uuid(),
  template_id: z.string().uuid(),
  question_text: z.string(),
  question_type: z.string().nullish(),
  is_required: z.boolean().nullish(),
  options: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  min_value: z.number().nullish(),
  max_value: z.number().nullish(),
  placeholder: z.string().nullish(),
  help_text: z.string().nullish(),
  validation_rule: z.string().nullish(),
  conditional_on: z.string().uuid().nullish(),
  conditional_value: z.string().nullish(),
  section: z.string().nullish(),
  sort_order: z.number().int().nullish(),
  created_at: z.coerce.date().nullish()
});

export const sfa_survey_questionsCreateSchema = z.object({
  template_id: z.string().uuid(),
  question_text: z.string(),
  question_type: z.string().optional(),
  is_required: z.boolean().optional(),
  options: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  min_value: z.number().optional(),
  max_value: z.number().optional(),
  placeholder: z.string().optional(),
  help_text: z.string().optional(),
  validation_rule: z.string().optional(),
  conditional_on: z.string().uuid().optional(),
  conditional_value: z.string().optional(),
  section: z.string().optional(),
  sort_order: z.number().int().optional()
});

export const sfa_survey_questionsUpdateSchema = z.object({
  template_id: z.string().uuid().optional(),
  question_text: z.string().optional(),
  question_type: z.string().optional(),
  is_required: z.boolean().optional(),
  options: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  min_value: z.number().optional(),
  max_value: z.number().optional(),
  placeholder: z.string().optional(),
  help_text: z.string().optional(),
  validation_rule: z.string().optional(),
  conditional_on: z.string().uuid().optional(),
  conditional_value: z.string().optional(),
  section: z.string().optional(),
  sort_order: z.number().int().optional()
});

export const sfa_survey_responsesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  template_id: z.string().uuid().nullish(),
  visit_id: z.string().uuid().nullish(),
  customer_id: z.string().uuid().nullish(),
  customer_name: z.string().nullish(),
  respondent_id: z.number().int().nullish(),
  response_date: z.coerce.date().nullish(),
  answers: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const sfa_survey_responsesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  template_id: z.string().uuid().optional(),
  visit_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  respondent_id: z.number().int().optional(),
  response_date: z.coerce.date().optional(),
  answers: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_survey_responsesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  template_id: z.string().uuid().optional(),
  visit_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  respondent_id: z.number().int().optional(),
  response_date: z.coerce.date().optional(),
  answers: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_survey_templatesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  code: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  survey_type: z.string().nullish(),
  target_audience: z.string().nullish(),
  is_required: z.boolean().nullish(),
  trigger_event: z.string().nullish(),
  question_count: z.number().int().nullish(),
  estimated_minutes: z.number().int().nullish(),
  status: z.string().nullish(),
  valid_from: z.coerce.date().nullish(),
  valid_to: z.coerce.date().nullish(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const sfa_survey_templatesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string(),
  title: z.string(),
  description: z.string().optional(),
  survey_type: z.string().optional(),
  target_audience: z.string().optional(),
  is_required: z.boolean().optional(),
  trigger_event: z.string().optional(),
  question_count: z.number().int().optional(),
  estimated_minutes: z.number().int().optional(),
  status: z.string().optional(),
  valid_from: z.coerce.date().optional(),
  valid_to: z.coerce.date().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_survey_templatesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  survey_type: z.string().optional(),
  target_audience: z.string().optional(),
  is_required: z.boolean().optional(),
  trigger_event: z.string().optional(),
  question_count: z.number().int().optional(),
  estimated_minutes: z.number().int().optional(),
  status: z.string().optional(),
  valid_from: z.coerce.date().optional(),
  valid_to: z.coerce.date().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_target_assignmentsSchema = z.object({
  id: z.string().uuid(),
  target_group_id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  assigned_to: z.number().int().nullish(),
  team_id: z.string().uuid().nullish(),
  territory_id: z.string().uuid().nullish(),
  assignment_type: z.string().nullish(),
  revenue_target: z.number().nullish(),
  revenue_achieved: z.number().nullish(),
  revenue_achievement_pct: z.number().nullish(),
  volume_target: z.number().nullish(),
  volume_achieved: z.number().nullish(),
  volume_unit: z.string().nullish(),
  volume_achievement_pct: z.number().nullish(),
  visit_target: z.number().int().nullish(),
  visit_achieved: z.number().int().nullish(),
  visit_achievement_pct: z.number().nullish(),
  new_customer_target: z.number().int().nullish(),
  new_customer_achieved: z.number().int().nullish(),
  effective_call_target: z.number().int().nullish(),
  effective_call_achieved: z.number().int().nullish(),
  collection_target: z.number().nullish(),
  collection_achieved: z.number().nullish(),
  weighted_achievement: z.number().nullish(),
  weight_config: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const sfa_target_assignmentsCreateSchema = z.object({
  target_group_id: z.string().uuid(),
  tenant_id: z.string().uuid().optional(),
  assigned_to: z.number().int().optional(),
  team_id: z.string().uuid().optional(),
  territory_id: z.string().uuid().optional(),
  assignment_type: z.string().optional(),
  revenue_target: z.number().optional(),
  revenue_achieved: z.number().optional(),
  revenue_achievement_pct: z.number().optional(),
  volume_target: z.number().optional(),
  volume_achieved: z.number().optional(),
  volume_unit: z.string().optional(),
  volume_achievement_pct: z.number().optional(),
  visit_target: z.number().int().optional(),
  visit_achieved: z.number().int().optional(),
  visit_achievement_pct: z.number().optional(),
  new_customer_target: z.number().int().optional(),
  new_customer_achieved: z.number().int().optional(),
  effective_call_target: z.number().int().optional(),
  effective_call_achieved: z.number().int().optional(),
  collection_target: z.number().optional(),
  collection_achieved: z.number().optional(),
  weighted_achievement: z.number().optional(),
  weight_config: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_target_assignmentsUpdateSchema = z.object({
  target_group_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  assigned_to: z.number().int().optional(),
  team_id: z.string().uuid().optional(),
  territory_id: z.string().uuid().optional(),
  assignment_type: z.string().optional(),
  revenue_target: z.number().optional(),
  revenue_achieved: z.number().optional(),
  revenue_achievement_pct: z.number().optional(),
  volume_target: z.number().optional(),
  volume_achieved: z.number().optional(),
  volume_unit: z.string().optional(),
  volume_achievement_pct: z.number().optional(),
  visit_target: z.number().int().optional(),
  visit_achieved: z.number().int().optional(),
  visit_achievement_pct: z.number().optional(),
  new_customer_target: z.number().int().optional(),
  new_customer_achieved: z.number().int().optional(),
  effective_call_target: z.number().int().optional(),
  effective_call_achieved: z.number().int().optional(),
  collection_target: z.number().optional(),
  collection_achieved: z.number().optional(),
  weighted_achievement: z.number().optional(),
  weight_config: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_target_groupsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  group_type: z.string(),
  period_type: z.string().nullish(),
  period: z.string(),
  year: z.number().int(),
  status: z.string().nullish(),
  territory_id: z.string().uuid().nullish(),
  team_id: z.string().uuid().nullish(),
  branch_id: z.string().uuid().nullish(),
  total_target_value: z.number().nullish(),
  total_achieved_value: z.number().nullish(),
  overall_achievement_pct: z.number().nullish(),
  target_metrics: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const sfa_target_groupsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  group_type: z.string().optional(),
  period_type: z.string().optional(),
  period: z.string(),
  year: z.number().int().optional(),
  status: z.string().optional(),
  territory_id: z.string().uuid().optional(),
  team_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  total_target_value: z.number().optional(),
  total_achieved_value: z.number().optional(),
  overall_achievement_pct: z.number().optional(),
  target_metrics: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_target_groupsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  group_type: z.string().optional(),
  period_type: z.string().optional(),
  period: z.string().optional(),
  year: z.number().int().optional(),
  status: z.string().optional(),
  territory_id: z.string().uuid().optional(),
  team_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  total_target_value: z.number().optional(),
  total_achieved_value: z.number().optional(),
  overall_achievement_pct: z.number().optional(),
  target_metrics: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_target_productsSchema = z.object({
  id: z.string().uuid(),
  target_assignment_id: z.string().uuid().nullish(),
  target_group_id: z.string().uuid().nullish(),
  tenant_id: z.string().uuid().nullish(),
  assigned_to: z.number().int().nullish(),
  product_id: z.string().uuid().nullish(),
  product_name: z.string().nullish(),
  product_sku: z.string().nullish(),
  category_id: z.string().uuid().nullish(),
  category_name: z.string().nullish(),
  target_type: z.string().nullish(),
  revenue_target: z.number().nullish(),
  revenue_achieved: z.number().nullish(),
  volume_target: z.number().nullish(),
  volume_achieved: z.number().nullish(),
  volume_unit: z.string().nullish(),
  achievement_pct: z.number().nullish(),
  priority: z.string().nullish(),
  notes: z.string().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const sfa_target_productsCreateSchema = z.object({
  target_assignment_id: z.string().uuid().optional(),
  target_group_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  assigned_to: z.number().int().optional(),
  product_id: z.string().uuid().optional(),
  product_name: z.string().optional(),
  product_sku: z.string().optional(),
  category_id: z.string().uuid().optional(),
  category_name: z.string().optional(),
  target_type: z.string().optional(),
  revenue_target: z.number().optional(),
  revenue_achieved: z.number().optional(),
  volume_target: z.number().optional(),
  volume_achieved: z.number().optional(),
  volume_unit: z.string().optional(),
  achievement_pct: z.number().optional(),
  priority: z.string().optional(),
  notes: z.string().optional()
});

export const sfa_target_productsUpdateSchema = z.object({
  target_assignment_id: z.string().uuid().optional(),
  target_group_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  assigned_to: z.number().int().optional(),
  product_id: z.string().uuid().optional(),
  product_name: z.string().optional(),
  product_sku: z.string().optional(),
  category_id: z.string().uuid().optional(),
  category_name: z.string().optional(),
  target_type: z.string().optional(),
  revenue_target: z.number().optional(),
  revenue_achieved: z.number().optional(),
  volume_target: z.number().optional(),
  volume_achieved: z.number().optional(),
  volume_unit: z.string().optional(),
  achievement_pct: z.number().optional(),
  priority: z.string().optional(),
  notes: z.string().optional()
});

export const sfa_targetsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  branch_id: z.string().uuid().nullish(),
  territory_id: z.string().uuid().nullish(),
  target_type: z.string(),
  period_type: z.string(),
  period: z.string(),
  assigned_to: z.number().int().nullish(),
  assigned_team: z.string().nullish(),
  target_value: z.number(),
  actual_value: z.number().nullish(),
  achievement_pct: z.number().nullish(),
  unit: z.string().nullish(),
  product_category: z.string().nullish(),
  product_id: z.string().uuid().nullish(),
  customer_segment: z.string().nullish(),
  status: z.string().nullish(),
  notes: z.string().nullish(),
  breakdown: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const sfa_targetsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  territory_id: z.string().uuid().optional(),
  target_type: z.string().optional(),
  period_type: z.string().optional(),
  period: z.string(),
  assigned_to: z.number().int().optional(),
  assigned_team: z.string().optional(),
  target_value: z.number().optional(),
  actual_value: z.number().optional(),
  achievement_pct: z.number().optional(),
  unit: z.string().optional(),
  product_category: z.string().optional(),
  product_id: z.string().uuid().optional(),
  customer_segment: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  breakdown: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_targetsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  territory_id: z.string().uuid().optional(),
  target_type: z.string().optional(),
  period_type: z.string().optional(),
  period: z.string().optional(),
  assigned_to: z.number().int().optional(),
  assigned_team: z.string().optional(),
  target_value: z.number().optional(),
  actual_value: z.number().optional(),
  achievement_pct: z.number().optional(),
  unit: z.string().optional(),
  product_category: z.string().optional(),
  product_id: z.string().uuid().optional(),
  customer_segment: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  breakdown: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_tax_settingsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  code: z.string(),
  name: z.string(),
  tax_type: z.string().nullish(),
  rate: z.number().nullish(),
  is_inclusive: z.boolean().nullish(),
  is_compound: z.boolean().nullish(),
  applies_to: z.string().nullish(),
  effective_from: z.coerce.date().nullish(),
  effective_to: z.coerce.date().nullish(),
  is_default: z.boolean().nullish(),
  is_active: z.boolean().nullish(),
  sort_order: z.number().int().nullish(),
  created_by: z.number().int().nullish(),
  updated_by: z.number().int().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const sfa_tax_settingsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string(),
  name: z.string(),
  tax_type: z.string().optional(),
  rate: z.number().optional(),
  is_inclusive: z.boolean().optional(),
  is_compound: z.boolean().optional(),
  applies_to: z.string().optional(),
  effective_from: z.coerce.date().optional(),
  effective_to: z.coerce.date().optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional()
});

export const sfa_tax_settingsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  tax_type: z.string().optional(),
  rate: z.number().optional(),
  is_inclusive: z.boolean().optional(),
  is_compound: z.boolean().optional(),
  applies_to: z.string().optional(),
  effective_from: z.coerce.date().optional(),
  effective_to: z.coerce.date().optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  created_by: z.number().int().optional(),
  updated_by: z.number().int().optional()
});

export const sfa_team_membersSchema = z.object({
  id: z.string().uuid(),
  team_id: z.string().uuid(),
  user_id: z.number().int(),
  role: z.string().nullish(),
  position: z.string().nullish(),
  territory_id: z.string().uuid().nullish(),
  join_date: z.coerce.date().nullish(),
  leave_date: z.coerce.date().nullish(),
  is_active: z.boolean().nullish(),
  daily_visit_target: z.number().int().nullish(),
  monthly_revenue_target: z.number().nullish(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const sfa_team_membersCreateSchema = z.object({
  team_id: z.string().uuid(),
  user_id: z.number().int(),
  role: z.string().optional(),
  position: z.string().optional(),
  territory_id: z.string().uuid().optional(),
  join_date: z.coerce.date().optional(),
  leave_date: z.coerce.date().optional(),
  is_active: z.boolean().optional(),
  daily_visit_target: z.number().int().optional(),
  monthly_revenue_target: z.number().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_team_membersUpdateSchema = z.object({
  team_id: z.string().uuid().optional(),
  user_id: z.number().int().optional(),
  role: z.string().optional(),
  position: z.string().optional(),
  territory_id: z.string().uuid().optional(),
  join_date: z.coerce.date().optional(),
  leave_date: z.coerce.date().optional(),
  is_active: z.boolean().optional(),
  daily_visit_target: z.number().int().optional(),
  monthly_revenue_target: z.number().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_teamsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  team_type: z.string().nullish(),
  territory_id: z.string().uuid().nullish(),
  branch_id: z.string().uuid().nullish(),
  parent_team_id: z.string().uuid().nullish(),
  leader_id: z.number().int().nullish(),
  max_members: z.number().int().nullish(),
  is_active: z.boolean().nullish(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const sfa_teamsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  team_type: z.string().optional(),
  territory_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  parent_team_id: z.string().uuid().optional(),
  leader_id: z.number().int().optional(),
  max_members: z.number().int().optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_teamsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  team_type: z.string().optional(),
  territory_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  parent_team_id: z.string().uuid().optional(),
  leader_id: z.number().int().optional(),
  max_members: z.number().int().optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_territoriesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  parent_id: z.string().uuid().nullish(),
  region: z.string().nullish(),
  city: z.string().nullish(),
  province: z.string().nullish(),
  assigned_manager_id: z.number().int().nullish(),
  geo_boundary: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const sfa_territoriesCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  parent_id: z.string().uuid().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  assigned_manager_id: z.number().int().optional(),
  geo_boundary: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_territoriesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  parent_id: z.string().uuid().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  assigned_manager_id: z.number().int().optional(),
  geo_boundary: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sfa_visitsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid().nullish(),
  branch_id: z.string().uuid().nullish(),
  salesperson_id: z.number().int(),
  lead_id: z.string().uuid().nullish(),
  opportunity_id: z.string().uuid().nullish(),
  customer_id: z.number().int().nullish(),
  customer_name: z.string().nullish(),
  visit_type: z.string().nullish(),
  purpose: z.string().nullish(),
  visit_date: z.coerce.date(),
  check_in_time: z.coerce.date().nullish(),
  check_out_time: z.coerce.date().nullish(),
  check_in_lat: z.number().nullish(),
  check_in_lng: z.number().nullish(),
  check_out_lat: z.number().nullish(),
  check_out_lng: z.number().nullish(),
  check_in_address: z.string().nullish(),
  check_out_address: z.string().nullish(),
  check_in_photo_url: z.string().nullish(),
  check_out_photo_url: z.string().nullish(),
  distance_from_target: z.number().nullish(),
  status: z.string().nullish(),
  outcome: z.string().nullish(),
  outcome_notes: z.string().nullish(),
  order_taken: z.boolean().nullish(),
  order_value: z.number().nullish(),
  products_discussed: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  feedback: z.string().nullish(),
  next_visit_date: z.coerce.date().nullish(),
  duration_minutes: z.number().int().nullish(),
  route_plan_id: z.string().uuid().nullish(),
  is_adhoc: z.boolean().nullish(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish(),
  sfa_competitor_activities: z.string(),
  sfa_display_audits: z.string(),
  sfa_field_orders: z.string(),
  sfa_survey_responses: z.string()
});

export const sfa_visitsCreateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  salesperson_id: z.number().int(),
  lead_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  customer_id: z.number().int().optional(),
  customer_name: z.string().optional(),
  visit_type: z.string().optional(),
  purpose: z.string().optional(),
  visit_date: z.coerce.date(),
  check_in_time: z.coerce.date().optional(),
  check_out_time: z.coerce.date().optional(),
  check_in_lat: z.number().optional(),
  check_in_lng: z.number().optional(),
  check_out_lat: z.number().optional(),
  check_out_lng: z.number().optional(),
  check_in_address: z.string().optional(),
  check_out_address: z.string().optional(),
  check_in_photo_url: z.string().optional(),
  check_out_photo_url: z.string().optional(),
  distance_from_target: z.number().optional(),
  status: z.string().optional(),
  outcome: z.string().optional(),
  outcome_notes: z.string().optional(),
  order_taken: z.boolean().optional(),
  order_value: z.number().optional(),
  products_discussed: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  feedback: z.string().optional(),
  next_visit_date: z.coerce.date().optional(),
  duration_minutes: z.number().int().optional(),
  route_plan_id: z.string().uuid().optional(),
  is_adhoc: z.boolean().optional(),
  sfa_competitor_activities: z.string(),
  sfa_display_audits: z.string(),
  sfa_field_orders: z.string(),
  sfa_survey_responses: z.string()
});

export const sfa_visitsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  salesperson_id: z.number().int().optional(),
  lead_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  customer_id: z.number().int().optional(),
  customer_name: z.string().optional(),
  visit_type: z.string().optional(),
  purpose: z.string().optional(),
  visit_date: z.coerce.date().optional(),
  check_in_time: z.coerce.date().optional(),
  check_out_time: z.coerce.date().optional(),
  check_in_lat: z.number().optional(),
  check_in_lng: z.number().optional(),
  check_out_lat: z.number().optional(),
  check_out_lng: z.number().optional(),
  check_in_address: z.string().optional(),
  check_out_address: z.string().optional(),
  check_in_photo_url: z.string().optional(),
  check_out_photo_url: z.string().optional(),
  distance_from_target: z.number().optional(),
  status: z.string().optional(),
  outcome: z.string().optional(),
  outcome_notes: z.string().optional(),
  order_taken: z.boolean().optional(),
  order_value: z.number().optional(),
  products_discussed: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  feedback: z.string().optional(),
  next_visit_date: z.coerce.date().optional(),
  duration_minutes: z.number().int().optional(),
  route_plan_id: z.string().uuid().optional(),
  is_adhoc: z.boolean().optional(),
  sfa_competitor_activities: z.string().optional(),
  sfa_display_audits: z.string().optional(),
  sfa_field_orders: z.string().optional(),
  sfa_survey_responses: z.string().optional()
});

export const storesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  owner_id: z.number().int().nullish(),
  business_type: z.string().nullish(),
  address: z.string().nullish(),
  city: z.string().nullish(),
  province: z.string().nullish(),
  postal_code: z.string().nullish(),
  phone: z.string().nullish(),
  email: z.string().nullish(),
  is_active: z.boolean().nullish(),
  settings: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const storesCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  owner_id: z.number().int().optional(),
  business_type: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  is_active: z.boolean().optional(),
  settings: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const storesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  owner_id: z.number().int().optional(),
  business_type: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  is_active: z.boolean().optional(),
  settings: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const subscriptionsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  status: z.enum(["trial", "active", "past_due", "cancelled", "expired"]),
  started_at: z.coerce.date(),
  trial_ends_at: z.coerce.date().nullish(),
  current_period_start: z.coerce.date(),
  current_period_end: z.coerce.date(),
  cancel_at_period_end: z.boolean().nullish(),
  cancelled_at: z.coerce.date().nullish(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  billing_cycles: z.string(),
  invoices: z.string()
});

export const subscriptionsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  status: z.enum(["trial", "active", "past_due", "cancelled", "expired"]).optional(),
  started_at: z.coerce.date(),
  trial_ends_at: z.coerce.date().optional(),
  current_period_start: z.coerce.date(),
  current_period_end: z.coerce.date(),
  cancel_at_period_end: z.boolean().optional(),
  cancelled_at: z.coerce.date().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  billing_cycles: z.string(),
  invoices: z.string()
});

export const subscriptionsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  plan_id: z.string().uuid().optional(),
  status: z.enum(["trial", "active", "past_due", "cancelled", "expired"]).optional(),
  started_at: z.coerce.date().optional(),
  trial_ends_at: z.coerce.date().optional(),
  current_period_start: z.coerce.date().optional(),
  current_period_end: z.coerce.date().optional(),
  cancel_at_period_end: z.boolean().optional(),
  cancelled_at: z.coerce.date().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  billing_cycles: z.string().optional(),
  invoices: z.string().optional()
});

export const sync_logsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  branch_id: z.string().uuid().nullish(),
  sync_type: z.enum(["products", "prices", "promotions", "settings", "inventory", "full"]),
  direction: z.enum(["hq_to_branch", "branch_to_hq"]),
  status: z.enum(["pending", "in_progress", "completed", "failed"]).nullish(),
  items_synced: z.number().int().nullish(),
  total_items: z.number().int().nullish(),
  error_message: z.string().nullish(),
  started_at: z.coerce.date().nullish(),
  completed_at: z.coerce.date().nullish(),
  initiated_by: z.number().int().nullish(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const sync_logsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  branch_id: z.string().uuid().optional(),
  sync_type: z.enum(["products", "prices", "promotions", "settings", "inventory", "full"]),
  direction: z.enum(["hq_to_branch", "branch_to_hq"]),
  status: z.enum(["pending", "in_progress", "completed", "failed"]).optional(),
  items_synced: z.number().int().optional(),
  total_items: z.number().int().optional(),
  error_message: z.string().optional(),
  started_at: z.coerce.date().optional(),
  completed_at: z.coerce.date().optional(),
  initiated_by: z.number().int().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const sync_logsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  sync_type: z.enum(["products", "prices", "promotions", "settings", "inventory", "full"]).optional(),
  direction: z.enum(["hq_to_branch", "branch_to_hq"]).optional(),
  status: z.enum(["pending", "in_progress", "completed", "failed"]).optional(),
  items_synced: z.number().int().optional(),
  total_items: z.number().int().optional(),
  error_message: z.string().optional(),
  started_at: z.coerce.date().optional(),
  completed_at: z.coerce.date().optional(),
  initiated_by: z.number().int().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const tenant_dashboardsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  dashboard_config_id: z.string().uuid(),
  customization: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const tenant_dashboardsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  dashboard_config_id: z.string().uuid(),
  customization: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const tenant_dashboardsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  dashboard_config_id: z.string().uuid().optional(),
  customization: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const tenant_modulesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  module_id: z.string().uuid(),
  is_enabled: z.boolean(),
  enabled_at: z.coerce.date().nullish(),
  disabled_at: z.coerce.date().nullish(),
  enabled_by: z.number().int().nullish(),
  configured_at: z.coerce.date().nullish(),
  config_data: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const tenant_modulesCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  module_id: z.string().uuid(),
  is_enabled: z.boolean().optional(),
  enabled_at: z.coerce.date().optional(),
  disabled_at: z.coerce.date().optional(),
  enabled_by: z.number().int().optional(),
  configured_at: z.coerce.date().optional(),
  config_data: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const tenant_modulesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  module_id: z.string().uuid().optional(),
  is_enabled: z.boolean().optional(),
  enabled_at: z.coerce.date().optional(),
  disabled_at: z.coerce.date().optional(),
  enabled_by: z.number().int().optional(),
  configured_at: z.coerce.date().optional(),
  config_data: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const tenant_packagesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  package_id: z.string().uuid(),
  is_active: z.boolean().nullish(),
  activated_at: z.coerce.date().nullish(),
  activated_by: z.number().int().nullish(),
  configuration: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const tenant_packagesCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  package_id: z.string().uuid(),
  is_active: z.boolean().optional(),
  activated_at: z.coerce.date().optional(),
  activated_by: z.number().int().optional(),
  configuration: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const tenant_packagesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  package_id: z.string().uuid().optional(),
  is_active: z.boolean().optional(),
  activated_at: z.coerce.date().optional(),
  activated_by: z.number().int().optional(),
  configuration: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const tenantsSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  business_type: z.string().nullish(),
  status: z.enum(["active", "inactive", "suspended", "trial"]).nullish(),
  subscription_plan: z.string().nullish(),
  subscription_start: z.coerce.date().nullish(),
  subscription_end: z.coerce.date().nullish(),
  max_users: z.number().int().nullish(),
  max_branches: z.number().int().nullish(),
  settings: z.record(z.string(), z.any()).or(z.array(z.any())).nullish()
});

export const tenantsCreateSchema = z.object({
  name: z.string(),
  code: z.string(),
  business_type: z.string().optional(),
  status: z.enum(["active", "inactive", "suspended", "trial"]).optional(),
  subscription_plan: z.string().optional(),
  subscription_start: z.coerce.date().optional(),
  subscription_end: z.coerce.date().optional(),
  max_users: z.number().int().optional(),
  max_branches: z.number().int().optional(),
  settings: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const tenantsUpdateSchema = z.object({
  name: z.string().optional(),
  code: z.string().optional(),
  business_type: z.string().optional(),
  status: z.enum(["active", "inactive", "suspended", "trial"]).optional(),
  subscription_plan: z.string().optional(),
  subscription_start: z.coerce.date().optional(),
  subscription_end: z.coerce.date().optional(),
  max_users: z.number().int().optional(),
  max_branches: z.number().int().optional(),
  settings: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const tms_carrier_ratesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  carrier_id: z.string().uuid(),
  rate_name: z.string(),
  origin_zone: z.string().nullish(),
  destination_zone: z.string().nullish(),
  vehicle_type: z.string().nullish(),
  rate_type: z.string().nullish(),
  base_rate: z.number().nullish(),
  min_charge: z.number().nullish(),
  max_weight_kg: z.number().nullish(),
  overweight_rate: z.number().nullish(),
  effective_from: z.coerce.date().nullish(),
  effective_to: z.coerce.date().nullish(),
  is_active: z.boolean().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const tms_carrier_ratesCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  carrier_id: z.string().uuid(),
  rate_name: z.string(),
  origin_zone: z.string().optional(),
  destination_zone: z.string().optional(),
  vehicle_type: z.string().optional(),
  rate_type: z.string().optional(),
  base_rate: z.number().optional(),
  min_charge: z.number().optional(),
  max_weight_kg: z.number().optional(),
  overweight_rate: z.number().optional(),
  effective_from: z.coerce.date().optional(),
  effective_to: z.coerce.date().optional(),
  is_active: z.boolean().optional()
});

export const tms_carrier_ratesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  carrier_id: z.string().uuid().optional(),
  rate_name: z.string().optional(),
  origin_zone: z.string().optional(),
  destination_zone: z.string().optional(),
  vehicle_type: z.string().optional(),
  rate_type: z.string().optional(),
  base_rate: z.number().optional(),
  min_charge: z.number().optional(),
  max_weight_kg: z.number().optional(),
  overweight_rate: z.number().optional(),
  effective_from: z.coerce.date().optional(),
  effective_to: z.coerce.date().optional(),
  is_active: z.boolean().optional()
});

export const tms_carrier_scoresSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  carrier_id: z.string().uuid(),
  score_period: z.string(),
  total_shipments: z.number().int().nullish(),
  delivered_on_time: z.number().int().nullish(),
  delivered_late: z.number().int().nullish(),
  damaged_shipments: z.number().int().nullish(),
  lost_shipments: z.number().int().nullish(),
  cancelled_shipments: z.number().int().nullish(),
  on_time_rate: z.number().nullish(),
  damage_rate: z.number().nullish(),
  loss_rate: z.number().nullish(),
  avg_delivery_hours: z.number().nullish(),
  total_revenue: z.number().nullish(),
  total_cost: z.number().nullish(),
  overall_score: z.number().nullish(),
  rank: z.number().int().nullish(),
  created_at: z.coerce.date()
});

export const tms_carrier_scoresCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  carrier_id: z.string().uuid(),
  score_period: z.string(),
  total_shipments: z.number().int().optional(),
  delivered_on_time: z.number().int().optional(),
  delivered_late: z.number().int().optional(),
  damaged_shipments: z.number().int().optional(),
  lost_shipments: z.number().int().optional(),
  cancelled_shipments: z.number().int().optional(),
  on_time_rate: z.number().optional(),
  damage_rate: z.number().optional(),
  loss_rate: z.number().optional(),
  avg_delivery_hours: z.number().optional(),
  total_revenue: z.number().optional(),
  total_cost: z.number().optional(),
  overall_score: z.number().optional(),
  rank: z.number().int().optional()
});

export const tms_carrier_scoresUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  carrier_id: z.string().uuid().optional(),
  score_period: z.string().optional(),
  total_shipments: z.number().int().optional(),
  delivered_on_time: z.number().int().optional(),
  delivered_late: z.number().int().optional(),
  damaged_shipments: z.number().int().optional(),
  lost_shipments: z.number().int().optional(),
  cancelled_shipments: z.number().int().optional(),
  on_time_rate: z.number().optional(),
  damage_rate: z.number().optional(),
  loss_rate: z.number().optional(),
  avg_delivery_hours: z.number().optional(),
  total_revenue: z.number().optional(),
  total_cost: z.number().optional(),
  overall_score: z.number().optional(),
  rank: z.number().int().optional()
});

export const tms_carriersSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  carrier_code: z.string(),
  carrier_name: z.string(),
  carrier_type: z.string().nullish(),
  contact_person: z.string().nullish(),
  phone: z.string().nullish(),
  email: z.string().nullish(),
  address: z.string().nullish(),
  npwp: z.string().nullish(),
  license_number: z.string().nullish(),
  license_expiry: z.coerce.date().nullish(),
  service_areas: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  vehicle_types: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  rating: z.number().nullish(),
  completed_shipments: z.number().int().nullish(),
  on_time_rate: z.number().nullish(),
  payment_terms: z.string().nullish(),
  bank_name: z.string().nullish(),
  bank_account: z.string().nullish(),
  bank_holder: z.string().nullish(),
  is_active: z.boolean().nullish(),
  notes: z.string().nullish(),
  created_by: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const tms_carriersCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  carrier_code: z.string(),
  carrier_name: z.string(),
  carrier_type: z.string().optional(),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  npwp: z.string().optional(),
  license_number: z.string().optional(),
  license_expiry: z.coerce.date().optional(),
  service_areas: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  vehicle_types: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  rating: z.number().optional(),
  completed_shipments: z.number().int().optional(),
  on_time_rate: z.number().optional(),
  payment_terms: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  bank_holder: z.string().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().optional(),
  created_by: z.string().optional()
});

export const tms_carriersUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  carrier_code: z.string().optional(),
  carrier_name: z.string().optional(),
  carrier_type: z.string().optional(),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  npwp: z.string().optional(),
  license_number: z.string().optional(),
  license_expiry: z.coerce.date().optional(),
  service_areas: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  vehicle_types: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  rating: z.number().optional(),
  completed_shipments: z.number().int().optional(),
  on_time_rate: z.number().optional(),
  payment_terms: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  bank_holder: z.string().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().optional(),
  created_by: z.string().optional()
});

export const tms_customer_addressesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  customer_name: z.string(),
  customer_phone: z.string().nullish(),
  customer_email: z.string().nullish(),
  company_name: z.string().nullish(),
  address_type: z.string().nullish(),
  address_label: z.string().nullish(),
  address: z.string().nullish(),
  city: z.string().nullish(),
  province: z.string().nullish(),
  postal_code: z.string().nullish(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
  zone_id: z.string().uuid().nullish(),
  contact_person: z.string().nullish(),
  contact_phone: z.string().nullish(),
  special_instructions: z.string().nullish(),
  is_default: z.boolean().nullish(),
  is_active: z.boolean().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const tms_customer_addressesCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  customer_name: z.string(),
  customer_phone: z.string().optional(),
  customer_email: z.string().optional(),
  company_name: z.string().optional(),
  address_type: z.string().optional(),
  address_label: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  zone_id: z.string().uuid().optional(),
  contact_person: z.string().optional(),
  contact_phone: z.string().optional(),
  special_instructions: z.string().optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional()
});

export const tms_customer_addressesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  customer_email: z.string().optional(),
  company_name: z.string().optional(),
  address_type: z.string().optional(),
  address_label: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postal_code: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  zone_id: z.string().uuid().optional(),
  contact_person: z.string().optional(),
  contact_phone: z.string().optional(),
  special_instructions: z.string().optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional()
});

export const tms_delivery_slasSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  sla_name: z.string(),
  sla_type: z.string().nullish(),
  origin_zone_id: z.string().uuid().nullish(),
  destination_zone_id: z.string().uuid().nullish(),
  service_type: z.string().nullish(),
  max_delivery_hours: z.number().int().nullish(),
  max_delivery_days: z.number().int().nullish(),
  penalty_per_hour_late: z.number().nullish(),
  penalty_per_day_late: z.number().nullish(),
  max_damage_rate_pct: z.number().nullish(),
  max_loss_rate_pct: z.number().nullish(),
  is_active: z.boolean().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const tms_delivery_slasCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  sla_name: z.string(),
  sla_type: z.string().optional(),
  origin_zone_id: z.string().uuid().optional(),
  destination_zone_id: z.string().uuid().optional(),
  service_type: z.string().optional(),
  max_delivery_hours: z.number().int().optional(),
  max_delivery_days: z.number().int().optional(),
  penalty_per_hour_late: z.number().optional(),
  penalty_per_day_late: z.number().optional(),
  max_damage_rate_pct: z.number().optional(),
  max_loss_rate_pct: z.number().optional(),
  is_active: z.boolean().optional()
});

export const tms_delivery_slasUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  sla_name: z.string().optional(),
  sla_type: z.string().optional(),
  origin_zone_id: z.string().uuid().optional(),
  destination_zone_id: z.string().uuid().optional(),
  service_type: z.string().optional(),
  max_delivery_hours: z.number().int().optional(),
  max_delivery_days: z.number().int().optional(),
  penalty_per_hour_late: z.number().optional(),
  penalty_per_day_late: z.number().optional(),
  max_damage_rate_pct: z.number().optional(),
  max_loss_rate_pct: z.number().optional(),
  is_active: z.boolean().optional()
});

export const tms_freight_bill_itemsSchema = z.object({
  id: z.string().uuid(),
  bill_id: z.string().uuid(),
  shipment_id: z.string().uuid().nullish(),
  trip_id: z.string().uuid().nullish(),
  description: z.string(),
  quantity: z.number().nullish(),
  unit: z.string().nullish(),
  rate: z.number().nullish(),
  amount: z.number().nullish(),
  created_at: z.coerce.date()
});

export const tms_freight_bill_itemsCreateSchema = z.object({
  bill_id: z.string().uuid(),
  shipment_id: z.string().uuid().optional(),
  trip_id: z.string().uuid().optional(),
  description: z.string(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  rate: z.number().optional(),
  amount: z.number().optional()
});

export const tms_freight_bill_itemsUpdateSchema = z.object({
  bill_id: z.string().uuid().optional(),
  shipment_id: z.string().uuid().optional(),
  trip_id: z.string().uuid().optional(),
  description: z.string().optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  rate: z.number().optional(),
  amount: z.number().optional()
});

export const tms_freight_billsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  bill_number: z.string(),
  bill_type: z.string().nullish(),
  bill_date: z.coerce.date(),
  due_date: z.coerce.date().nullish(),
  customer_name: z.string().nullish(),
  carrier_name: z.string().nullish(),
  carrier_id: z.string().uuid().nullish(),
  period_from: z.coerce.date().nullish(),
  period_to: z.coerce.date().nullish(),
  subtotal: z.number().nullish(),
  tax_amount: z.number().nullish(),
  discount_amount: z.number().nullish(),
  total_amount: z.number().nullish(),
  paid_amount: z.number().nullish(),
  balance: z.number().nullish(),
  currency: z.string().nullish(),
  payment_status: z.string().nullish(),
  status: z.string().nullish(),
  notes: z.string().nullish(),
  created_by: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const tms_freight_billsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  bill_number: z.string(),
  bill_type: z.string().optional(),
  bill_date: z.coerce.date().optional(),
  due_date: z.coerce.date().optional(),
  customer_name: z.string().optional(),
  carrier_name: z.string().optional(),
  carrier_id: z.string().uuid().optional(),
  period_from: z.coerce.date().optional(),
  period_to: z.coerce.date().optional(),
  subtotal: z.number().optional(),
  tax_amount: z.number().optional(),
  discount_amount: z.number().optional(),
  total_amount: z.number().optional(),
  paid_amount: z.number().optional(),
  balance: z.number().optional(),
  currency: z.string().optional(),
  payment_status: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  created_by: z.string().optional()
});

export const tms_freight_billsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  bill_number: z.string().optional(),
  bill_type: z.string().optional(),
  bill_date: z.coerce.date().optional(),
  due_date: z.coerce.date().optional(),
  customer_name: z.string().optional(),
  carrier_name: z.string().optional(),
  carrier_id: z.string().uuid().optional(),
  period_from: z.coerce.date().optional(),
  period_to: z.coerce.date().optional(),
  subtotal: z.number().optional(),
  tax_amount: z.number().optional(),
  discount_amount: z.number().optional(),
  total_amount: z.number().optional(),
  paid_amount: z.number().optional(),
  balance: z.number().optional(),
  currency: z.string().optional(),
  payment_status: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  created_by: z.string().optional()
});

export const tms_logistics_kpiSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  kpi_date: z.coerce.date(),
  total_shipments: z.number().int().nullish(),
  delivered_shipments: z.number().int().nullish(),
  pending_shipments: z.number().int().nullish(),
  cancelled_shipments: z.number().int().nullish(),
  on_time_delivery_rate: z.number().nullish(),
  avg_delivery_time_hours: z.number().nullish(),
  total_weight_kg: z.number().nullish(),
  total_volume_m3: z.number().nullish(),
  total_revenue: z.number().nullish(),
  total_cost: z.number().nullish(),
  profit_margin_pct: z.number().nullish(),
  cost_per_kg: z.number().nullish(),
  cost_per_shipment: z.number().nullish(),
  total_trips: z.number().int().nullish(),
  total_distance_km: z.number().nullish(),
  fuel_cost: z.number().nullish(),
  toll_cost: z.number().nullish(),
  pod_completion_rate: z.number().nullish(),
  customer_complaint_count: z.number().int().nullish(),
  created_at: z.coerce.date()
});

export const tms_logistics_kpiCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  kpi_date: z.coerce.date(),
  total_shipments: z.number().int().optional(),
  delivered_shipments: z.number().int().optional(),
  pending_shipments: z.number().int().optional(),
  cancelled_shipments: z.number().int().optional(),
  on_time_delivery_rate: z.number().optional(),
  avg_delivery_time_hours: z.number().optional(),
  total_weight_kg: z.number().optional(),
  total_volume_m3: z.number().optional(),
  total_revenue: z.number().optional(),
  total_cost: z.number().optional(),
  profit_margin_pct: z.number().optional(),
  cost_per_kg: z.number().optional(),
  cost_per_shipment: z.number().optional(),
  total_trips: z.number().int().optional(),
  total_distance_km: z.number().optional(),
  fuel_cost: z.number().optional(),
  toll_cost: z.number().optional(),
  pod_completion_rate: z.number().optional(),
  customer_complaint_count: z.number().int().optional()
});

export const tms_logistics_kpiUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  kpi_date: z.coerce.date().optional(),
  total_shipments: z.number().int().optional(),
  delivered_shipments: z.number().int().optional(),
  pending_shipments: z.number().int().optional(),
  cancelled_shipments: z.number().int().optional(),
  on_time_delivery_rate: z.number().optional(),
  avg_delivery_time_hours: z.number().optional(),
  total_weight_kg: z.number().optional(),
  total_volume_m3: z.number().optional(),
  total_revenue: z.number().optional(),
  total_cost: z.number().optional(),
  profit_margin_pct: z.number().optional(),
  cost_per_kg: z.number().optional(),
  cost_per_shipment: z.number().optional(),
  total_trips: z.number().int().optional(),
  total_distance_km: z.number().optional(),
  fuel_cost: z.number().optional(),
  toll_cost: z.number().optional(),
  pod_completion_rate: z.number().optional(),
  customer_complaint_count: z.number().int().optional()
});

export const tms_proof_of_deliverySchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  shipment_id: z.string().uuid(),
  trip_id: z.string().uuid().nullish(),
  pod_number: z.string().nullish(),
  received_by: z.string().nullish(),
  receiver_title: z.string().nullish(),
  received_at: z.coerce.date().nullish(),
  signature_url: z.string().nullish(),
  photos: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  condition: z.string().nullish(),
  items_received: z.number().int().nullish(),
  items_damaged: z.number().int().nullish(),
  items_missing: z.number().int().nullish(),
  damage_description: z.string().nullish(),
  receiver_notes: z.string().nullish(),
  driver_notes: z.string().nullish(),
  status: z.string().nullish(),
  created_by: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const tms_proof_of_deliveryCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  shipment_id: z.string().uuid(),
  trip_id: z.string().uuid().optional(),
  pod_number: z.string().optional(),
  received_by: z.string().optional(),
  receiver_title: z.string().optional(),
  received_at: z.coerce.date().optional(),
  signature_url: z.string().optional(),
  photos: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  condition: z.string().optional(),
  items_received: z.number().int().optional(),
  items_damaged: z.number().int().optional(),
  items_missing: z.number().int().optional(),
  damage_description: z.string().optional(),
  receiver_notes: z.string().optional(),
  driver_notes: z.string().optional(),
  status: z.string().optional(),
  created_by: z.string().optional()
});

export const tms_proof_of_deliveryUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  shipment_id: z.string().uuid().optional(),
  trip_id: z.string().uuid().optional(),
  pod_number: z.string().optional(),
  received_by: z.string().optional(),
  receiver_title: z.string().optional(),
  received_at: z.coerce.date().optional(),
  signature_url: z.string().optional(),
  photos: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  condition: z.string().optional(),
  items_received: z.number().int().optional(),
  items_damaged: z.number().int().optional(),
  items_missing: z.number().int().optional(),
  damage_description: z.string().optional(),
  receiver_notes: z.string().optional(),
  driver_notes: z.string().optional(),
  status: z.string().optional(),
  created_by: z.string().optional()
});

export const tms_rate_cardsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  rate_name: z.string(),
  origin_zone_id: z.string().uuid().nullish(),
  destination_zone_id: z.string().uuid().nullish(),
  service_type: z.string().nullish(),
  vehicle_type: z.string().nullish(),
  rate_type: z.string().nullish(),
  min_weight_kg: z.number().nullish(),
  max_weight_kg: z.number().nullish(),
  base_rate: z.number().nullish(),
  per_unit_rate: z.number().nullish(),
  min_charge: z.number().nullish(),
  surcharge_pct: z.number().nullish(),
  effective_from: z.coerce.date().nullish(),
  effective_to: z.coerce.date().nullish(),
  is_active: z.boolean().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const tms_rate_cardsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  rate_name: z.string(),
  origin_zone_id: z.string().uuid().optional(),
  destination_zone_id: z.string().uuid().optional(),
  service_type: z.string().optional(),
  vehicle_type: z.string().optional(),
  rate_type: z.string().optional(),
  min_weight_kg: z.number().optional(),
  max_weight_kg: z.number().optional(),
  base_rate: z.number().optional(),
  per_unit_rate: z.number().optional(),
  min_charge: z.number().optional(),
  surcharge_pct: z.number().optional(),
  effective_from: z.coerce.date().optional(),
  effective_to: z.coerce.date().optional(),
  is_active: z.boolean().optional()
});

export const tms_rate_cardsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  rate_name: z.string().optional(),
  origin_zone_id: z.string().uuid().optional(),
  destination_zone_id: z.string().uuid().optional(),
  service_type: z.string().optional(),
  vehicle_type: z.string().optional(),
  rate_type: z.string().optional(),
  min_weight_kg: z.number().optional(),
  max_weight_kg: z.number().optional(),
  base_rate: z.number().optional(),
  per_unit_rate: z.number().optional(),
  min_charge: z.number().optional(),
  surcharge_pct: z.number().optional(),
  effective_from: z.coerce.date().optional(),
  effective_to: z.coerce.date().optional(),
  is_active: z.boolean().optional()
});

export const tms_routesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  route_code: z.string(),
  route_name: z.string(),
  origin_name: z.string().nullish(),
  origin_address: z.string().nullish(),
  origin_lat: z.number().nullish(),
  origin_lng: z.number().nullish(),
  destination_name: z.string().nullish(),
  destination_address: z.string().nullish(),
  destination_lat: z.number().nullish(),
  destination_lng: z.number().nullish(),
  distance_km: z.number().nullish(),
  estimated_duration_hours: z.number().nullish(),
  toll_cost: z.number().nullish(),
  fuel_estimate: z.number().nullish(),
  route_type: z.string().nullish(),
  waypoints: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  is_active: z.boolean().nullish(),
  created_by: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const tms_routesCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  route_code: z.string(),
  route_name: z.string(),
  origin_name: z.string().optional(),
  origin_address: z.string().optional(),
  origin_lat: z.number().optional(),
  origin_lng: z.number().optional(),
  destination_name: z.string().optional(),
  destination_address: z.string().optional(),
  destination_lat: z.number().optional(),
  destination_lng: z.number().optional(),
  distance_km: z.number().optional(),
  estimated_duration_hours: z.number().optional(),
  toll_cost: z.number().optional(),
  fuel_estimate: z.number().optional(),
  route_type: z.string().optional(),
  waypoints: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  is_active: z.boolean().optional(),
  created_by: z.string().optional()
});

export const tms_routesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  route_code: z.string().optional(),
  route_name: z.string().optional(),
  origin_name: z.string().optional(),
  origin_address: z.string().optional(),
  origin_lat: z.number().optional(),
  origin_lng: z.number().optional(),
  destination_name: z.string().optional(),
  destination_address: z.string().optional(),
  destination_lat: z.number().optional(),
  destination_lng: z.number().optional(),
  distance_km: z.number().optional(),
  estimated_duration_hours: z.number().optional(),
  toll_cost: z.number().optional(),
  fuel_estimate: z.number().optional(),
  route_type: z.string().optional(),
  waypoints: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  is_active: z.boolean().optional(),
  created_by: z.string().optional()
});

export const tms_settingsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  setting_key: z.string(),
  setting_value: z.string().nullish(),
  setting_type: z.string().nullish(),
  category: z.string().nullish(),
  label: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const tms_settingsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  setting_key: z.string(),
  setting_value: z.string().optional(),
  setting_type: z.string().optional(),
  category: z.string().optional(),
  label: z.string().optional()
});

export const tms_settingsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  setting_key: z.string().optional(),
  setting_value: z.string().optional(),
  setting_type: z.string().optional(),
  category: z.string().optional(),
  label: z.string().optional()
});

export const tms_shipment_itemsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  shipment_id: z.string().uuid(),
  item_number: z.number().int().nullish(),
  description: z.string(),
  sku: z.string().nullish(),
  quantity: z.number().int().nullish(),
  weight_kg: z.number().nullish(),
  volume_m3: z.number().nullish(),
  length_cm: z.number().nullish(),
  width_cm: z.number().nullish(),
  height_cm: z.number().nullish(),
  unit_value: z.number().nullish(),
  total_value: z.number().nullish(),
  packaging_type: z.string().nullish(),
  is_fragile: z.boolean().nullish(),
  is_hazardous: z.boolean().nullish(),
  notes: z.string().nullish(),
  created_at: z.coerce.date()
});

export const tms_shipment_itemsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  shipment_id: z.string().uuid(),
  item_number: z.number().int().optional(),
  description: z.string(),
  sku: z.string().optional(),
  quantity: z.number().int().optional(),
  weight_kg: z.number().optional(),
  volume_m3: z.number().optional(),
  length_cm: z.number().optional(),
  width_cm: z.number().optional(),
  height_cm: z.number().optional(),
  unit_value: z.number().optional(),
  total_value: z.number().optional(),
  packaging_type: z.string().optional(),
  is_fragile: z.boolean().optional(),
  is_hazardous: z.boolean().optional(),
  notes: z.string().optional()
});

export const tms_shipment_itemsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  shipment_id: z.string().uuid().optional(),
  item_number: z.number().int().optional(),
  description: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.number().int().optional(),
  weight_kg: z.number().optional(),
  volume_m3: z.number().optional(),
  length_cm: z.number().optional(),
  width_cm: z.number().optional(),
  height_cm: z.number().optional(),
  unit_value: z.number().optional(),
  total_value: z.number().optional(),
  packaging_type: z.string().optional(),
  is_fragile: z.boolean().optional(),
  is_hazardous: z.boolean().optional(),
  notes: z.string().optional()
});

export const tms_shipment_trackingSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  shipment_id: z.string().uuid(),
  status: z.string(),
  location: z.string().nullish(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
  description: z.string().nullish(),
  performed_by: z.string().nullish(),
  photo_url: z.string().nullish(),
  is_customer_visible: z.boolean().nullish(),
  created_at: z.coerce.date()
});

export const tms_shipment_trackingCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  shipment_id: z.string().uuid(),
  status: z.string(),
  location: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  description: z.string().optional(),
  performed_by: z.string().optional(),
  photo_url: z.string().optional(),
  is_customer_visible: z.boolean().optional()
});

export const tms_shipment_trackingUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  shipment_id: z.string().uuid().optional(),
  status: z.string().optional(),
  location: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  description: z.string().optional(),
  performed_by: z.string().optional(),
  photo_url: z.string().optional(),
  is_customer_visible: z.boolean().optional()
});

export const tms_shipmentsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  shipment_number: z.string(),
  shipment_type: z.string().nullish(),
  order_date: z.coerce.date(),
  required_delivery_date: z.coerce.date().nullish(),
  actual_delivery_date: z.coerce.date().nullish(),
  shipper_name: z.string().nullish(),
  shipper_phone: z.string().nullish(),
  shipper_address: z.string().nullish(),
  consignee_name: z.string().nullish(),
  consignee_phone: z.string().nullish(),
  consignee_address: z.string().nullish(),
  origin_name: z.string().nullish(),
  origin_address: z.string().nullish(),
  origin_lat: z.number().nullish(),
  origin_lng: z.number().nullish(),
  destination_name: z.string().nullish(),
  destination_address: z.string().nullish(),
  destination_lat: z.number().nullish(),
  destination_lng: z.number().nullish(),
  total_weight_kg: z.number().nullish(),
  total_volume_m3: z.number().nullish(),
  total_pieces: z.number().int().nullish(),
  goods_description: z.string().nullish(),
  goods_value: z.number().nullish(),
  is_fragile: z.boolean().nullish(),
  is_hazardous: z.boolean().nullish(),
  temperature_controlled: z.boolean().nullish(),
  min_temp: z.number().nullish(),
  max_temp: z.number().nullish(),
  carrier_id: z.string().uuid().nullish(),
  route_id: z.string().uuid().nullish(),
  vehicle_id: z.string().uuid().nullish(),
  driver_id: z.string().uuid().nullish(),
  freight_charge: z.number().nullish(),
  insurance_charge: z.number().nullish(),
  handling_charge: z.number().nullish(),
  other_charges: z.number().nullish(),
  tax_amount: z.number().nullish(),
  discount_amount: z.number().nullish(),
  total_charge: z.number().nullish(),
  payment_status: z.string().nullish(),
  payment_method: z.string().nullish(),
  priority: z.string().nullish(),
  status: z.string().nullish(),
  tracking_url: z.string().nullish(),
  special_instructions: z.string().nullish(),
  internal_notes: z.string().nullish(),
  created_by: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const tms_shipmentsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  shipment_number: z.string(),
  shipment_type: z.string().optional(),
  order_date: z.coerce.date().optional(),
  required_delivery_date: z.coerce.date().optional(),
  actual_delivery_date: z.coerce.date().optional(),
  shipper_name: z.string().optional(),
  shipper_phone: z.string().optional(),
  shipper_address: z.string().optional(),
  consignee_name: z.string().optional(),
  consignee_phone: z.string().optional(),
  consignee_address: z.string().optional(),
  origin_name: z.string().optional(),
  origin_address: z.string().optional(),
  origin_lat: z.number().optional(),
  origin_lng: z.number().optional(),
  destination_name: z.string().optional(),
  destination_address: z.string().optional(),
  destination_lat: z.number().optional(),
  destination_lng: z.number().optional(),
  total_weight_kg: z.number().optional(),
  total_volume_m3: z.number().optional(),
  total_pieces: z.number().int().optional(),
  goods_description: z.string().optional(),
  goods_value: z.number().optional(),
  is_fragile: z.boolean().optional(),
  is_hazardous: z.boolean().optional(),
  temperature_controlled: z.boolean().optional(),
  min_temp: z.number().optional(),
  max_temp: z.number().optional(),
  carrier_id: z.string().uuid().optional(),
  route_id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  freight_charge: z.number().optional(),
  insurance_charge: z.number().optional(),
  handling_charge: z.number().optional(),
  other_charges: z.number().optional(),
  tax_amount: z.number().optional(),
  discount_amount: z.number().optional(),
  total_charge: z.number().optional(),
  payment_status: z.string().optional(),
  payment_method: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  tracking_url: z.string().optional(),
  special_instructions: z.string().optional(),
  internal_notes: z.string().optional(),
  created_by: z.string().optional()
});

export const tms_shipmentsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  shipment_number: z.string().optional(),
  shipment_type: z.string().optional(),
  order_date: z.coerce.date().optional(),
  required_delivery_date: z.coerce.date().optional(),
  actual_delivery_date: z.coerce.date().optional(),
  shipper_name: z.string().optional(),
  shipper_phone: z.string().optional(),
  shipper_address: z.string().optional(),
  consignee_name: z.string().optional(),
  consignee_phone: z.string().optional(),
  consignee_address: z.string().optional(),
  origin_name: z.string().optional(),
  origin_address: z.string().optional(),
  origin_lat: z.number().optional(),
  origin_lng: z.number().optional(),
  destination_name: z.string().optional(),
  destination_address: z.string().optional(),
  destination_lat: z.number().optional(),
  destination_lng: z.number().optional(),
  total_weight_kg: z.number().optional(),
  total_volume_m3: z.number().optional(),
  total_pieces: z.number().int().optional(),
  goods_description: z.string().optional(),
  goods_value: z.number().optional(),
  is_fragile: z.boolean().optional(),
  is_hazardous: z.boolean().optional(),
  temperature_controlled: z.boolean().optional(),
  min_temp: z.number().optional(),
  max_temp: z.number().optional(),
  carrier_id: z.string().uuid().optional(),
  route_id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  freight_charge: z.number().optional(),
  insurance_charge: z.number().optional(),
  handling_charge: z.number().optional(),
  other_charges: z.number().optional(),
  tax_amount: z.number().optional(),
  discount_amount: z.number().optional(),
  total_charge: z.number().optional(),
  payment_status: z.string().optional(),
  payment_method: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  tracking_url: z.string().optional(),
  special_instructions: z.string().optional(),
  internal_notes: z.string().optional(),
  created_by: z.string().optional()
});

export const tms_trip_eventsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  trip_id: z.string().uuid(),
  event_type: z.string(),
  event_time: z.coerce.date(),
  location: z.string().nullish(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
  description: z.string().nullish(),
  photo_url: z.string().nullish(),
  created_by: z.string().nullish(),
  created_at: z.coerce.date()
});

export const tms_trip_eventsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  trip_id: z.string().uuid(),
  event_type: z.string(),
  event_time: z.coerce.date(),
  location: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  description: z.string().optional(),
  photo_url: z.string().optional(),
  created_by: z.string().optional()
});

export const tms_trip_eventsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  trip_id: z.string().uuid().optional(),
  event_type: z.string().optional(),
  event_time: z.coerce.date().optional(),
  location: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  description: z.string().optional(),
  photo_url: z.string().optional(),
  created_by: z.string().optional()
});

export const tms_trip_shipmentsSchema = z.object({
  id: z.string().uuid(),
  trip_id: z.string().uuid(),
  shipment_id: z.string().uuid(),
  stop_sequence: z.number().int().nullish(),
  planned_arrival: z.coerce.date().nullish(),
  actual_arrival: z.coerce.date().nullish(),
  status: z.string().nullish(),
  failure_reason: z.string().nullish(),
  notes: z.string().nullish(),
  created_at: z.coerce.date()
});

export const tms_trip_shipmentsCreateSchema = z.object({
  trip_id: z.string().uuid(),
  shipment_id: z.string().uuid(),
  stop_sequence: z.number().int().optional(),
  planned_arrival: z.coerce.date().optional(),
  actual_arrival: z.coerce.date().optional(),
  status: z.string().optional(),
  failure_reason: z.string().optional(),
  notes: z.string().optional()
});

export const tms_trip_shipmentsUpdateSchema = z.object({
  trip_id: z.string().uuid().optional(),
  shipment_id: z.string().uuid().optional(),
  stop_sequence: z.number().int().optional(),
  planned_arrival: z.coerce.date().optional(),
  actual_arrival: z.coerce.date().optional(),
  status: z.string().optional(),
  failure_reason: z.string().optional(),
  notes: z.string().optional()
});

export const tms_tripsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  trip_number: z.string(),
  trip_type: z.string().nullish(),
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  helper_driver_id: z.string().uuid().nullish(),
  route_id: z.string().uuid().nullish(),
  carrier_id: z.string().uuid().nullish(),
  planned_start: z.coerce.date().nullish(),
  planned_end: z.coerce.date().nullish(),
  actual_start: z.coerce.date().nullish(),
  actual_end: z.coerce.date().nullish(),
  start_odometer: z.number().nullish(),
  end_odometer: z.number().nullish(),
  total_distance_km: z.number().nullish(),
  start_location: z.string().nullish(),
  end_location: z.string().nullish(),
  start_lat: z.number().nullish(),
  start_lng: z.number().nullish(),
  end_lat: z.number().nullish(),
  end_lng: z.number().nullish(),
  fuel_used_liters: z.number().nullish(),
  fuel_cost: z.number().nullish(),
  toll_cost: z.number().nullish(),
  parking_cost: z.number().nullish(),
  meal_allowance: z.number().nullish(),
  other_expense: z.number().nullish(),
  total_expense: z.number().nullish(),
  total_shipments: z.number().int().nullish(),
  delivered_shipments: z.number().int().nullish(),
  failed_shipments: z.number().int().nullish(),
  status: z.string().nullish(),
  notes: z.string().nullish(),
  created_by: z.string().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const tms_tripsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  trip_number: z.string(),
  trip_type: z.string().optional(),
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  helper_driver_id: z.string().uuid().optional(),
  route_id: z.string().uuid().optional(),
  carrier_id: z.string().uuid().optional(),
  planned_start: z.coerce.date().optional(),
  planned_end: z.coerce.date().optional(),
  actual_start: z.coerce.date().optional(),
  actual_end: z.coerce.date().optional(),
  start_odometer: z.number().optional(),
  end_odometer: z.number().optional(),
  total_distance_km: z.number().optional(),
  start_location: z.string().optional(),
  end_location: z.string().optional(),
  start_lat: z.number().optional(),
  start_lng: z.number().optional(),
  end_lat: z.number().optional(),
  end_lng: z.number().optional(),
  fuel_used_liters: z.number().optional(),
  fuel_cost: z.number().optional(),
  toll_cost: z.number().optional(),
  parking_cost: z.number().optional(),
  meal_allowance: z.number().optional(),
  other_expense: z.number().optional(),
  total_expense: z.number().optional(),
  total_shipments: z.number().int().optional(),
  delivered_shipments: z.number().int().optional(),
  failed_shipments: z.number().int().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  created_by: z.string().optional()
});

export const tms_tripsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  trip_number: z.string().optional(),
  trip_type: z.string().optional(),
  vehicle_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
  helper_driver_id: z.string().uuid().optional(),
  route_id: z.string().uuid().optional(),
  carrier_id: z.string().uuid().optional(),
  planned_start: z.coerce.date().optional(),
  planned_end: z.coerce.date().optional(),
  actual_start: z.coerce.date().optional(),
  actual_end: z.coerce.date().optional(),
  start_odometer: z.number().optional(),
  end_odometer: z.number().optional(),
  total_distance_km: z.number().optional(),
  start_location: z.string().optional(),
  end_location: z.string().optional(),
  start_lat: z.number().optional(),
  start_lng: z.number().optional(),
  end_lat: z.number().optional(),
  end_lng: z.number().optional(),
  fuel_used_liters: z.number().optional(),
  fuel_cost: z.number().optional(),
  toll_cost: z.number().optional(),
  parking_cost: z.number().optional(),
  meal_allowance: z.number().optional(),
  other_expense: z.number().optional(),
  total_expense: z.number().optional(),
  total_shipments: z.number().int().optional(),
  delivered_shipments: z.number().int().optional(),
  failed_shipments: z.number().int().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  created_by: z.string().optional()
});

export const tms_warehousesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  warehouse_code: z.string(),
  warehouse_name: z.string(),
  warehouse_type: z.string().nullish(),
  address: z.string().nullish(),
  city: z.string().nullish(),
  province: z.string().nullish(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
  contact_person: z.string().nullish(),
  phone: z.string().nullish(),
  capacity_m3: z.number().nullish(),
  capacity_pallets: z.number().int().nullish(),
  operating_hours: z.string().nullish(),
  is_active: z.boolean().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const tms_warehousesCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  warehouse_code: z.string(),
  warehouse_name: z.string(),
  warehouse_type: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  capacity_m3: z.number().optional(),
  capacity_pallets: z.number().int().optional(),
  operating_hours: z.string().optional(),
  is_active: z.boolean().optional()
});

export const tms_warehousesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  warehouse_code: z.string().optional(),
  warehouse_name: z.string().optional(),
  warehouse_type: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  capacity_m3: z.number().optional(),
  capacity_pallets: z.number().int().optional(),
  operating_hours: z.string().optional(),
  is_active: z.boolean().optional()
});

export const tms_zonesSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  zone_code: z.string(),
  zone_name: z.string(),
  zone_type: z.string().nullish(),
  parent_zone_id: z.string().uuid().nullish(),
  provinces: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  cities: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  postal_codes: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  is_active: z.boolean().nullish(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const tms_zonesCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  zone_code: z.string(),
  zone_name: z.string(),
  zone_type: z.string().optional(),
  parent_zone_id: z.string().uuid().optional(),
  provinces: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  cities: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  postal_codes: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  is_active: z.boolean().optional()
});

export const tms_zonesUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  zone_code: z.string().optional(),
  zone_name: z.string().optional(),
  zone_type: z.string().optional(),
  parent_zone_id: z.string().uuid().optional(),
  provinces: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  cities: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  postal_codes: z.record(z.string(), z.any()).or(z.array(z.any())).optional(),
  is_active: z.boolean().optional()
});

export const usage_metricsSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  metric_name: z.string(),
  metric_value: z.number(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  source: z.string().nullish(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).nullish(),
  created_at: z.coerce.date()
});

export const usage_metricsCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  metric_name: z.string(),
  metric_value: z.number(),
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  source: z.string().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const usage_metricsUpdateSchema = z.object({
  tenant_id: z.string().uuid().optional(),
  metric_name: z.string().optional(),
  metric_value: z.number().optional(),
  period_start: z.coerce.date().optional(),
  period_end: z.coerce.date().optional(),
  source: z.string().optional(),
  metadata: z.record(z.string(), z.any()).or(z.array(z.any())).optional()
});

export const user_preferencesSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  key: z.string(),
  value: z.string(),
  created_at: z.coerce.date().nullish(),
  updated_at: z.coerce.date().nullish()
});

export const user_preferencesCreateSchema = z.object({
  user_id: z.string().uuid(),
  key: z.string(),
  value: z.string()
});

export const user_preferencesUpdateSchema = z.object({
  user_id: z.string().uuid().optional(),
  key: z.string().optional(),
  value: z.string().optional()
});

export const usersSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullish(),
  businessName: z.string().nullish(),
  password: z.string(),
  role: z.string().nullish(),
  isActive: z.boolean().nullish(),
  lastLogin: z.coerce.date().nullish(),
  createdAt: z.coerce.date().nullish(),
  updatedAt: z.coerce.date().nullish(),
  tenant_id: z.string().uuid().nullish(),
  assigned_branch_id: z.string().uuid().nullish(),
  data_scope: z.string().nullish(),
  role_id: z.string().uuid().nullish(),
  branches: z.string(),
  employees: z.string(),
  kyb_applications: z.string(),
  sfa_achievements: z.string(),
  sfa_approval_requests: z.string(),
  sfa_competitor_activities: z.string(),
  sfa_coverage_assignments: z.string(),
  sfa_display_audits: z.string(),
  sfa_field_orders: z.string(),
  sfa_incentive_calculations: z.string(),
  sfa_plafon: z.string(),
  sfa_survey_responses: z.string(),
  sfa_target_assignments: z.string(),
  sfa_target_products: z.string(),
  sfa_team_members: z.string(),
  sfa_teams: z.string(),
  stores: z.string(),
  sync_logs: z.string(),
  tenant_modules: z.string()
});

export const usersCreateSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  businessName: z.string().optional(),
  password: z.string(),
  role: z.string().optional(),
  isActive: z.boolean().optional(),
  lastLogin: z.coerce.date().optional(),
  tenant_id: z.string().uuid().optional(),
  assigned_branch_id: z.string().uuid().optional(),
  data_scope: z.string().optional(),
  role_id: z.string().uuid().optional(),
  branches: z.string(),
  employees: z.string(),
  kyb_applications: z.string(),
  sfa_achievements: z.string(),
  sfa_approval_requests: z.string(),
  sfa_competitor_activities: z.string(),
  sfa_coverage_assignments: z.string(),
  sfa_display_audits: z.string(),
  sfa_field_orders: z.string(),
  sfa_incentive_calculations: z.string(),
  sfa_plafon: z.string(),
  sfa_survey_responses: z.string(),
  sfa_target_assignments: z.string(),
  sfa_target_products: z.string(),
  sfa_team_members: z.string(),
  sfa_teams: z.string(),
  stores: z.string(),
  sync_logs: z.string(),
  tenant_modules: z.string()
});

export const usersUpdateSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  businessName: z.string().optional(),
  password: z.string().optional(),
  role: z.string().optional(),
  isActive: z.boolean().optional(),
  lastLogin: z.coerce.date().optional(),
  tenant_id: z.string().uuid().optional(),
  assigned_branch_id: z.string().uuid().optional(),
  data_scope: z.string().optional(),
  role_id: z.string().uuid().optional(),
  branches: z.string().optional(),
  employees: z.string().optional(),
  kyb_applications: z.string().optional(),
  sfa_achievements: z.string().optional(),
  sfa_approval_requests: z.string().optional(),
  sfa_competitor_activities: z.string().optional(),
  sfa_coverage_assignments: z.string().optional(),
  sfa_display_audits: z.string().optional(),
  sfa_field_orders: z.string().optional(),
  sfa_incentive_calculations: z.string().optional(),
  sfa_plafon: z.string().optional(),
  sfa_survey_responses: z.string().optional(),
  sfa_target_assignments: z.string().optional(),
  sfa_target_products: z.string().optional(),
  sfa_team_members: z.string().optional(),
  sfa_teams: z.string().optional(),
  stores: z.string().optional(),
  sync_logs: z.string().optional(),
  tenant_modules: z.string().optional()
});


// ============================================================
// TYPE INFERENCES
// ============================================================

export type Customers = z.infer<typeof CustomersSchema>;
export type CustomersCreate = z.infer<typeof CustomersCreateSchema>;
export type CustomersUpdate = z.infer<typeof CustomersUpdateSchema>;

export type SequelizeMeta = z.infer<typeof SequelizeMetaSchema>;
export type SequelizeMetaCreate = z.infer<typeof SequelizeMetaCreateSchema>;
export type SequelizeMetaUpdate = z.infer<typeof SequelizeMetaUpdateSchema>;

export type activation_requests = z.infer<typeof activation_requestsSchema>;
export type activation_requestsCreate = z.infer<typeof activation_requestsCreateSchema>;
export type activation_requestsUpdate = z.infer<typeof activation_requestsUpdateSchema>;

export type ai_executions = z.infer<typeof ai_executionsSchema>;
export type ai_executionsCreate = z.infer<typeof ai_executionsCreateSchema>;
export type ai_executionsUpdate = z.infer<typeof ai_executionsUpdateSchema>;

export type ai_models = z.infer<typeof ai_modelsSchema>;
export type ai_modelsCreate = z.infer<typeof ai_modelsCreateSchema>;
export type ai_modelsUpdate = z.infer<typeof ai_modelsUpdateSchema>;

export type ai_workflows = z.infer<typeof ai_workflowsSchema>;
export type ai_workflowsCreate = z.infer<typeof ai_workflowsCreateSchema>;
export type ai_workflowsUpdate = z.infer<typeof ai_workflowsUpdateSchema>;

export type billing_cycles = z.infer<typeof billing_cyclesSchema>;
export type billing_cyclesCreate = z.infer<typeof billing_cyclesCreateSchema>;
export type billing_cyclesUpdate = z.infer<typeof billing_cyclesUpdateSchema>;

export type branches = z.infer<typeof branchesSchema>;
export type branchesCreate = z.infer<typeof branchesCreateSchema>;
export type branchesUpdate = z.infer<typeof branchesUpdateSchema>;

export type business_packages = z.infer<typeof business_packagesSchema>;
export type business_packagesCreate = z.infer<typeof business_packagesCreateSchema>;
export type business_packagesUpdate = z.infer<typeof business_packagesUpdateSchema>;

export type business_type_modules = z.infer<typeof business_type_modulesSchema>;
export type business_type_modulesCreate = z.infer<typeof business_type_modulesCreateSchema>;
export type business_type_modulesUpdate = z.infer<typeof business_type_modulesUpdateSchema>;

export type business_types = z.infer<typeof business_typesSchema>;
export type business_typesCreate = z.infer<typeof business_typesCreateSchema>;
export type business_typesUpdate = z.infer<typeof business_typesUpdateSchema>;

export type crm_automation_logs = z.infer<typeof crm_automation_logsSchema>;
export type crm_automation_logsCreate = z.infer<typeof crm_automation_logsCreateSchema>;
export type crm_automation_logsUpdate = z.infer<typeof crm_automation_logsUpdateSchema>;

export type crm_automation_rules = z.infer<typeof crm_automation_rulesSchema>;
export type crm_automation_rulesCreate = z.infer<typeof crm_automation_rulesCreateSchema>;
export type crm_automation_rulesUpdate = z.infer<typeof crm_automation_rulesUpdateSchema>;

export type crm_calendar_events = z.infer<typeof crm_calendar_eventsSchema>;
export type crm_calendar_eventsCreate = z.infer<typeof crm_calendar_eventsCreateSchema>;
export type crm_calendar_eventsUpdate = z.infer<typeof crm_calendar_eventsUpdateSchema>;

export type crm_comm_campaigns = z.infer<typeof crm_comm_campaignsSchema>;
export type crm_comm_campaignsCreate = z.infer<typeof crm_comm_campaignsCreateSchema>;
export type crm_comm_campaignsUpdate = z.infer<typeof crm_comm_campaignsUpdateSchema>;

export type crm_communications = z.infer<typeof crm_communicationsSchema>;
export type crm_communicationsCreate = z.infer<typeof crm_communicationsCreateSchema>;
export type crm_communicationsUpdate = z.infer<typeof crm_communicationsUpdateSchema>;

export type crm_contacts = z.infer<typeof crm_contactsSchema>;
export type crm_contactsCreate = z.infer<typeof crm_contactsCreateSchema>;
export type crm_contactsUpdate = z.infer<typeof crm_contactsUpdateSchema>;

export type crm_custom_dashboards = z.infer<typeof crm_custom_dashboardsSchema>;
export type crm_custom_dashboardsCreate = z.infer<typeof crm_custom_dashboardsCreateSchema>;
export type crm_custom_dashboardsUpdate = z.infer<typeof crm_custom_dashboardsUpdateSchema>;

export type crm_customer_segments = z.infer<typeof crm_customer_segmentsSchema>;
export type crm_customer_segmentsCreate = z.infer<typeof crm_customer_segmentsCreateSchema>;
export type crm_customer_segmentsUpdate = z.infer<typeof crm_customer_segmentsUpdateSchema>;

export type crm_customer_tags = z.infer<typeof crm_customer_tagsSchema>;
export type crm_customer_tagsCreate = z.infer<typeof crm_customer_tagsCreateSchema>;
export type crm_customer_tagsUpdate = z.infer<typeof crm_customer_tagsUpdateSchema>;

export type crm_customers = z.infer<typeof crm_customersSchema>;
export type crm_customersCreate = z.infer<typeof crm_customersCreateSchema>;
export type crm_customersUpdate = z.infer<typeof crm_customersUpdateSchema>;

export type crm_deal_scores = z.infer<typeof crm_deal_scoresSchema>;
export type crm_deal_scoresCreate = z.infer<typeof crm_deal_scoresCreateSchema>;
export type crm_deal_scoresUpdate = z.infer<typeof crm_deal_scoresUpdateSchema>;

export type crm_document_templates = z.infer<typeof crm_document_templatesSchema>;
export type crm_document_templatesCreate = z.infer<typeof crm_document_templatesCreateSchema>;
export type crm_document_templatesUpdate = z.infer<typeof crm_document_templatesUpdateSchema>;

export type crm_documents = z.infer<typeof crm_documentsSchema>;
export type crm_documentsCreate = z.infer<typeof crm_documentsCreateSchema>;
export type crm_documentsUpdate = z.infer<typeof crm_documentsUpdateSchema>;

export type crm_email_templates = z.infer<typeof crm_email_templatesSchema>;
export type crm_email_templatesCreate = z.infer<typeof crm_email_templatesCreateSchema>;
export type crm_email_templatesUpdate = z.infer<typeof crm_email_templatesUpdateSchema>;

export type crm_follow_ups = z.infer<typeof crm_follow_upsSchema>;
export type crm_follow_upsCreate = z.infer<typeof crm_follow_upsCreateSchema>;
export type crm_follow_upsUpdate = z.infer<typeof crm_follow_upsUpdateSchema>;

export type crm_forecast_items = z.infer<typeof crm_forecast_itemsSchema>;
export type crm_forecast_itemsCreate = z.infer<typeof crm_forecast_itemsCreateSchema>;
export type crm_forecast_itemsUpdate = z.infer<typeof crm_forecast_itemsUpdateSchema>;

export type crm_forecasts = z.infer<typeof crm_forecastsSchema>;
export type crm_forecastsCreate = z.infer<typeof crm_forecastsCreateSchema>;
export type crm_forecastsUpdate = z.infer<typeof crm_forecastsUpdateSchema>;

export type crm_interactions = z.infer<typeof crm_interactionsSchema>;
export type crm_interactionsCreate = z.infer<typeof crm_interactionsCreateSchema>;
export type crm_interactionsUpdate = z.infer<typeof crm_interactionsUpdateSchema>;

export type crm_satisfaction = z.infer<typeof crm_satisfactionSchema>;
export type crm_satisfactionCreate = z.infer<typeof crm_satisfactionCreateSchema>;
export type crm_satisfactionUpdate = z.infer<typeof crm_satisfactionUpdateSchema>;

export type crm_saved_reports = z.infer<typeof crm_saved_reportsSchema>;
export type crm_saved_reportsCreate = z.infer<typeof crm_saved_reportsCreateSchema>;
export type crm_saved_reportsUpdate = z.infer<typeof crm_saved_reportsUpdateSchema>;

export type crm_sla_policies = z.infer<typeof crm_sla_policiesSchema>;
export type crm_sla_policiesCreate = z.infer<typeof crm_sla_policiesCreateSchema>;
export type crm_sla_policiesUpdate = z.infer<typeof crm_sla_policiesUpdateSchema>;

export type crm_task_templates = z.infer<typeof crm_task_templatesSchema>;
export type crm_task_templatesCreate = z.infer<typeof crm_task_templatesCreateSchema>;
export type crm_task_templatesUpdate = z.infer<typeof crm_task_templatesUpdateSchema>;

export type crm_tasks = z.infer<typeof crm_tasksSchema>;
export type crm_tasksCreate = z.infer<typeof crm_tasksCreateSchema>;
export type crm_tasksUpdate = z.infer<typeof crm_tasksUpdateSchema>;

export type crm_ticket_comments = z.infer<typeof crm_ticket_commentsSchema>;
export type crm_ticket_commentsCreate = z.infer<typeof crm_ticket_commentsCreateSchema>;
export type crm_ticket_commentsUpdate = z.infer<typeof crm_ticket_commentsUpdateSchema>;

export type crm_tickets = z.infer<typeof crm_ticketsSchema>;
export type crm_ticketsCreate = z.infer<typeof crm_ticketsCreateSchema>;
export type crm_ticketsUpdate = z.infer<typeof crm_ticketsUpdateSchema>;

export type customer_loyalty = z.infer<typeof customer_loyaltySchema>;
export type customer_loyaltyCreate = z.infer<typeof customer_loyaltyCreateSchema>;
export type customer_loyaltyUpdate = z.infer<typeof customer_loyaltyUpdateSchema>;

export type customers = z.infer<typeof customersSchema>;
export type customersCreate = z.infer<typeof customersCreateSchema>;
export type customersUpdate = z.infer<typeof customersUpdateSchema>;

export type dashboard_configurations = z.infer<typeof dashboard_configurationsSchema>;
export type dashboard_configurationsCreate = z.infer<typeof dashboard_configurationsCreateSchema>;
export type dashboard_configurationsUpdate = z.infer<typeof dashboard_configurationsUpdateSchema>;

export type employee_attendances = z.infer<typeof employee_attendancesSchema>;
export type employee_attendancesCreate = z.infer<typeof employee_attendancesCreateSchema>;
export type employee_attendancesUpdate = z.infer<typeof employee_attendancesUpdateSchema>;

export type employee_certifications = z.infer<typeof employee_certificationsSchema>;
export type employee_certificationsCreate = z.infer<typeof employee_certificationsCreateSchema>;
export type employee_certificationsUpdate = z.infer<typeof employee_certificationsUpdateSchema>;

export type employee_claims = z.infer<typeof employee_claimsSchema>;
export type employee_claimsCreate = z.infer<typeof employee_claimsCreateSchema>;
export type employee_claimsUpdate = z.infer<typeof employee_claimsUpdateSchema>;

export type employee_contracts = z.infer<typeof employee_contractsSchema>;
export type employee_contractsCreate = z.infer<typeof employee_contractsCreateSchema>;
export type employee_contractsUpdate = z.infer<typeof employee_contractsUpdateSchema>;

export type employee_documents = z.infer<typeof employee_documentsSchema>;
export type employee_documentsCreate = z.infer<typeof employee_documentsCreateSchema>;
export type employee_documentsUpdate = z.infer<typeof employee_documentsUpdateSchema>;

export type employee_educations = z.infer<typeof employee_educationsSchema>;
export type employee_educationsCreate = z.infer<typeof employee_educationsCreateSchema>;
export type employee_educationsUpdate = z.infer<typeof employee_educationsUpdateSchema>;

export type employee_families = z.infer<typeof employee_familiesSchema>;
export type employee_familiesCreate = z.infer<typeof employee_familiesCreateSchema>;
export type employee_familiesUpdate = z.infer<typeof employee_familiesUpdateSchema>;

export type employee_kpis = z.infer<typeof employee_kpisSchema>;
export type employee_kpisCreate = z.infer<typeof employee_kpisCreateSchema>;
export type employee_kpisUpdate = z.infer<typeof employee_kpisUpdateSchema>;

export type employee_mutations = z.infer<typeof employee_mutationsSchema>;
export type employee_mutationsCreate = z.infer<typeof employee_mutationsCreateSchema>;
export type employee_mutationsUpdate = z.infer<typeof employee_mutationsUpdateSchema>;

export type employee_salaries = z.infer<typeof employee_salariesSchema>;
export type employee_salariesCreate = z.infer<typeof employee_salariesCreateSchema>;
export type employee_salariesUpdate = z.infer<typeof employee_salariesUpdateSchema>;

export type employee_salary_components = z.infer<typeof employee_salary_componentsSchema>;
export type employee_salary_componentsCreate = z.infer<typeof employee_salary_componentsCreateSchema>;
export type employee_salary_componentsUpdate = z.infer<typeof employee_salary_componentsUpdateSchema>;

export type employee_skills = z.infer<typeof employee_skillsSchema>;
export type employee_skillsCreate = z.infer<typeof employee_skillsCreateSchema>;
export type employee_skillsUpdate = z.infer<typeof employee_skillsUpdateSchema>;

export type employee_work_experiences = z.infer<typeof employee_work_experiencesSchema>;
export type employee_work_experiencesCreate = z.infer<typeof employee_work_experiencesCreateSchema>;
export type employee_work_experiencesUpdate = z.infer<typeof employee_work_experiencesUpdateSchema>;

export type employees = z.infer<typeof employeesSchema>;
export type employeesCreate = z.infer<typeof employeesCreateSchema>;
export type employeesUpdate = z.infer<typeof employeesUpdateSchema>;

export type finance_accounts = z.infer<typeof finance_accountsSchema>;
export type finance_accountsCreate = z.infer<typeof finance_accountsCreateSchema>;
export type finance_accountsUpdate = z.infer<typeof finance_accountsUpdateSchema>;

export type finance_budgets = z.infer<typeof finance_budgetsSchema>;
export type finance_budgetsCreate = z.infer<typeof finance_budgetsCreateSchema>;
export type finance_budgetsUpdate = z.infer<typeof finance_budgetsUpdateSchema>;

export type finance_invoice_items = z.infer<typeof finance_invoice_itemsSchema>;
export type finance_invoice_itemsCreate = z.infer<typeof finance_invoice_itemsCreateSchema>;
export type finance_invoice_itemsUpdate = z.infer<typeof finance_invoice_itemsUpdateSchema>;

export type finance_invoice_payments = z.infer<typeof finance_invoice_paymentsSchema>;
export type finance_invoice_paymentsCreate = z.infer<typeof finance_invoice_paymentsCreateSchema>;
export type finance_invoice_paymentsUpdate = z.infer<typeof finance_invoice_paymentsUpdateSchema>;

export type finance_invoices = z.infer<typeof finance_invoicesSchema>;
export type finance_invoicesCreate = z.infer<typeof finance_invoicesCreateSchema>;
export type finance_invoicesUpdate = z.infer<typeof finance_invoicesUpdateSchema>;

export type finance_payable_payments = z.infer<typeof finance_payable_paymentsSchema>;
export type finance_payable_paymentsCreate = z.infer<typeof finance_payable_paymentsCreateSchema>;
export type finance_payable_paymentsUpdate = z.infer<typeof finance_payable_paymentsUpdateSchema>;

export type finance_payables = z.infer<typeof finance_payablesSchema>;
export type finance_payablesCreate = z.infer<typeof finance_payablesCreateSchema>;
export type finance_payablesUpdate = z.infer<typeof finance_payablesUpdateSchema>;

export type finance_receivable_payments = z.infer<typeof finance_receivable_paymentsSchema>;
export type finance_receivable_paymentsCreate = z.infer<typeof finance_receivable_paymentsCreateSchema>;
export type finance_receivable_paymentsUpdate = z.infer<typeof finance_receivable_paymentsUpdateSchema>;

export type finance_receivables = z.infer<typeof finance_receivablesSchema>;
export type finance_receivablesCreate = z.infer<typeof finance_receivablesCreateSchema>;
export type finance_receivablesUpdate = z.infer<typeof finance_receivablesUpdateSchema>;

export type finance_transactions = z.infer<typeof finance_transactionsSchema>;
export type finance_transactionsCreate = z.infer<typeof finance_transactionsCreateSchema>;
export type finance_transactionsUpdate = z.infer<typeof finance_transactionsUpdateSchema>;

export type fms_cost_records = z.infer<typeof fms_cost_recordsSchema>;
export type fms_cost_recordsCreate = z.infer<typeof fms_cost_recordsCreateSchema>;
export type fms_cost_recordsUpdate = z.infer<typeof fms_cost_recordsUpdateSchema>;

export type fms_documents = z.infer<typeof fms_documentsSchema>;
export type fms_documentsCreate = z.infer<typeof fms_documentsCreateSchema>;
export type fms_documentsUpdate = z.infer<typeof fms_documentsUpdateSchema>;

export type fms_driver_violations = z.infer<typeof fms_driver_violationsSchema>;
export type fms_driver_violationsCreate = z.infer<typeof fms_driver_violationsCreateSchema>;
export type fms_driver_violationsUpdate = z.infer<typeof fms_driver_violationsUpdateSchema>;

export type fms_drivers = z.infer<typeof fms_driversSchema>;
export type fms_driversCreate = z.infer<typeof fms_driversCreateSchema>;
export type fms_driversUpdate = z.infer<typeof fms_driversUpdateSchema>;

export type fms_fleet_kpi = z.infer<typeof fms_fleet_kpiSchema>;
export type fms_fleet_kpiCreate = z.infer<typeof fms_fleet_kpiCreateSchema>;
export type fms_fleet_kpiUpdate = z.infer<typeof fms_fleet_kpiUpdateSchema>;

export type fms_fuel_records = z.infer<typeof fms_fuel_recordsSchema>;
export type fms_fuel_recordsCreate = z.infer<typeof fms_fuel_recordsCreateSchema>;
export type fms_fuel_recordsUpdate = z.infer<typeof fms_fuel_recordsUpdateSchema>;

export type fms_geofence_events = z.infer<typeof fms_geofence_eventsSchema>;
export type fms_geofence_eventsCreate = z.infer<typeof fms_geofence_eventsCreateSchema>;
export type fms_geofence_eventsUpdate = z.infer<typeof fms_geofence_eventsUpdateSchema>;

export type fms_geofences = z.infer<typeof fms_geofencesSchema>;
export type fms_geofencesCreate = z.infer<typeof fms_geofencesCreateSchema>;
export type fms_geofencesUpdate = z.infer<typeof fms_geofencesUpdateSchema>;

export type fms_gps_tracking = z.infer<typeof fms_gps_trackingSchema>;
export type fms_gps_trackingCreate = z.infer<typeof fms_gps_trackingCreateSchema>;
export type fms_gps_trackingUpdate = z.infer<typeof fms_gps_trackingUpdateSchema>;

export type fms_incidents = z.infer<typeof fms_incidentsSchema>;
export type fms_incidentsCreate = z.infer<typeof fms_incidentsCreateSchema>;
export type fms_incidentsUpdate = z.infer<typeof fms_incidentsUpdateSchema>;

export type fms_inspections = z.infer<typeof fms_inspectionsSchema>;
export type fms_inspectionsCreate = z.infer<typeof fms_inspectionsCreateSchema>;
export type fms_inspectionsUpdate = z.infer<typeof fms_inspectionsUpdateSchema>;

export type fms_maintenance_records = z.infer<typeof fms_maintenance_recordsSchema>;
export type fms_maintenance_recordsCreate = z.infer<typeof fms_maintenance_recordsCreateSchema>;
export type fms_maintenance_recordsUpdate = z.infer<typeof fms_maintenance_recordsUpdateSchema>;

export type fms_maintenance_schedules = z.infer<typeof fms_maintenance_schedulesSchema>;
export type fms_maintenance_schedulesCreate = z.infer<typeof fms_maintenance_schedulesCreateSchema>;
export type fms_maintenance_schedulesUpdate = z.infer<typeof fms_maintenance_schedulesUpdateSchema>;

export type fms_reminders = z.infer<typeof fms_remindersSchema>;
export type fms_remindersCreate = z.infer<typeof fms_remindersCreateSchema>;
export type fms_remindersUpdate = z.infer<typeof fms_remindersUpdateSchema>;

export type fms_rental_payments = z.infer<typeof fms_rental_paymentsSchema>;
export type fms_rental_paymentsCreate = z.infer<typeof fms_rental_paymentsCreateSchema>;
export type fms_rental_paymentsUpdate = z.infer<typeof fms_rental_paymentsUpdateSchema>;

export type fms_rentals = z.infer<typeof fms_rentalsSchema>;
export type fms_rentalsCreate = z.infer<typeof fms_rentalsCreateSchema>;
export type fms_rentalsUpdate = z.infer<typeof fms_rentalsUpdateSchema>;

export type fms_settings = z.infer<typeof fms_settingsSchema>;
export type fms_settingsCreate = z.infer<typeof fms_settingsCreateSchema>;
export type fms_settingsUpdate = z.infer<typeof fms_settingsUpdateSchema>;

export type fms_tires = z.infer<typeof fms_tiresSchema>;
export type fms_tiresCreate = z.infer<typeof fms_tiresCreateSchema>;
export type fms_tiresUpdate = z.infer<typeof fms_tiresUpdateSchema>;

export type fms_vehicle_assignments = z.infer<typeof fms_vehicle_assignmentsSchema>;
export type fms_vehicle_assignmentsCreate = z.infer<typeof fms_vehicle_assignmentsCreateSchema>;
export type fms_vehicle_assignmentsUpdate = z.infer<typeof fms_vehicle_assignmentsUpdateSchema>;

export type fms_vehicles = z.infer<typeof fms_vehiclesSchema>;
export type fms_vehiclesCreate = z.infer<typeof fms_vehiclesCreateSchema>;
export type fms_vehiclesUpdate = z.infer<typeof fms_vehiclesUpdateSchema>;

export type hris_candidates = z.infer<typeof hris_candidatesSchema>;
export type hris_candidatesCreate = z.infer<typeof hris_candidatesCreateSchema>;
export type hris_candidatesUpdate = z.infer<typeof hris_candidatesUpdateSchema>;

export type hris_certifications = z.infer<typeof hris_certificationsSchema>;
export type hris_certificationsCreate = z.infer<typeof hris_certificationsCreateSchema>;
export type hris_certificationsUpdate = z.infer<typeof hris_certificationsUpdateSchema>;

export type hris_job_openings = z.infer<typeof hris_job_openingsSchema>;
export type hris_job_openingsCreate = z.infer<typeof hris_job_openingsCreateSchema>;
export type hris_job_openingsUpdate = z.infer<typeof hris_job_openingsUpdateSchema>;

export type hris_training_enrollments = z.infer<typeof hris_training_enrollmentsSchema>;
export type hris_training_enrollmentsCreate = z.infer<typeof hris_training_enrollmentsCreateSchema>;
export type hris_training_enrollmentsUpdate = z.infer<typeof hris_training_enrollmentsUpdateSchema>;

export type hris_training_programs = z.infer<typeof hris_training_programsSchema>;
export type hris_training_programsCreate = z.infer<typeof hris_training_programsCreateSchema>;
export type hris_training_programsUpdate = z.infer<typeof hris_training_programsUpdateSchema>;

export type invoice_items = z.infer<typeof invoice_itemsSchema>;
export type invoice_itemsCreate = z.infer<typeof invoice_itemsCreateSchema>;
export type invoice_itemsUpdate = z.infer<typeof invoice_itemsUpdateSchema>;

export type invoices = z.infer<typeof invoicesSchema>;
export type invoicesCreate = z.infer<typeof invoicesCreateSchema>;
export type invoicesUpdate = z.infer<typeof invoicesUpdateSchema>;

export type job_grades = z.infer<typeof job_gradesSchema>;
export type job_gradesCreate = z.infer<typeof job_gradesCreateSchema>;
export type job_gradesUpdate = z.infer<typeof job_gradesUpdateSchema>;

export type kitchen_inventory_items = z.infer<typeof kitchen_inventory_itemsSchema>;
export type kitchen_inventory_itemsCreate = z.infer<typeof kitchen_inventory_itemsCreateSchema>;
export type kitchen_inventory_itemsUpdate = z.infer<typeof kitchen_inventory_itemsUpdateSchema>;

export type kitchen_inventory_transactions = z.infer<typeof kitchen_inventory_transactionsSchema>;
export type kitchen_inventory_transactionsCreate = z.infer<typeof kitchen_inventory_transactionsCreateSchema>;
export type kitchen_inventory_transactionsUpdate = z.infer<typeof kitchen_inventory_transactionsUpdateSchema>;

export type kitchen_order_items = z.infer<typeof kitchen_order_itemsSchema>;
export type kitchen_order_itemsCreate = z.infer<typeof kitchen_order_itemsCreateSchema>;
export type kitchen_order_itemsUpdate = z.infer<typeof kitchen_order_itemsUpdateSchema>;

export type kitchen_orders = z.infer<typeof kitchen_ordersSchema>;
export type kitchen_ordersCreate = z.infer<typeof kitchen_ordersCreateSchema>;
export type kitchen_ordersUpdate = z.infer<typeof kitchen_ordersUpdateSchema>;

export type kpi_templates = z.infer<typeof kpi_templatesSchema>;
export type kpi_templatesCreate = z.infer<typeof kpi_templatesCreateSchema>;
export type kpi_templatesUpdate = z.infer<typeof kpi_templatesUpdateSchema>;

export type kyb_applications = z.infer<typeof kyb_applicationsSchema>;
export type kyb_applicationsCreate = z.infer<typeof kyb_applicationsCreateSchema>;
export type kyb_applicationsUpdate = z.infer<typeof kyb_applicationsUpdateSchema>;

export type kyb_documents = z.infer<typeof kyb_documentsSchema>;
export type kyb_documentsCreate = z.infer<typeof kyb_documentsCreateSchema>;
export type kyb_documentsUpdate = z.infer<typeof kyb_documentsUpdateSchema>;

export type leave_approval_configs = z.infer<typeof leave_approval_configsSchema>;
export type leave_approval_configsCreate = z.infer<typeof leave_approval_configsCreateSchema>;
export type leave_approval_configsUpdate = z.infer<typeof leave_approval_configsUpdateSchema>;

export type leave_approval_steps = z.infer<typeof leave_approval_stepsSchema>;
export type leave_approval_stepsCreate = z.infer<typeof leave_approval_stepsCreateSchema>;
export type leave_approval_stepsUpdate = z.infer<typeof leave_approval_stepsUpdateSchema>;

export type leave_balances = z.infer<typeof leave_balancesSchema>;
export type leave_balancesCreate = z.infer<typeof leave_balancesCreateSchema>;
export type leave_balancesUpdate = z.infer<typeof leave_balancesUpdateSchema>;

export type leave_requests = z.infer<typeof leave_requestsSchema>;
export type leave_requestsCreate = z.infer<typeof leave_requestsCreateSchema>;
export type leave_requestsUpdate = z.infer<typeof leave_requestsUpdateSchema>;

export type leave_types = z.infer<typeof leave_typesSchema>;
export type leave_typesCreate = z.infer<typeof leave_typesCreateSchema>;
export type leave_typesUpdate = z.infer<typeof leave_typesUpdateSchema>;

export type lookup_options = z.infer<typeof lookup_optionsSchema>;
export type lookup_optionsCreate = z.infer<typeof lookup_optionsCreateSchema>;
export type lookup_optionsUpdate = z.infer<typeof lookup_optionsUpdateSchema>;

export type loyalty_programs = z.infer<typeof loyalty_programsSchema>;
export type loyalty_programsCreate = z.infer<typeof loyalty_programsCreateSchema>;
export type loyalty_programsUpdate = z.infer<typeof loyalty_programsUpdateSchema>;

export type loyalty_rewards = z.infer<typeof loyalty_rewardsSchema>;
export type loyalty_rewardsCreate = z.infer<typeof loyalty_rewardsCreateSchema>;
export type loyalty_rewardsUpdate = z.infer<typeof loyalty_rewardsUpdateSchema>;

export type loyalty_tiers = z.infer<typeof loyalty_tiersSchema>;
export type loyalty_tiersCreate = z.infer<typeof loyalty_tiersCreateSchema>;
export type loyalty_tiersUpdate = z.infer<typeof loyalty_tiersUpdateSchema>;

export type mkt_budget_items = z.infer<typeof mkt_budget_itemsSchema>;
export type mkt_budget_itemsCreate = z.infer<typeof mkt_budget_itemsCreateSchema>;
export type mkt_budget_itemsUpdate = z.infer<typeof mkt_budget_itemsUpdateSchema>;

export type mkt_budgets = z.infer<typeof mkt_budgetsSchema>;
export type mkt_budgetsCreate = z.infer<typeof mkt_budgetsCreateSchema>;
export type mkt_budgetsUpdate = z.infer<typeof mkt_budgetsUpdateSchema>;

export type mkt_campaign_audiences = z.infer<typeof mkt_campaign_audiencesSchema>;
export type mkt_campaign_audiencesCreate = z.infer<typeof mkt_campaign_audiencesCreateSchema>;
export type mkt_campaign_audiencesUpdate = z.infer<typeof mkt_campaign_audiencesUpdateSchema>;

export type mkt_campaign_channels = z.infer<typeof mkt_campaign_channelsSchema>;
export type mkt_campaign_channelsCreate = z.infer<typeof mkt_campaign_channelsCreateSchema>;
export type mkt_campaign_channelsUpdate = z.infer<typeof mkt_campaign_channelsUpdateSchema>;

export type mkt_campaigns = z.infer<typeof mkt_campaignsSchema>;
export type mkt_campaignsCreate = z.infer<typeof mkt_campaignsCreateSchema>;
export type mkt_campaignsUpdate = z.infer<typeof mkt_campaignsUpdateSchema>;

export type mkt_content_assets = z.infer<typeof mkt_content_assetsSchema>;
export type mkt_content_assetsCreate = z.infer<typeof mkt_content_assetsCreateSchema>;
export type mkt_content_assetsUpdate = z.infer<typeof mkt_content_assetsUpdateSchema>;

export type mkt_promotion_usage = z.infer<typeof mkt_promotion_usageSchema>;
export type mkt_promotion_usageCreate = z.infer<typeof mkt_promotion_usageCreateSchema>;
export type mkt_promotion_usageUpdate = z.infer<typeof mkt_promotion_usageUpdateSchema>;

export type mkt_promotions = z.infer<typeof mkt_promotionsSchema>;
export type mkt_promotionsCreate = z.infer<typeof mkt_promotionsCreateSchema>;
export type mkt_promotionsUpdate = z.infer<typeof mkt_promotionsUpdateSchema>;

export type mkt_segment_rules = z.infer<typeof mkt_segment_rulesSchema>;
export type mkt_segment_rulesCreate = z.infer<typeof mkt_segment_rulesCreateSchema>;
export type mkt_segment_rulesUpdate = z.infer<typeof mkt_segment_rulesUpdateSchema>;

export type mkt_segments = z.infer<typeof mkt_segmentsSchema>;
export type mkt_segmentsCreate = z.infer<typeof mkt_segmentsCreateSchema>;
export type mkt_segmentsUpdate = z.infer<typeof mkt_segmentsUpdateSchema>;

export type module_dependencies = z.infer<typeof module_dependenciesSchema>;
export type module_dependenciesCreate = z.infer<typeof module_dependenciesCreateSchema>;
export type module_dependenciesUpdate = z.infer<typeof module_dependenciesUpdateSchema>;

export type module_features = z.infer<typeof module_featuresSchema>;
export type module_featuresCreate = z.infer<typeof module_featuresCreateSchema>;
export type module_featuresUpdate = z.infer<typeof module_featuresUpdateSchema>;

export type modules = z.infer<typeof modulesSchema>;
export type modulesCreate = z.infer<typeof modulesCreateSchema>;
export type modulesUpdate = z.infer<typeof modulesUpdateSchema>;

export type org_structures = z.infer<typeof org_structuresSchema>;
export type org_structuresCreate = z.infer<typeof org_structuresCreateSchema>;
export type org_structuresUpdate = z.infer<typeof org_structuresUpdateSchema>;

export type package_features = z.infer<typeof package_featuresSchema>;
export type package_featuresCreate = z.infer<typeof package_featuresCreateSchema>;
export type package_featuresUpdate = z.infer<typeof package_featuresUpdateSchema>;

export type package_modules = z.infer<typeof package_modulesSchema>;
export type package_modulesCreate = z.infer<typeof package_modulesCreateSchema>;
export type package_modulesUpdate = z.infer<typeof package_modulesUpdateSchema>;

export type partners = z.infer<typeof partnersSchema>;
export type partnersCreate = z.infer<typeof partnersCreateSchema>;
export type partnersUpdate = z.infer<typeof partnersUpdateSchema>;

export type payment_transactions = z.infer<typeof payment_transactionsSchema>;
export type payment_transactionsCreate = z.infer<typeof payment_transactionsCreateSchema>;
export type payment_transactionsUpdate = z.infer<typeof payment_transactionsUpdateSchema>;

export type payroll_components = z.infer<typeof payroll_componentsSchema>;
export type payroll_componentsCreate = z.infer<typeof payroll_componentsCreateSchema>;
export type payroll_componentsUpdate = z.infer<typeof payroll_componentsUpdateSchema>;

export type payroll_items = z.infer<typeof payroll_itemsSchema>;
export type payroll_itemsCreate = z.infer<typeof payroll_itemsCreateSchema>;
export type payroll_itemsUpdate = z.infer<typeof payroll_itemsUpdateSchema>;

export type payroll_runs = z.infer<typeof payroll_runsSchema>;
export type payroll_runsCreate = z.infer<typeof payroll_runsCreateSchema>;
export type payroll_runsUpdate = z.infer<typeof payroll_runsUpdateSchema>;

export type performance_reviews = z.infer<typeof performance_reviewsSchema>;
export type performance_reviewsCreate = z.infer<typeof performance_reviewsCreateSchema>;
export type performance_reviewsUpdate = z.infer<typeof performance_reviewsUpdateSchema>;

export type plan_limits = z.infer<typeof plan_limitsSchema>;
export type plan_limitsCreate = z.infer<typeof plan_limitsCreateSchema>;
export type plan_limitsUpdate = z.infer<typeof plan_limitsUpdateSchema>;

export type plans = z.infer<typeof plansSchema>;
export type plansCreate = z.infer<typeof plansCreateSchema>;
export type plansUpdate = z.infer<typeof plansUpdateSchema>;

export type pos_transaction_items = z.infer<typeof pos_transaction_itemsSchema>;
export type pos_transaction_itemsCreate = z.infer<typeof pos_transaction_itemsCreateSchema>;
export type pos_transaction_itemsUpdate = z.infer<typeof pos_transaction_itemsUpdateSchema>;

export type pos_transactions = z.infer<typeof pos_transactionsSchema>;
export type pos_transactionsCreate = z.infer<typeof pos_transactionsCreateSchema>;
export type pos_transactionsUpdate = z.infer<typeof pos_transactionsUpdateSchema>;

export type products = z.infer<typeof productsSchema>;
export type productsCreate = z.infer<typeof productsCreateSchema>;
export type productsUpdate = z.infer<typeof productsUpdateSchema>;

export type sfa_achievement_details = z.infer<typeof sfa_achievement_detailsSchema>;
export type sfa_achievement_detailsCreate = z.infer<typeof sfa_achievement_detailsCreateSchema>;
export type sfa_achievement_detailsUpdate = z.infer<typeof sfa_achievement_detailsUpdateSchema>;

export type sfa_achievements = z.infer<typeof sfa_achievementsSchema>;
export type sfa_achievementsCreate = z.infer<typeof sfa_achievementsCreateSchema>;
export type sfa_achievementsUpdate = z.infer<typeof sfa_achievementsUpdateSchema>;

export type sfa_activities = z.infer<typeof sfa_activitiesSchema>;
export type sfa_activitiesCreate = z.infer<typeof sfa_activitiesCreateSchema>;
export type sfa_activitiesUpdate = z.infer<typeof sfa_activitiesUpdateSchema>;

export type sfa_approval_requests = z.infer<typeof sfa_approval_requestsSchema>;
export type sfa_approval_requestsCreate = z.infer<typeof sfa_approval_requestsCreateSchema>;
export type sfa_approval_requestsUpdate = z.infer<typeof sfa_approval_requestsUpdateSchema>;

export type sfa_approval_steps = z.infer<typeof sfa_approval_stepsSchema>;
export type sfa_approval_stepsCreate = z.infer<typeof sfa_approval_stepsCreateSchema>;
export type sfa_approval_stepsUpdate = z.infer<typeof sfa_approval_stepsUpdateSchema>;

export type sfa_approval_workflows = z.infer<typeof sfa_approval_workflowsSchema>;
export type sfa_approval_workflowsCreate = z.infer<typeof sfa_approval_workflowsCreateSchema>;
export type sfa_approval_workflowsUpdate = z.infer<typeof sfa_approval_workflowsUpdateSchema>;

export type sfa_business_settings = z.infer<typeof sfa_business_settingsSchema>;
export type sfa_business_settingsCreate = z.infer<typeof sfa_business_settingsCreateSchema>;
export type sfa_business_settingsUpdate = z.infer<typeof sfa_business_settingsUpdateSchema>;

export type sfa_commission_group_products = z.infer<typeof sfa_commission_group_productsSchema>;
export type sfa_commission_group_productsCreate = z.infer<typeof sfa_commission_group_productsCreateSchema>;
export type sfa_commission_group_productsUpdate = z.infer<typeof sfa_commission_group_productsUpdateSchema>;

export type sfa_commission_groups = z.infer<typeof sfa_commission_groupsSchema>;
export type sfa_commission_groupsCreate = z.infer<typeof sfa_commission_groupsCreateSchema>;
export type sfa_commission_groupsUpdate = z.infer<typeof sfa_commission_groupsUpdateSchema>;

export type sfa_competitor_activities = z.infer<typeof sfa_competitor_activitiesSchema>;
export type sfa_competitor_activitiesCreate = z.infer<typeof sfa_competitor_activitiesCreateSchema>;
export type sfa_competitor_activitiesUpdate = z.infer<typeof sfa_competitor_activitiesUpdateSchema>;

export type sfa_coverage_assignments = z.infer<typeof sfa_coverage_assignmentsSchema>;
export type sfa_coverage_assignmentsCreate = z.infer<typeof sfa_coverage_assignmentsCreateSchema>;
export type sfa_coverage_assignmentsUpdate = z.infer<typeof sfa_coverage_assignmentsUpdateSchema>;

export type sfa_coverage_plans = z.infer<typeof sfa_coverage_plansSchema>;
export type sfa_coverage_plansCreate = z.infer<typeof sfa_coverage_plansCreateSchema>;
export type sfa_coverage_plansUpdate = z.infer<typeof sfa_coverage_plansUpdateSchema>;

export type sfa_currencies = z.infer<typeof sfa_currenciesSchema>;
export type sfa_currenciesCreate = z.infer<typeof sfa_currenciesCreateSchema>;
export type sfa_currenciesUpdate = z.infer<typeof sfa_currenciesUpdateSchema>;

export type sfa_display_audits = z.infer<typeof sfa_display_auditsSchema>;
export type sfa_display_auditsCreate = z.infer<typeof sfa_display_auditsCreateSchema>;
export type sfa_display_auditsUpdate = z.infer<typeof sfa_display_auditsUpdateSchema>;

export type sfa_display_items = z.infer<typeof sfa_display_itemsSchema>;
export type sfa_display_itemsCreate = z.infer<typeof sfa_display_itemsCreateSchema>;
export type sfa_display_itemsUpdate = z.infer<typeof sfa_display_itemsUpdateSchema>;

export type sfa_exchange_rates = z.infer<typeof sfa_exchange_ratesSchema>;
export type sfa_exchange_ratesCreate = z.infer<typeof sfa_exchange_ratesCreateSchema>;
export type sfa_exchange_ratesUpdate = z.infer<typeof sfa_exchange_ratesUpdateSchema>;

export type sfa_field_order_items = z.infer<typeof sfa_field_order_itemsSchema>;
export type sfa_field_order_itemsCreate = z.infer<typeof sfa_field_order_itemsCreateSchema>;
export type sfa_field_order_itemsUpdate = z.infer<typeof sfa_field_order_itemsUpdateSchema>;

export type sfa_field_orders = z.infer<typeof sfa_field_ordersSchema>;
export type sfa_field_ordersCreate = z.infer<typeof sfa_field_ordersCreateSchema>;
export type sfa_field_ordersUpdate = z.infer<typeof sfa_field_ordersUpdateSchema>;

export type sfa_geofences = z.infer<typeof sfa_geofencesSchema>;
export type sfa_geofencesCreate = z.infer<typeof sfa_geofencesCreateSchema>;
export type sfa_geofencesUpdate = z.infer<typeof sfa_geofencesUpdateSchema>;

export type sfa_incentive_calculations = z.infer<typeof sfa_incentive_calculationsSchema>;
export type sfa_incentive_calculationsCreate = z.infer<typeof sfa_incentive_calculationsCreateSchema>;
export type sfa_incentive_calculationsUpdate = z.infer<typeof sfa_incentive_calculationsUpdateSchema>;

export type sfa_incentive_schemes = z.infer<typeof sfa_incentive_schemesSchema>;
export type sfa_incentive_schemesCreate = z.infer<typeof sfa_incentive_schemesCreateSchema>;
export type sfa_incentive_schemesUpdate = z.infer<typeof sfa_incentive_schemesUpdateSchema>;

export type sfa_incentive_tiers = z.infer<typeof sfa_incentive_tiersSchema>;
export type sfa_incentive_tiersCreate = z.infer<typeof sfa_incentive_tiersCreateSchema>;
export type sfa_incentive_tiersUpdate = z.infer<typeof sfa_incentive_tiersUpdateSchema>;

export type sfa_leads = z.infer<typeof sfa_leadsSchema>;
export type sfa_leadsCreate = z.infer<typeof sfa_leadsCreateSchema>;
export type sfa_leadsUpdate = z.infer<typeof sfa_leadsUpdateSchema>;

export type sfa_numbering_formats = z.infer<typeof sfa_numbering_formatsSchema>;
export type sfa_numbering_formatsCreate = z.infer<typeof sfa_numbering_formatsCreateSchema>;
export type sfa_numbering_formatsUpdate = z.infer<typeof sfa_numbering_formatsUpdateSchema>;

export type sfa_opportunities = z.infer<typeof sfa_opportunitiesSchema>;
export type sfa_opportunitiesCreate = z.infer<typeof sfa_opportunitiesCreateSchema>;
export type sfa_opportunitiesUpdate = z.infer<typeof sfa_opportunitiesUpdateSchema>;

export type sfa_outlet_targets = z.infer<typeof sfa_outlet_targetsSchema>;
export type sfa_outlet_targetsCreate = z.infer<typeof sfa_outlet_targetsCreateSchema>;
export type sfa_outlet_targetsUpdate = z.infer<typeof sfa_outlet_targetsUpdateSchema>;

export type sfa_parameters = z.infer<typeof sfa_parametersSchema>;
export type sfa_parametersCreate = z.infer<typeof sfa_parametersCreateSchema>;
export type sfa_parametersUpdate = z.infer<typeof sfa_parametersUpdateSchema>;

export type sfa_payment_terms = z.infer<typeof sfa_payment_termsSchema>;
export type sfa_payment_termsCreate = z.infer<typeof sfa_payment_termsCreateSchema>;
export type sfa_payment_termsUpdate = z.infer<typeof sfa_payment_termsUpdateSchema>;

export type sfa_plafon = z.infer<typeof sfa_plafonSchema>;
export type sfa_plafonCreate = z.infer<typeof sfa_plafonCreateSchema>;
export type sfa_plafonUpdate = z.infer<typeof sfa_plafonUpdateSchema>;

export type sfa_plafon_usage = z.infer<typeof sfa_plafon_usageSchema>;
export type sfa_plafon_usageCreate = z.infer<typeof sfa_plafon_usageCreateSchema>;
export type sfa_plafon_usageUpdate = z.infer<typeof sfa_plafon_usageUpdateSchema>;

export type sfa_product_commissions = z.infer<typeof sfa_product_commissionsSchema>;
export type sfa_product_commissionsCreate = z.infer<typeof sfa_product_commissionsCreateSchema>;
export type sfa_product_commissionsUpdate = z.infer<typeof sfa_product_commissionsUpdateSchema>;

export type sfa_quotation_items = z.infer<typeof sfa_quotation_itemsSchema>;
export type sfa_quotation_itemsCreate = z.infer<typeof sfa_quotation_itemsCreateSchema>;
export type sfa_quotation_itemsUpdate = z.infer<typeof sfa_quotation_itemsUpdateSchema>;

export type sfa_quotations = z.infer<typeof sfa_quotationsSchema>;
export type sfa_quotationsCreate = z.infer<typeof sfa_quotationsCreateSchema>;
export type sfa_quotationsUpdate = z.infer<typeof sfa_quotationsUpdateSchema>;

export type sfa_route_plans = z.infer<typeof sfa_route_plansSchema>;
export type sfa_route_plansCreate = z.infer<typeof sfa_route_plansCreateSchema>;
export type sfa_route_plansUpdate = z.infer<typeof sfa_route_plansUpdateSchema>;

export type sfa_sales_strategies = z.infer<typeof sfa_sales_strategiesSchema>;
export type sfa_sales_strategiesCreate = z.infer<typeof sfa_sales_strategiesCreateSchema>;
export type sfa_sales_strategiesUpdate = z.infer<typeof sfa_sales_strategiesUpdateSchema>;

export type sfa_strategy_kpis = z.infer<typeof sfa_strategy_kpisSchema>;
export type sfa_strategy_kpisCreate = z.infer<typeof sfa_strategy_kpisCreateSchema>;
export type sfa_strategy_kpisUpdate = z.infer<typeof sfa_strategy_kpisUpdateSchema>;

export type sfa_survey_questions = z.infer<typeof sfa_survey_questionsSchema>;
export type sfa_survey_questionsCreate = z.infer<typeof sfa_survey_questionsCreateSchema>;
export type sfa_survey_questionsUpdate = z.infer<typeof sfa_survey_questionsUpdateSchema>;

export type sfa_survey_responses = z.infer<typeof sfa_survey_responsesSchema>;
export type sfa_survey_responsesCreate = z.infer<typeof sfa_survey_responsesCreateSchema>;
export type sfa_survey_responsesUpdate = z.infer<typeof sfa_survey_responsesUpdateSchema>;

export type sfa_survey_templates = z.infer<typeof sfa_survey_templatesSchema>;
export type sfa_survey_templatesCreate = z.infer<typeof sfa_survey_templatesCreateSchema>;
export type sfa_survey_templatesUpdate = z.infer<typeof sfa_survey_templatesUpdateSchema>;

export type sfa_target_assignments = z.infer<typeof sfa_target_assignmentsSchema>;
export type sfa_target_assignmentsCreate = z.infer<typeof sfa_target_assignmentsCreateSchema>;
export type sfa_target_assignmentsUpdate = z.infer<typeof sfa_target_assignmentsUpdateSchema>;

export type sfa_target_groups = z.infer<typeof sfa_target_groupsSchema>;
export type sfa_target_groupsCreate = z.infer<typeof sfa_target_groupsCreateSchema>;
export type sfa_target_groupsUpdate = z.infer<typeof sfa_target_groupsUpdateSchema>;

export type sfa_target_products = z.infer<typeof sfa_target_productsSchema>;
export type sfa_target_productsCreate = z.infer<typeof sfa_target_productsCreateSchema>;
export type sfa_target_productsUpdate = z.infer<typeof sfa_target_productsUpdateSchema>;

export type sfa_targets = z.infer<typeof sfa_targetsSchema>;
export type sfa_targetsCreate = z.infer<typeof sfa_targetsCreateSchema>;
export type sfa_targetsUpdate = z.infer<typeof sfa_targetsUpdateSchema>;

export type sfa_tax_settings = z.infer<typeof sfa_tax_settingsSchema>;
export type sfa_tax_settingsCreate = z.infer<typeof sfa_tax_settingsCreateSchema>;
export type sfa_tax_settingsUpdate = z.infer<typeof sfa_tax_settingsUpdateSchema>;

export type sfa_team_members = z.infer<typeof sfa_team_membersSchema>;
export type sfa_team_membersCreate = z.infer<typeof sfa_team_membersCreateSchema>;
export type sfa_team_membersUpdate = z.infer<typeof sfa_team_membersUpdateSchema>;

export type sfa_teams = z.infer<typeof sfa_teamsSchema>;
export type sfa_teamsCreate = z.infer<typeof sfa_teamsCreateSchema>;
export type sfa_teamsUpdate = z.infer<typeof sfa_teamsUpdateSchema>;

export type sfa_territories = z.infer<typeof sfa_territoriesSchema>;
export type sfa_territoriesCreate = z.infer<typeof sfa_territoriesCreateSchema>;
export type sfa_territoriesUpdate = z.infer<typeof sfa_territoriesUpdateSchema>;

export type sfa_visits = z.infer<typeof sfa_visitsSchema>;
export type sfa_visitsCreate = z.infer<typeof sfa_visitsCreateSchema>;
export type sfa_visitsUpdate = z.infer<typeof sfa_visitsUpdateSchema>;

export type stores = z.infer<typeof storesSchema>;
export type storesCreate = z.infer<typeof storesCreateSchema>;
export type storesUpdate = z.infer<typeof storesUpdateSchema>;

export type subscriptions = z.infer<typeof subscriptionsSchema>;
export type subscriptionsCreate = z.infer<typeof subscriptionsCreateSchema>;
export type subscriptionsUpdate = z.infer<typeof subscriptionsUpdateSchema>;

export type sync_logs = z.infer<typeof sync_logsSchema>;
export type sync_logsCreate = z.infer<typeof sync_logsCreateSchema>;
export type sync_logsUpdate = z.infer<typeof sync_logsUpdateSchema>;

export type tenant_dashboards = z.infer<typeof tenant_dashboardsSchema>;
export type tenant_dashboardsCreate = z.infer<typeof tenant_dashboardsCreateSchema>;
export type tenant_dashboardsUpdate = z.infer<typeof tenant_dashboardsUpdateSchema>;

export type tenant_modules = z.infer<typeof tenant_modulesSchema>;
export type tenant_modulesCreate = z.infer<typeof tenant_modulesCreateSchema>;
export type tenant_modulesUpdate = z.infer<typeof tenant_modulesUpdateSchema>;

export type tenant_packages = z.infer<typeof tenant_packagesSchema>;
export type tenant_packagesCreate = z.infer<typeof tenant_packagesCreateSchema>;
export type tenant_packagesUpdate = z.infer<typeof tenant_packagesUpdateSchema>;

export type tenants = z.infer<typeof tenantsSchema>;
export type tenantsCreate = z.infer<typeof tenantsCreateSchema>;
export type tenantsUpdate = z.infer<typeof tenantsUpdateSchema>;

export type tms_carrier_rates = z.infer<typeof tms_carrier_ratesSchema>;
export type tms_carrier_ratesCreate = z.infer<typeof tms_carrier_ratesCreateSchema>;
export type tms_carrier_ratesUpdate = z.infer<typeof tms_carrier_ratesUpdateSchema>;

export type tms_carrier_scores = z.infer<typeof tms_carrier_scoresSchema>;
export type tms_carrier_scoresCreate = z.infer<typeof tms_carrier_scoresCreateSchema>;
export type tms_carrier_scoresUpdate = z.infer<typeof tms_carrier_scoresUpdateSchema>;

export type tms_carriers = z.infer<typeof tms_carriersSchema>;
export type tms_carriersCreate = z.infer<typeof tms_carriersCreateSchema>;
export type tms_carriersUpdate = z.infer<typeof tms_carriersUpdateSchema>;

export type tms_customer_addresses = z.infer<typeof tms_customer_addressesSchema>;
export type tms_customer_addressesCreate = z.infer<typeof tms_customer_addressesCreateSchema>;
export type tms_customer_addressesUpdate = z.infer<typeof tms_customer_addressesUpdateSchema>;

export type tms_delivery_slas = z.infer<typeof tms_delivery_slasSchema>;
export type tms_delivery_slasCreate = z.infer<typeof tms_delivery_slasCreateSchema>;
export type tms_delivery_slasUpdate = z.infer<typeof tms_delivery_slasUpdateSchema>;

export type tms_freight_bill_items = z.infer<typeof tms_freight_bill_itemsSchema>;
export type tms_freight_bill_itemsCreate = z.infer<typeof tms_freight_bill_itemsCreateSchema>;
export type tms_freight_bill_itemsUpdate = z.infer<typeof tms_freight_bill_itemsUpdateSchema>;

export type tms_freight_bills = z.infer<typeof tms_freight_billsSchema>;
export type tms_freight_billsCreate = z.infer<typeof tms_freight_billsCreateSchema>;
export type tms_freight_billsUpdate = z.infer<typeof tms_freight_billsUpdateSchema>;

export type tms_logistics_kpi = z.infer<typeof tms_logistics_kpiSchema>;
export type tms_logistics_kpiCreate = z.infer<typeof tms_logistics_kpiCreateSchema>;
export type tms_logistics_kpiUpdate = z.infer<typeof tms_logistics_kpiUpdateSchema>;

export type tms_proof_of_delivery = z.infer<typeof tms_proof_of_deliverySchema>;
export type tms_proof_of_deliveryCreate = z.infer<typeof tms_proof_of_deliveryCreateSchema>;
export type tms_proof_of_deliveryUpdate = z.infer<typeof tms_proof_of_deliveryUpdateSchema>;

export type tms_rate_cards = z.infer<typeof tms_rate_cardsSchema>;
export type tms_rate_cardsCreate = z.infer<typeof tms_rate_cardsCreateSchema>;
export type tms_rate_cardsUpdate = z.infer<typeof tms_rate_cardsUpdateSchema>;

export type tms_routes = z.infer<typeof tms_routesSchema>;
export type tms_routesCreate = z.infer<typeof tms_routesCreateSchema>;
export type tms_routesUpdate = z.infer<typeof tms_routesUpdateSchema>;

export type tms_settings = z.infer<typeof tms_settingsSchema>;
export type tms_settingsCreate = z.infer<typeof tms_settingsCreateSchema>;
export type tms_settingsUpdate = z.infer<typeof tms_settingsUpdateSchema>;

export type tms_shipment_items = z.infer<typeof tms_shipment_itemsSchema>;
export type tms_shipment_itemsCreate = z.infer<typeof tms_shipment_itemsCreateSchema>;
export type tms_shipment_itemsUpdate = z.infer<typeof tms_shipment_itemsUpdateSchema>;

export type tms_shipment_tracking = z.infer<typeof tms_shipment_trackingSchema>;
export type tms_shipment_trackingCreate = z.infer<typeof tms_shipment_trackingCreateSchema>;
export type tms_shipment_trackingUpdate = z.infer<typeof tms_shipment_trackingUpdateSchema>;

export type tms_shipments = z.infer<typeof tms_shipmentsSchema>;
export type tms_shipmentsCreate = z.infer<typeof tms_shipmentsCreateSchema>;
export type tms_shipmentsUpdate = z.infer<typeof tms_shipmentsUpdateSchema>;

export type tms_trip_events = z.infer<typeof tms_trip_eventsSchema>;
export type tms_trip_eventsCreate = z.infer<typeof tms_trip_eventsCreateSchema>;
export type tms_trip_eventsUpdate = z.infer<typeof tms_trip_eventsUpdateSchema>;

export type tms_trip_shipments = z.infer<typeof tms_trip_shipmentsSchema>;
export type tms_trip_shipmentsCreate = z.infer<typeof tms_trip_shipmentsCreateSchema>;
export type tms_trip_shipmentsUpdate = z.infer<typeof tms_trip_shipmentsUpdateSchema>;

export type tms_trips = z.infer<typeof tms_tripsSchema>;
export type tms_tripsCreate = z.infer<typeof tms_tripsCreateSchema>;
export type tms_tripsUpdate = z.infer<typeof tms_tripsUpdateSchema>;

export type tms_warehouses = z.infer<typeof tms_warehousesSchema>;
export type tms_warehousesCreate = z.infer<typeof tms_warehousesCreateSchema>;
export type tms_warehousesUpdate = z.infer<typeof tms_warehousesUpdateSchema>;

export type tms_zones = z.infer<typeof tms_zonesSchema>;
export type tms_zonesCreate = z.infer<typeof tms_zonesCreateSchema>;
export type tms_zonesUpdate = z.infer<typeof tms_zonesUpdateSchema>;

export type usage_metrics = z.infer<typeof usage_metricsSchema>;
export type usage_metricsCreate = z.infer<typeof usage_metricsCreateSchema>;
export type usage_metricsUpdate = z.infer<typeof usage_metricsUpdateSchema>;

export type user_preferences = z.infer<typeof user_preferencesSchema>;
export type user_preferencesCreate = z.infer<typeof user_preferencesCreateSchema>;
export type user_preferencesUpdate = z.infer<typeof user_preferencesUpdateSchema>;

export type users = z.infer<typeof usersSchema>;
export type usersCreate = z.infer<typeof usersCreateSchema>;
export type usersUpdate = z.infer<typeof usersUpdateSchema>;


// ============================================================
// API HELPERS
// ============================================================

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
    totalPages: z.number().int(),
  });

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.record(z.string(), z.any()).optional(),
});

export const ApiSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
});
