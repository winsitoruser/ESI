const seq = require('../lib/sequelize');
const fs = require('fs');

async function exportSchema() {
  let output = '-- Bedagang ERP - Database Schema Export\n';
  output += `-- Generated: ${new Date().toISOString()}\n`;
  output += '-- Total tables: 80\n\n';

  // Get all tables
  const [tables] = await seq.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
  );

  // Get all enum types
  const [enums] = await seq.query(
    "SELECT typname, string_agg(enumlabel, ''', ''' ORDER BY enumsortorder) as vals FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid GROUP BY typname ORDER BY typname"
  );

  output += '-- =====================\n-- ENUM TYPES\n-- =====================\n\n';
  for (const en of enums) {
    output += `CREATE TYPE ${en.typname} AS ENUM ('${en.vals}');\n`;
  }
  output += '\n';

  // Get CREATE TABLE for each table
  for (const t of tables) {
    const tbl = t.tablename;
    if (tbl === 'SequelizeMeta') continue;

    const [cols] = await seq.query(`
      SELECT column_name, data_type, udt_name, character_maximum_length, 
             column_default, is_nullable, is_identity
      FROM information_schema.columns 
      WHERE table_name='${tbl}' AND table_schema='public'
      ORDER BY ordinal_position
    `);

    const [constraints] = await seq.query(`
      SELECT tc.constraint_name, tc.constraint_type, 
             kcu.column_name,
             ccu.table_name AS foreign_table_name,
             ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.table_name = '${tbl}' AND tc.table_schema = 'public'
      ORDER BY tc.constraint_type, kcu.ordinal_position
    `);

    const [indexes] = await seq.query(`
      SELECT indexname, indexdef FROM pg_indexes 
      WHERE tablename='${tbl}' AND schemaname='public'
    `);

    output += `-- =====================\n-- TABLE: ${tbl}\n-- =====================\n`;
    output += `CREATE TABLE IF NOT EXISTS ${tbl} (\n`;

    const colDefs = cols.map(c => {
      let type = c.data_type === 'USER-DEFINED' ? c.udt_name : c.data_type;
      if (c.character_maximum_length) type += `(${c.character_maximum_length})`;
      if (type === 'character varying' && c.character_maximum_length) type = `VARCHAR(${c.character_maximum_length})`;
      else if (type === 'character varying') type = 'VARCHAR(255)';
      else if (type === 'timestamp with time zone') type = 'TIMESTAMPTZ';
      else if (type === 'timestamp without time zone') type = 'TIMESTAMP';

      let def = `  ${c.column_name} ${type}`;
      if (c.column_default) def += ` DEFAULT ${c.column_default}`;
      if (c.is_nullable === 'NO') def += ' NOT NULL';
      return def;
    });

    output += colDefs.join(',\n');

    // Add constraints
    const pks = constraints.filter(c => c.constraint_type === 'PRIMARY KEY');
    if (pks.length > 0) {
      output += `,\n  PRIMARY KEY (${[...new Set(pks.map(p => p.column_name))].join(', ')})`;
    }

    const uqs = {};
    constraints.filter(c => c.constraint_type === 'UNIQUE').forEach(c => {
      if (!uqs[c.constraint_name]) uqs[c.constraint_name] = [];
      uqs[c.constraint_name].push(c.column_name);
    });
    for (const [name, ucols] of Object.entries(uqs)) {
      output += `,\n  UNIQUE (${ucols.join(', ')})`;
    }

    output += '\n);\n\n';

    // Foreign keys
    const fks = constraints.filter(c => c.constraint_type === 'FOREIGN KEY');
    for (const fk of fks) {
      output += `ALTER TABLE ${tbl} ADD CONSTRAINT ${fk.constraint_name} FOREIGN KEY (${fk.column_name}) REFERENCES ${fk.foreign_table_name}(${fk.foreign_column_name});\n`;
    }

    // Indexes (non-primary)
    for (const idx of indexes) {
      if (!idx.indexname.endsWith('_pkey') && !constraints.some(c => c.constraint_name === idx.indexname)) {
        output += `${idx.indexdef};\n`;
      }
    }

    output += '\n';
  }

  fs.writeFileSync('./export/db-schema.sql', output, 'utf8');
  console.log(`Schema exported to export/db-schema.sql (${(output.length / 1024).toFixed(1)} KB)`);
  process.exit(0);
}

exportSchema().catch(e => { console.error(e); process.exit(1); });
