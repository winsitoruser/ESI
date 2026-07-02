const http = require('http');
const options = { hostname: 'localhost', port: 3000, path: '/api/business/config', method: 'GET' };
const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try { const j = JSON.parse(data); console.log('Success:', j.success, '| Error:', j.error || 'none', '| Debug:', j.debug || 'none'); } 
    catch { console.log('Raw:', data.substring(0, 200)); }
  });
});
req.on('error', e => console.error('Req error:', e.message));
req.end();
