# DB Schema Fix — Non-Intrusive Approach

Digunakan saat Sequelize migration chain rusak / incomplete, tetapi tabel sudah ada dari `sync()`.

## Diagnosis Flow

```
Error: column "is_active" does not exist
```

```
Error: relation "notifications" does not exist  
```

```
Error: relation "Employees" does not exist
```

Semua error di atas punya 1 akar: **migration belum di-run** atau **migration gagal karena FK case-sensitive**.

## Step-by-Step Fix

## 1. Cek kondisi DB

```bash
cd /Users/winnerharry/Bedagang\\ ERP/bedagang---PoS

# Cek koneksi PostgreSQL — jangan pakai pg_isready jika Postgres.app
# Postgres.app binary tidak di PATH → gunakan Sequelize langsung
node -e "
const { Sequelize } = require('sequelize');
const config = require('./config/database');
const sq = new Sequelize(config.development.database, config.development.username, config.development.password, {
  host: config.development.host, port: config.development.port, dialect: config.development.dialect, logging: false
});
async function main() {
  console.log('Tables:', t.length);
  await sq.close();
}
main().catch(e => { console.error(e.message); process.exit(1); });
"

# Cek pending migrations
npx sequelize-cli db:migrate:status | grep "down"
```

### 2. Scan missing columns per tabel

```javascript
const sfaTables = ['sfa_teams','sfa_targets','sfa_target_groups',
  'sfa_team_members','sfa_visits','sfa_activities','sfa_leads',
  'sfa_opportunities','sfa_field_orders','sfa_quotations',
  'sfa_coverage_plans','sfa_route_plans','sfa_product_commissions',
  'sfa_sales_strategies'];
const neededCols = ['is_active','total','net_amount','metadata'];

for (const tbl of sfaTables) {
  const [cols] = await sq.query(`SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='${tbl}'`);
  const colNames = cols.map(c => c.column_name);
  const missing = neededCols.filter(c => !colNames.includes(c));
  if (missing.length > 0) console.log(tbl, 'MISSING:', missing.join(', '));
}
```

### 3. Fix dengan ALTER TABLE

```javascript
const fixes = [
  { table: 'sfa_targets', col: 'is_active', type: 'BOOLEAN DEFAULT true' },
  { table: 'sfa_targets', col: 'total', type: 'DECIMAL(18,2) DEFAULT 0' },
  // ... semua kombinasi tabel+kolom yang kurang
];
for (const fix of fixes) {
  await sq.query(`ALTER TABLE "${fix.table}" ADD COLUMN IF NOT EXISTS "${fix.col}" ${fix.type}`);
}
```

### 4. Buat tabel yang belum ada

```javascript
await sq.query(`CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "user_id" UUID, "title" VARCHAR(255), "message" TEXT,
  "type" VARCHAR(50), "is_read" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
)`);

await sq.query(`CREATE TABLE IF NOT EXISTS "transaction_blocks" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "block_number" INTEGER UNIQUE, "block_hash" VARCHAR(128),
  "previous_block_hash" VARCHAR(128),
  "created_at" TIMESTAMPTZ DEFAULT NOW()
)`);
```

### 5. Register di SequelizeMeta

```javascript
const pendingMigrations = [
  '20260228000002-create-branches-table.js',
  '20260228000003-create-store-settings-table.js',
  // ... semua migration yang statusnya "down"
];
for (const m of pendingMigrations) {
  await sq.query(`INSERT INTO "SequelizeMeta" ("name") VALUES ('${m}') ON CONFLICT DO NOTHING`);
}
```

### 6. Restart server & verify

```bash
kill $(lsof -ti :3001)
npm run dev --port=3001 &
sleep 8
curl -sL -o /dev/null -w "%{http_code}:%{url_effective}" http://localhost:3001
# Browser: login, cek console = zero errors
```

## Mengapa migration `db:migrate` gagal?

1. **Hanya 26 dari 140 migrations** yang tercatat di `SequelizeMeta` — sisanya skip/tidak pernah di-run
2. **Tabel sudah ada** dari Sequelize `sync()` — `CREATE TABLE IF NOT EXISTS` skip, tapi FK reference crash
3. **Case-sensitive FK** — Migration pake `REFERENCES "Employees"` (quoted), tabel aktual `employees` (lowercase)
4. **FK dependency chain** — Migration A reference tabel B yang belum dibuat

Pendekatan ALTER TABLE langsung menghindari semua masalah di atas.
