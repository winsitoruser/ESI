#!/usr/bin/env node
/**
 * Aggregate smoke Waves 86–100 — runs each wave script and prints per-wave summary.
 */
const { spawnSync } = require("child_process");
const waves = [
  86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100,
];
const results = [];
let fail = 0;
for (const w of waves) {
  const script = `scripts/smoke-test-humanify-wave${w}.js`;
  const r = spawnSync("node", [script], { stdio: "inherit" });
  const ok = !r.status;
  if (!ok) fail++;
  results.push({ wave: w, ok });
}
console.log("\n── Waves 86–100 per-wave summary ──");
for (const row of results) {
  console.log(`Wave-${row.wave}: ${row.ok ? "PASS" : "FAIL"}`);
}
console.log(fail ? `AGG FAIL ${fail}/${waves.length}` : `AGG OK waves 86-100 (${waves.length}/${waves.length})`);
process.exit(fail ? 1 : 0);
