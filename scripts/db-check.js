require("dotenv").config({path:require("path").resolve(__dirname,"..",".env")});
process.env.NODE_ENV="production";
var cfg=require("../config/database");
cfg.production.dialectOptions={};
var {Sequelize}=require("sequelize");
var c=cfg.production;
var seq=new Sequelize(c.database,c.username,c.password,{host:c.host,port:c.port||5432,dialect:c.dialect,logging:false,dialectOptions:{}});
seq.authenticate().then(function(){
  return seq.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name",{type:seq.QueryTypes.SELECT});
}).then(function(rows){
  console.log("Total tables: "+rows.length);
  rows.forEach(function(r){console.log("  "+r.table_name);});
  process.exit(0);
}).catch(function(e){
  console.log("ERR: "+e.message);
  process.exit(1);
});
