import sequelize from '../config/database';

// Auth & Core
export { Tenant, User, Role, BusinessType, Module, TenantModule } from './auth.models';
export { Branch, BranchModule, BranchSetup } from './branch.models';

// Product & Category
export { Category, Product, ProductVariant, ProductPrice, Unit } from './product.models';

// POS
export { PosTransaction, PosTransactionItem, Shift, HeldTransaction, PrinterConfig } from './pos.models';

// Inventory
export { Warehouse, Location, Stock, StockMovement, StockAdjustment, StockAdjustmentItem, StockOpname, StockOpnameItem } from './inventory.models';

// Purchase & Supplier
export { Supplier, PurchaseOrder, PurchaseOrderItem, GoodsReceipt, GoodsReceiptItem } from './purchase.models';

// Customer
export { Customer, CustomerLoyalty } from './customer.models';

// Loyalty
export { LoyaltyProgram, LoyaltyTier, LoyaltyReward, PointTransaction, RewardRedemption } from './loyalty.models';

// Promo & Voucher
export { Promo, PromoProduct, PromoCategory, Voucher } from './promo.models';

// CRM
export { CrmCustomer, CrmContact, CrmInteraction, CrmTicket, CrmTicketComment, CrmForecast, CrmAutomationRule, CrmDocument, CrmSegment } from './crm.models';

// Kitchen
export { KitchenOrder, KitchenOrderItem, KitchenRecipe, KitchenRecipeIngredient, KitchenInventoryItem, KitchenSettings } from './kitchen.models';

// Table & Reservation
export { Table, TableSession, Reservation } from './table.models';

// Employee & Schedule
export { Employee, EmployeeSchedule, ShiftTemplate } from './employee.models';

// HRIS
export { EmployeeAttendance, AttendanceDevice, LeaveType, LeaveRequest, LeaveBalance, PayrollRun, EmployeeSalary, KPITemplate, PerformanceReview } from './hris.models';

// Finance
export { FinanceAccount, JournalEntry, JournalEntryLine, FinanceTransaction, FinanceInvoice, FinanceInvoiceItem, FinancePayment, FinanceBudget, TaxSetting } from './finance.models';

// SFA
export { SfaTeam, SfaTeamMember, SfaTerritory, SfaVisit, SfaLead, SfaOpportunity, SfaFieldOrder, SfaFieldOrderItem, SfaTarget, SfaTargetAssignment, SfaIncentiveScheme, SfaQuotation } from './sfa.models';

// Marketing
export { MktCampaign, MktCampaignChannel, MktSegment, MktPromotion, MktBudget } from './marketing.models';

// Fleet
export { FleetVehicle, FleetDriver, FleetGpsLocation, FleetMaintenanceSchedule, FleetFuelTransaction, GeofenceLocation } from './fleet.models';

// TMS
export { TmsShipment, TmsCarrier, TmsRateCard, TmsTrackingEvent } from './tms.models';

// Manufacturing
export { MfgWorkCenter, MfgBom, MfgBomItem, MfgRouting, MfgRoutingOperation, MfgWorkOrder, MfgQcTemplate, MfgQcInspection, MfgProductionPlan, MfgWasteRecord } from './manufacturing.models';

// Asset
export { Asset, AssetCategory, AssetMovement, AssetMaintenanceSchedule } from './asset.models';

// Project
export { PjmProject, PjmTask, PjmMilestone, PjmTimesheet, PjmRisk } from './project.models';

// Procurement
export { EprVendor, EprProcurementRequest, EprRfq, EprRfqResponse, EprContract } from './procurement.models';

// EXIM
export { EximShipment, EximContainer, EximCustoms, EximLC, EximPartner, EximDocument } from './exim.models';

// Billing
export { SubscriptionPackage, Subscription, BillingInvoice, PaymentTransaction, UsageRecord } from './billing.models';

// Admin & System
export { AuditLog, SystemBackup, Notification, NotificationSetting, SystemAlert, AlertSubscription, Webhook, StoreSetting, SyncLog, IntegrationConfig, Announcement } from './admin.models';

// ==================== ASSOCIATIONS ====================
import { Tenant, User, Role, BusinessType, Module, TenantModule } from './auth.models';
import { Branch, BranchModule, BranchSetup } from './branch.models';
import { Category, Product, ProductVariant, ProductPrice } from './product.models';
import { PosTransaction, PosTransactionItem, Shift, HeldTransaction } from './pos.models';
import { Warehouse, Location, Stock, StockMovement, StockAdjustment, StockAdjustmentItem, StockOpname, StockOpnameItem } from './inventory.models';
import { Supplier, PurchaseOrder, PurchaseOrderItem, GoodsReceipt, GoodsReceiptItem } from './purchase.models';
import { Customer, CustomerLoyalty } from './customer.models';
import { LoyaltyProgram, LoyaltyTier, LoyaltyReward, PointTransaction, RewardRedemption } from './loyalty.models';
import { Promo, PromoProduct, PromoCategory, Voucher } from './promo.models';
import { CrmCustomer, CrmContact, CrmInteraction, CrmTicket, CrmTicketComment, CrmForecast } from './crm.models';
import { KitchenOrder, KitchenOrderItem, KitchenRecipe, KitchenRecipeIngredient } from './kitchen.models';
import { Table, TableSession, Reservation } from './table.models';
import { Employee, EmployeeSchedule } from './employee.models';
import { EmployeeAttendance, LeaveRequest, LeaveBalance, PayrollRun, EmployeeSalary, PerformanceReview } from './hris.models';
import { FinanceAccount, JournalEntry, JournalEntryLine, FinanceInvoice, FinanceInvoiceItem, FinancePayment, FinanceBudget } from './finance.models';
import { SfaTeam, SfaTeamMember, SfaTerritory, SfaVisit, SfaLead, SfaOpportunity, SfaFieldOrder, SfaFieldOrderItem, SfaTarget, SfaTargetAssignment, SfaQuotation } from './sfa.models';
import { MktCampaign, MktCampaignChannel } from './marketing.models';
import { FleetVehicle, FleetDriver, FleetGpsLocation, FleetMaintenanceSchedule, FleetFuelTransaction } from './fleet.models';
import { TmsShipment, TmsTrackingEvent } from './tms.models';
import { MfgBom, MfgBomItem, MfgRouting, MfgRoutingOperation, MfgWorkOrder, MfgQcInspection } from './manufacturing.models';
import { Asset, AssetCategory, AssetMovement, AssetMaintenanceSchedule } from './asset.models';
import { PjmProject, PjmTask, PjmMilestone, PjmTimesheet, PjmRisk } from './project.models';
import { EprVendor, EprRfq, EprRfqResponse, EprContract } from './procurement.models';
import { EximShipment, EximContainer, EximCustoms, EximDocument } from './exim.models';
import { SubscriptionPackage, Subscription, BillingInvoice, PaymentTransaction } from './billing.models';
import { AuditLog, Notification, SystemAlert, AlertSubscription } from './admin.models';

export function setupAssociations(): void {
  // Tenant
  Tenant.hasMany(User, { foreignKey: 'tenant_id' });
  Tenant.hasMany(Branch, { foreignKey: 'tenant_id' });
  Tenant.hasMany(TenantModule, { foreignKey: 'tenant_id' });
  Tenant.belongsTo(BusinessType, { foreignKey: 'business_type_id' });

  // User
  User.belongsTo(Tenant, { foreignKey: 'tenant_id' });
  User.belongsTo(Branch, { foreignKey: 'branch_id' });

  // Branch
  Branch.belongsTo(Tenant, { foreignKey: 'tenant_id' });
  Branch.hasMany(User, { foreignKey: 'branch_id' });
  Branch.hasMany(BranchModule, { foreignKey: 'branch_id' });
  Branch.hasOne(BranchSetup, { foreignKey: 'branch_id' });

  // Module
  TenantModule.belongsTo(Tenant, { foreignKey: 'tenant_id' });
  TenantModule.belongsTo(Module, { foreignKey: 'module_id' });
  BranchModule.belongsTo(Branch, { foreignKey: 'branch_id' });
  BranchModule.belongsTo(Module, { foreignKey: 'module_id' });

  // Product
  Category.hasMany(Product, { foreignKey: 'category_id' });
  Category.hasMany(Category, { foreignKey: 'parent_id', as: 'children' });
  Product.belongsTo(Category, { foreignKey: 'category_id' });
  Product.hasMany(ProductVariant, { foreignKey: 'product_id' });
  Product.hasMany(ProductPrice, { foreignKey: 'product_id' });
  Product.hasMany(Stock, { foreignKey: 'product_id' });
  ProductVariant.belongsTo(Product, { foreignKey: 'product_id' });

  // POS
  PosTransaction.belongsTo(Branch, { foreignKey: 'branch_id' });
  PosTransaction.belongsTo(User, { foreignKey: 'cashier_id', as: 'cashier' });
  PosTransaction.belongsTo(Customer, { foreignKey: 'customer_id' });
  PosTransaction.belongsTo(Table, { foreignKey: 'table_id' });
  PosTransaction.belongsTo(Shift, { foreignKey: 'shift_id' });
  PosTransaction.hasMany(PosTransactionItem, { foreignKey: 'transaction_id', as: 'items' });
  PosTransactionItem.belongsTo(PosTransaction, { foreignKey: 'transaction_id' });
  PosTransactionItem.belongsTo(Product, { foreignKey: 'product_id' });
  Shift.belongsTo(Branch, { foreignKey: 'branch_id' });
  Shift.belongsTo(User, { foreignKey: 'cashier_id' });
  Shift.hasMany(PosTransaction, { foreignKey: 'shift_id' });

  // Inventory
  Warehouse.hasMany(Location, { foreignKey: 'warehouse_id' });
  Warehouse.hasMany(Stock, { foreignKey: 'warehouse_id' });
  Location.belongsTo(Warehouse, { foreignKey: 'warehouse_id' });
  Stock.belongsTo(Product, { foreignKey: 'product_id' });
  Stock.belongsTo(Warehouse, { foreignKey: 'warehouse_id' });
  StockAdjustment.hasMany(StockAdjustmentItem, { foreignKey: 'adjustment_id', as: 'items' });
  StockAdjustmentItem.belongsTo(StockAdjustment, { foreignKey: 'adjustment_id' });
  StockOpname.hasMany(StockOpnameItem, { foreignKey: 'opname_id', as: 'items' });
  StockOpnameItem.belongsTo(StockOpname, { foreignKey: 'opname_id' });

  // Purchase
  PurchaseOrder.belongsTo(Supplier, { foreignKey: 'supplier_id' });
  PurchaseOrder.hasMany(PurchaseOrderItem, { foreignKey: 'purchase_order_id', as: 'items' });
  PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'purchase_order_id' });
  PurchaseOrderItem.belongsTo(Product, { foreignKey: 'product_id' });
  GoodsReceipt.belongsTo(PurchaseOrder, { foreignKey: 'purchase_order_id' });
  GoodsReceipt.belongsTo(Supplier, { foreignKey: 'supplier_id' });
  GoodsReceipt.hasMany(GoodsReceiptItem, { foreignKey: 'goods_receipt_id', as: 'items' });
  GoodsReceiptItem.belongsTo(GoodsReceipt, { foreignKey: 'goods_receipt_id' });

  // Customer & Loyalty
  Customer.hasOne(CustomerLoyalty, { foreignKey: 'customer_id' });
  CustomerLoyalty.belongsTo(Customer, { foreignKey: 'customer_id' });
  CustomerLoyalty.belongsTo(LoyaltyProgram, { foreignKey: 'loyalty_program_id' });
  LoyaltyProgram.hasMany(LoyaltyTier, { foreignKey: 'program_id' });
  LoyaltyProgram.hasMany(LoyaltyReward, { foreignKey: 'program_id' });
  LoyaltyTier.belongsTo(LoyaltyProgram, { foreignKey: 'program_id' });

  // CRM
  CrmCustomer.belongsTo(Customer, { foreignKey: 'customer_id' });
  CrmCustomer.hasMany(CrmContact, { foreignKey: 'crm_customer_id' });
  CrmCustomer.hasMany(CrmInteraction, { foreignKey: 'crm_customer_id' });
  CrmCustomer.hasMany(CrmTicket, { foreignKey: 'crm_customer_id' });
  CrmTicket.hasMany(CrmTicketComment, { foreignKey: 'ticket_id' });

  // Kitchen
  KitchenOrder.hasMany(KitchenOrderItem, { foreignKey: 'kitchen_order_id', as: 'items' });
  KitchenOrderItem.belongsTo(KitchenOrder, { foreignKey: 'kitchen_order_id' });
  KitchenRecipe.hasMany(KitchenRecipeIngredient, { foreignKey: 'recipe_id', as: 'ingredients' });
  KitchenRecipeIngredient.belongsTo(KitchenRecipe, { foreignKey: 'recipe_id' });

  // Table
  Table.hasMany(TableSession, { foreignKey: 'table_id' });
  Table.hasMany(Reservation, { foreignKey: 'table_id' });
  TableSession.belongsTo(Table, { foreignKey: 'table_id' });

  // Employee
  Employee.belongsTo(Branch, { foreignKey: 'branch_id' });
  Employee.belongsTo(User, { foreignKey: 'user_id' });
  Employee.hasMany(EmployeeAttendance, { foreignKey: 'employee_id' });
  Employee.hasMany(EmployeeSchedule, { foreignKey: 'employee_id' });
  Employee.hasMany(LeaveRequest, { foreignKey: 'employee_id' });
  Employee.hasMany(LeaveBalance, { foreignKey: 'employee_id' });
  Employee.hasMany(PerformanceReview, { foreignKey: 'employee_id' });

  // Payroll
  PayrollRun.hasMany(EmployeeSalary, { foreignKey: 'payroll_run_id', as: 'salaries' });
  EmployeeSalary.belongsTo(PayrollRun, { foreignKey: 'payroll_run_id' });
  EmployeeSalary.belongsTo(Employee, { foreignKey: 'employee_id' });

  // Finance
  FinanceAccount.hasMany(FinanceAccount, { foreignKey: 'parent_id', as: 'children' });
  JournalEntry.hasMany(JournalEntryLine, { foreignKey: 'journal_entry_id', as: 'lines' });
  JournalEntryLine.belongsTo(JournalEntry, { foreignKey: 'journal_entry_id' });
  JournalEntryLine.belongsTo(FinanceAccount, { foreignKey: 'account_id' });
  FinanceInvoice.hasMany(FinanceInvoiceItem, { foreignKey: 'invoice_id', as: 'items' });
  FinanceInvoice.hasMany(FinancePayment, { foreignKey: 'invoice_id', as: 'payments' });
  FinanceInvoiceItem.belongsTo(FinanceInvoice, { foreignKey: 'invoice_id' });
  FinancePayment.belongsTo(FinanceInvoice, { foreignKey: 'invoice_id' });

  // SFA
  SfaTeam.hasMany(SfaTeamMember, { foreignKey: 'team_id', as: 'members' });
  SfaTeamMember.belongsTo(SfaTeam, { foreignKey: 'team_id' });
  SfaTeamMember.belongsTo(Employee, { foreignKey: 'employee_id' });
  SfaLead.hasMany(SfaOpportunity, { foreignKey: 'lead_id' });
  SfaOpportunity.belongsTo(SfaLead, { foreignKey: 'lead_id' });
  SfaFieldOrder.hasMany(SfaFieldOrderItem, { foreignKey: 'field_order_id', as: 'items' });
  SfaFieldOrderItem.belongsTo(SfaFieldOrder, { foreignKey: 'field_order_id' });
  SfaTarget.hasMany(SfaTargetAssignment, { foreignKey: 'target_id', as: 'assignments' });
  SfaTargetAssignment.belongsTo(SfaTarget, { foreignKey: 'target_id' });
  SfaQuotation.belongsTo(Customer, { foreignKey: 'customer_id' });

  // Marketing
  MktCampaign.hasMany(MktCampaignChannel, { foreignKey: 'campaign_id', as: 'channels' });
  MktCampaignChannel.belongsTo(MktCampaign, { foreignKey: 'campaign_id' });

  // Fleet
  FleetVehicle.hasMany(FleetGpsLocation, { foreignKey: 'vehicle_id' });
  FleetVehicle.hasMany(FleetMaintenanceSchedule, { foreignKey: 'vehicle_id' });
  FleetVehicle.hasMany(FleetFuelTransaction, { foreignKey: 'vehicle_id' });
  FleetDriver.belongsTo(FleetVehicle, { foreignKey: 'assigned_vehicle_id' });
  FleetDriver.belongsTo(Employee, { foreignKey: 'employee_id' });

  // TMS
  TmsShipment.hasMany(TmsTrackingEvent, { foreignKey: 'shipment_id', as: 'events' });
  TmsTrackingEvent.belongsTo(TmsShipment, { foreignKey: 'shipment_id' });

  // Manufacturing
  MfgBom.hasMany(MfgBomItem, { foreignKey: 'bom_id', as: 'items' });
  MfgBomItem.belongsTo(MfgBom, { foreignKey: 'bom_id' });
  MfgRouting.hasMany(MfgRoutingOperation, { foreignKey: 'routing_id', as: 'operations' });
  MfgRoutingOperation.belongsTo(MfgRouting, { foreignKey: 'routing_id' });
  MfgWorkOrder.belongsTo(MfgBom, { foreignKey: 'bom_id' });
  MfgWorkOrder.belongsTo(MfgRouting, { foreignKey: 'routing_id' });
  MfgWorkOrder.hasMany(MfgQcInspection, { foreignKey: 'work_order_id' });

  // Asset
  Asset.belongsTo(AssetCategory, { foreignKey: 'category_id' });
  Asset.hasMany(AssetMovement, { foreignKey: 'asset_id' });
  Asset.hasMany(AssetMaintenanceSchedule, { foreignKey: 'asset_id' });
  AssetCategory.hasMany(Asset, { foreignKey: 'category_id' });

  // Project
  PjmProject.hasMany(PjmTask, { foreignKey: 'project_id', as: 'tasks' });
  PjmProject.hasMany(PjmMilestone, { foreignKey: 'project_id', as: 'milestones' });
  PjmProject.hasMany(PjmTimesheet, { foreignKey: 'project_id' });
  PjmProject.hasMany(PjmRisk, { foreignKey: 'project_id', as: 'risks' });
  PjmTask.belongsTo(PjmProject, { foreignKey: 'project_id' });

  // Procurement
  EprRfq.hasMany(EprRfqResponse, { foreignKey: 'rfq_id', as: 'responses' });
  EprRfqResponse.belongsTo(EprRfq, { foreignKey: 'rfq_id' });
  EprRfqResponse.belongsTo(EprVendor, { foreignKey: 'vendor_id' });
  EprContract.belongsTo(EprVendor, { foreignKey: 'vendor_id' });

  // EXIM
  EximShipment.hasMany(EximContainer, { foreignKey: 'shipment_id', as: 'containers' });
  EximShipment.hasOne(EximCustoms, { foreignKey: 'shipment_id' });
  EximShipment.hasMany(EximDocument, { foreignKey: 'shipment_id', as: 'documents' });

  // Billing
  SubscriptionPackage.hasMany(Subscription, { foreignKey: 'package_id' });
  Subscription.belongsTo(SubscriptionPackage, { foreignKey: 'package_id' });
  Subscription.belongsTo(Tenant, { foreignKey: 'tenant_id' });
  Subscription.hasMany(BillingInvoice, { foreignKey: 'subscription_id' });
  BillingInvoice.belongsTo(Subscription, { foreignKey: 'subscription_id' });
  BillingInvoice.hasMany(PaymentTransaction, { foreignKey: 'billing_invoice_id' });

  // Notifications
  Notification.belongsTo(User, { foreignKey: 'user_id' });
  AlertSubscription.belongsTo(User, { foreignKey: 'user_id' });
}

export { sequelize };
export default sequelize;
