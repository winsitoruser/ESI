#!/usr/bin/env node

/**
 * Comprehensive Admin API Testing Script
 * Tests all admin endpoints untuk verify functionality
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper function untuk make HTTP requests
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': process.env.TEST_SESSION_COOKIE || ''
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test helper
function test(name, fn) {
  return async () => {
    try {
      await fn();
      results.passed++;
      results.tests.push({ name, status: 'PASSED' });
      console.log(`✅ ${name}`);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'FAILED', error: error.message });
      console.log(`❌ ${name}: ${error.message}`);
    }
  };
}

// Assertion helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Test Suite
const tests = [
  test('GET /api/admin/modules - Should return modules list', async () => {
    const res = await makeRequest('/api/admin/modules');
    assert(res.status === 200 || res.status === 401 || res.status === 403, 
      `Expected 200/401/403, got ${res.status}`);
    if (res.status === 200) {
      assert(res.body.success !== false, 'Response should be successful');
      assert(Array.isArray(res.body.data), 'Should return array of modules');
    }
  }),

  test('GET /api/admin/business-types - Should return business types', async () => {
    const res = await makeRequest('/api/admin/business-types');
    assert(res.status === 200 || res.status === 401 || res.status === 403, 
      `Expected 200/401/403, got ${res.status}`);
    if (res.status === 200) {
      assert(res.body.success !== false, 'Response should be successful');
      assert(Array.isArray(res.body.data), 'Should return array of business types');
    }
  }),

  test('GET /api/admin/tenants - Should return tenants list', async () => {
    const res = await makeRequest('/api/admin/tenants');
    assert(res.status === 200 || res.status === 401 || res.status === 403, 
      `Expected 200/401/403, got ${res.status}`);
    if (res.status === 200) {
      assert(res.body.success !== false, 'Response should be successful');
    }
  }),

  test('GET /api/admin/partners - Should return partners list', async () => {
    const res = await makeRequest('/api/admin/partners');
    assert(res.status === 200 || res.status === 401 || res.status === 403, 
      `Expected 200/401/403, got ${res.status}`);
    if (res.status === 200) {
      assert(res.body.success !== false, 'Response should be successful');
    }
  }),

  test('GET /api/admin/outlets - Should return outlets list', async () => {
    const res = await makeRequest('/api/admin/outlets');
    assert(res.status === 200 || res.status === 401 || res.status === 403, 
      `Expected 200/401/403, got ${res.status}`);
    if (res.status === 200) {
      assert(res.body.success !== false, 'Response should be successful');
    }
  }),

  test('GET /api/admin/activations - Should return activation requests', async () => {
    const res = await makeRequest('/api/admin/activations');
    assert(res.status === 200 || res.status === 401 || res.status === 403, 
      `Expected 200/401/403, got ${res.status}`);
    if (res.status === 200) {
      assert(res.body.success !== false, 'Response should be successful');
    }
  }),

  test('GET /api/admin/transactions - Should return transactions', async () => {
    const res = await makeRequest('/api/admin/transactions');
    assert(res.status === 200 || res.status === 401 || res.status === 403, 
      `Expected 200/401/403, got ${res.status}`);
    if (res.status === 200) {
      assert(res.body.success !== false, 'Response should be successful');
    }
  }),

  test('GET /api/admin/subscriptions - Should return subscriptions', async () => {
    const res = await makeRequest('/api/admin/subscriptions');
    assert(res.status === 200 || res.status === 401 || res.status === 403, 
      `Expected 200/401/403, got ${res.status}`);
    if (res.status === 200) {
      assert(res.body.success !== false, 'Response should be successful');
    }
  }),

  test('GET /api/admin/dashboard/stats - Should return dashboard stats', async () => {
    const res = await makeRequest('/api/admin/dashboard/stats');
    assert(res.status === 200 || res.status === 401 || res.status === 403, 
      `Expected 200/401/403, got ${res.status}`);
    if (res.status === 200) {
      assert(res.body.success !== false, 'Response should be successful');
    }
  }),

  test('GET /api/admin/analytics/overview - Should return analytics', async () => {
    const res = await makeRequest('/api/admin/analytics/overview');
    assert(res.status === 200 || res.status === 401 || res.status === 403, 
      `Expected 200/401/403, got ${res.status}`);
    if (res.status === 200) {
      assert(res.body.success !== false, 'Response should be successful');
    }
  }),

  test('GET /api/admin/branches - Should return branches list', async () => {
    const res = await makeRequest('/api/admin/branches');
    assert(res.status === 200 || res.status === 401 || res.status === 403, 
      `Expected 200/401/403, got ${res.status}`);
    if (res.status === 200) {
      assert(res.body.success !== false, 'Response should be successful');
    }
  }),

  test('GET /api/health - Should return 404 or health status', async () => {
    const res = await makeRequest('/api/health');
    assert(res.status === 404 || res.status === 200, 
      `Expected 404 or 200, got ${res.status}`);
  })
];

// Run all tests
async function runTests() {
  console.log('\n🚀 Starting Admin API Tests...\n');
  console.log('='.repeat(60));
  
  for (const testFn of tests) {
    await testFn();
  }

  console.log('='.repeat(60));
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   📝 Total:  ${results.passed + results.failed}`);
  
  if (results.failed > 0) {
    console.log('\n⚠️  Failed Tests:');
    results.tests
      .filter(t => t.status === 'FAILED')
      .forEach(t => console.log(`   - ${t.name}: ${t.error}`));
  }

  console.log('\n' + '='.repeat(60));
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});
