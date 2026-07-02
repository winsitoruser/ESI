#!/usr/bin/env node
// Fix: wrap createTable with IF NOT EXISTS guard via raw SQL
const fs = require('fs');

const dir = 'migrations';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && !f.startsWith('_') && !f.startsWith('202600')).sort();

let count = 0;
for (const file of files) {
  const fp = dir + '/' + file;
  let c = fs.readFileSync(fp, 'utf8');
  let orig = c;
  
  // Replace: await queryInterface.createTable('X',
  // With:    let X_guard; try { [X_guard] = await queryInterface.sequelize.query("SELECT to_regclass('public.X')"); } catch(e){} if(!X_guard?.[0]?.to_regclass){
  // And add: } at the end
  
  // Match: await queryInterface.createTable('tablename',
  // Then find the matching );
  const regex = /(\s*)(await queryInterface\.createTable\s*\(\s*'(\w+)'\s*,)/g;
  
  c = c.replace(regex, (match, indent, call, tableName) => {
    count++;
    const guard = 
`\n${indent}// [SIMESI] Guard: skip if ${tableName} exists
${indent}let _tbl_${tableName};
${indent}try {
${indent}  [_tbl_${tableName}] = await queryInterface.sequelize.query("SELECT to_regclass('public.${tableName}')");
${indent}} catch(_e) { /* ignore */ }
${indent}if (!_tbl_${tableName}?.[0]?.to_regclass) {
${indent}  ${call}`;
    return guard;
  });
  
  // For each createTable guard added, find the closing ); of the call
  // and add a closing brace + indent after it
  // Pattern: look for `);` that closes the createTable call
  // The createTable call has nested objects, so we need to track brace depth
  // Actually, let's be simpler: add }); at the end of each createTable block
  // by looking for the pattern:  );  followed by whitespace and then another 
  // await, //, or closing }) of the up function
  
  // Replace each `\n    );` that closes createTable with `\n    });`
  // But only for createTable calls, not other function calls
  
  // Actually, let me just add }); by replacing each closing parens-semicolon
  // that appears after a createTable block. The simplest approach:
  // Find ); that comes after our guard and add a } before it
  
  // For each table name we guarded, find ); that follows it
  // We'll look for the pattern ");\n" that occurs near the end of the 
  // createTable block
  
  c = c.replace(
    /(\/\/ \[SIMESI\] Guard: skip if (\w+) exists[\s\S]*?)(\n\s*\);)/g,
    '$1$3\n    }'
  );
  
  if (c !== orig) {
    fs.writeFileSync(fp, c);
    console.log(`  Fixed: ${file}`);
  }
}

console.log(`\n✅ Fixed ${count} createTable calls across migration files`);
