require("dotenv").config({path:require("path").resolve(__dirname,"..",".env")});
process.env.NODE_ENV="production";
var cfg=require("../config/database");
cfg.production.dialectOptions={};
var db=require("../models");
var b = db.sequelize.models.Branch;
if(b) {
  console.log("Branch tableName: '" + b.tableName + "'");
  console.log("Branch tableName (fn): '" + b.getTableName() + "'");
  console.log("Branch schema: " + b._schema);
}
var s = db.sequelize.models.Store;
if(s) {
  console.log("Store tableName: '" + s.tableName + "'");
  console.log("Store tableName (fn): '" + s.getTableName() + "'");
}
var t = db.sequelize.models.Tenant;
if(t) {
  console.log("Tenant tableName: '" + t.tableName + "'");
  console.log("Tenant tableName (fn): '" + t.getTableName() + "'");
}
// Check first 5 models defined
var models = Object.keys(db.sequelize.models);
for(var i=0;i<5 && i<models.length;i++){
  var m = db.sequelize.models[models[i]];
  console.log("Model[" + i + "]: " + models[i] + " -> table: " + m.tableName + " (get: " + m.getTableName() + ")");
  // Check references
  if(m.tableAttributes){
    Object.keys(m.tableAttributes).forEach(function(a){
      var col = m.tableAttributes[a];
      if(col.references){
        console.log("  " + a + " refs: " + JSON.stringify(col.references));
      }
    });
  }
}
process.exit(0);
