#!/usr/bin/env node
/** Soft smoke Wave-100 — file/string presence gates */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log("✓", m); } else { fail++; console.error("✗", m); } }
function read(p) { try { return fs.readFileSync(path.join(root, p), "utf8"); } catch { return ""; } }
function exists(p) { return fs.existsSync(path.join(root, p)); }
ok(exists("docs/humanify-waves-86-100.md") && read("docs/humanify-waves-86-100.md").includes("Wave-100"), "docs/humanify-waves-86-100.md :: Wave-100");
ok(exists("docs/humanify-waves-86-100.md") && read("docs/humanify-waves-86-100.md").includes("W100-30"), "docs/humanify-waves-86-100.md :: W100-30");
ok(exists("package.json") && read("package.json").includes("smoke:wave85"), "package.json :: smoke:wave85");
ok(exists(".hermes/HANDOFF.md") && read(".hermes/HANDOFF.md").includes("HOLD launch"), ".hermes/HANDOFF.md :: HOLD launch");
ok(exists("docs/humanify-waves-86-100.md") && read("docs/humanify-waves-86-100.md").includes("Wave-100"), "catalog Wave-100");
ok(exists("docs/humanify-waves-86-100.md") && (read("docs/humanify-waves-86-100.md").match(/W100-\d+/g)||[]).length >= 30, "≥30 task ids Wave-100");
console.log(`Wave-100 soft smoke: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
