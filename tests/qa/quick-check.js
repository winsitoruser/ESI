#!/usr/bin/env node
/**
 * Quick warmed-endpoint check + memory snapshot
 */
const { execSync } = require('child_process');
const BASE = 'http://localhost:3001';

function timeReq(path) {
  const t0 = Date.now();
  const out = execSync(`curl -s -o /dev/null -w "%{http_code}" "${BASE}${path}"`, { timeout: 10000, encoding: 'utf8' });
  return { status: out.trim(), time: Date.now() - t0 };
}

console.log('=== WARMED-UP ENDPOINTS ===\n');
['/api/health', '/api/auth/session', '/api/hq/dashboard', '/api/hq/hris/employees?limit=5', '/api/hq/inventory/products?limit=5'].forEach(p => {
  const r = timeReq(p);
  console.log(`   ${p} → HTTP ${r.status} (${r.time}ms)`);
});

console.log('\n=== MEMORY ===\n');
try {
  const ps = execSync('ps aux | grep "[n]ext-server" | awk \'{printf "PID=%s RSS=%dMB CPU=%s%%\\n", $2, $6/1024, $3}\'', { encoding: 'utf8' });
  console.log(`   ${ps.trim()}`);
} catch(e) { console.log('   No next-server process found'); }

console.log('\n=== DB TABLES COUNT ===\n');
const dbUrl = execSync('grep DATABASE_URL .env 2>/dev/null || grep DATABASE_URL .env.local 2>/dev/null || echo ""', { encoding: 'utf8', timeout: 5000 }).trim();
console.log(`   DATABASE_URL: ${dbUrl ? 'found' : 'not found'}`);
