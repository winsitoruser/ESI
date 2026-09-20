#!/usr/bin/env node
/**
 * Wave-86 — Mutation / Transfer depth (static assertions)
 */
const fs = require('fs');
const path = require('path');
let passed = 0;
let failed = 0;
const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m) => { console.log('  ✗', m); failed++; };
const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

console.log('Humanify wave-86 mutation/transfer depth');

const applyDue = read('lib/hris/mutation-apply-due.ts');
if (/export function isMutationEffectiveOnOrBeforeToday/.test(applyDue)
  && /export function isMutationDeferredPending/.test(applyDue)
  && /export async function countDueMutations/.test(applyDue)) {
  ok('mutation-apply-due exports effective + deferred + countDueMutations');
} else fail('mutation-apply-due exports');

if (/stampMutationApplied|applied_at/.test(applyDue) && /scanDueMutations/.test(applyDue)) {
  ok('deferred apply stamps applied_at/notes');
} else fail('applied stamp');

const mutPage = read('pages/humanify/mutations.tsx');
if (/isMutationDeferredPending|Menunggu efektif/.test(mutPage)
  && /fmtEffective|mutationDaysUntilEffective/.test(mutPage)
  && /due_soon|filterChip/.test(mutPage)
  && /json\.deferred/.test(mutPage)) {
  ok('HQ mutations UI deferred badge + effective fmt + due_soon + deferred toast');
} else fail('HQ mutations UI');

const mss = read('pages/humanify/mss.tsx');
if (/isMutationDeferredPending/.test(mss) && /Menunggu efektif/.test(mss) && /json\.deferred/.test(mss)) {
  ok('MSS mutation deferred hint + deferred toast');
} else fail('MSS deferred');

const hub = read('components/employee/ManagerHubTab.tsx');
if (/Menunggu efektif|json\.deferred/.test(hub) && /compOffDays/.test(hub)) {
  ok('Manager Hub mutation deferred + OT compOff toast');
} else fail('Manager Hub');

const ess = read('components/employee/MutationRequestCard.tsx');
if (/MUTATION_STATUS_LABELS/.test(ess) && /Menunggu efektif/.test(ess) && /executed/.test(ess)) {
  ok('ESS MutationRequestCard ID status labels + deferred/executed');
} else fail('ESS MutationRequestCard');

const wf = read('pages/api/humanify/workflow.ts');
if (/due_soon/.test(wf) && /status IN \('pending', 'waiting'\)/.test(wf) && /deferred: !dueNow/.test(wf)) {
  ok('API due_soon filter + reject clears waiting + deferred response');
} else fail('workflow API');

const dash = read('pages/api/humanify/dashboard.ts');
if (/mutation_due/.test(dash)) ok('Dashboard action inbox mutation_due');
else fail('mutation_due inbox');

const scan = read('pages/api/platform/mutation-apply-due-scan.ts');
if (/cronTag/.test(scan) && /mutation-apply-due/.test(scan) && /behavior/.test(scan)) {
  ok('Platform GET mutation-apply-due-scan docs');
} else fail('scan docs');

const crons = read('scripts/ensure-humanify-crons.sh');
if (/mutation-apply-due/.test(crons) && /run-humanify-mutation-apply-due-scan/.test(crons)) {
  ok('ensure-humanify-crons tag mutation-apply-due');
} else fail('cron tag');

const layout = read('components/hq/HQLayout.tsx');
if (/mutationsDueBadge/.test(layout) && /humanify-mutations/.test(layout) && /due_soon=1/.test(layout)) {
  ok('Sidebar optional badge for mutations due');
} else fail('sidebar badge');

const idx = read('pages/humanify/index.tsx');
if (/mutation_due/.test(idx)) ok('Dashboard label mutation_due');
else fail('index label');

const docs = exists('docs/humanify-waves-86-100.md') && /Wave-86/.test(read('docs/humanify-waves-86-100.md'));
if (docs) ok('docs/humanify-waves-86-100.md Wave-86 section');
else fail('wave docs');

console.log(`\nRESULT: ${passed} passed / ${failed} failed`);
process.exit(failed ? 1 : 0);
