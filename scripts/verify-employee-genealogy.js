#!/usr/bin/env node
/**
 * Verify Employee Genealogy DB layer
 * Run: node scripts/verify-employee-genealogy.js
 */
require('dotenv').config();
const { Sequelize } = require('sequelize');
const path = require('path');

const seq = new Sequelize(process.env.DATABASE_URL || process.env.POSTGRES_URL, { dialect: 'postgres', logging: false });
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { console.log('  ✗', m, d ? `- ${d}` : ''); failed++; };

// Load TS helpers via ts-node/register or duplicate minimal logic
function inferWorkRole(position) {
  const p = (position || '').toLowerCase();
  if (/super\s*admin|ceo|direktur/i.test(p)) return 'EXECUTIVE';
  if (/manager|manajer/i.test(p)) return 'MANAGER';
  if (/supervisor|senior|head\s*chef/i.test(p)) return 'SUPERVISOR';
  return 'STAFF';
}

function buildTree(rows) {
  const byId = new Map();
  rows.forEach((r) => byId.set(r.id, { ...r, children: [] }));
  const roots = [];
  rows.forEach((r) => {
    const node = byId.get(r.id);
    if (r.supervisor_id && byId.has(r.supervisor_id)) {
      byId.get(r.supervisor_id).children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

async function main() {
  console.log('Verifying Employee Genealogy (DB layer)\n');

  const [cols] = await seq.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name IN ('supervisor_id', 'work_role')
  `);
  if (cols.length >= 2) ok('columns supervisor_id + work_role exist');
  else fail('missing genealogy columns', `found ${cols.length}`);

  const [emps] = await seq.query(`
    SELECT e.id, e.employee_code, e.name, e.position, e.supervisor_id, e.work_role,
           sup.name AS supervisor_name
    FROM employees e
    LEFT JOIN employees sup ON e.supervisor_id = sup.id
    WHERE e.is_active = true
    ORDER BY e.name
  `);
  if (emps.length >= 10) ok(`active employees: ${emps.length}`);
  else fail('active employees count', emps.length);

  const withSup = emps.filter((e) => e.supervisor_id);
  if (withSup.length >= emps.length - 2) ok(`with supervisor: ${withSup.length}/${emps.length}`);
  else fail('supervisor assignments incomplete', `${withSup.length}/${emps.length}`);

  const roots = emps.filter((e) => !e.supervisor_id);
  if (roots.length >= 1 && roots.some((r) => /super\s*admin/i.test(r.position))) {
    ok(`org root: ${roots.map((r) => r.name).join(', ')}`);
  } else fail('no clear org root');

  const tree = buildTree(emps);
  if (tree.length >= 1) ok(`tree roots: ${tree.length}`);
  else fail('tree build failed');

  const superAdmin = emps.find((e) => /super\s*admin/i.test(e.position));
  if (superAdmin) {
    const [reports] = await seq.query(
      `SELECT COUNT(*)::int AS c FROM employees WHERE supervisor_id = :id`,
      { replacements: { id: superAdmin.id } }
    );
    if (parseInt(reports[0].c, 10) >= 4) ok(`Super Admin direct reports: ${reports[0].c}`);
    else fail('Super Admin should have multiple direct reports', reports[0].c);
  }

  // Cycle check
  let cycle = false;
  for (const e of emps) {
    const visited = new Set();
    let cur = e.supervisor_id;
    while (cur) {
      if (cur === e.id || visited.has(cur)) { cycle = true; break; }
      visited.add(cur);
      cur = emps.find((x) => x.id === cur)?.supervisor_id;
    }
    if (cycle) break;
  }
  if (!cycle) ok('no hierarchy cycles');
  else fail('hierarchy cycle detected');

  console.log(`\n${passed} passed, ${failed} failed`);
  await seq.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
