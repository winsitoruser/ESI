#!/usr/bin/env node
/** Soft smoke Wave-97 — ESS polish (≥8 file needles + ≥30 catalog ids) */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log("✓", m); } else { fail++; console.error("✗", m); } }
function read(p) { try { return fs.readFileSync(path.join(root, p), "utf8"); } catch { return ""; } }
function exists(p) { return fs.existsSync(path.join(root, p)); }

ok(exists("components/employee/MutationRequestCard.tsx") && read("components/employee/MutationRequestCard.tsx").includes("Mutation"), "MutationRequestCard");
ok(exists("components/employee/tabs/HomeTab.tsx") && read("components/employee/tabs/HomeTab.tsx").includes("Desk"), "HomeTab Desk");
ok(exists("components/employee/EmployeePortal.tsx") && read("components/employee/EmployeePortal.tsx").includes("leaveDays"), "EmployeePortal leaveDays");
ok(exists("components/employee/EmployeePortal.tsx") && read("components/employee/EmployeePortal.tsx").includes("cancel-overtime"), "ESS cancel-overtime");
ok(exists("pages/api/employee/mutation-request.ts") && read("pages/api/employee/mutation-request.ts").includes("branches"), "mutation-request branches");
ok(exists("pages/api/employee/dashboard.ts") && read("pages/api/employee/dashboard.ts").includes("cancel-leave"), "dashboard cancel-leave");
ok(exists("components/employee/tabs/LeaveTab.tsx") && read("components/employee/tabs/LeaveTab.tsx").includes("onCancelLeave"), "LeaveTab onCancelLeave");
ok(exists("docs/humanify-waves-86-100.md") && read("docs/humanify-waves-86-100.md").includes("Wave-97"), "catalog Wave-97");
ok(exists("docs/humanify-waves-86-100.md") && (read("docs/humanify-waves-86-100.md").match(/W97-\d+/g)||[]).length >= 30, "≥30 task ids Wave-97");
console.log(`Wave-97 soft smoke: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
