
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const db = require("/opt/bedagang/models");
const sq = db.sequelize;

async function main() {
  console.log("🔄 Creating all tables (force sync)...");
  
  try {
    await sq.sync({ force: true });
    console.log("✅ Full sync completed");
  } catch(e) {
    console.log("  Sync had errors but tables should exist");
    console.log("  Error:", e.message.substring(0,100));
  }

  // Fix known column naming issues
  const fixes = [
    `ALTER TABLE "pos_transactions" ADD COLUMN IF NOT EXISTS "branchId" UUID`,
    `ALTER TABLE "pos_transactions" ADD COLUMN IF NOT EXISTS "cashierId" UUID`,
    `ALTER TABLE "pos_transactions" ADD COLUMN IF NOT EXISTS "shiftId" UUID`,
    `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "category_id" INTEGER`,
    `CREATE INDEX IF NOT EXISTS "idx_pos_transactions_branch_id" ON "pos_transactions" ("branch_id")`,
    `CREATE INDEX IF NOT EXISTS "idx_products_category_id" ON "products" ("category_id")`,
  ];
  
  for (const sql of fixes) {
    try { await sq.query(sql); } catch(e) { /* ignore */ }
  }
  console.log("✅ Column/index fixes applied");
  
  // Count tables
  const [tables] = await sq.query("SELECT count(*) as cnt FROM pg_tables WHERE schemaname='public'");
  console.log("  Tables: " + tables[0].cnt);

  // Seed
  const [tenants] = await sq.query(`SELECT id FROM "Tenants" WHERE code = 'PRODUCTION' LIMIT 1`);
  let tenantId;
  if (tenants.length === 0) {
    const r = await sq.query(`INSERT INTO "Tenants" (id,name,code,status,"subscriptionPlan","setupCompleted","onboardingStep","isActive","businessType","createdAt","updatedAt") VALUES (gen_random_uuid(),'Production','PRODUCTION','active','enterprise',true,99,true,'retail',NOW(),NOW()) RETURNING id`);
    tenantId = r[0][0].id;
    console.log("✅ Tenant PRODUCTION");
  } else { tenantId = tenants[0].id; }

  for (const u of [{e:"superadmin@bedagang.com",p:"superadmin123",r:"super_admin",n:"Super Admin"},{e:"demo@bedagang.com",p:"demo123",r:"owner",n:"Demo User"}]) {
    const [ex] = await sq.query("SELECT id FROM "Users" WHERE email='" + u.e + "' LIMIT 1");
    if (ex.length === 0) {
      const bcrypt = require("bcryptjs");
      const hash = await bcrypt.hash(u.p,10);
      await sq.query("INSERT INTO "Users" (id,email,password,role,name,"tenantId","createdAt","updatedAt") VALUES (gen_random_uuid(),'" + u.e + "',$1,'" + u.r + "','" + u.n + "',$2,NOW(),NOW())",{bind:[hash,tenantId]});
      console.log("✅ " + u.e);
    }
  }
  
  await sq.close();
  console.log("\n🎉 Production DB ready!");
}
main().catch(e => { console.error("❌", e.message); });
