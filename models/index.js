const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Import sequelize instance
const sequelize = require('../lib/sequelize');

const db = {};

// Import all models
db.User = require('./User')(sequelize, DataTypes);
db.Customer = require('./Customer')(sequelize, DataTypes);
db.Employee = require('./Employee')(sequelize, DataTypes);
db.Category = require('./Category')(sequelize, DataTypes);
db.Product = require('./Product')(sequelize, DataTypes);
db.Supplier = require('./Supplier')(sequelize, DataTypes);
db.Stock = require('./Stock')(sequelize, DataTypes);

// Models that are already defined with sequelize instance
db.StockMovement = require('./StockMovement');
db.StockAdjustment = require('./StockAdjustment');
db.StockAdjustmentItem = require('./StockAdjustmentItem');
db.PurchaseOrder = require('./PurchaseOrder');
db.PurchaseOrderItem = require('./PurchaseOrderItem');
db.SalesOrder = require('./SalesOrder');
db.SalesOrderItem = require('./SalesOrderItem');
db.GoodsReceipt = require('./GoodsReceipt');
db.GoodsReceiptItem = require('./GoodsReceiptItem');
db.PosTransaction = require('./PosTransaction');
db.PosTransactionItem = require('./PosTransactionItem');
db.HeldTransaction = require('./HeldTransaction');
db.Table = require('./Table');
db.Reservation = require('./Reservation');
db.TableSession = require('./TableSession');
db.ProductCostHistory = require('./ProductCostHistory');
db.ProductCostComponent = require('./ProductCostComponent');
db.Shift = require('./Shift');

// Modular System Models
db.Tenant = require('./Tenant')(sequelize);
db.BusinessType = require('./BusinessType')(sequelize);
db.Module = require('./Module')(sequelize);
db.BusinessTypeModule = require('./BusinessTypeModule')(sequelize);
db.TenantModule = require('./TenantModule')(sequelize);
db.ModuleDependency = require('./ModuleDependency')(sequelize);
db.ShiftHandover = require('./ShiftHandover');
db.CustomerLoyalty = require('./CustomerLoyalty');
db.LoyaltyProgram = require('./LoyaltyProgram');
db.LoyaltyTier = require('./LoyaltyTier');
db.LoyaltyReward = require('./LoyaltyReward');
db.PointTransaction = require('./PointTransaction');
db.RewardRedemption = require('./RewardRedemption');
db.Warehouse = require('./Warehouse');
db.Location = require('./Location');
db.StockOpname = require('./StockOpname');
db.StockOpnameItem = require('./StockOpnameItem');
db.IncidentReport = require('./IncidentReport');
db.Recipe = require('./Recipe')(sequelize, DataTypes);
db.RecipeIngredient = require('./RecipeIngredient')(sequelize, DataTypes);
db.RecipeHistory = require('./RecipeHistory')(sequelize, DataTypes);
db.Production = require('./Production')(sequelize, DataTypes);
db.ProductionMaterial = require('./ProductionMaterial')(sequelize, DataTypes);
db.ProductionHistory = require('./ProductionHistory')(sequelize, DataTypes);
db.ProductionWaste = require('./ProductionWaste')(sequelize, DataTypes);
db.ProductPrice = require('./ProductPrice');
db.ProductVariant = require('./ProductVariant');
db.SystemAlert = require('./SystemAlert');
db.AlertSubscription = require('./AlertSubscription');
db.AlertAction = require('./AlertAction');
db.EmployeeSchedule = require('./EmployeeSchedule');
db.ShiftTemplate = require('./ShiftTemplate');
db.Store = require('./Store');
db.Branch = require('./Branch');
db.StoreSetting = require('./StoreSetting');

// Kitchen Models
db.KitchenOrder = require('./KitchenOrder');
db.KitchenOrderItem = require('./KitchenOrderItem');
db.KitchenInventoryItem = require('./KitchenInventoryItem');
db.KitchenInventoryTransaction = require('./KitchenInventoryTransaction');

// Branch Real-time Metrics
db.BranchRealTimeMetrics = require('./BranchRealTimeMetrics');

// Branch Setup & Onboarding
db.BranchSetup = require('./BranchSetup');
db.BranchModule = require('./BranchModule');
db.SyncLog = require('./SyncLog');

// Fleet Models
db.FleetVehicle = require('./FleetVehicle');
db.FleetDriver = require('./FleetDriver');
db.FleetFuelTransaction = require('./FleetFuelTransaction');
db.FleetMaintenanceSchedule = require('./FleetMaintenanceSchedule');
db.FleetRoute = require('./FleetRoute');
db.FleetGpsLocation = require('./FleetGpsLocation');

// Admin Panel Models
db.Partner = require('./Partner');
db.SubscriptionPackage = require('./SubscriptionPackage');
db.PartnerSubscription = require('./PartnerSubscription');
db.PartnerOutlet = require('./PartnerOutlet');
db.PartnerUser = require('./PartnerUser');
db.ActivationRequest = require('./ActivationRequest');

// KYB (Know Your Business) Models
db.KybApplication = require('./KybApplication');
db.KybDocument = require('./KybDocument');

// HRIS Models
db.EmployeeAttendance = require('./EmployeeAttendance');
db.EmployeeKPI = require('./EmployeeKPI');
db.KPITemplate = require('./KPITemplate');
db.KPIScoring = require('./KPIScoring');
db.PerformanceReview = require('./PerformanceReview');
db.LeaveRequest = require('./LeaveRequest');
db.HRISWebhookLog = require('./HRISWebhookLog');

// HRIS — Employee Sub-models
db.EmployeeSalary = require('./EmployeeSalary');
db.EmployeeContract = require('./EmployeeContract');
db.EmployeeClaim = require('./EmployeeClaim');
db.EmployeeDocument = require('./EmployeeDocument');
db.EmployeeEducation = require('./EmployeeEducation');
db.EmployeeFamily = require('./EmployeeFamily');
db.EmployeeCertification = require('./EmployeeCertification');
db.EmployeeSkill = require('./EmployeeSkill');
db.EmployeeWorkExperience = require('./EmployeeWorkExperience');
db.EmployeeMutation = require('./EmployeeMutation');

// HRIS — Payroll Models
db.PayrollRun = require('./PayrollRun');
db.PayrollComponent = require('./PayrollComponent');

// HRIS — Leave Models
db.LeaveType = require('./LeaveType');
db.LeaveBalance = require('./LeaveBalance');
db.LeaveApprovalConfig = require('./LeaveApprovalConfig');

// HRIS — Shift & Attendance Models
db.WorkShift = require('./WorkShift');
db.ShiftSchedule = require('./ShiftSchedule');
db.ShiftRotation = require('./ShiftRotation');
db.GeofenceLocation = require('./GeofenceLocation');
db.AttendanceSetting = require('./AttendanceSetting');

// HRIS — Travel & Expense Models
db.TravelExpense = require('./TravelExpense');
db.TravelRequest = require('./TravelRequest');

// HRIS — Workforce Planning Models
db.HeadcountPlan = require('./HeadcountPlan');
db.ManpowerBudget = require('./ManpowerBudget');

// HRIS — Offboarding & Discipline Models
db.TerminationRequest = require('./TerminationRequest');
db.WarningLetter = require('./WarningLetter');

// HRIS — Reminder Model
db.ContractReminder = require('./ContractReminder');

// Attendance System Models
db.AttendanceDevice = require('./AttendanceDevice');
db.AttendanceDeviceLog = require('./AttendanceDeviceLog');
db.AttendanceSettings = require('./AttendanceSettings');

// Fleet Management Models
db.FleetVehicle = require('./FleetVehicle');
db.FleetDriver = require('./FleetDriver');
db.FleetRoute = require('./FleetRoute');
db.FleetRouteAssignment = require('./FleetRouteAssignment');
db.FleetGpsLocation = require('./FleetGpsLocation');
db.FleetMaintenanceSchedule = require('./FleetMaintenanceSchedule');
db.FleetFuelTransaction = require('./FleetFuelTransaction');
db.FleetVehicleInspection = require('./FleetVehicleInspection');
db.FleetDeliveryProof = require('./FleetDeliveryProof');
db.FleetDriverExpense = require('./FleetDriverExpense');

// Third-party Integration Models
db.IntegrationProvider = require('./IntegrationProvider');
db.IntegrationConfig = require('./IntegrationConfig');
db.IntegrationRequest = require('./IntegrationRequest');
db.IntegrationLog = require('./IntegrationLog');
db.IntegrationWebhook = require('./IntegrationWebhook');

// SFA (Sales Force Automation) Models
db.SfaTerritory = require('./SfaTerritory')(sequelize);
db.SfaLead = require('./SfaLead')(sequelize);
db.SfaOpportunity = require('./SfaOpportunity')(sequelize);
db.SfaActivity = require('./SfaActivity')(sequelize);
db.SfaVisit = require('./SfaVisit')(sequelize);
db.SfaTarget = require('./SfaTarget')(sequelize);
db.SfaQuotation = require('./SfaQuotation')(sequelize);
db.SfaQuotationItem = require('./SfaQuotationItem')(sequelize);
db.SfaRoutePlan = require('./SfaRoutePlan')(sequelize);

// SFA Enhanced Models (Teams, Targets, Achievements, Incentives, Plafon, Parameters)
db.SfaTeam = require('./SfaTeam')(sequelize);
db.SfaTeamMember = require('./SfaTeamMember')(sequelize);
db.SfaTargetGroup = require('./SfaTargetGroup')(sequelize);
db.SfaTargetAssignment = require('./SfaTargetAssignment')(sequelize);
db.SfaTargetProduct = require('./SfaTargetProduct')(sequelize);
db.SfaAchievement = require('./SfaAchievement')(sequelize);
db.SfaAchievementDetail = require('./SfaAchievementDetail')(sequelize);
db.SfaIncentiveScheme = require('./SfaIncentiveScheme')(sequelize);
db.SfaIncentiveTier = require('./SfaIncentiveTier')(sequelize);
db.SfaIncentiveCalculation = require('./SfaIncentiveCalculation')(sequelize);
db.SfaPlafon = require('./SfaPlafon')(sequelize);
db.SfaPlafonUsage = require('./SfaPlafonUsage')(sequelize);
db.SfaParameter = require('./SfaParameter')(sequelize);

// SFA Advanced Models (Coverage, Field Orders, Display, Competitor, Survey, Approval, Geofence, Commission)
db.SfaCoveragePlan = require('./SfaCoveragePlan')(sequelize);
db.SfaCoverageAssignment = require('./SfaCoverageAssignment')(sequelize);
db.SfaFieldOrder = require('./SfaFieldOrder')(sequelize);
db.SfaFieldOrderItem = require('./SfaFieldOrderItem')(sequelize);
db.SfaDisplayAudit = require('./SfaDisplayAudit')(sequelize);
db.SfaDisplayItem = require('./SfaDisplayItem')(sequelize);
db.SfaCompetitorActivity = require('./SfaCompetitorActivity')(sequelize);
db.SfaSurveyTemplate = require('./SfaSurveyTemplate')(sequelize);
db.SfaSurveyQuestion = require('./SfaSurveyQuestion')(sequelize);
db.SfaSurveyResponse = require('./SfaSurveyResponse')(sequelize);
db.SfaApprovalWorkflow = require('./SfaApprovalWorkflow')(sequelize);
db.SfaApprovalStep = require('./SfaApprovalStep')(sequelize);
db.SfaApprovalRequest = require('./SfaApprovalRequest')(sequelize);
db.SfaGeofence = require('./SfaGeofence')(sequelize);
db.SfaProductCommission = require('./SfaProductCommission')(sequelize);
db.SfaCommissionGroup = require('./SfaCommissionGroup')(sequelize);
db.SfaCommissionGroupProduct = require('./SfaCommissionGroupProduct')(sequelize);
db.SfaOutletTarget = require('./SfaOutletTarget')(sequelize);
db.SfaSalesStrategy = require('./SfaSalesStrategy')(sequelize);
db.SfaStrategyKpi = require('./SfaStrategyKpi')(sequelize);

// Marketing Models
db.MktCampaign = require('./MktCampaign')(sequelize);
db.MktCampaignChannel = require('./MktCampaignChannel')(sequelize);
db.MktSegment = require('./MktSegment')(sequelize);
db.MktSegmentRule = require('./MktSegmentRule')(sequelize);
db.MktPromotion = require('./MktPromotion')(sequelize);
db.MktPromotionUsage = require('./MktPromotionUsage')(sequelize);
db.MktContentAsset = require('./MktContentAsset')(sequelize);
db.MktBudget = require('./MktBudget')(sequelize);
db.MktBudgetItem = require('./MktBudgetItem')(sequelize);
db.MktCampaignAudience = require('./MktCampaignAudience')(sequelize);

// CRM Models (Customer 360°, Communication, Tasks, Forecasting, Service, Automation, Documents, Analytics)
db.CrmCustomer = require('./CrmCustomer')(sequelize);
db.CrmContact = require('./CrmContact')(sequelize);
db.CrmInteraction = require('./CrmInteraction')(sequelize);
db.CrmCustomerSegment = require('./CrmCustomerSegment')(sequelize);
db.CrmCustomerTag = require('./CrmCustomerTag')(sequelize);
db.CrmCommunication = require('./CrmCommunication')(sequelize);
db.CrmFollowUp = require('./CrmFollowUp')(sequelize);
db.CrmEmailTemplate = require('./CrmEmailTemplate')(sequelize);
db.CrmCommCampaign = require('./CrmCommCampaign')(sequelize);
db.CrmTask = require('./CrmTask')(sequelize);
db.CrmTaskTemplate = require('./CrmTaskTemplate')(sequelize);
db.CrmCalendarEvent = require('./CrmCalendarEvent')(sequelize);
db.CrmForecast = require('./CrmForecast')(sequelize);
db.CrmForecastItem = require('./CrmForecastItem')(sequelize);
db.CrmDealScore = require('./CrmDealScore')(sequelize);
db.CrmTicket = require('./CrmTicket')(sequelize);
db.CrmTicketComment = require('./CrmTicketComment')(sequelize);
db.CrmSlaPolicy = require('./CrmSlaPolicy')(sequelize);
db.CrmSatisfaction = require('./CrmSatisfaction')(sequelize);
db.CrmAutomationRule = require('./CrmAutomationRule')(sequelize);
db.CrmAutomationLog = require('./CrmAutomationLog')(sequelize);
db.CrmDocument = require('./CrmDocument')(sequelize);
db.CrmDocumentTemplate = require('./CrmDocumentTemplate')(sequelize);
db.CrmSavedReport = require('./CrmSavedReport')(sequelize);
db.CrmCustomDashboard = require('./CrmCustomDashboard')(sequelize);

// Manufacturing Models
db.MfgWorkCenter = require('./MfgWorkCenter')(sequelize);
db.MfgBom = require('./MfgBom')(sequelize);
db.MfgBomItem = require('./MfgBomItem')(sequelize);
db.MfgRouting = require('./MfgRouting')(sequelize);
db.MfgRoutingOperation = require('./MfgRoutingOperation')(sequelize);
db.MfgWorkOrder = require('./MfgWorkOrder')(sequelize);
db.MfgWoMaterial = require('./MfgWoMaterial')(sequelize);
db.MfgWoOperation = require('./MfgWoOperation')(sequelize);
db.MfgWoOutput = require('./MfgWoOutput')(sequelize);
db.MfgQcTemplate = require('./MfgQcTemplate')(sequelize);
db.MfgQcInspection = require('./MfgQcInspection')(sequelize);
db.MfgQcResult = require('./MfgQcResult')(sequelize);
db.MfgMachine = require('./MfgMachine')(sequelize);
db.MfgMaintenanceRecord = require('./MfgMaintenanceRecord')(sequelize);
db.MfgProductionPlan = require('./MfgProductionPlan')(sequelize);
db.MfgProductionPlanItem = require('./MfgProductionPlanItem')(sequelize);
db.MfgWasteRecord = require('./MfgWasteRecord')(sequelize);
db.MfgProductionCost = require('./MfgProductionCost')(sequelize);
db.MfgShiftProduction = require('./MfgShiftProduction')(sequelize);
db.MfgSetting = require('./MfgSetting')(sequelize);

// Project Management Models
db.PjmProject = require('./PjmProject')(sequelize);
db.PjmTask = require('./PjmTask')(sequelize);
db.PjmMilestone = require('./PjmMilestone')(sequelize);
db.PjmTimesheet = require('./PjmTimesheet')(sequelize);
db.PjmResource = require('./PjmResource')(sequelize);
db.PjmRisk = require('./PjmRisk')(sequelize);
db.PjmBudget = require('./PjmBudget')(sequelize);
db.PjmDocument = require('./PjmDocument')(sequelize);
db.PjmSetting = require('./PjmSetting')(sequelize);
db.PjmSprint = require('./PjmSprint')(sequelize);
db.PjmComment = require('./PjmComment')(sequelize);
db.PjmActivityLog = require('./PjmActivityLog')(sequelize);
db.PjmAttachment = require('./PjmAttachment')(sequelize);
db.PjmApproval = require('./PjmApproval')(sequelize);
db.PjmDependency = require('./PjmDependency')(sequelize);
db.PjmWatcher = require('./PjmWatcher')(sequelize);
db.PjmBaseline = require('./PjmBaseline')(sequelize);

// E-Procurement Models
db.EprVendor = require('./EprVendor')(sequelize);
db.EprRfq = require('./EprRfq')(sequelize);
db.EprRfqItem = require('./EprRfqItem')(sequelize);
db.EprRfqResponse = require('./EprRfqResponse')(sequelize);
db.EprTender = require('./EprTender')(sequelize);
db.EprTenderBid = require('./EprTenderBid')(sequelize);
db.EprProcurementRequest = require('./EprProcurementRequest')(sequelize);
db.EprContract = require('./EprContract')(sequelize);
db.EprEvaluation = require('./EprEvaluation')(sequelize);
db.EprSetting = require('./EprSetting')(sequelize);

// Export-Import Models
db.EximShipment = require('./EximShipment')(sequelize);
db.EximDocument = require('./EximDocument')(sequelize);
db.EximCustoms = require('./EximCustoms')(sequelize);
db.EximLC = require('./EximLC')(sequelize);
db.EximContainer = require('./EximContainer')(sequelize);
db.EximPartner = require('./EximPartner')(sequelize);
db.EximCost = require('./EximCost')(sequelize);
db.EximHsCode = require('./EximHsCode')(sequelize);
db.EximSetting = require('./EximSetting')(sequelize);

// Finance Models
db.FinanceAccount = require('./FinanceAccount');
db.FinanceBudget = require('./FinanceBudget');
db.FinanceInvoice = require('./FinanceInvoice');
db.FinanceInvoiceItem = require('./FinanceInvoiceItem');
db.FinanceInvoicePayment = require('./FinanceInvoicePayment');
db.FinancePayable = require('./FinancePayable');
db.FinancePayablePayment = require('./FinancePayablePayment');
db.FinanceReceivable = require('./FinanceReceivable');
db.FinanceReceivablePayment = require('./FinanceReceivablePayment');
db.FinanceTransaction = require('./FinanceTransaction');

// Kitchen Extended Models
db.KitchenRecipe = require('./KitchenRecipe');
db.KitchenRecipeIngredient = require('./KitchenRecipeIngredient');
db.KitchenSettings = require('./KitchenSettings');
db.KitchenStaff = require('./KitchenStaff');

// Promo Models
db.Promo = require('./Promo');
db.PromoBundle = require('./PromoBundle');
db.PromoCategory = require('./PromoCategory');
db.PromoProduct = require('./PromoProduct');

// Supply Chain Models
db.InternalRequisition = require('./InternalRequisition');
db.InternalRequisitionItem = require('./InternalRequisitionItem');

// Additional Models
db.AuditLog = require('./AuditLog');
db.TransactionBlock = require('./TransactionBlock');
db.ChainVerificationLog = require('./ChainVerificationLog');
db.AuditReceipt = require('./AuditReceipt');

db.Notification = require('./Notification');
db.NotificationSetting = require('./NotificationSetting');
db.OutletIntegration = require('./OutletIntegration');
db.PartnerIntegration = require('./PartnerIntegration');
db.PriceTier = require('./PriceTier');
db.PrinterConfig = require('./PrinterConfig');
db.Role = require('./Role');
db.SystemBackup = require('./SystemBackup');
db.Unit = require('./Unit');
db.Voucher = require('./Voucher');

// Asset Management Models
db.Asset = require('./Asset');
db.AssetCategory = require('./AssetCategory');
db.AssetLicense = require('./AssetLicense');
db.AssetMovement = require('./AssetMovement');
db.AssetMaintenanceSchedule = require('./AssetMaintenanceSchedule');
db.AssetTenancy = require('./AssetTenancy');
db.AssetWorkOrder = require('./AssetWorkOrder');

// Subscription & Billing Models (factory-style - MUST be invoked with sequelize)
db.Plan = require('./Plan')(sequelize);
db.PlanLimit = require('./PlanLimit')(sequelize);
db.Subscription = require('./Subscription')(sequelize);
db.BillingCycle = require('./BillingCycle')(sequelize);
db.Invoice = require('./Invoice')(sequelize);
db.InvoiceItem = require('./InvoiceItem')(sequelize);
db.PaymentTransaction = require('./PaymentTransaction')(sequelize);
db.UsageMetric = require('./UsageMetric')(sequelize);
db.ModulePricing = require('./ModulePricing')(sequelize);

// Load associations if they exist
// Associations are defined in the models themselves or in separate files
console.log('Loading model associations...');
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    try {
      console.log(`Loading associations for ${modelName}...`);
      db[modelName].associate(db);
      console.log(`✓ Associations loaded for ${modelName}`);
    } catch (error) {
      console.warn(`Warning: Could not load associations for ${modelName}:`, error.message);
    }
  }
});
console.log('All associations loaded.');

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
