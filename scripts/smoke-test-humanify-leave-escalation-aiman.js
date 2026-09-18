#!/usr/bin/env node
/**
 * Static smoke — leave escalation + AIMAN IR/payroll tools (no DB).
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
let fails = 0;
function ok(m) { console.log(`  ✓ ${m}`); }
function fail(m) { console.error(`  ✗ ${m}`); fails++; }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

console.log('smoke:leave-escalation-aiman-p2');

const esc = read('lib/hris/leave-escalation.ts');
if (esc.includes('escalation_hours') && esc.includes('escalateStaleLeaveForTenant') && esc.includes('scanAllActiveTenantsLeaveEscalation')) {
  ok('leave-escalation runner');
} else fail('leave-escalation missing');

const api = read('pages/api/platform/leave-escalation-scan.ts');
if (api.includes('scanAllActiveTenantsLeaveEscalation') && api.includes('cronAuthorized')) ok('leave-escalation API');
else fail('leave-escalation API');

const script = read('scripts/run-humanify-leave-escalation-scan.js');
if (script.includes('/api/platform/leave-escalation-scan')) ok('leave-escalation cron script');
else fail('leave-escalation cron script');

const crons = read('scripts/ensure-humanify-crons.sh');
if (crons.includes('leave-escalation') && crons.includes('run-humanify-leave-escalation-scan.js')) ok('cron wired');
else fail('cron not wired');

const catalog = read('lib/hris/aiman-agent-catalog.ts');
for (const t of ['payroll_create_draft_run', 'run_leave_escalation', 'ir_pending_sp_list', 'ir_phase_reminder', 'ir_desk']) {
  if (catalog.includes(t)) ok(`catalog ${t}`);
  else fail(`catalog missing ${t}`);
}

const tools = read('lib/hris/aiman-agent-tools.ts');
if (tools.includes('toolPayrollCreateDraft') && tools.includes('toolIrPhaseReminder') && tools.includes('escalateStaleLeaveForTenant')) {
  ok('aiman-agent-tools implementations');
} else fail('aiman-agent-tools incomplete');

const agent = read('lib/hris/aiman-agent.ts');
if (agent.includes("id: 'ir_desk'") && agent.includes('payroll_create_draft_run') && agent.includes('run_leave_escalation')) {
  ok('aiman-agent workflows');
} else fail('aiman-agent workflows');

const hub = read('pages/api/humanify/ai-hub.ts');
if (hub.includes('payroll_create_draft_run') && hub.includes('ir_phase_reminder') && hub.includes('run_leave_escalation')) {
  ok('ai-hub allowlist');
} else fail('ai-hub allowlist');

const pkg = read('package.json');
if (pkg.includes('"scan:leave-escalation"')) ok('npm scan:leave-escalation');
else fail('npm script');

// Safety: no disbursement / paid in new payroll tool
if (!tools.includes("status', 'paid'") && !tools.includes('disbursement')) ok('payroll tool avoids disbursement');
else {
  // soft: only fail if draft tool sets paid
  if (/toolPayrollCreateDraft[\s\S]*?'paid'/.test(tools)) fail('draft tool must not set paid');
  else ok('payroll tool avoids paid status');
}

console.log(fails ? `\nFAIL ${fails}` : '\nPASS');
process.exit(fails ? 1 : 0);
