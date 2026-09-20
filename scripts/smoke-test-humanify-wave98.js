#!/usr/bin/env node
/** Soft smoke Wave-98 — file/string presence gates */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log("✓", m); } else { fail++; console.error("✗", m); } }
function read(p) { try { return fs.readFileSync(path.join(root, p), "utf8"); } catch { return ""; } }
function exists(p) { return fs.existsSync(path.join(root, p)); }
ok(exists("scripts/ensure-humanify-crons.sh") && read("scripts/ensure-humanify-crons.sh").includes("leave-escalation"), "scripts/ensure-humanify-crons.sh :: leave-escalation");
ok(exists("scripts/ensure-humanify-crons.sh") && read("scripts/ensure-humanify-crons.sh").includes("hr-automation-scan"), "scripts/ensure-humanify-crons.sh :: hr-automation-scan");
ok(exists("pages/api/platform/leave-escalation-scan.ts") && read("pages/api/platform/leave-escalation-scan.ts").includes("leave-escalation"), "pages/api/platform/leave-escalation-scan.ts :: leave-escalation");
ok(exists("package.json") && read("package.json").includes("scan:mutation-apply-due"), "package.json :: scan:mutation-apply-due");
ok(exists("docs/humanify-waves-86-100.md") && read("docs/humanify-waves-86-100.md").includes("Wave-98"), "catalog Wave-98");
ok(exists("docs/humanify-waves-86-100.md") && (read("docs/humanify-waves-86-100.md").match(/W98-\d+/g)||[]).length >= 30, "≥30 task ids Wave-98");
console.log(`Wave-98 soft smoke: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
