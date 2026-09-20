#!/usr/bin/env node
/** Soft smoke Wave-93 — file/string presence gates */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log("✓", m); } else { fail++; console.error("✗", m); } }
function read(p) { try { return fs.readFileSync(path.join(root, p), "utf8"); } catch { return ""; } }
function exists(p) { return fs.existsSync(path.join(root, p)); }
ok(exists("pages/api/employee/desk.ts") && read("pages/api/employee/desk.ts").includes("listTickets"), "pages/api/employee/desk.ts :: listTickets");
ok(exists("pages/humanify/support.tsx") && read("pages/humanify/support.tsx").includes("assigned_to"), "pages/humanify/support.tsx :: assigned_to");
ok(exists("lib/hris/support-store.ts") && read("lib/hris/support-store.ts").includes("assigned_to"), "lib/hris/support-store.ts :: assigned_to");
ok(exists("components/employee/EmployeePortal.tsx") && read("components/employee/EmployeePortal.tsx").includes("deskTickets"), "components/employee/EmployeePortal.tsx :: deskTickets");
ok(exists("docs/humanify-waves-86-100.md") && read("docs/humanify-waves-86-100.md").includes("Wave-93"), "catalog Wave-93");
ok(exists("docs/humanify-waves-86-100.md") && (read("docs/humanify-waves-86-100.md").match(/W93-\d+/g)||[]).length >= 30, "≥30 task ids Wave-93");
console.log(`Wave-93 soft smoke: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
