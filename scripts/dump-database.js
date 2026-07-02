/**
 * Bedagang ERP - Full Database SQL Dump Script
 * 
 * Connects to PostgreSQL and dumps:
 * 1. Extensions
 * 2. Enum types
 * 3. Sequences
 * 4. Tables (CREATE TABLE with columns, defaults, constraints)
 * 5. Indexes
 * 6. Foreign keys
 * 7. Data (INSERT statements)
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.development' });
require('dotenv').config();

const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'bedagang_dev',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'jakarta123',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  }
);

const OUTPUT_FILE = path.join(__dirname, '..', 'export', 'full_dump.sql');

async function query(sql, replacements) {
  const [results] = await sequelize.query(sql, replacements ? { replacements } : undefined);
  return results;
}

function escapeString(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function getExtensions() {
  const rows = await query(`SELECT extname FROM pg_extension WHERE extname != 'plpgsql' ORDER BY extname`);
  return rows.map(r => `CREATE EXTENSION IF NOT EXISTS "${r.extname}" WITH SCHEMA public;`);
}

async function getEnumTypes() {
  const rows = await query(`
    SELECT t.typname AS enum_name,
           array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname
  `);
  return rows.map(r => {
    let enumVals = r.enum_values;
    // Handle case where array_agg returns a string like "{val1,val2}"
    if (typeof enumVals === 'string') {
      enumVals = enumVals.replace(/^\{/, '').replace(/\}$/, '').split(',');
    }
    const vals = enumVals.map(v => `    '${v}'`).join(',\n');
    return `CREATE TYPE public.${r.enum_name} AS ENUM (\n${vals}\n);`;
  });
}

async function getSequences() {
  const rows = await query(`
    SELECT sequencename, start_value, min_value, max_value, increment_by, cycle,
           last_value, data_type
    FROM pg_sequences
    WHERE schemaname = 'public'
    ORDER BY sequencename
  `);
  const lines = [];
  for (const r of rows) {
    lines.push(`CREATE SEQUENCE IF NOT EXISTS public.${r.sequencename}\n    AS ${r.data_type || 'bigint'}\n    START WITH ${r.start_value || 1}\n    INCREMENT BY ${r.increment_by || 1}\n    NO MINVALUE\n    NO MAXVALUE\n    CACHE 1;`);
  }
  return lines;
}

async function getTables() {
  const rows = await query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename != 'SequelizeMeta'
    ORDER BY tablename
  `);
  return rows.map(r => r.tablename);
}

async function getTableDDL(tableName) {
  // Get columns
  const columns = await query(`
    SELECT 
      c.column_name,
      c.data_type,
      c.udt_name,
      c.character_maximum_length,
      c.numeric_precision,
      c.numeric_scale,
      c.is_nullable,
      c.column_default,
      c.is_identity,
      c.identity_generation
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = ?
    ORDER BY c.ordinal_position
  `, [tableName]);

  if (columns.length === 0) return null;

  const colDefs = [];
  for (const col of columns) {
    let typeName;
    if (col.data_type === 'USER-DEFINED') {
      typeName = `public.${col.udt_name}`;
    } else if (col.data_type === 'character varying') {
      typeName = col.character_maximum_length ? `character varying(${col.character_maximum_length})` : 'character varying';
    } else if (col.data_type === 'numeric') {
      if (col.numeric_precision && col.numeric_scale) {
        typeName = `numeric(${col.numeric_precision},${col.numeric_scale})`;
      } else {
        typeName = 'numeric';
      }
    } else if (col.data_type === 'ARRAY') {
      typeName = `${col.udt_name}[]`;
      if (typeName.startsWith('_')) typeName = typeName.substring(1) + '[]';
    } else {
      typeName = col.data_type;
    }

    let def = `    "${col.column_name}" ${typeName}`;
    if (col.column_default !== null && col.column_default !== undefined) {
      def += ` DEFAULT ${col.column_default}`;
    }
    if (col.is_nullable === 'NO') {
      def += ' NOT NULL';
    }
    colDefs.push(def);
  }

  // Get primary key
  const pks = await query(`
    SELECT kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = ? AND tc.constraint_type = 'PRIMARY KEY'
    ORDER BY kcu.ordinal_position
  `, [tableName]);

  // Get unique constraints
  const uqs = await query(`
    SELECT tc.constraint_name,
           array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public' AND tc.table_name = ? AND tc.constraint_type = 'UNIQUE'
    GROUP BY tc.constraint_name
    ORDER BY tc.constraint_name
  `, [tableName]);

  // Get check constraints (excluding NOT NULL which are already inline)
  const checks = await query(`
    SELECT cc.constraint_name, cc.check_clause
    FROM information_schema.check_constraints cc
    JOIN information_schema.table_constraints tc ON cc.constraint_name = tc.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = ?
      AND cc.check_clause NOT LIKE '%IS NOT NULL%'
    ORDER BY cc.constraint_name
  `, [tableName]);

  const constraints = [];
  if (pks.length > 0) {
    const pkCols = pks.map(p => `"${p.column_name}"`).join(', ');
    constraints.push(`    PRIMARY KEY (${pkCols})`);
  }
  for (const uq of uqs) {
    let uqColArr = uq.columns;
    if (typeof uqColArr === 'string') {
      uqColArr = uqColArr.replace(/^\{/, '').replace(/\}$/, '').split(',');
    }
    const uqCols = uqColArr.map(c => `"${c}"`).join(', ');
    constraints.push(`    CONSTRAINT "${uq.constraint_name}" UNIQUE (${uqCols})`);
  }
  for (const ck of checks) {
    constraints.push(`    CONSTRAINT "${ck.constraint_name}" CHECK (${ck.check_clause})`);
  }

  const allParts = [...colDefs, ...constraints];
  return `CREATE TABLE IF NOT EXISTS public."${tableName}" (\n${allParts.join(',\n')}\n);`;
}

async function getForeignKeys(tableName) {
  const fks = await query(`
    SELECT
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.update_rule,
      rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' AND tc.table_name = ?
    ORDER BY tc.constraint_name
  `, [tableName]);

  return fks.map(fk => {
    let stmt = `ALTER TABLE public."${tableName}" ADD CONSTRAINT "${fk.constraint_name}" FOREIGN KEY ("${fk.column_name}") REFERENCES public."${fk.foreign_table_name}"("${fk.foreign_column_name}")`;
    if (fk.delete_rule && fk.delete_rule !== 'NO ACTION') stmt += ` ON DELETE ${fk.delete_rule}`;
    if (fk.update_rule && fk.update_rule !== 'NO ACTION') stmt += ` ON UPDATE ${fk.update_rule}`;
    return stmt + ';';
  });
}

async function getIndexes(tableName) {
  const rows = await query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = ?
      AND indexname NOT LIKE '%_pkey'
    ORDER BY indexname
  `, [tableName]);

  // Dedupe - only non-PK, non-constraint indexes
  const seen = new Set();
  const results = [];
  for (const r of rows) {
    if (!seen.has(r.indexname)) {
      seen.add(r.indexname);
      results.push(r.indexdef + ';');
    }
  }
  return results;
}

async function getTableData(tableName) {
  try {
    const rows = await query(`SELECT * FROM public."${tableName}" ORDER BY 1 LIMIT 10000`);
    if (rows.length === 0) return [];

    const lines = [];
    for (const row of rows) {
      const cols = Object.keys(row);
      const colNames = cols.map(c => `"${c}"`).join(', ');
      const values = cols.map(c => escapeString(row[c])).join(', ');
      lines.push(`INSERT INTO public."${tableName}" (${colNames}) VALUES (${values});`);
    }
    return lines;
  } catch (err) {
    return [`-- Error dumping data for ${tableName}: ${err.message}`];
  }
}

async function setSequenceValues() {
  const rows = await query(`
    SELECT 
      s.relname AS sequence_name,
      COALESCE(pg_sequence_last_value(s.oid), 1) AS last_value
    FROM pg_class s
    JOIN pg_namespace n ON s.relnamespace = n.oid
    WHERE s.relkind = 'S' AND n.nspname = 'public'
    ORDER BY s.relname
  `);
  
  // Alternatively, get from actual sequences
  const lines = [];
  for (const r of rows) {
    try {
      const [val] = await query(`SELECT last_value, is_called FROM public."${r.sequence_name}"`);
      if (val && val.last_value) {
        lines.push(`SELECT pg_catalog.setval('public."${r.sequence_name}"', ${val.last_value}, ${val.is_called});`);
      }
    } catch (e) {
      // skip
    }
  }
  return lines;
}

async function main() {
  console.log('Connecting to database...');
  await sequelize.authenticate();
  console.log('Connected successfully!\n');

  const output = [];
  const timestamp = new Date().toISOString();

  output.push('--');
  output.push('-- Bedagang ERP - Full Database Dump');
  output.push(`-- Generated: ${timestamp}`);
  output.push('-- Database: ' + (process.env.DB_NAME || 'bedagang_dev'));
  output.push('--');
  output.push('');
  output.push('SET statement_timeout = 0;');
  output.push('SET lock_timeout = 0;');
  output.push("SET client_encoding = 'UTF8';");
  output.push('SET standard_conforming_strings = on;');
  output.push("SELECT pg_catalog.set_config('search_path', '', false);");
  output.push('SET check_function_bodies = false;');
  output.push('SET xmloption = content;');
  output.push('SET client_min_messages = warning;');
  output.push('SET row_security = off;');
  output.push('');

  // 1. Extensions
  console.log('Dumping extensions...');
  const extensions = await getExtensions();
  if (extensions.length > 0) {
    output.push('-- =============================================');
    output.push('-- EXTENSIONS');
    output.push('-- =============================================');
    output.push('');
    extensions.forEach(e => { output.push(e); output.push(''); });
  }

  // 2. Enum types
  console.log('Dumping enum types...');
  const enums = await getEnumTypes();
  if (enums.length > 0) {
    output.push('-- =============================================');
    output.push('-- ENUM TYPES');
    output.push('-- =============================================');
    output.push('');
    enums.forEach(e => { output.push(e); output.push(''); });
  }

  // 3. Sequences
  console.log('Dumping sequences...');
  const sequences = await getSequences();
  if (sequences.length > 0) {
    output.push('-- =============================================');
    output.push('-- SEQUENCES');
    output.push('-- =============================================');
    output.push('');
    sequences.forEach(s => { output.push(s); output.push(''); });
  }

  // 4. Tables
  console.log('Dumping tables...');
  const tables = await getTables();
  console.log(`Found ${tables.length} tables\n`);

  output.push('-- =============================================');
  output.push(`-- TABLES (${tables.length} total)`);
  output.push('-- =============================================');
  output.push('');

  const allFKs = [];
  const allIndexes = [];

  for (const table of tables) {
    process.stdout.write(`  Table: ${table}...`);
    const ddl = await getTableDDL(table);
    if (ddl) {
      output.push(`-- ---------------------`);
      output.push(`-- TABLE: ${table}`);
      output.push(`-- ---------------------`);
      output.push(ddl);
      output.push('');
    }

    const fks = await getForeignKeys(table);
    if (fks.length > 0) allFKs.push({ table, fks });

    const indexes = await getIndexes(table);
    if (indexes.length > 0) allIndexes.push({ table, indexes });

    console.log(' OK');
  }

  // 5. Foreign keys (after all tables created)
  if (allFKs.length > 0) {
    output.push('-- =============================================');
    output.push('-- FOREIGN KEYS');
    output.push('-- =============================================');
    output.push('');
    for (const { table, fks } of allFKs) {
      output.push(`-- FK for: ${table}`);
      fks.forEach(fk => output.push(fk));
      output.push('');
    }
  }

  // 6. Indexes
  if (allIndexes.length > 0) {
    output.push('-- =============================================');
    output.push('-- INDEXES');
    output.push('-- =============================================');
    output.push('');
    for (const { table, indexes } of allIndexes) {
      output.push(`-- Indexes for: ${table}`);
      indexes.forEach(idx => output.push(idx));
      output.push('');
    }
  }

  // 7. Data
  console.log('\nDumping table data...');
  output.push('-- =============================================');
  output.push('-- DATA');
  output.push('-- =============================================');
  output.push('');

  let tablesWithData = 0;
  for (const table of tables) {
    process.stdout.write(`  Data: ${table}...`);
    const dataLines = await getTableData(table);
    if (dataLines.length > 0) {
      tablesWithData++;
      output.push(`-- Data for: ${table} (${dataLines.length} rows)`);
      dataLines.forEach(d => output.push(d));
      output.push('');
    }
    console.log(` ${dataLines.length} rows`);
  }

  // 8. Sequence values
  console.log('\nSetting sequence values...');
  const seqVals = await setSequenceValues();
  if (seqVals.length > 0) {
    output.push('-- =============================================');
    output.push('-- SEQUENCE VALUES');
    output.push('-- =============================================');
    output.push('');
    seqVals.forEach(s => output.push(s));
    output.push('');
  }

  // Write file
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(OUTPUT_FILE, output.join('\n'), 'utf8');

  console.log(`\n========================================`);
  console.log(`Dump complete!`);
  console.log(`Tables: ${tables.length}`);
  console.log(`Tables with data: ${tablesWithData}`);
  console.log(`Enums: ${enums.length}`);
  console.log(`Sequences: ${sequences.length}`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log(`Size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)} KB`);
  console.log(`========================================`);

  await sequelize.close();
}

main().catch(err => {
  console.error('Dump failed:', err.message);
  process.exit(1);
});
