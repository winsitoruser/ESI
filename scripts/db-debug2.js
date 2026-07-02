require("dotenv").config({path:require("path").resolve(__dirname,"..",".env")});
process.env.NODE_ENV="production";
var cfg=require("../config/database");
cfg.production.dialectOptions={};
var {Sequelize}=require("sequelize");
var c=cfg.production;
var seq=new Sequelize(c.database,c.username,c.password,{host:c.host,port:c.port||5432,dialect:c.dialect,logging:false,dialectOptions:{}});
// Manually define a Tenant model
var Tenant = seq.define("Tenant", {
  id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
  name: { type: Sequelize.STRING(255) }
}, { tableName: "tenants" });
console.log("Defined Tenant model");
seq.sync().then(function(){
  console.log("Sync done - checking if tenants table exists");
  return seq.query("SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='tenants') AS exists", {type: seq.QueryTypes.SELECT});
}).then(function(r){
  console.log("tenants exists: "+r[0].exists);
  return seq.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name", {type: seq.QueryTypes.SELECT});
}).then(function(r){
  console.log("Tables:");
  r.forEach(function(t){console.log("  "+t.table_name);});
  process.exit(0);
}).catch(function(e){
  console.log("ERR: "+e.message);
  if(e.parent) console.log("SQL: "+e.parent.message);
  process.exit(1);
});
