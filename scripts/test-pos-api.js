const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/pos/dashboard-stats',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response:', data);
    
    if (res.statusCode === 200) {
      const json = JSON.parse(data);
      console.log('\n✅ API Response Success!');
      console.log('Transactions:', json.data.today.transactions);
      console.log('Sales:', json.data.today.sales);
      console.log('Sales Trend Items:', json.data.salesTrend.length);
      console.log('Payment Methods:', json.data.paymentMethods.length);
      console.log('Top Products:', json.data.topProducts.length);
    } else {
      console.log('\n❌ API Error');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.log('\nMake sure dev server is running: npm run dev');
});

req.end();
