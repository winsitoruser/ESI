#!/usr/bin/env node
/** Soft smoke Wave-99 — Auth / guards (≥8 file needles + ≥30 catalog ids) */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log("✓", m); } else { fail++; console.error("✗", m); } }
function read(p) { try { return fs.readFileSync(path.join(root, p), "utf8"); } catch { return ""; } }
function exists(p) { return fs.existsSync(path.join(root, p)); }

const desk = read("pages/api/employee/desk.ts");
const mgr = read("pages/api/employee/manager.ts");
const wf = read("pages/api/humanify/workflow.ts");
const deploy = read("scripts/deploy-humanify-vps.sh");

ok(exists("pages/api/employee/desk.ts") && desk.includes("withEmployeeAuth"), "desk withEmployeeAuth");
ok(exists("pages/api/employee/desk.ts") && desk.includes("sanitizePlainText"), "desk sanitizePlainText");
ok(exists("pages/api/employee/desk.ts") && desk.includes("NO_TENANT"), "desk NO_TENANT");
ok(exists("pages/api/employee/desk.ts") && desk.includes("checkLimit"), "desk checkLimit");
ok(exists("pages/api/employee/manager.ts") && mgr.includes("assertEmployeeOnTeam"), "manager assertEmployeeOnTeam");
ok(exists("pages/api/employee/mutation-request.ts") && read("pages/api/employee/mutation-request.ts").includes("tenant_id"), "mutation-request tenant_id");
ok(exists("pages/api/humanify/workflow.ts") && wf.includes("assertMutationEmployeeOnTeamForManager"), "workflow team gate");
ok(exists("scripts/deploy-humanify-vps.sh") && deploy.includes("wipe-prod") && /HOLD/i.test(deploy), "deploy HOLD wipe-prod");
ok(exists("lib/security/sanitize-user-text.ts") && read("lib/security/sanitize-user-text.ts").includes("stripHtmlTags"), "sanitize-user-text");
ok(exists("docs/humanify-waves-86-100.md") && read("docs/humanify-waves-86-100.md").includes("Wave-99"), "catalog Wave-99");
ok(exists("docs/humanify-waves-86-100.md") && (read("docs/humanify-waves-86-100.md").match(/W99-\d+/g)||[]).length >= 30, "≥30 task ids Wave-99");
console.log(`Wave-99 soft smoke: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
