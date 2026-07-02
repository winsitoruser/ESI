const { execSync } = require('child_process');
try {
  const result = execSync('npx jest tests/smoke/__minimal.test.ts --no-cache --no-coverage --verbose', { 
    timeout: 25000, 
    encoding: 'utf8',
    env: { ...process.env, TMPDIR: '/tmp' }
  });
  console.log('STDOUT:', result);
} catch(e) {
  console.log('ERR:', e.stderr || e.message);
  if (e.stdout) console.log('OUT:', e.stdout);
}
