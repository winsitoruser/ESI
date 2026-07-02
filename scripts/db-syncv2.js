require("dotenv").config({path:require("path").resolve(__dirname,"..",".env")});
process.env.NODE_ENV="production";
var cfg=require("../config/database");
cfg.production.dialectOptions={};
var db=require("../models");
async function run(){
  await db.sequelize.authenticate();
  console.log("Connected. Syncing...");
  await db.sequelize.sync();
  console.log("Sync pass 1 done.");
  var rows = await db.sequelize.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name",
    {type: db.sequelize.QueryTypes.SELECT}
  );
  var names = rows.map(function(r){return r.table_name;});
  console.log("Tables ("+names.length+"):");
  names.forEach(function(n){console.log("  "+n);});
  process.exit(0);
}
run().catch(function(e){
  console.log("ERR: "+e.message);
  if(e.parent) console.log("SQL: "+e.parent.message);
  process.exit(1);
});
