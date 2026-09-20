#!/usr/bin/env node
/** Soft smoke Wave-100 — Closeout docs/meta (≥8 file needles + ≥30 catalog ids) */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
let pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; console.log("✓", m); } else { fail++; console.error("✗", m); } }
function read(p) { try { return fs.readFileSync(path.join(root, p), "utf8"); } catch { return ""; } }
function exists(p) { return fs.existsSync(path.join(root, p)); }

const docs = read("docs/humanify-waves-86-100.md");
const pkg = read("package.json");
const handoff = read(".hermes/HANDOFF.md");
const agg = read("scripts/smoke-test-humanify-waves-86-100.js");

ok(exists("docs/humanify-waves-86-100.md") && docs.includes("Wave-100"), "docs Wave-100");
ok(exists("docs/humanify-waves-86-100.md") && docs.includes("W100-30"), "docs W100-30");
ok(exists("docs/humanify-waves-86-100.md") && docs.includes("Wave-86"), "docs Wave-86");
ok(exists("docs/humanify-waves-86-100.md") && docs.includes("Wave-93"), "docs Wave-93");
ok(exists("package.json") && pkg.includes("smoke:wave85"), "package smoke:wave85");
ok(exists("package.json") && pkg.includes("smoke:waves-86-100"), "package smoke:waves-86-100");
ok(exists("package.json") && (pkg.match(/"smoke:wave86"/g) || []).length === 1, "smoke:wave86 deduped once");
ok(exists(".hermes/HANDOFF.md") && /HOLD launch/i.test(handoff), "HANDOFF HOLD launch");
ok(exists("scripts/smoke-test-humanify-waves-86-100.js") && agg.includes("per-wave"), "AGG per-wave summary");
ok(exists("docs/humanify-waves-86-100.md") && (docs.match(/W100-\d+/g)||[]).length >= 30, "≥30 task ids Wave-100");
console.log(`Wave-100 soft smoke: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
