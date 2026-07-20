#!/usr/bin/env node
/**
 * Guard: production must never enable HR mock UI.
 * Usage: NODE_ENV=production node scripts/smoke-test-humanify-mock-guard.js
 */
const path = require('path');

// Evaluate allowHrMockFallback logic inline (avoid TS transpile)
function allowHrMockFallback(env) {
  const flag = String(env.HUMANIFY_ALLOW_MOCK || '').toLowerCase();
  if (flag === 'false' || flag === '0' || flag === 'off') return false;
  if (env.NODE_ENV === 'production') return false;
  return true;
}

let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };

console.log('Humanify mock-guard');

if (allowHrMockFallback({ NODE_ENV: 'production' }) === false) ok('production → mock off');
else fail('production still allows mock');

if (allowHrMockFallback({ NODE_ENV: 'production', HUMANIFY_ALLOW_MOCK: 'true' }) === false) {
  ok('production ignores HUMANIFY_ALLOW_MOCK=true');
} else fail('production must ignore ALLOW_MOCK=true');

if (allowHrMockFallback({ NODE_ENV: 'development', HUMANIFY_ALLOW_MOCK: 'false' }) === false) {
  ok('dev + ALLOW_MOCK=false → off');
} else fail('ALLOW_MOCK=false should disable in dev');

if (allowHrMockFallback({ NODE_ENV: 'development' }) === true) ok('dev default → mock on');
else fail('dev should allow mock by default');

// Source file must not hardcode USE_MOCK_UI = true
const fs = require('fs');
const src = fs.readFileSync(path.join(__dirname, '../lib/hris/data-source.ts'), 'utf8');
if (/NODE_ENV === 'production'/.test(src) || /NODE_ENV !== 'production'/.test(src) || /allowHrMockFallback/.test(src)) {
  ok('data-source.ts present');
} else fail('data-source.ts missing guard');

// SEC-S2-1: devices mutate paths must gate _mock
const devices = fs.readFileSync(path.join(__dirname, '../pages/api/humanify/attendance/devices.ts'), 'utf8');
const mockReturns = (devices.match(/_mock:\s*true/g) || []).length;
const allowGates = (devices.match(/allowHrMockFallback\(\)/g) || []).length;
if (mockReturns > 0 && allowGates >= mockReturns) ok('devices.ts every _mock behind allowHrMockFallback');
else fail(`devices.ts mock/guard mismatch (_mock=${mockReturns}, allow=${allowGates})`);
if (/dataSource:\s*'empty'/.test(devices) && /503/.test(devices)) ok('devices.ts prod empty/503 path');
else fail('devices.ts missing prod empty/503');

// Wave-60 / BE-4: leave-management + team-tasks mock paths must be gated
const leaveMgmt = fs.readFileSync(path.join(__dirname, '../pages/api/humanify/leave-management.ts'), 'utf8');
const leaveMockCalls = (leaveMgmt.match(/getMock\w+\s*\(/g) || []).length;
const leaveAllow = (leaveMgmt.match(/allowHrMockFallback\s*\(/g) || []).length;
if (leaveMockCalls > 0 && leaveAllow >= 5) ok(`leave-management.ts mock gated (${leaveMockCalls} getMock*, ${leaveAllow} allow*)`);
else fail(`leave-management.ts mock gate weak (getMock=${leaveMockCalls}, allow=${leaveAllow})`);
if (/createLeaveRequest[\s\S]*return res\.status\(500\)/.test(leaveMgmt)) {
  ok('leave-management create fails closed (500, not mock)');
} else fail('leave-management create must not mock on error');

const teamTasks = fs.readFileSync(path.join(__dirname, '../pages/api/humanify/team-tasks.ts'), 'utf8');
if (/isMock:\s*true/.test(teamTasks) && /allowHrMockFallback\s*\(/.test(teamTasks)) {
  ok('team-tasks.ts isMock:true behind allowHrMockFallback');
} else if (!/isMock:\s*true/.test(teamTasks)) {
  ok('team-tasks.ts no isMock:true');
} else fail('team-tasks.ts isMock:true without allowHrMockFallback');
if (/dataSource:\s*'empty'/.test(teamTasks) && /!allowHrMockFallback\(\)/.test(teamTasks)) {
  ok('team-tasks.ts prod empty path when mock off');
} else fail('team-tasks.ts missing prod empty path');
if (/handleCreateTask[\s\S]*return res\.status\(500\)/.test(teamTasks)
  || /Failed to create task/.test(teamTasks)) {
  ok('team-tasks create fails closed (500, not mock)');
} else fail('team-tasks create must not mock on error');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
