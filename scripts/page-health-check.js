const http = require('http');

const pages = [
  '/', '/dashboard', '/dashboard-fnb',
  '/pos', '/pos/cashier',
  '/customers', '/employees',
  '/inventory', '/inventory/products', '/inventory/transfers', '/inventory/stock-opname',
  '/inventory/purchase-orders', '/inventory/recipes', '/inventory/production', '/inventory/returns',
  '/kitchen', '/kitchen/orders',
  '/finance', '/finance/expenses', '/finance/invoices', '/finance/daily-income',
  '/finance/profit-loss', '/finance/tax', '/finance/billing', '/finance/monthly-report',
  '/orders', '/reports', '/settings',
  '/promo-voucher', '/loyalty-program',
  '/hq', '/hq/branches', '/hq/products', '/hq/inventory', '/hq/finance',
  '/hq/users', '/hq/suppliers', '/hq/reports', '/hq/settings',
  '/hq/hris/kpi', '/hq/audit-logs', '/hq/requisitions', '/hq/purchase-orders',
  '/admin/dashboard', '/admin/partners', '/admin/tenants', '/admin/modules',
  '/admin/business-types', '/admin/subscriptions', '/admin/kyb-review',
  '/admin/activations', '/admin/analytics', '/admin/outlets',
  '/onboarding', '/onboarding/kyb',
  '/auth/login', '/auth/register',
  '/billing',
];

let results = { ok: [], fail: [], redirect: [] };
let done = 0;

function check(path) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3001${path}`, { timeout: 10000 }, (res) => {
      const code = res.statusCode;
      if (code >= 200 && code < 300) results.ok.push({ path, code });
      else if (code >= 300 && code < 400) results.redirect.push({ path, code, location: res.headers.location });
      else results.fail.push({ path, code });
      res.resume();
      resolve();
    });
    req.on('error', (e) => {
      results.fail.push({ path, code: 'ERR', error: e.message });
      resolve();
    });
    req.on('timeout', () => {
      results.fail.push({ path, code: 'TIMEOUT' });
      req.destroy();
      resolve();
    });
  });
}

async function run() {
  console.log(`Checking ${pages.length} pages...\n`);
  // Check 5 at a time
  for (let i = 0; i < pages.length; i += 5) {
    const batch = pages.slice(i, i + 5);
    await Promise.all(batch.map(check));
    process.stdout.write(`Progress: ${Math.min(i + 5, pages.length)}/${pages.length}\r`);
  }
  
  console.log(`\n=== RESULTS ===`);
  console.log(`OK (${results.ok.length}): ${results.ok.map(r => r.path).join(', ')}`);
  console.log(`\nREDIRECT (${results.redirect.length}):`);
  results.redirect.forEach(r => console.log(`  ${r.path} -> ${r.code} ${r.location || ''}`));
  console.log(`\nFAIL (${results.fail.length}):`);
  results.fail.forEach(r => console.log(`  ${r.path} -> ${r.code} ${r.error || ''}`));
  
  process.exit(0);
}
run();
