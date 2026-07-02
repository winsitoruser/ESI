// Quick script to find unprotected HQ API files
const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else if (file.endsWith('.ts')) {
      results.push(filePath);
    }
  });
  return results;
}

const hqDir = path.join(__dirname, '..', 'pages', 'api', 'hq');
const files = walkDir(hqDir);

const unprotected = files.filter(f => {
  const content = fs.readFileSync(f, 'utf8');
  return content.includes('export default async function handler') &&
    !content.includes('getServerSession') &&
    !content.includes('withHQAuth') &&
    !content.includes('withModuleGuard');
});

if (unprotected.length === 0) {
  console.log('ALL HQ APIs are protected!');
} else {
  console.log(`Found ${unprotected.length} unprotected APIs:`);
  unprotected.forEach(f => console.log(' -', path.relative(hqDir, f)));
}
