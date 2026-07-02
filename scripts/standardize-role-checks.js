const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '..', 'pages', 'api', 'admin');

// Files to update with standardized role checking
const filesToUpdate = [
  'partners/[id].ts',
  'activations/[id]/approve.ts',
  'activations/[id]/reject.ts'
];

const oldRoleCheck = `if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user?.role as string))`;
const newRoleCheck = `const userRole = (session?.user?.role as string)?.toLowerCase();
    if (!session || !['admin', 'super_admin', 'superadmin'].includes(userRole))`;

const oldRoleCheckVariant2 = `if (!session || !['SUPER_ADMIN', 'super_admin'].includes(session.user?.role as string))`;
const newRoleCheckVariant2 = `const userRole = (session?.user?.role as string)?.toLowerCase();
    if (!session || !['super_admin', 'superadmin'].includes(userRole))`;

console.log('🔧 Standardizing role checks in admin API files...\n');

filesToUpdate.forEach(file => {
  const filePath = path.join(apiDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;

  // Check for old role check pattern 1
  if (content.includes(oldRoleCheck)) {
    content = content.replace(oldRoleCheck, newRoleCheck);
    updated = true;
  }

  // Check for old role check pattern 2
  if (content.includes(oldRoleCheckVariant2)) {
    content = content.replace(oldRoleCheckVariant2, newRoleCheckVariant2);
    updated = true;
  }

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${file}`);
  } else {
    console.log(`ℹ️  No changes needed: ${file}`);
  }
});

console.log('\n✨ Role check standardization complete!');
