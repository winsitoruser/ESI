/**
 * Database Sync Script - creates all missing tables via Sequelize
 * Phase 1: Create core/dependency tables first (no FK issues)
 * Phase 2: Create all remaining tables
 * 
 * Usage: NODE_ENV=production node scripts/db-sync-final.js
 */
require("dotenv").config({path:require("path").resolve(__dirname,"..",".env")});
process.env.NODE_ENV = "production";
var cfg = require("../config/database");
cfg.production.dialectOptions = {};
var db = require("../models");

async function logTableCount(label) {
  var rows = await db.sequelize.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name",
    { type: db.sequelize.QueryTypes.SELECT }
  );
  var names = rows.map(function(r){return r.table_name;});
  console.log(label + " - Tables: " + names.length);
  return names;
}

async function tableExists(name) {
  var r = await db.sequelize.query(
    "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='" + name + "') AS e",
    { type: db.sequelize.QueryTypes.SELECT }
  );
  return r[0].e;
}

async function run() {
  await db.sequelize.authenticate();
  console.log("Connected to " + process.env.DB_NAME);
  
  // Phase 1: Create core tables that are referenced by others
  // Order: tenants -> stores -> branches -> users -> roles -> categories -> suppliers -> etc
  var coreModels = [
    "Tenant", "Role", "Module", "BusinessType", "BusinessTypeModule",
    "Store", "Branch", "Category", "Supplier", "Unit", "Warehouse", "Location",
    "User", "Customer", "Employee", "Product", "Stock", "PriceTier",
    "Plan", "PlanLimit", "SubscriptionPackage", "BillingCycle",
    "Subscription", "Invoice", "InvoiceItem"
  ];
  
  console.log("\nPhase 1 - Creating core tables...");
  for (var i = 0; i < coreModels.length; i++) {
    var name = coreModels[i];
    var model = db.sequelize.models[name];
    if (!model) { 
      console.log("  SKIP " + name + " (not in models)");
      continue; 
    }
    try {
      var exists = await tableExists(model.tableName);
      if (exists) {
        console.log("  OK " + name + " (" + model.tableName + ") - exists");
      } else {
        await model.sync();
        console.log("  ++ " + name + " (" + model.tableName + ") - CREATED");
      }
    } catch(e) {
      console.log("  !! " + name + " - ERROR: " + e.message.substring(0, 80));
    }
  }
  
  await logTableCount("After phase 1");
  
  // Phase 2: Sync all remaining tables
  console.log("\nPhase 2 - Creating all remaining tables...");
  var modelNames = Object.keys(db.sequelize.models);
  var totalCreated = 0;
  var totalErrors = 0;
  
  for (var i = 0; i < modelNames.length; i++) {
    var name = modelNames[i];
    var model = db.sequelize.models[name];
    try {
      var exists = await tableExists(model.tableName);
      if (!exists) {
        await model.sync();
        console.log("  ++ " + name + " (" + model.tableName + ") - CREATED");
        totalCreated++;
      }
    } catch(e) {
      console.log("  !! " + name + " (" + model.tableName + ") - " + e.message.substring(0, 80));
      totalErrors++;
    }
  }
  
  var finalNames = await logTableCount("Final");
  
  console.log("\nSummary:");
  console.log("  Total models: " + modelNames.length);
  console.log("  Final tables: " + finalNames.length);
  console.log("  Created in phase 2: " + totalCreated);
  console.log("  Errors: " + totalErrors);
  
  process.exit(0);
}

run().catch(function(e) {
  console.log("FATAL: " + e.message);
  process.exit(1);
});
