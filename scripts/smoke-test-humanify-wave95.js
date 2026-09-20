#!/usr/bin/env node
/** Soft smoke Wave-95 — MSS inbox depth (≥8 file needles + ≥30 catalog ids) */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log("✓", m); } else { fail++; console.error("✗", m); } }
function read(p) { try { return fs.readFileSync(path.join(root, p), "utf8"); } catch { return ""; } }
function exists(p) { return fs.existsSync(path.join(root, p)); }

const mss = read("pages/humanify/mss.tsx");
ok(exists("pages/humanify/mss.tsx") && mss.includes("okr-approval"), "mss :: okr-approval");
ok(exists("pages/humanify/mss.tsx") && mss.includes("travel-approval"), "mss :: travel-approval");
ok(exists("pages/humanify/mss.tsx") && mss.includes("training-approval"), "mss :: training-approval");
ok(exists("components/employee/ManagerHubTab.tsx") && read("components/employee/ManagerHubTab.tsx").includes("mutation"), "ManagerHubTab :: mutation");
ok(exists("pages/api/humanify/workflow.ts") && read("pages/api/humanify/workflow.ts").includes("pendingTraining"), "workflow :: pendingTraining");
ok(exists("pages/api/humanify/workflow.ts") && read("pages/api/humanify/workflow.ts").includes("pendingOkr"), "workflow :: pendingOkr");
ok(exists("pages/api/humanify/workflow.ts") && read("pages/api/humanify/workflow.ts").includes("pendingTravel"), "workflow :: pendingTravel");
ok(exists("docs/humanify-waves-86-100.md") && read("docs/humanify-waves-86-100.md").includes("Wave-95"), "catalog Wave-95");
ok(exists("docs/humanify-waves-86-100.md") && (read("docs/humanify-waves-86-100.md").match(/W95-\d+/g)||[]).length >= 30, "≥30 task ids Wave-95");
console.log(`Wave-95 soft smoke: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
