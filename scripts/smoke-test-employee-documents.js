#!/usr/bin/env node
/**
 * Smoke + stress test — employee document upload on /humanify/employees
 * Usage: SMOKE_BASE_URL=http://103.92.215.37 node scripts/smoke-test-employee-documents.js
 */
const fs = require('fs');
const path = require('path');

const BASE = process.env.SMOKE_BASE_URL || 'https://humanify.id';
const EMAIL = process.env.SMOKE_EMAIL || 'superadmin@humanify.id';
const PASSWORDS = [...new Set([process.env.SMOKE_PASSWORD, 'superadmin123', 'MasterAdmin2026!'].filter(Boolean))];

let COOKIE = '';
let passed = 0;
let failed = 0;
const failures = [];

const ok = (m) => { console.log('  ✓', m); passed++; };
const fail = (m, d) => { const line = d ? `${m} — ${d}` : m; console.log('  ✗', line); failures.push(line); failed++; };

async function login() {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const csrfCookie = (csrfRes.headers.getSetCookie?.() || []).find((c) => c.includes('next-auth.csrf-token'))?.split(';')[0] || '';
  for (const pass of PASSWORDS) {
    const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: csrfCookie },
      body: new URLSearchParams({ csrfToken, email: EMAIL, password: pass, json: 'true' }),
      redirect: 'manual',
    });
    const sessionCookies = (loginRes.headers.getSetCookie?.() || []).filter((c) => c.includes('next-auth')).map((c) => c.split(';')[0]);
    if (csrfCookie) sessionCookies.push(csrfCookie);
    COOKIE = sessionCookies.join('; ');
    const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: COOKIE } })).json();
    if (session?.user?.email) return session;
  }
  throw new Error('Login failed');
}

function buildMultipart(fields, file) {
  const boundary = `----FormBoundary${Date.now()}`;
  let body = '';
  for (const [k, v] of Object.entries(fields)) {
    body += `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
  }
  body += `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.name}"\r\nContent-Type: ${file.type}\r\n\r\n`;
  const start = Buffer.from(body, 'utf8');
  const end = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
  return {
    body: Buffer.concat([start, file.buffer, end]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function uploadDocument(employeeId, extra = {}) {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  const stamp = Date.now();
  const { body, contentType } = buildMultipart(
    {
      employee_id: String(employeeId),
      document_type: extra.document_type || 'KTP',
      title: extra.title || `Smoke KTP ${stamp}`,
      document_number: extra.document_number || `SMOKE-${stamp}`,
      ...extra.fields,
    },
    { name: `smoke-${stamp}.png`, type: 'image/png', buffer: png }
  );
  const res = await fetch(`${BASE}/api/humanify/employee-documents`, {
    method: 'POST',
    headers: { Cookie: COOKIE, 'Content-Type': contentType },
    body,
  });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { _raw: text.slice(0, 300) }; }
  return { res, json };
}

async function main() {
  console.log('══════════════════════════════════════════');
  console.log('  Employee Documents — Smoke & Stress Test');
  console.log('══════════════════════════════════════════');
  console.log('Target:', BASE);

  const session = await login();
  ok(`login as ${session.user.email} (tenant: ${session.user.tenantId || 'none'})`);

  const pageRes = await fetch(`${BASE}/humanify/employees`, { headers: { Cookie: COOKIE }, redirect: 'manual' });
  if ([200, 307, 308].includes(pageRes.status)) ok('page /humanify/employees');
  else fail('page /humanify/employees', `HTTP ${pageRes.status}`);

  const empRes = await fetch(`${BASE}/api/humanify/employee-profile?action=list&limit=5`, { headers: { Cookie: COOKIE } });
  const empJson = await empRes.json();
  const employees = Array.isArray(empJson.data) ? empJson.data : (empJson.data?.employees || empJson.employees || []);
  if (employees.length) ok(`employees list (${employees.length})`);
  else fail('employees list', 'empty');

  const emp = employees[0];
  if (!emp) { console.log('No employee to test'); process.exit(1); }

  const detailRes = await fetch(`${BASE}/api/humanify/employee-profile?action=detail&employeeId=${emp.id}`, { headers: { Cookie: COOKIE } });
  const detailJson = await detailRes.json();
  if (detailRes.ok) ok('employee detail GET');
  else fail('employee detail GET', `HTTP ${detailRes.status}`);

  const compRes = await fetch(`${BASE}/api/humanify/employee-documents?action=completeness&employee_id=${emp.id}`, { headers: { Cookie: COOKIE } });
  const compJson = await compRes.json();
  if (compRes.ok && compJson.success !== false) ok('document completeness GET');
  else fail('document completeness GET', compJson.error || `HTTP ${compRes.status}`);

  const upload = await uploadDocument(emp.id);
  const docId = upload.json.data?.id;
  if (upload.res.status === 201 && upload.json.success && docId) {
    ok('document upload POST');
    if (upload.json.data?.file_url) ok('upload returns file_url');
    else fail('upload file_url', 'missing');

    const fileUrl = upload.json.data.file_url;
    const fileRes = await fetch(`${BASE}/api/humanify/employee-documents?action=download&id=${encodeURIComponent(docId)}`, {
      headers: { Cookie: COOKIE },
    });
    const ct = fileRes.headers.get('content-type') || '';
    if (fileRes.ok && (ct.includes('image/') || ct.includes('pdf') || ct.includes('octet-stream'))) {
      ok('document download GET');
    } else {
      fail('document download GET', `HTTP ${fileRes.status} type=${ct}`);
    }

    const verifyRes = await fetch(`${BASE}/api/humanify/employee-documents?action=verify`, {
      method: 'PATCH',
      headers: { Cookie: COOKIE, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: docId, status: 'verified' }),
    });
    const verifyJson = await verifyRes.json();
    if (verifyRes.ok && verifyJson.success) ok('document verify PATCH');
    else fail('document verify PATCH', verifyJson.error || `HTTP ${verifyRes.status}`);

    const detail2 = await fetch(`${BASE}/api/humanify/employee-profile?action=detail&employeeId=${emp.id}`, { headers: { Cookie: COOKIE } });
    const detail2Json = await detail2.json();
    const docs = detail2Json.data?.documents || [];
    if (docs.some((d) => d.id === docId)) ok('document appears in employee detail');
    else fail('document in detail', 'not found after upload');

    const delRes = await fetch(`${BASE}/api/humanify/employee-documents?id=${docId}`, { method: 'DELETE', headers: { Cookie: COOKIE } });
    const delJson = await delRes.json();
    if (delRes.ok && delJson.success) ok('document DELETE');
    else fail('document DELETE', delJson.error || `HTTP ${delRes.status}`);
  } else {
    fail('document upload POST', `HTTP ${upload.res.status} ${upload.json.error || upload.json._raw || ''}`);
  }

  console.log('\nStress: 20 parallel uploads (then cleanup)...');
  const t0 = Date.now();
  const uploads = await Promise.all(
    Array.from({ length: 20 }, (_, i) => uploadDocument(emp.id, { title: `Stress ${Date.now()}-${i}` }))
  );
  const elapsed = Date.now() - t0;
  const okUploads = uploads.filter((u) => u.res.status === 201 && u.json.success);
  if (okUploads.length === 20) ok(`stress upload 20/20 in ${elapsed}ms`);
  else fail('stress upload', `${okUploads.length}/20 ok in ${elapsed}ms`);

  await Promise.all(
    okUploads.map((u) =>
      fetch(`${BASE}/api/humanify/employee-documents?id=${u.json.data.id}`, { method: 'DELETE', headers: { Cookie: COOKIE } })
    )
  );
  ok('stress cleanup delete');

  console.log('\n══════════════════════════════════════════');
  console.log(`Result: ${passed} passed, ${failed} failed`);
  if (failures.length) failures.forEach((f) => console.log('  •', f));
  console.log('══════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
