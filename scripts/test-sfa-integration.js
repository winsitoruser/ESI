#!/usr/bin/env node
/**
 * SFA/CRM Backend Integration Test Script
 * Tests all API endpoints for correct response structure
 */

const BASE = 'http://localhost:3001';
let COOKIE = '';
let results = { pass: 0, fail: 0, errors: [] };

async function login() {
  // Step 1: Get CSRF token
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();
  const cookies = csrfRes.headers.getSetCookie?.() || [];
  let csrfCookie = '';
  for (const c of cookies) {
    if (c.includes('next-auth.csrf-token')) {
      csrfCookie = c.split(';')[0];
    }
  }

  // Step 2: Login
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': csrfCookie,
    },
    body: new URLSearchParams({
      csrfToken,
      email: 'owner@warungkopi.com',
      password: 'password123',
      json: 'true',
    }),
    redirect: 'manual',
  });

  const loginCookies = loginRes.headers.getSetCookie?.() || [];
  const sessionCookies = [];
  for (const c of loginCookies) {
    if (c.includes('next-auth')) {
      sessionCookies.push(c.split(';')[0]);
    }
  }
  if (csrfCookie) sessionCookies.push(csrfCookie);
  COOKIE = sessionCookies.join('; ');

  // Verify session
  const sessionRes = await fetch(`${BASE}/api/auth/session`, {
    headers: { 'Cookie': COOKIE },
  });
  const session = await sessionRes.json();
  // Also grab any new cookies
  const sessCookies = sessionRes.headers.getSetCookie?.() || [];
  for (const c of sessCookies) {
    if (c.includes('next-auth') && !COOKIE.includes(c.split('=')[0])) {
      COOKIE += '; ' + c.split(';')[0];
    }
  }

  if (session?.user?.email) {
    console.log(`✅ Login OK: ${session.user.name} (${session.user.role})`);
    return true;
  }
  console.log('❌ Login failed - session:', JSON.stringify(session));
  return false;
}

async function api(url, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'Cookie': COOKIE },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${url}`, opts);
  return res.json();
}

function test(name, result) {
  if (result.success) {
    results.pass++;
    console.log(`  ✅ ${name}`);
  } else {
    results.fail++;
    const err = result.error || 'Unknown error';
    results.errors.push({ name, error: err });
    console.log(`  ❌ ${name}: ${err}`);
  }
}

async function testCoreAPI() {
  console.log('\n═══ CORE SFA API (/api/hq/sfa) ═══');
  
  test('unified-dashboard', await api('/api/hq/sfa?action=unified-dashboard'));
  test('dashboard', await api('/api/hq/sfa?action=dashboard'));
  test('leads', await api('/api/hq/sfa?action=leads'));
  test('opportunities', await api('/api/hq/sfa?action=opportunities'));
  test('pipeline', await api('/api/hq/sfa?action=pipeline'));
  test('visits', await api('/api/hq/sfa?action=visits'));
  test('territories', await api('/api/hq/sfa?action=territories'));
  test('quotations', await api('/api/hq/sfa?action=quotations'));
  test('activities', await api('/api/hq/sfa?action=activities'));
  
  // Test CRUD: create lead
  const createLead = await api('/api/hq/sfa?action=create-lead', 'POST', {
    contact_name: 'Test Lead Integration',
    company_name: 'PT Test Corp',
    contact_email: 'test@test.com',
    source: 'manual',
    priority: 'medium',
    estimated_value: 5000000,
  });
  test('create-lead', createLead);
  
  if (createLead.success) {
    // Get the lead ID
    const leadsAfter = await api('/api/hq/sfa?action=leads');
    const testLead = (leadsAfter.data || []).find(l => l.contact_name === 'Test Lead Integration');
    if (testLead) {
      // Update lead
      const updateLead = await api('/api/hq/sfa?action=update-lead', 'PUT', { id: testLead.id, status: 'contacted' });
      test('update-lead', updateLead);
      
      // Convert lead
      const convertLead = await api('/api/hq/sfa?action=convert-lead', 'POST', {
        lead_id: testLead.id,
        opportunity_title: 'Test Opportunity',
        expected_value: 5000000,
      });
      test('convert-lead', convertLead);
      
      // Delete lead
      const deleteLead = await api(`/api/hq/sfa?action=delete-lead&id=${testLead.id}`, 'DELETE');
      test('delete-lead', deleteLead);
    }
  }

  // Create opportunity
  const createOpp = await api('/api/hq/sfa?action=create-opportunity', 'POST', {
    title: 'Test Opportunity Integration',
    expected_value: 10000000,
    expected_close_date: '2025-06-30',
  });
  test('create-opportunity', createOpp);
  
  if (createOpp.success) {
    const opps = await api('/api/hq/sfa?action=opportunities');
    const testOpp = (opps.data || []).find(o => o.title === 'Test Opportunity Integration');
    if (testOpp) {
      const updateOpp = await api('/api/hq/sfa?action=update-opportunity', 'PUT', {
        id: testOpp.id, stage: 'proposal', probability: 40, status: 'open'
      });
      test('update-opportunity', updateOpp);
      await api(`/api/hq/sfa?action=delete-opportunity&id=${testOpp.id}`, 'DELETE');
    }
  }

  // Create visit
  const createVisit = await api('/api/hq/sfa?action=create-visit', 'POST', {
    customer_name: 'Test Customer Visit',
    visit_date: new Date().toISOString().slice(0,10),
    visit_type: 'regular',
    purpose: 'Integration test',
  });
  test('create-visit', createVisit);
}

async function testEnhancedAPI() {
  console.log('\n═══ ENHANCED SFA API (/api/hq/sfa/enhanced) ═══');
  
  test('teams', await api('/api/hq/sfa/enhanced?action=teams'));
  test('target-groups', await api('/api/hq/sfa/enhanced?action=target-groups'));
  test('incentive-schemes', await api('/api/hq/sfa/enhanced?action=incentive-schemes'));
  test('parameters', await api('/api/hq/sfa/enhanced?action=parameters'));
  test('plafon-list', await api('/api/hq/sfa/enhanced?action=plafon-list'));
  test('achievements', await api('/api/hq/sfa/enhanced?action=achievements'));
  
  // Create team
  const createTeam = await api('/api/hq/sfa/enhanced?action=create-team', 'POST', {
    code: 'TEST-INTEG',
    name: 'Test Integration Team',
    team_type: 'field_force',
    max_members: 10,
  });
  test('create-team', createTeam);

  // Clean up
  if (createTeam.success) {
    const teams = await api('/api/hq/sfa/enhanced?action=teams');
    const testTeam = (teams.data || []).find(t => t.code === 'TEST-INTEG');
    if (testTeam) {
      await api('/api/hq/sfa/enhanced?action=update-team', 'PUT', { id: testTeam.id, is_active: false });
    }
  }
}

async function testAdvancedAPI() {
  console.log('\n═══ ADVANCED SFA API (/api/hq/sfa/advanced) ═══');
  
  test('coverage-plans', await api('/api/hq/sfa/advanced?action=coverage-plans'));
  test('coverage-compliance', await api('/api/hq/sfa/advanced?action=coverage-compliance'));
  test('field-orders', await api('/api/hq/sfa/advanced?action=field-orders'));
  test('display-audits', await api('/api/hq/sfa/advanced?action=display-audits'));
  test('competitor-activities', await api('/api/hq/sfa/advanced?action=competitor-activities'));
  test('competitor-summary', await api('/api/hq/sfa/advanced?action=competitor-summary'));
  test('survey-templates', await api('/api/hq/sfa/advanced?action=survey-templates'));
  test('survey-responses', await api('/api/hq/sfa/advanced?action=survey-responses'));
  test('approval-workflows', await api('/api/hq/sfa/advanced?action=approval-workflows'));
  test('approval-requests', await api('/api/hq/sfa/advanced?action=approval-requests'));
  test('geofences', await api('/api/hq/sfa/advanced?action=geofences'));
  test('product-commissions', await api('/api/hq/sfa/advanced?action=product-commissions'));
  
  // Create field order
  const createFO = await api('/api/hq/sfa/advanced?action=create-field-order', 'POST', {
    customer_name: 'Test FO Customer',
    customer_address: 'Jl Test 123',
    payment_method: 'credit',
  });
  test('create-field-order', createFO);
  
  // Create competitor activity
  const createComp = await api('/api/hq/sfa/advanced?action=create-competitor-activity', 'POST', {
    competitor_name: 'Test Competitor',
    competitor_brand: 'TestBrand',
    activity_type: 'promotion',
    impact_level: 'low',
    description: 'Integration test',
  });
  test('create-competitor-activity', createComp);
  
  // Create geofence
  const createGeo = await api('/api/hq/sfa/advanced?action=create-geofence', 'POST', {
    name: 'Test Zone Integ',
    center_lat: -6.2,
    center_lng: 106.8,
    radius_meters: 200,
    fence_type: 'circle',
  });
  test('create-geofence', createGeo);
}

async function testCrmAPI() {
  console.log('\n═══ CRM API (/api/hq/sfa/crm) ═══');
  
  test('customers', await api('/api/hq/sfa/crm?action=customers'));
  test('customer-analytics', await api('/api/hq/sfa/crm?action=customer-analytics'));
  test('communications', await api('/api/hq/sfa/crm?action=communications'));
  test('follow-ups', await api('/api/hq/sfa/crm?action=follow-ups'));
  test('tasks', await api('/api/hq/sfa/crm?action=tasks'));
  test('task-summary', await api('/api/hq/sfa/crm?action=task-summary'));
  test('calendar-events', await api('/api/hq/sfa/crm?action=calendar-events'));
  test('forecasts', await api('/api/hq/sfa/crm?action=forecasts'));
  test('forecast-analytics', await api('/api/hq/sfa/crm?action=forecast-analytics'));
  test('tickets', await api('/api/hq/sfa/crm?action=tickets'));
  test('service-analytics', await api('/api/hq/sfa/crm?action=service-analytics'));
  test('satisfaction', await api('/api/hq/sfa/crm?action=satisfaction'));
  test('automation-rules', await api('/api/hq/sfa/crm?action=automation-rules'));
  test('automation-logs', await api('/api/hq/sfa/crm?action=automation-logs'));
  
  // Create customer
  const createCust = await api('/api/hq/sfa/crm?action=create-customer', 'POST', {
    display_name: 'Test CRM Customer',
    company_name: 'PT CRM Test',
    customer_type: 'company',
    lifecycle_stage: 'prospect',
    customer_status: 'active',
    industry: 'Technology',
    acquisition_source: 'website',
  });
  test('create-customer', createCust);
  
  // Create communication
  const createComm = await api('/api/hq/sfa/crm?action=create-communication', 'POST', {
    comm_type: 'call',
    direction: 'outbound',
    subject: 'Test call',
    status: 'completed',
    outcome: 'positive',
  });
  test('create-communication', createComm);
  
  // Create task
  const createTask = await api('/api/hq/sfa/crm?action=create-task', 'POST', {
    title: 'Test CRM Task',
    task_type: 'follow_up',
    priority: 'medium',
    status: 'open',
    due_date: '2025-12-31',
  });
  test('create-task', createTask);
  
  // Create forecast
  const createForecast = await api('/api/hq/sfa/crm?action=create-forecast', 'POST', {
    name: 'Test Q1 Forecast',
    forecast_period: 'quarterly',
    status: 'draft',
    period_start: '2025-01-01',
    period_end: '2025-03-31',
    target_revenue: 100000000,
  });
  test('create-forecast', createForecast);
  
  // Create ticket
  const createTicket = await api('/api/hq/sfa/crm?action=create-ticket', 'POST', {
    subject: 'Test Support Ticket',
    category: 'request',
    priority: 'medium',
    severity: 'minor',
    source_channel: 'email',
    description: 'Integration test ticket',
  });
  test('create-ticket', createTicket);
  
  // Create automation rule
  const createRule = await api('/api/hq/sfa/crm?action=create-automation-rule', 'POST', {
    name: 'Test Auto Rule',
    rule_type: 'trigger',
    trigger_entity: 'lead',
    trigger_event: 'lead_created',
    is_active: true,
    description: 'Integration test rule',
  });
  test('create-automation-rule', createRule);
}

async function testAiWorkflowAPI() {
  console.log('\n═══ AI WORKFLOW API (/api/hq/sfa/ai-workflow) ═══');
  
  test('models', await api('/api/hq/sfa/ai-workflow?action=models'));
  test('workflows', await api('/api/hq/sfa/ai-workflow?action=workflows'));
  test('executions', await api('/api/hq/sfa/ai-workflow?action=executions'));
  test('usage-stats', await api('/api/hq/sfa/ai-workflow?action=usage-stats'));
  test('model-catalog', await api('/api/hq/sfa/ai-workflow?action=model-catalog'));
  test('workflow-templates', await api('/api/hq/sfa/ai-workflow?action=workflow-templates'));
  
  // Setup a model
  const setupModel = await api('/api/hq/sfa/ai-workflow?action=setup-model', 'POST', {
    code: 'test-model',
    name: 'Test Model',
    provider: 'openai',
    model_id: 'gpt-4o-mini',
    capabilities: ['text'],
    cost_per_1k_input: 0.00015,
    cost_per_1k_output: 0.0006,
    max_context_tokens: 128000,
    is_default: false,
  });
  test('setup-model', setupModel);
}

async function testHrisSyncAPI() {
  console.log('\n═══ HRIS SYNC API (/api/hq/sfa/hris-sync) ═══');
  
  test('sync-status', await api('/api/hq/sfa/hris-sync?action=sync-status'));
  test('departments', await api('/api/hq/sfa/hris-sync?action=departments'));
  test('available-users', await api('/api/hq/sfa/hris-sync?action=available-users'));
  test('hris-employees', await api('/api/hq/sfa/hris-sync?action=hris-employees'));
}

async function testImportExportAPI() {
  console.log('\n═══ IMPORT/EXPORT API (/api/hq/sfa/import-export) ═══');
  
  test('entities', await api('/api/hq/sfa/import-export?action=entities'));
  test('template-leads', await api('/api/hq/sfa/import-export?action=template&entity=leads&format=json'));
  test('template-customers', await api('/api/hq/sfa/import-export?action=template&entity=customers&format=json'));
  test('export-leads', await api('/api/hq/sfa/import-export?action=export&entity=leads'));
  
  // Validate import
  const validateImport = await api('/api/hq/sfa/import-export?action=validate', 'POST', {
    entity: 'leads',
    rows: [
      { contact_name: 'Import Test Lead', company_name: 'PT Import', source: 'website', priority: 'high' }
    ]
  });
  test('validate-import', validateImport);
}

async function testIntegrationAPI() {
  console.log('\n═══ INTEGRATION API (/api/hq/integrations/crm-sfa) ═══');
  
  test('health', await api('/api/hq/integrations/crm-sfa?action=health'));
  test('convertible-leads', await api('/api/hq/integrations/crm-sfa?action=convertible-leads'));
  test('unlinkable-visits', await api('/api/hq/integrations/crm-sfa?action=unlinkable-visits'));
  test('syncable-pipeline', await api('/api/hq/integrations/crm-sfa?action=syncable-pipeline'));
}

async function testAuditTrailAPI() {
  console.log('\n═══ AUDIT TRAIL API (/api/hq/sfa/audit-trail) ═══');
  
  test('timeline', await api('/api/hq/sfa/audit-trail?action=timeline&limit=10'));
  test('summary', await api('/api/hq/sfa/audit-trail?action=summary&period=7d'));
  test('filters', await api('/api/hq/sfa/audit-trail?action=filters'));
}

async function testNotificationsAPI() {
  console.log('\n═══ NOTIFICATIONS API (/api/hq/sfa/notifications) ═══');
  
  test('my-notifications', await api('/api/hq/sfa/notifications?action=my-notifications'));
}

async function main() {
  console.log('🔧 SFA/CRM Backend Integration Test');
  console.log('====================================\n');
  
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('\n⚠️  Cannot proceed without authentication. Trying with default password...');
    return;
  }
  
  await testCoreAPI();
  await testEnhancedAPI();
  await testAdvancedAPI();
  await testCrmAPI();
  await testAiWorkflowAPI();
  await testHrisSyncAPI();
  await testImportExportAPI();
  await testIntegrationAPI();
  await testAuditTrailAPI();
  await testNotificationsAPI();
  
  console.log('\n════════════════════════════════════');
  console.log(`📊 RESULTS: ${results.pass} passed, ${results.fail} failed`);
  console.log('════════════════════════════════════');
  
  if (results.errors.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.errors.forEach(e => console.log(`   - ${e.name}: ${e.error}`));
  }
  
  console.log('');
}

main().catch(console.error);
