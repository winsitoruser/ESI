#!/usr/bin/env node
/** Soft smoke Wave-98 — Crons / platform scans (≥8 file needles + ≥30 catalog ids) */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log("✓", m); } else { fail++; console.error("✗", m); } }
function read(p) { try { return fs.readFileSync(path.join(root, p), "utf8"); } catch { return ""; } }
function exists(p) { return fs.existsSync(path.join(root, p)); }

const crons = read("scripts/ensure-humanify-crons.sh");
ok(exists("scripts/ensure-humanify-crons.sh") && crons.includes("leave-escalation"), "crons leave-escalation");
ok(exists("scripts/ensure-humanify-crons.sh") && crons.includes("hr-automation-scan"), "crons hr-automation-scan");
ok(exists("scripts/ensure-humanify-crons.sh") && crons.includes("mutation-apply-due"), "crons mutation-apply-due");
ok(exists("pages/api/platform/leave-escalation-scan.ts") && read("pages/api/platform/leave-escalation-scan.ts").includes("leave-escalation"), "leave-escalation-scan");
ok(exists("pages/api/platform/mutation-apply-due-scan.ts") && read("pages/api/platform/mutation-apply-due-scan.ts").includes("mutation-apply-due"), "mutation-apply-due-scan");
ok(exists("pages/api/platform/hr-automation-scan.ts") && read("pages/api/platform/hr-automation-scan.ts").includes("hr-automation"), "hr-automation-scan");
ok(exists("package.json") && read("package.json").includes("scan:mutation-apply-due"), "package scan:mutation-apply-due");
ok(exists("scripts/run-humanify-mutation-apply-due-scan.js"), "run mutation-apply-due script");
ok(exists("scripts/ensure-humanify-crons.sh") && read("scripts/ensure-humanify-crons.sh").includes("--check"), "crons --check");
ok(exists("docs/humanify-waves-86-100.md") && read("docs/humanify-waves-86-100.md").includes("Wave-98"), "catalog Wave-98");
ok(exists("docs/humanify-waves-86-100.md") && (read("docs/humanify-waves-86-100.md").match(/W98-\d+/g)||[]).length >= 30, "≥30 task ids Wave-98");
console.log(`Wave-98 soft smoke: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
