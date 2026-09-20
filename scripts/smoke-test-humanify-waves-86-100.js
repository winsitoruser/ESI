#!/usr/bin/env node
const { spawnSync } = require("child_process");
let fail = 0;
{ const r = spawnSync("node", ["scripts/smoke-test-humanify-wave86.js"], { stdio: "inherit" }); if (r.status) fail++; }
{ const r = spawnSync("node", ["scripts/smoke-test-humanify-wave87.js"], { stdio: "inherit" }); if (r.status) fail++; }
{ const r = spawnSync("node", ["scripts/smoke-test-humanify-wave88.js"], { stdio: "inherit" }); if (r.status) fail++; }
{ const r = spawnSync("node", ["scripts/smoke-test-humanify-wave89.js"], { stdio: "inherit" }); if (r.status) fail++; }
{ const r = spawnSync("node", ["scripts/smoke-test-humanify-wave90.js"], { stdio: "inherit" }); if (r.status) fail++; }
{ const r = spawnSync("node", ["scripts/smoke-test-humanify-wave91.js"], { stdio: "inherit" }); if (r.status) fail++; }
{ const r = spawnSync("node", ["scripts/smoke-test-humanify-wave92.js"], { stdio: "inherit" }); if (r.status) fail++; }
{ const r = spawnSync("node", ["scripts/smoke-test-humanify-wave93.js"], { stdio: "inherit" }); if (r.status) fail++; }
{ const r = spawnSync("node", ["scripts/smoke-test-humanify-wave94.js"], { stdio: "inherit" }); if (r.status) fail++; }
{ const r = spawnSync("node", ["scripts/smoke-test-humanify-wave95.js"], { stdio: "inherit" }); if (r.status) fail++; }
{ const r = spawnSync("node", ["scripts/smoke-test-humanify-wave96.js"], { stdio: "inherit" }); if (r.status) fail++; }
{ const r = spawnSync("node", ["scripts/smoke-test-humanify-wave97.js"], { stdio: "inherit" }); if (r.status) fail++; }
{ const r = spawnSync("node", ["scripts/smoke-test-humanify-wave98.js"], { stdio: "inherit" }); if (r.status) fail++; }
{ const r = spawnSync("node", ["scripts/smoke-test-humanify-wave99.js"], { stdio: "inherit" }); if (r.status) fail++; }
{ const r = spawnSync("node", ["scripts/smoke-test-humanify-wave100.js"], { stdio: "inherit" }); if (r.status) fail++; }
console.log(fail ? `AGG FAIL ${fail}` : "AGG OK waves 86-100");
process.exit(fail ? 1 : 0);
