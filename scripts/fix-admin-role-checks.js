const fs = require('fs');
const path = require('path');

const filesToFix = [
  'pages/admin/activations/index.tsx',
  'pages/admin/outlets/index.tsx',
  'pages/admin/transactions/index.tsx',
  'pages/admin/outlets/[id].tsx',
  'pages/admin/transactions/[id].tsx',
  'pages/admin/partners/[id].tsx',
  'pages/admin/modules/[id].tsx',
  'pages/admin/business-types/[id].tsx',
  'pages/admin/dashboard-unified.tsx',
  'pages/admin/dashboard-new.tsx'
];

const fixes = [
  {
    // Fix: ['ADMIN', 'SUPER_ADMIN'] to lowercase with proper check
    old: /if \(session && !\['ADMIN', 'SUPER_ADMIN'\]\.includes\(session\.user\?\.role as string\)\) \{[\s\S]*?router\.push\('\/'\);/g,
    new: `const userRole = (session?.user?.role as string)?.toLowerCase();
    if (session && !['admin', 'super_admin', 'superadmin'].includes(userRole)) {
      router.push('/admin/login');`
  },
  {
    // Fix: ['ADMIN', 'super_admin'] to lowercase
    old: /if \(session && !\['ADMIN', 'super_admin'\]\.includes\(session\.user\?\.role as string\)\)/g,
    new: `const userRole = (session?.user?.role as string)?.toLowerCase();
    if (session && !['admin', 'super_admin', 'superadmin'].includes(userRole))`
  },
  {
    // Fix: ['SUPER_ADMIN', 'super_admin'] to lowercase
    old: /if \(session && !\['SUPER_ADMIN', 'super_admin'\]\.includes\(session\.user\?\.role as string\)\)/g,
    new: `const userRole = (session?.user?.role as string)?.toLowerCase();
    if (session && !['admin', 'super_admin', 'superadmin'].includes(userRole))`
  }
];

console.log('Fixing admin role checks...\n');

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipped: ${file} (not found)`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  fixes.forEach(fix => {
    if (fix.old.test(content)) {
      content = content.replace(fix.old, fix.new);
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
  } else {
    console.log(`ℹ️  No changes: ${file}`);
  }
});

console.log('\n✨ Done!');
