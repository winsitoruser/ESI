const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Directories to include in backend export
const dirs = [
  'models',
  'lib',
  'config',
  'pages/api',
  'migrations',
  'types',
];

const outputDir = path.join(__dirname, '..', 'export', 'backend');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(child => {
      copyRecursive(path.join(src, child), path.join(dest, child));
    });
  } else {
    // Skip node_modules, .next, etc
    if (src.includes('node_modules') || src.includes('.next')) return;
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// Clean & create
if (fs.existsSync(outputDir)) fs.rmSync(outputDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

const root = path.join(__dirname, '..');
let totalFiles = 0;

for (const dir of dirs) {
  const srcPath = path.join(root, dir);
  const destPath = path.join(outputDir, dir);
  if (fs.existsSync(srcPath)) {
    copyRecursive(srcPath, destPath);
    // Count files
    const count = (d) => {
      let c = 0;
      if (fs.statSync(d).isDirectory()) {
        fs.readdirSync(d).forEach(f => { c += count(path.join(d, f)); });
      } else { c = 1; }
      return c;
    };
    const fc = count(destPath);
    console.log(`  ${dir}: ${fc} files`);
    totalFiles += fc;
  }
}

// Also copy root config files
const rootFiles = [
  'package.json', 'tsconfig.json', 'next.config.js', '.env.example',
  'next-env.d.ts', 'tailwind.config.js', 'postcss.config.js'
];
for (const f of rootFiles) {
  const src = path.join(root, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(outputDir, f));
    totalFiles++;
    console.log(`  ${f}: copied`);
  }
}

// Copy DB schema into export
fs.copyFileSync(
  path.join(root, 'export', 'db-schema.sql'),
  path.join(outputDir, 'db-schema.sql')
);
totalFiles++;

console.log(`\nTotal: ${totalFiles} files exported to export/backend/`);

// Create ZIP if possible
try {
  const zipPath = path.join(root, 'export', 'bedagang-backend-export.zip');
  execSync(`powershell Compress-Archive -Path "${outputDir}\\*" -DestinationPath "${zipPath}" -Force`);
  const size = (fs.statSync(zipPath).size / (1024*1024)).toFixed(1);
  console.log(`ZIP created: export/bedagang-backend-export.zip (${size} MB)`);
} catch(e) {
  console.log('ZIP creation skipped:', e.message);
}
