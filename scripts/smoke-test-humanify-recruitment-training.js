#!/usr/bin/env node
/**
 * Humanify Recruitment & Training — smoke, regression & stress test
 * Usage: SMOKE_BASE_URL=http://localhost:3010 node scripts/smoke-test-humanify-recruitment-training.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:3010';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@bedagang.com';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

let COOKIE = '';
let passed = 0;
let failed = 0;
const failures = [];

const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => {
  const line = d ? `${m} — ${d}` : m;
  console.log('  ✗', line);
  failures.push(line);
  failed++;
};

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || [])
    .find((c) => c.includes('next-auth.csrf-token'))?.split(';')[0] || '';

  for (const pass of PASSWORDS) {
    const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
      body: new URLSearchParams({ csrfToken, email: EMAIL, password: pass, json: 'true' }),
      redirect: 'manual',
    });
    const sessionCookies = (loginRes.headers.getSetCookie?.() || [])
      .filter((c) => c.includes('next-auth'))
      .map((c) => c.split(';')[0]);
    if (csrfCookie) sessionCookies.push(csrfCookie);
    COOKIE = sessionCookies.join('; ');
    const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
    if (session?.user?.email) {
      ok(`login as ${session.user.email}`);
      return session;
    }
  }
  throw new Error('Login failed');
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: COOKIE }, redirect: 'manual' });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 200) }; }
  return { res, json, text };
}

async function api(method, path, body) {
  const opts = { method, headers: { Cookie: COOKIE } };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 200) }; }
  return { res, json, text };
}

function expectPage(path, { res }) {
  if ([200, 307, 308].includes(res.status)) ok(`page ${path}`);
  else fail(`page ${path}`, `HTTP ${res.status}`);
}

function expectApi(name, { res, json }, statuses = [200]) {
  if (!statuses.includes(res.status)) {
    fail(name, `HTTP ${res.status}${json.error ? ': ' + json.error : ''}`);
    return false;
  }
  if (json.success === false) {
    fail(name, json.error || 'success=false');
    return false;
  }
  ok(name);
  return true;
}

const PAGES = [
  '/humanify/recruitment',
  '/humanify/training',
  '/humanify/training-development',
  '/humanify/training-scoring',
];

const API_READS = [
  ['recruitment openings', '/api/humanify/recruitment?action=openings'],
  ['recruitment candidates', '/api/humanify/recruitment?action=candidates'],
  ['recruitment pipeline', '/api/humanify/recruitment?action=pipeline'],
  ['recruitment analytics', '/api/humanify/recruitment?action=analytics'],
  ['training programs', '/api/humanify/training?action=programs'],
  ['training schedule', '/api/humanify/training?action=schedule'],
  ['training certifications', '/api/humanify/training?action=certifications'],
  ['training enrollments', '/api/humanify/training?action=enrollments'],
  ['training analytics', '/api/humanify/training?action=analytics'],
  ['dev dashboard', '/api/humanify/training-development?action=dashboard'],
  ['dev curricula', '/api/humanify/training-development?action=curricula'],
  ['dev modules', '/api/humanify/training-development?action=modules'],
  ['dev batches', '/api/humanify/training-development?action=batches'],
  ['dev graduations', '/api/humanify/training-development?action=graduations'],
  ['dev placements', '/api/humanify/training-development?action=placements'],
  ['dev outsourcing-pipeline', '/api/humanify/training-development?action=outsourcing-pipeline'],
  ['dev pipeline alias', '/api/humanify/training-development?action=pipeline'],
  ['scoring configs', '/api/humanify/training-scoring?action=configs'],
  ['scoring competencies', '/api/humanify/training-scoring?action=competencies'],
  ['scoring participant-scores', '/api/humanify/training-scoring?action=participant-scores'],
];

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Humanify Recruitment & Training Smoke Test');
  console.log('═══════════════════════════════════════════════════');
  console.log('Target:', BASE);

  try {
    await login();
  } catch (e) {
    fail('login', e.message);
    process.exit(1);
  }

  console.log('\n══ Pages ══');
  for (const p of PAGES) expectPage(p, await get(p));

  console.log('\n══ API (GET) ══');
  let batchId = null;
  for (const [name, path] of API_READS) {
    const r = await api('GET', path);
    if (expectApi(name, r)) {
      if (path.includes('action=batches') && Array.isArray(r.json.data) && r.json.data[0]) {
        batchId = r.json.data[0].id;
      }
    }
  }

  if (batchId) {
    expectApi('score-summary', await api('GET', `/api/humanify/training-scoring?action=score-summary&batch_id=${batchId}`));
  } else {
    fail('score-summary', 'no batch_id from batches API');
  }

  const stamp = Date.now();

  console.log('\n══ CRUD: Recruitment ══');
  const createOpening = await api('POST', '/api/humanify/recruitment?action=create-opening', {
    title: `Smoke Job ${stamp}`,
    department: 'HR',
    location: 'Jakarta',
    type: 'full_time',
    priority: 'medium',
    salary_min: 5000000,
    salary_max: 8000000,
    description: 'Smoke test opening',
  });
  const openingId = createOpening.json?.data?.id;
  if ([200, 201].includes(createOpening.res.status) && openingId) {
    ok('POST create-opening');
    const createCand = await api('POST', '/api/humanify/recruitment?action=create-candidate', {
      name: `Smoke Candidate ${stamp}`,
      email: `smoke${stamp}@test.com`,
      job_id: openingId,
      stage: 'applied',
      source: 'Smoke Test',
    });
    const candId = createCand.json?.data?.id;
    if ([200, 201].includes(createCand.res.status) && candId) {
      ok('POST create-candidate');
      const updCand = await api('PUT', '/api/humanify/recruitment?action=update-candidate', {
        id: candId, stage: 'screening', rating: 4,
      });
      if (updCand.res.status === 200) ok('PUT update-candidate');
      else fail('PUT update-candidate', `HTTP ${updCand.res.status}`);

      const delCand = await api('DELETE', `/api/humanify/recruitment?action=delete-candidate&id=${candId}`);
      if (delCand.res.status === 200) ok('DELETE delete-candidate');
      else fail('DELETE delete-candidate', `HTTP ${delCand.res.status}`);
    } else {
      fail('POST create-candidate', `HTTP ${createCand.res.status} ${createCand.json?.error || ''}`);
    }

    const updOpening = await api('PUT', '/api/humanify/recruitment?action=update-opening', {
      id: openingId, status: 'closed',
    });
    if (updOpening.res.status === 200) ok('PUT update-opening');
    else fail('PUT update-opening', `HTTP ${updOpening.res.status}`);

    const delOpening = await api('DELETE', `/api/humanify/recruitment?action=delete-opening&id=${openingId}`);
    if (delOpening.res.status === 200) ok('DELETE delete-opening');
    else fail('DELETE delete-opening', `HTTP ${delOpening.res.status}`);
  } else {
    fail('POST create-opening', `HTTP ${createOpening.res.status} ${createOpening.json?.error || ''}`);
  }

  console.log('\n══ CRUD: Training ══');
  const createProg = await api('POST', '/api/humanify/training?action=create-program', {
    title: `Smoke Training ${stamp}`,
    category: 'technical',
    type: 'workshop',
    trainer: 'Smoke Trainer',
    location: 'Online',
    status: 'upcoming',
    max_participants: 20,
    cost_per_person: 100000,
    description: 'Smoke test program',
  });
  const progId = createProg.json?.data?.id;
  if ([200, 201].includes(createProg.res.status) && progId) {
    ok('POST create-program');
    const updProg = await api('PUT', '/api/humanify/training?action=update-program', {
      id: progId, status: 'active',
    });
    if (updProg.res.status === 200) ok('PUT update-program');
    else fail('PUT update-program', `HTTP ${updProg.res.status}`);

    const delProg = await api('DELETE', `/api/humanify/training?action=delete-program&id=${progId}`);
    if (delProg.res.status === 200) ok('DELETE delete-program');
    else fail('DELETE delete-program', `HTTP ${delProg.res.status}`);
  } else {
    fail('POST create-program', `HTTP ${createProg.res.status} ${createProg.json?.error || ''}`);
  }

  console.log('\n══ CRUD: Training Development ══');
  const createCur = await api('POST', '/api/humanify/training-development?action=create-curriculum', {
    code: `SMK-CUR-${stamp}`,
    title: `Smoke Curriculum ${stamp}`,
    category: 'general',
    total_hours: 8,
    passing_score: 70,
  });
  const curId = createCur.json?.data?.id;
  if ([200, 201].includes(createCur.res.status) && curId) {
    ok('POST create-curriculum');
    const createMod = await api('POST', '/api/humanify/training-development?action=create-module', {
      curriculum_id: curId,
      title: `Smoke Module ${stamp}`,
      duration_hours: 2,
    });
    const modId = createMod.json?.data?.id;
    if ([200, 201].includes(createMod.res.status) && modId) ok('POST create-module');
    else fail('POST create-module', `HTTP ${createMod.res.status} ${createMod.json?.error || ''}`);

    const createBatch = await api('POST', '/api/humanify/training-development?action=create-batch', {
      curriculum_id: curId,
      batch_code: `SMK-BATCH-${stamp}`,
      batch_name: `Smoke Batch ${stamp}`,
      batch_type: 'regular',
      start_date: '2026-07-01',
      end_date: '2026-07-15',
      max_participants: 10,
    });
    const smokeBatchId = createBatch.json?.data?.id;
    if ([200, 201].includes(createBatch.res.status) && smokeBatchId) ok('POST create-batch');
    else fail('POST create-batch', `HTTP ${createBatch.res.status} ${createBatch.json?.error || ''}`);
  } else {
    fail('POST create-curriculum', `HTTP ${createCur.res.status} ${createCur.json?.error || ''}`);
  }

  console.log('\n══ CRUD: Training Scoring ══');
  const [curList] = await (async () => {
    const r = await api('GET', '/api/humanify/training-development?action=curricula');
    return [r.json?.data || []];
  })();
  const scoringCurId = curList[0]?.id;
  if (scoringCurId) {
    const createCfg = await api('POST', '/api/humanify/training-scoring?action=create-config', {
      curriculum_id: scoringCurId,
      config_name: `Smoke Config ${stamp}`,
      weight_exam: 30,
      weight_attendance: 20,
      weight_practical: 25,
      weight_assignment: 15,
      weight_attitude: 10,
      passing_score: 75,
    });
    const cfgId = createCfg.json?.data?.id;
    if ([200, 201].includes(createCfg.res.status) && cfgId) {
      ok('POST create-config');
      const createComp = await api('POST', '/api/humanify/training-scoring?action=create-competency', {
        curriculum_id: scoringCurId,
        name: `Smoke Competency ${stamp}`,
        code: `SMK-COMP-${stamp}`,
        weight: 25,
      });
      const compId = createComp.json?.data?.id;
      if ([200, 201].includes(createComp.res.status) && compId) {
        ok('POST create-competency');
        const delComp = await api('DELETE', `/api/humanify/training-scoring?action=delete-competency&id=${compId}`);
        if (delComp.res.status === 200) ok('DELETE delete-competency');
        else fail('DELETE delete-competency', `HTTP ${delComp.res.status}`);
      } else {
        fail('POST create-competency', `HTTP ${createComp.res.status} ${createComp.json?.error || ''}`);
      }
      const delCfg = await api('DELETE', `/api/humanify/training-scoring?action=delete-config&id=${cfgId}`);
      if (delCfg.res.status === 200) ok('DELETE delete-config');
      else fail('DELETE delete-config', `HTTP ${delCfg.res.status}`);
    } else {
      fail('POST create-config', `HTTP ${createCfg.res.status} ${createCfg.json?.error || ''}`);
    }
  } else {
    fail('scoring CRUD setup', 'no curriculum available');
  }

  console.log('\n══ Stress Test (50 concurrent reads) ══');
  const stressPaths = [
    '/api/humanify/recruitment?action=openings',
    '/api/humanify/training?action=programs',
    '/api/humanify/training-development?action=curricula',
    '/api/humanify/training-scoring?action=configs',
  ];
  const stressJobs = [];
  for (let i = 0; i < 50; i++) {
    const path = stressPaths[i % stressPaths.length];
    stressJobs.push(
      fetch(`${BASE}${path}`, { headers: { Cookie: COOKIE } })
        .then((r) => ({ ok: r.status === 200, status: r.status }))
    );
  }
  const stressResults = await Promise.all(stressJobs);
  const stressOk = stressResults.filter((r) => r.ok).length;
  if (stressOk === 50) ok(`stress 50/50 concurrent GET OK`);
  else fail('stress concurrent GET', `${stressOk}/50 OK`);

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log('  -', f));
  }
  console.log('═══════════════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
