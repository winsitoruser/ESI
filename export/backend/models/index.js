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

// Third-party Integration Models
db.IntegrationProvider = require('./IntegrationProvider');
db.IntegrationConfig = require('./IntegrationConfig');
db.IntegrationRequest = require('./IntegrationRequest');

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
