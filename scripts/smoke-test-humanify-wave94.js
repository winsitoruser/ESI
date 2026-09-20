#!/usr/bin/env node
/** Soft smoke Wave-94 — file/string presence gates */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log("✓", m); } else { fail++; console.error("✗", m); } }
function read(p) { try { return fs.readFileSync(path.join(root, p), "utf8"); } catch { return ""; } }
function exists(p) { return fs.existsSync(path.join(root, p)); }
ok(exists("pages/humanify/workforce-analytics.tsx") && read("pages/humanify/workforce-analytics.tsx").includes("positionTitle"), "pages/humanify/workforce-analytics.tsx :: positionTitle");
ok(exists("pages/humanify/workforce-analytics.tsx") && read("pages/humanify/workforce-analytics.tsx").includes("Position title"), "pages/humanify/workforce-analytics.tsx :: Position title");
ok(exists("lib/hris/workforce-categories.ts") && read("lib/hris/workforce-categories.ts").includes("export"), "lib/hris/workforce-categories.ts :: export");
ok(exists("docs/humanify-waves-86-100.md") && read("docs/humanify-waves-86-100.md").includes("Wave-94"), "catalog Wave-94");
ok(exists("docs/humanify-waves-86-100.md") && (read("docs/humanify-waves-86-100.md").match(/W94-\d+/g)||[]).length >= 30, "≥30 task ids Wave-94");
console.log(`Wave-94 soft smoke: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
