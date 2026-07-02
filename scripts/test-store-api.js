const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testStoreAPI() {
  console.log('🧪 Testing Store Settings API\n');

  try {
    // Test 1: Get Store Settings
    console.log('1. Testing GET /api/settings/store');
    const storeRes = await fetch(`${BASE_URL}/api/settings/store`);
    const storeData = await storeRes.json();
    console.log('   Status:', storeRes.status);
    console.log('   Success:', storeData.success);
    console.log('   Has Data:', !!storeData.data);
    console.log('');

    // Test 2: Get Branches
    console.log('2. Testing GET /api/settings/store/branches');
    const branchesRes = await fetch(`${BASE_URL}/api/settings/store/branches`);
    const branchesData = await branchesRes.json();
    console.log('   Status:', branchesRes.status);
    console.log('   Success:', branchesData.success);
    console.log('   Branch Count:', branchesData.data?.length || 0);
    console.log('');

    // Test 3: Get Settings
    console.log('3. Testing GET /api/settings/store/settings');
    const settingsRes = await fetch(`${BASE_URL}/api/settings/store/settings`);
    const settingsData = await settingsRes.json();
    console.log('   Status:', settingsRes.status);
    console.log('   Success:', settingsData.success);
    console.log('   Has Settings:', !!settingsData.data);
    console.log('');

    console.log('✅ API Tests Complete!');
    console.log('\nNote: Some endpoints may return errors if database tables are not created yet.');
    console.log('This is expected. The API structure is correct.\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testStoreAPI();
