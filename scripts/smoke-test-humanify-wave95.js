#!/usr/bin/env node
/** Soft smoke Wave-95 — file/string presence gates */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log("✓", m); } else { fail++; console.error("✗", m); } }
function read(p) { try { return fs.readFileSync(path.join(root, p), "utf8"); } catch { return ""; } }
function exists(p) { return fs.existsSync(path.join(root, p)); }
ok(exists("pages/humanify/mss.tsx") && read("pages/humanify/mss.tsx").includes("okr-approval"), "pages/humanify/mss.tsx :: okr-approval");
ok(exists("pages/humanify/mss.tsx") && read("pages/humanify/mss.tsx").includes("travel-approval"), "pages/humanify/mss.tsx :: travel-approval");
ok(exists("components/employee/ManagerHubTab.tsx") && read("components/employee/ManagerHubTab.tsx").includes("mutation"), "components/employee/ManagerHubTab.tsx :: mutation");
ok(exists("pages/api/humanify/workflow.ts") && read("pages/api/humanify/workflow.ts").includes("pendingTraining"), "pages/api/humanify/workflow.ts :: pendingTraining");
ok(exists("docs/humanify-waves-86-100.md") && read("docs/humanify-waves-86-100.md").includes("Wave-95"), "catalog Wave-95");
ok(exists("docs/humanify-waves-86-100.md") && (read("docs/humanify-waves-86-100.md").match(/W95-\d+/g)||[]).length >= 30, "≥30 task ids Wave-95");
console.log(`Wave-95 soft smoke: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
