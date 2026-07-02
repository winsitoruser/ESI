require("dotenv").config({path:require("path").resolve(__dirname,"..",".env")});
process.env.NODE_ENV = "production";
var cfg = require("../config/database");
cfg.production.dialectOptions = {};
var db = require("../models");

async function run() {
  await db.sequelize.authenticate();
  console.log("Phase 3 - Retrying failed tables...\n");
  
  var modelNames = Object.keys(db.sequelize.models);
  var created = 0, errors = 0;
  
  for (var pass = 0; pass < 3; pass++) {
    console.log("--- Pass " + (pass+1) + " ---");
    var passCreated = 0;
    for (var i = 0; i < modelNames.length; i++) {
      var name = modelNames[i];
      var model = db.sequelize.models[name];
      try {
        var r = await db.sequelize.query(
          "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='" + model.tableName + "') AS e",
          { type: db.sequelize.QueryTypes.SELECT }
        );
        if (!r[0].e) {
          await model.sync();
          console.log("  + " + name + " -> " + model.tableName);
          passCreated++;
        }
      } catch(e) {}
    }
    console.log("  Created in pass " + (pass+1) + ": " + passCreated);
    created += passCreated;
    if (passCreated === 0) break;
  }
  
  // Final count
  var rows = await db.sequelize.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name",
    { type: db.sequelize.QueryTypes.SELECT }
  );
  var names = rows.map(function(r){return r.table_name;});
  
  console.log("\nFinal tables: " + names.length);
  names.forEach(function(n){console.log("  " + n);});
  
  // Count remaining failed models
  var remaining = [];
  for (var i = 0; i < modelNames.length; i++) {
    var model = db.sequelize.models[modelNames[i]];
    var r = await db.sequelize.query(
      "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='" + model.tableName + "') AS e",
      { type: db.sequelize.QueryTypes.SELECT }
    );
    if (!r[0].e) remaining.push(modelNames[i] + " (" + model.tableName + ")");
  }
  if (remaining.length > 0) {
    console.log("\nStill missing (" + remaining.length + "):");
    remaining.forEach(function(n){console.log("  " + n);});
  }
  
  process.exit(0);
}

run().catch(function(e) {
  console.log("FATAL: " + e.message);
  process.exit(1);
});
