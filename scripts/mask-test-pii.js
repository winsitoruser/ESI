#!/usr/bin/env node
/**
 * Wave 18 — SEC-DAT-007 mask PII in JSON/text for test dumps
 * Usage: echo '{"nik":"3201010101010001","email":"a@b.com"}' | node scripts/mask-test-pii.js
 */
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { input += c; });
process.stdin.on('end', () => {
  let s = input || '';
  s = s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]');
  s = s.replace(/\b\d{16}\b/g, (m) => `${m.slice(0, 4)}********${m.slice(-4)}`);
  s = s.replace(/(sk_live_|hfy_live_)[A-Za-z0-9_-]+/g, '$1[REDACTED]');
  process.stdout.write(s + (s.endsWith('\n') ? '' : '\n'));
});
