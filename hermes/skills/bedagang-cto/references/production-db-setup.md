# Production Database Setup (Sequelize Model Sync)

Gunakan ketika deploy ke VPS baru dengan DB PostgreSQL fresh (tidak bisa pakai migrasi karena chain 140+ migrasi rusak/dependensi kompleks).

## Strategi

JANGAN jalankan `npx sequelize db:migrate` untuk fresh production DB — chain migration rusak (FK case mismatch, missing dependencies). Gunakan **Sequelize model sync** langsung.

## Workflow

### 1. Reset Database (Dari VPS)
```bash
# Via postgres user (trust auth)
echo "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO bedagang;" \
  | su - postgres -c "psql -d bedagang_staging"
```

### 2. Script Sync (db-sync-production.js)
```javascript
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const db = require("/opt/bedagang/models");
const sq = db.sequelize;

async function main() {
  // Force sync: drop + recreate
  await sq.sync({ force: true });
  console.log("✅ Tables synced");
  
  // Fix indexes for branchId → branch_id naming mismatch
  const fixes = [
    `CREATE INDEX IF NOT EXISTS "idx_pos_transactions_branch" ON "pos_transactions" ("branch_id")`,
    `ALTER TABLE "pos_transactions" ADD COLUMN IF NOT EXISTS "branchId" UUID`,
  ];
  for (const sql of fixes) {
    try { await sq.query(sql); } catch(e) { /* ignore FK/index errors */ }
  }

  // Seed tenant + users (wrapped in gen_random_uuid())
  const [tenants] = await sq.query(`SELECT id FROM "Tenants" WHERE code = 'PRODUCTION' LIMIT 1`);
  if (tenants.length === 0) {
    await sq.query(`INSERT INTO "Tenants" (id,name,code,status,"subscriptionPlan","setupCompleted","onboardingStep","isActive","businessType","createdAt","updatedAt")
      VALUES (gen_random_uuid(),'Production','PRODUCTION','active','enterprise',true,99,true,'retail',NOW(),NOW())`);
  }
  
  // Seed users with bcrypt
  const bcrypt = require("bcryptjs");
  const hash = await bcrypt.hash("superadmin123", 10);
  await sq.query(`INSERT INTO "Users" (id,email,password,role,name,"tenantId","createdAt","updatedAt")
    VALUES (gen_random_uuid(),'superadmin@bedagang.com',$1,'super_admin','Super Admin',$2,NOW(),NOW())`,
    { bind: [hash, tenantId] });
}
```

## Pitfalls

### ⚠️ Sequential Model Sync dengan `{ force: true }`
- Sebagian model ada FK ke model lain, sehingga order matters. `sync({ force: true })` handle ini otomatis tapi error partial dipertengahan bisa stop seluruh proses.
- **Fix:** Wrap dalam try-catch. Tabel tetap terbuat walau index gagal.

### ⚠️ Column Naming Mismatch (CamelCase vs snake_case)
Beberapa model punya:
```javascript
branchId: {
  type: DataTypes.UUID,
  field: 'branch_id',  // DB column = branch_id
}
```
Tapi di `associate()` ada `CREATE INDEX "pos_transactions_branch_id" ON "pos_transactions" ("branchId")` — ini gagal karena kolom di DB bernama `branch_id`, bukan `branchId`.

**Fix:** Buat index secara manual dengan nama kolom yang benar:
```sql
CREATE INDEX IF NOT EXISTS "idx_pos_transactions_branch" ON "pos_transactions" ("branch_id");
```

### ⚠️ Product model pakai INTEGER id, Category model pakai UUID id
- `Product.id` = INTEGER (autoIncrement)
- `Category.id` = UUID
- `Product.category_id` = INTEGER → references `categories.id` (UUID)
- Sequelize sync bisa gagal karena tipe data mismatch
- **Fix:** Ignore error, tabel tetap terbuat tanpa FK constraint

### ⚠️ .env.development Override
Config di `config/database.js`:
```javascript
require('dotenv').config({ path: '.env.development' });  // Load FIRST
require('dotenv').config();  // Load SECOND (does NOT override)
```
`.env.development` punya `DB_USER=postgres` yang override env var dari shell. **Fix:** Backup/rename `.env.development`:
```bash
mv .env.development .env.development.bak
```

### ⚠️ PostgreSQL Auth untuk `su - postgres`
Default pg_hba.conf untuk AlmaLinux 8 menggunakan `peer` auth untuk local socket.
Setelah instalasi, rubah jadi `md5` atau `trust` untuk user postgres:
```
local   all   all   trust
```
Lalu `systemctl reload postgresql-15`.

## Verifikasi
```bash
# Cek tabel
psql -h localhost -U bedagang -d bedagang_staging -c "\dt"

# Cek count
psql -h localhost -U bedagang -d bedagang_staging -c "SELECT count(*) FROM pg_tables WHERE schemaname='public'"

# Test login via health endpoint
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/auth/login
```
