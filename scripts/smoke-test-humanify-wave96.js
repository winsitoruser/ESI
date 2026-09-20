#!/usr/bin/env node
/** Soft smoke Wave-96 — file/string presence gates */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log("✓", m); } else { fail++; console.error("✗", m); } }
function read(p) { try { return fs.readFileSync(path.join(root, p), "utf8"); } catch { return ""; } }
function exists(p) { return fs.existsSync(path.join(root, p)); }
ok(exists("lib/hris/payroll-inputs-store.ts") && read("lib/hris/payroll-inputs-store.ts").includes("CASH_ADV"), "lib/hris/payroll-inputs-store.ts :: CASH_ADV");
ok(exists("scripts/smoke-test-humanify-kasbon.js") && read("scripts/smoke-test-humanify-kasbon.js").includes("kasbon"), "scripts/smoke-test-humanify-kasbon.js :: kasbon");
ok(exists("pages/humanify/payroll/cash-advance.tsx") && read("pages/humanify/payroll/cash-advance.tsx").includes("Kasbon"), "pages/humanify/payroll/cash-advance.tsx :: Kasbon");
ok(exists("pages/api/humanify/disbursement.ts") && read("pages/api/humanify/disbursement.ts").includes("settlement"), "pages/api/humanify/disbursement.ts :: settlement");
ok(exists("docs/humanify-waves-86-100.md") && read("docs/humanify-waves-86-100.md").includes("Wave-96"), "catalog Wave-96");
ok(exists("docs/humanify-waves-86-100.md") && (read("docs/humanify-waves-86-100.md").match(/W96-\d+/g)||[]).length >= 30, "≥30 task ids Wave-96");
console.log(`Wave-96 soft smoke: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
