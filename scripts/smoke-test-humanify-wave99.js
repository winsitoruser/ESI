#!/usr/bin/env node
/** Soft smoke Wave-99 — file/string presence gates */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log("✓", m); } else { fail++; console.error("✗", m); } }
function read(p) { try { return fs.readFileSync(path.join(root, p), "utf8"); } catch { return ""; } }
function exists(p) { return fs.existsSync(path.join(root, p)); }
ok(exists("pages/api/employee/desk.ts") && read("pages/api/employee/desk.ts").includes("withEmployeeAuth"), "pages/api/employee/desk.ts :: withEmployeeAuth");
ok(exists("pages/api/employee/mutation-request.ts") && read("pages/api/employee/mutation-request.ts").includes("tenant_id"), "pages/api/employee/mutation-request.ts :: tenant_id");
ok(exists("scripts/deploy-humanify-vps.sh") && read("scripts/deploy-humanify-vps.sh").includes("wipe-prod"), "scripts/deploy-humanify-vps.sh :: wipe-prod");
ok(exists("pages/api/employee/manager.ts") && read("pages/api/employee/manager.ts").includes("assertEmployeeOnTeam"), "pages/api/employee/manager.ts :: assertEmployeeOnTeam");
ok(exists("docs/humanify-waves-86-100.md") && read("docs/humanify-waves-86-100.md").includes("Wave-99"), "catalog Wave-99");
ok(exists("docs/humanify-waves-86-100.md") && (read("docs/humanify-waves-86-100.md").match(/W99-\d+/g)||[]).length >= 30, "≥30 task ids Wave-99");
console.log(`Wave-99 soft smoke: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
