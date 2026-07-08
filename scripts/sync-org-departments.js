#!/usr/bin/env node
/** Sync org_structures dengan HRIS_DEPARTMENTS + normalisasi dept karyawan legacy */
require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL required');
  process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions:
    DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
      ? {}
      : { ssl: { require: true, rejectUnauthorized: false } },
});

// Inline sync (avoid TS compile on VPS)
const HRIS_DEPARTMENTS = [
  ['MANAGEMENT', 'Manajemen'], ['OPERATIONS', 'Operasional'], ['SALES', 'Penjualan'],
  ['FINANCE', 'Keuangan'], ['ADMINISTRATION', 'Administrasi'], ['WAREHOUSE', 'Gudang'],
  ['CUSTOMER_SERVICE', 'Layanan Pelanggan'], ['IT', 'IT'], ['HR', 'SDM'],
  ['MARKETING', 'Pemasaran'], ['LOGISTICS', 'Logistik'], ['CLINICAL', 'Klinis'],
  ['PHARMACY', 'Farmasi'], ['PRODUCTION', 'Produksi'],
];
const ROOT_CODE = 'NAINCODE-GROUP';
const ROOT_NAME = 'Naincode Inti Teknologi';
const ALIASES = { KITCHEN: 'PRODUCTION', Kitchen: 'PRODUCTION', Operations: 'OPERATIONS', HQ: 'MANAGEMENT', Humanify: 'IT' };

async function main() {
  await sequelize.authenticate();
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS org_structures (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID, name VARCHAR(200) NOT NULL, code VARCHAR(50),
      parent_id UUID, level INTEGER DEFAULT 0, sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  for (const [legacy, canonical] of Object.entries(ALIASES)) {
    const [r] = await sequelize.query(
      `UPDATE employees SET department = :canonical
       WHERE UPPER(TRIM(department)) = UPPER(TRIM(:legacy)) AND department IS DISTINCT FROM :canonical RETURNING id`,
      { replacements: { legacy, canonical } }
    );
    if (r.length) console.log(`  migrated ${r.length} employees: ${legacy} → ${canonical}`);
  }

  let [[root]] = await sequelize.query(`SELECT id FROM org_structures WHERE code = :c LIMIT 1`, { replacements: { c: ROOT_CODE } });
  if (!root?.id) {
    const [[leg]] = await sequelize.query(`SELECT id FROM org_structures WHERE parent_id IS NULL ORDER BY created_at LIMIT 1`);
    if (leg?.id) {
      await sequelize.query(`UPDATE org_structures SET code=:c, name=:n, level=0 WHERE id=:id`, { replacements: { c: ROOT_CODE, n: ROOT_NAME, id: leg.id } });
      root = leg;
    } else {
      const [ins] = await sequelize.query(
        `INSERT INTO org_structures (name, code, level, is_active) VALUES (:n,:c,0,true) RETURNING id`,
        { replacements: { n: ROOT_NAME, c: ROOT_CODE } }
      );
      root = ins[0];
    }
  }

  let order = 0;
  for (const [code, label] of HRIS_DEPARTMENTS) {
    order += 1;
    const [[ex]] = await sequelize.query(`SELECT id FROM org_structures WHERE code=:code LIMIT 1`, { replacements: { code } });
    if (ex?.id) {
      await sequelize.query(
        `UPDATE org_structures SET name=:label, parent_id=:pid, level=1, sort_order=:ord, is_active=true, updated_at=NOW() WHERE id=:id`,
        { replacements: { label, pid: root.id, ord: order, id: ex.id } }
      );
    } else {
      await sequelize.query(
        `INSERT INTO org_structures (name, code, parent_id, level, sort_order, is_active) VALUES (:label,:code,:pid,1,:ord,true)`,
        { replacements: { label, code, pid: root.id, ord: order } }
      );
    }
  }

  const codes = HRIS_DEPARTMENTS.map((d) => d[0]);
  await sequelize.query(
    `UPDATE org_structures SET is_active=false, updated_at=NOW()
     WHERE is_active=true AND code IS NOT NULL AND code NOT IN (:root, :codes) AND code != :root`,
    { replacements: { root: ROOT_CODE, codes } }
  );

  const [[cnt]] = await sequelize.query(
    `SELECT COUNT(*)::int AS c FROM org_structures WHERE is_active=true AND parent_id=:pid`,
    { replacements: { pid: root.id } }
  );
  console.log(`✓ org departemen tersinkron: ${cnt.c} unit aktif di bawah ${ROOT_CODE}`);
  await sequelize.close();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
