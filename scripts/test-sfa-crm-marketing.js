#!/usr/bin/env node
/**
 * BEDAGANG ERP — Authenticated Bulk API Test Script
 * Tests: CRM, SFA, Marketing modules with NextAuth session
 * 
 * Usage: node test-sfa-crm-marketing.js [base-url]
 * Default: http://localhost:3001
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = process.argv[2] || 'http://localhost:3001';
const RESULTS = [];
const LOG = [];

// Test credentials (development)
const TEST_CREDENTIALS = {
  email: 'superadmin@bedagang.com',
  password: 'superadmin123'
};

// Cookies jar for session persistence
let COOKIE_JAR = [];

function log(...args) {
  const msg = args.join(' ');
  LOG.push(msg);
  console.log(msg);
}

function elapsed(start) {
  return ((Date.now() - start) / 1000).toFixed(3) + 's';
}

/**
 * Parse set-cookie headers and update cookie jar
 */
function updateCookies(setCookieHeaders) {
  if (!setCookieHeaders) return;
  
  const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  
  for (const header of headers) {
    // Extract cookie name=value part
    const match = header.match(/^([^=]+=[^;]+);/);
    if (match) {
      const cookiePair = match[1];
      const cookieName = cookiePair.split('=')[0];
      
      // Remove existing cookie with same name
      COOKIE_JAR = COOKIE_JAR.filter(c => !c.startsWith(cookieName + '='));
      // Add new cookie
      COOKIE_JAR.push(cookiePair);
    }
  }
}

/**
 * Get cookie header string for requests
 */
function getCookieHeader() {
  return COOKIE_JAR.join('; ');
}

/**
 * Get CSRF token
 */
async function getCsrfToken() {
  log('\n🔐 Step 1: Getting CSRF token...');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/csrf`);
    const data = await res.json();
    log(`   ✅ CSRF token obtained: ${data.csrfToken ? 'present' : 'missing'}`);
    return data.csrfToken;
  } catch (e) {
    log(`   ❌ Failed to get CSRF token: ${e.message}`);
    return null;
  }
}

/**
 * Login to get session cookies
 */
async function login(csrfToken) {
  log('\n🔐 Step 2: Logging in...');
  log(`   Email: ${TEST_CREDENTIALS.email}`);
  
  try {
    const params = new URLSearchParams({
      csrfToken,
      email: TEST_CREDENTIALS.email,
      password: TEST_CREDENTIALS.password,
      callbackUrl: `${BASE_URL}/hq/dashboard`,
    });
    
    const res = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
      redirect: 'manual',
    });
    
    // Extract cookies
    const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    updateCookies(setCookie);
    
    const location = res.headers.get('location');
    const isSuccess = res.status === 302 && location && location.includes('/hq/dashboard');
    
    if (isSuccess) {
      log(`   ✅ Login successful (HTTP ${res.status})`);
      log(`   Redirect: ${location}`);
      log(`   Cookies: ${COOKIE_JAR.length} cookies stored`);
      return { success: true, cookies: COOKIE_JAR.length };
    } else {
      log(`   ❌ Login failed (HTTP ${res.status})`);
      log(`   Location: ${location || 'none'}`);
      return { success: false, status: res.status };
    }
  } catch (e) {
    log(`   ❌ Login error: ${e.message}`);
    return { success: false, error: e.message };
  }
}

/**
 * Test a single endpoint with authentication
 */
async function testAuthenticatedEndpoint(method, path, queryParams = {}, body = null) {
  const url = new URL(`${BASE_URL}${path}`);
  
  // Add query parameters
  for (const [key, value] of Object.entries(queryParams)) {
    url.searchParams.append(key, value);
  }
  
  const t0 = Date.now();
  const opts = {
    method,
    headers: {
      'Cookie': getCookieHeader(),
    },
  };
  
  if (body && (method === 'POST' || method === 'PUT')) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  
  try {
    const res = await fetch(url.toString(), opts);
    const time = Date.now() - t0;
    let responseText = '';
    let responseData = null;
    
    try {
      responseText = await res.text();
      try {
        responseData = JSON.parse(responseText);
      } catch {
        // Not JSON
      }
    } catch {
      responseText = '';
    }
    
    const result = {
      method,
      path: url.toString(),
      status: res.status,
      time,
      responseSize: responseText.length,
      isSuccess: res.status === 200,
      isUnauthorized: res.status === 401,
      isForbidden: res.status === 403,
      isNotFound: res.status === 404,
      responseData: responseData ? (typeof responseData === 'object' ? Object.keys(responseData) : null) : null,
    };
    
    return result;
  } catch (e) {
    return {
      method,
      path: url.toString(),
      status: 0,
      time: Date.now() - t0,
      error: e.message,
      isSuccess: false,
    };
  }
}

/**
 * Test unauthenticated endpoint (should return 401)
 */
async function testUnauthorizedEndpoint(method, path, queryParams = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(queryParams)) {
    url.searchParams.append(key, value);
  }
  
  // No cookies - intentionally unauthenticated
  const opts = {
    method,
    headers: {},
  };
  
  try {
    const res = await fetch(url.toString(), opts);
    const result = {
      method,
      path: url.toString(),
      status: res.status,
      isUnauthorized: res.status === 401,
      expected: 401,
    };
    return result;
  } catch (e) {
    return {
      method,
      path: url.toString(),
      status: 0,
      error: e.message,
      isUnauthorized: false,
    };
  }
}

/**
 * Run unauthorized security tests (all should return 401)
 */
async function runUnauthorizedSecurityTests() {
  log('\n🔒 Step 3: Security Test — Unauthorized Access (should return 401)');
  log('============================================================');
  
  const testEndpoints = [
    // CRM
    { method: 'GET', path: '/api/hq/sfa/crm', query: { action: 'customers' } },
    { method: 'GET', path: '/api/hq/sfa/crm', query: { action: 'leads' } },
    { method: 'GET', path: '/api/hq/sfa/crm', query: { action: 'crm-dashboard' } },
    
    // SFA Core
    { method: 'GET', path: '/api/hq/sfa/index', query: { action: 'leads' } },
    { method: 'GET', path: '/api/hq/sfa/index', query: { action: 'dashboard' } },
    { method: 'GET', path: '/api/hq/sfa/index', query: { action: 'visits' } },
    
    // Sales Management
    { method: 'GET', path: '/api/hq/sfa/sales-management', query: { action: 'sales-dashboard' } },
    { method: 'GET', path: '/api/hq/sfa/sales-management', query: { action: 'sales-entries' } },
    
    // Task Calendar
    { method: 'GET', path: '/api/hq/sfa/task-calendar', query: { action: 'board' } },
    { method: 'GET', path: '/api/hq/sfa/task-calendar', query: { action: 'stats' } },
    
    // Enhanced
    { method: 'GET', path: '/api/hq/sfa/enhanced', query: { action: 'enhanced-dashboard' } },
    { method: 'GET', path: '/api/hq/sfa/enhanced', query: { action: 'teams' } },
    
    // Advanced
    { method: 'GET', path: '/api/hq/sfa/advanced', query: { action: 'advanced-dashboard' } },
    
    // Marketing
    { method: 'GET', path: '/api/hq/marketing/index', query: { action: 'dashboard' } },
    { method: 'GET', path: '/api/hq/marketing/index', query: { action: 'campaigns' } },
    { method: 'GET', path: '/api/hq/marketing/index', query: { action: 'promotions' } },
    
    // HQ Dashboard
    { method: 'GET', path: '/api/hq/dashboard', query: {} },
  ];
  
  const results = [];
  let passed = 0;
  let failed = 0;
  
  for (const ep of testEndpoints) {
    const r = await testUnauthorizedEndpoint(ep.method, ep.path, ep.query);
    results.push(r);
    
    const queryStr = Object.entries(ep.query).map(([k, v]) => `${k}=${v}`).join('&');
    const displayPath = ep.path + (queryStr ? `?${queryStr}` : '');
    
    if (r.isUnauthorized) {
      log(`   ✅ ${ep.method} ${displayPath} → HTTP ${r.status} (401 expected ✓)`);
      passed++;
    } else {
      log(`   ❌ ${ep.method} ${displayPath} → HTTP ${r.status} (401 expected ✗)`);
      failed++;
    }
  }
  
  const rate = ((passed / results.length) * 100).toFixed(1);
  log(`\n   Security Test Results: ${passed}/${results.length} passed (${rate}%)`);
  
  return { results, passed, failed, rate: rate + '%' };
}

/**
 * Run authenticated CRM tests
 */
async function runAuthenticatedCRMTests() {
  log('\n📊 Step 4: Authenticated CRM Tests');
  log('=================================');
  
  const testEndpoints = [
    // Dashboard
    { method: 'GET', path: '/api/hq/sfa/crm', query: { action: 'crm-dashboard' } },
    { method: 'GET', path: '/api/hq/sfa/crm', query: { action: 'customers' } },
    
    // Lists
    { method: 'GET', path: '/api/hq/sfa/crm', query: { action: 'contacts' } },
    { method: 'GET', path: '/api/hq/sfa/crm', query: { action: 'tasks' } },
    { method: 'GET', path: '/api/hq/sfa/crm', query: { action: 'tickets' } },
    { method: 'GET', path: '/api/hq/sfa/crm', query: { action: 'segments' } },
    
    // Analytics
    { method: 'GET', path: '/api/hq/sfa/crm', query: { action: 'customer-analytics' } },
    { method: 'GET', path: '/api/hq/sfa/crm', query: { action: 'service-analytics' } },
    { method: 'GET', path: '/api/hq/sfa/crm', query: { action: 'task-summary' } },
  ];
  
  const results = [];
  
  for (const ep of testEndpoints) {
    const r = await testAuthenticatedEndpoint(ep.method, ep.path, ep.query);
    results.push(r);
    RESULTS.push({ category: 'CRM', ...r });
    
    const queryStr = Object.entries(ep.query).map(([k, v]) => `${k}=${v}`).join('&');
    const displayPath = ep.path + (queryStr ? `?${queryStr}` : '');
    
    if (r.isSuccess) {
      log(`   ✅ ${ep.method} ${displayPath} → HTTP ${r.status} (${r.time}ms, ${r.responseSize}B)`);
      if (r.responseData) {
        log(`      Response keys: ${r.responseData.join(', ')}`);
      }
    } else if (r.isUnauthorized) {
      log(`   ⚠️  ${ep.method} ${displayPath} → HTTP ${r.status} (Unauthorized — session issue)`);
    } else {
      log(`   ❌ ${ep.method} ${displayPath} → HTTP ${r.status} (${r.time}ms)`);
    }
  }
  
  const success = results.filter(r => r.isSuccess).length;
  const rate = ((success / results.length) * 100).toFixed(1);
  log(`\n   CRM Results: ${success}/${results.length} OK (${rate}%)`);
  
  return { results, success, rate: rate + '%' };
}

/**
 * Run authenticated SFA tests
 */
async function runAuthenticatedSFATests() {
  log('\n📊 Step 5: Authenticated SFA Tests');
  log('=================================');
  
  const testEndpoints = [
    // Core SFA
    { method: 'GET', path: '/api/hq/sfa/index', query: { action: 'dashboard' } },
    { method: 'GET', path: '/api/hq/sfa/index', query: { action: 'leads' } },
    { method: 'GET', path: '/api/hq/sfa/index', query: { action: 'opportunities' } },
    { method: 'GET', path: '/api/hq/sfa/index', query: { action: 'visits' } },
    { method: 'GET', path: '/api/hq/sfa/index', query: { action: 'pipeline' } },
    { method: 'GET', path: '/api/hq/sfa/index', query: { action: 'territories' } },
    { method: 'GET', path: '/api/hq/sfa/index', query: { action: 'targets' } },
    
    // Sales Management
    { method: 'GET', path: '/api/hq/sfa/sales-management', query: { action: 'sales-dashboard' } },
    { method: 'GET', path: '/api/hq/sfa/sales-management', query: { action: 'sales-entries' } },
    { method: 'GET', path: '/api/hq/sfa/sales-management', query: { action: 'salespersons' } },
    { method: 'GET', path: '/api/hq/sfa/sales-management', query: { action: 'leaderboard' } },
    { method: 'GET', path: '/api/hq/sfa/sales-management', query: { action: 'sales-trend' } },
    { method: 'GET', path: '/api/hq/sfa/sales-management', query: { action: 'pareto-products' } },
    
    // Task Calendar
    { method: 'GET', path: '/api/hq/sfa/task-calendar', query: { action: 'board' } },
    { method: 'GET', path: '/api/hq/sfa/task-calendar', query: { action: 'stats' } },
    { method: 'GET', path: '/api/hq/sfa/task-calendar', query: { action: 'holidays' } },
    { method: 'GET', path: '/api/hq/sfa/task-calendar', query: { action: 'users' } },
    
    // Enhanced
    { method: 'GET', path: '/api/hq/sfa/enhanced', query: { action: 'enhanced-dashboard' } },
    { method: 'GET', path: '/api/hq/sfa/enhanced', query: { action: 'teams' } },
    { method: 'GET', path: '/api/hq/sfa/enhanced', query: { action: 'incentive-schemes' } },
    { method: 'GET', path: '/api/hq/sfa/enhanced', query: { action: 'target-groups' } },
    
    // Advanced
    { method: 'GET', path: '/api/hq/sfa/advanced', query: { action: 'advanced-dashboard' } },
    { method: 'GET', path: '/api/hq/sfa/advanced', query: { action: 'geofences' } },
    { method: 'GET', path: '/api/hq/sfa/advanced', query: { action: 'sales-strategies' } },
    { method: 'GET', path: '/api/hq/sfa/advanced', query: { action: 'commission-groups' } },
    
    // Lookup
    { method: 'GET', path: '/api/hq/sfa/lookup', query: { action: 'all' } },
    { method: 'GET', path: '/api/hq/sfa/lookup', query: { action: 'summary' } },
    
    // Notifications
    { method: 'GET', path: '/api/hq/sfa/notifications', query: { action: 'my-notifications' } },
    
    // Audit Trail
    { method: 'GET', path: '/api/hq/sfa/audit-trail', query: { action: 'summary' } },
    { method: 'GET', path: '/api/hq/sfa/audit-trail', query: { action: 'log' } },
    
    // HRIS Sync
    { method: 'GET', path: '/api/hq/sfa/hris-sync', query: { action: 'sync-status' } },
    { method: 'GET', path: '/api/hq/sfa/hris-sync', query: { action: 'departments' } },
  ];
  
  const results = [];
  
  for (const ep of testEndpoints) {
    const r = await testAuthenticatedEndpoint(ep.method, ep.path, ep.query);
    results.push(r);
    RESULTS.push({ category: 'SFA', ...r });
    
    const queryStr = Object.entries(ep.query).map(([k, v]) => `${k}=${v}`).join('&');
    const displayPath = ep.path + (queryStr ? `?${queryStr}` : '');
    
    if (r.isSuccess) {
      log(`   ✅ ${ep.method} ${displayPath} → HTTP ${r.status} (${r.time}ms)`);
    } else if (r.isUnauthorized) {
      log(`   ⚠️  ${ep.method} ${displayPath} → HTTP ${r.status} (Unauthorized)`);
    } else {
      log(`   ❌ ${ep.method} ${displayPath} → HTTP ${r.status}`);
    }
  }
  
  const success = results.filter(r => r.isSuccess).length;
  const rate = ((success / results.length) * 100).toFixed(1);
  log(`\n   SFA Results: ${success}/${results.length} OK (${rate}%)`);
  
  return { results, success, rate: rate + '%' };
}

/**
 * Run authenticated Marketing tests
 */
async function runAuthenticatedMarketingTests() {
  log('\n📊 Step 6: Authenticated Marketing Tests');
  log('========================================');
  
  const testEndpoints = [
    { method: 'GET', path: '/api/hq/marketing/index', query: { action: 'dashboard' } },
    { method: 'GET', path: '/api/hq/marketing/index', query: { action: 'campaigns' } },
    { method: 'GET', path: '/api/hq/marketing/index', query: { action: 'promotions' } },
    { method: 'GET', path: '/api/hq/marketing/index', query: { action: 'segments' } },
    { method: 'GET', path: '/api/hq/marketing/index', query: { action: 'budgets' } },
    { method: 'GET', path: '/api/hq/marketing/index', query: { action: 'content-assets' } },
  ];
  
  const results = [];
  
  for (const ep of testEndpoints) {
    const r = await testAuthenticatedEndpoint(ep.method, ep.path, ep.query);
    results.push(r);
    RESULTS.push({ category: 'Marketing', ...r });
    
    const queryStr = Object.entries(ep.query).map(([k, v]) => `${k}=${v}`).join('&');
    const displayPath = ep.path + (queryStr ? `?${queryStr}` : '');
    
    if (r.isSuccess) {
      log(`   ✅ ${ep.method} ${displayPath} → HTTP ${r.status} (${r.time}ms)`);
    } else if (r.isUnauthorized) {
      log(`   ⚠️  ${ep.method} ${displayPath} → HTTP ${r.status} (Unauthorized)`);
    } else {
      log(`   ❌ ${ep.method} ${displayPath} → HTTP ${r.status}`);
    }
  }
  
  const success = results.filter(r => r.isSuccess).length;
  const rate = ((success / results.length) * 100).toFixed(1);
  log(`\n   Marketing Results: ${success}/${results.length} OK (${rate}%)`);
  
  return { results, success, rate: rate + '%' };
}

/**
 * Generate test report
 */
function generateReport(testResults) {
  const { security, crm, sfa, marketing } = testResults;
  
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
  
  // Count total
  const totalTests = RESULTS.length;
  const totalSuccess = RESULTS.filter(r => r.isSuccess).length;
  const totalUnauthorized = RESULTS.filter(r => r.isUnauthorized).length;
  const totalFailed = RESULTS.filter(r => !r.isSuccess && !r.isUnauthorized).length;
  
  // By category
  const byCategory = {};
  for (const r of RESULTS) {
    const cat = r.category || 'Other';
    if (!byCategory[cat]) byCategory[cat] = { total: 0, success: 0 };
    byCategory[cat].total++;
    if (r.isSuccess) byCategory[cat].success++;
  }
  
  const report = `# BEDAGANG ERP — CRM/SFA/Marketing API Test Report

**Generated:** ${now}  
**Target:** ${BASE_URL}  
**Test User:** ${TEST_CREDENTIALS.email}

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${totalTests} |
| ✅ Success (HTTP 200) | ${totalSuccess} |
| ⚠️  Unauthorized (HTTP 401) | ${totalUnauthorized} |
| ❌ Failed | ${totalFailed} |
| Success Rate | ${((totalSuccess / Math.max(totalTests, 1)) * 100).toFixed(1)}% |

## Security Test Results

${security.passed}/${security.results.length} endpoints correctly return 401 without authentication.

**Status:** ${security.rate} pass rate

## Test Results by Category

| Category | Total | Success | Rate |
|----------|-------|---------|------|
${Object.entries(byCategory).map(([cat, data]) => 
  `| ${cat} | ${data.total} | ${data.success} | ${((data.success / Math.max(data.total, 1)) * 100).toFixed(1)}% |`
).join('\n')}

## Slow Endpoints (>500ms)

${RESULTS.filter(r => r.time > 500).length > 0 
  ? RESULTS.filter(r => r.time > 500).map(r => `- ${r.path}: ${r.time}ms (HTTP ${r.status})`).join('\n')
  : 'No slow endpoints found.'}

## Failed Endpoints

${totalFailed > 0 
  ? RESULTS.filter(r => !r.isSuccess && !r.isUnauthorized).map(r => `- ${r.path}: HTTP ${r.status}${r.error ? ` (${r.error})` : ''}`).join('\n')
  : 'No failed endpoints.'}

---

*Generated by Bedagang Test Suite*
`;

  return report;
}

/**
 * Main test runner
 */
async function main() {
  log('='.repeat(60));
  log('🔧 BEDAGANG ERP — CRM/SFA/Marketing API Test Suite');
  log('='.repeat(60));
  log(`Target: ${BASE_URL}`);
  log(`Test User: ${TEST_CREDENTIALS.email}`);
  
  const overallStart = Date.now();
  const testResults = {};
  
  // Step 1: Get CSRF token
  const csrfToken = await getCsrfToken();
  if (!csrfToken) {
    log('\n❌ Cannot proceed without CSRF token. Is the server running?');
    log(`   Make sure: npm run dev is running at ${BASE_URL}`);
    process.exit(1);
  }
  
  // Step 2: Login
  const loginResult = await login(csrfToken);
  if (!loginResult.success) {
    log('\n❌ Login failed. Please check:');
    log('   1. Server is running');
    log('   2. Database is accessible');
    log('   3. Test credentials are correct');
    log('\n   Default credentials:');
    log('   - Email: superadmin@bedagang.com');
    log('   - Password: superadmin123');
    process.exit(1);
  }
  
  // Step 3: Security tests (unauthorized should return 401)
  testResults.security = await runUnauthorizedSecurityTests();
  
  // Step 4: Authenticated CRM tests
  testResults.crm = await runAuthenticatedCRMTests();
  
  // Step 5: Authenticated SFA tests
  testResults.sfa = await runAuthenticatedSFATests();
  
  // Step 6: Authenticated Marketing tests
  testResults.marketing = await runAuthenticatedMarketingTests();
  
  // Generate report
  log('\n' + '='.repeat(60));
  log('📊 TEST SUMMARY');
  log('='.repeat(60));
  
  const report = generateReport(testResults);
  
  // Save report
  const reportPath = path.join(process.cwd(), 'API-TEST-RESULTS.md');
  fs.writeFileSync(reportPath, report);
  log(`\n📄 Report saved to: ${reportPath}`);
  
  // Save detailed JSON results
  const jsonPath = path.join(process.cwd(), 'API-TEST-RESULTS.json');
  fs.writeFileSync(jsonPath, JSON.stringify(RESULTS, null, 2));
  log(`📄 Detailed JSON saved to: ${jsonPath}`);
  
  // Final summary
  const totalTime = elapsed(overallStart);
  const totalSuccess = RESULTS.filter(r => r.isSuccess).length;
  const totalTests = RESULTS.length;
  
  log(`\n⏱️  Total time: ${totalTime}`);
  log(`✅ Tests passed: ${totalSuccess}/${totalTests}`);
  log(`Success rate: ${((totalSuccess / Math.max(totalTests, 1)) * 100).toFixed(1)}%`);
  
  log('\n' + '='.repeat(60));
}

main().catch(console.error);
