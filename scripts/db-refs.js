require("dotenv").config({path:require("path").resolve(__dirname,"..",".env")});
process.env.NODE_ENV="production";
var cfg=require("../config/database");
cfg.production.dialectOptions={};
var db=require("../models");
// Check which models reference branchId
var refs = {};
Object.keys(db.sequelize.models).forEach(function(name){
  var model = db.sequelize.models[name];
  if(model && model.tableAttributes){
    var attrs = model.tableAttributes;
    Object.keys(attrs).forEach(function(attr){
      var col = attrs[attr];
      if(col.references && col.references.model){
        var ref = typeof col.references.model === 'string' ? col.references.model : (col.references.model.tableName || col.references.model.name);
        if(!refs[ref]) refs[ref] = [];
        refs[ref].push(name + "." + attr + "->" + ref + "." + (col.references.key || "id"));
      }
    });
  }
});
Object.keys(refs).sort().forEach(function(ref){
  refs[ref].forEach(function(r){
    console.log(r);
  });
});
process.exit(0);
