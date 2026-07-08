#!/usr/bin/env bash
# Export Humanify HRIS → standalone repo folder
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:-$(dirname "$SRC")/humanify}"

echo "→ Export Humanify: $SRC → $DEST"
if [ -d "$DEST/.git" ]; then
  echo "  (preserving existing .git)"
  mv "$DEST/.git" /tmp/humanify-export-git-backup-$$
fi
rm -rf "$DEST"
mkdir -p "$DEST"
if [ -d "/tmp/humanify-export-git-backup-$$" ]; then
  mv "/tmp/humanify-export-git-backup-$$" "$DEST/.git"
fi

copy() {
  local from="$1" to="$2"
  if [ -e "$SRC/$from" ]; then
    mkdir -p "$(dirname "$DEST/$to")"
    cp -R "$SRC/$from" "$DEST/$to"
    echo "  ✓ $to"
  fi
}

# ── Humanify core ──
copy pages/humanify pages/humanify
copy pages/api/humanify pages/api/humanify
copy components/humanify components/humanify
copy lib/humanify lib/humanify
copy lib/hris lib/hris
copy config/humanify-sidebar.config.ts config/humanify-sidebar.config.ts

# ── Users & roles (Humanify platform admin) ──
copy pages/api/hq/users/by-role.ts pages/api/humanify/users/by-role.ts 2>/dev/null || true
copy pages/api/hq/roles pages/api/humanify/roles 2>/dev/null || true
copy pages/api/hq/permissions pages/api/humanify/permissions 2>/dev/null || true
copy pages/api/hq/managers pages/api/humanify/managers 2>/dev/null || true
# me/permissions sudah ada di pages/api/humanify/me — jangan copy hq/me (bikin me/me/permissions)
# Jangan copy pages/hq/users → humanify/users (bikin users/users duplikat)
copy components/hq/ui components/hq/ui 2>/dev/null || true

# ── Auth & employee portal ──
copy pages/api/auth pages/api/auth
copy pages/api/employee pages/api/employee
copy pages/employee pages/employee
copy lib/employee-portal.ts lib/employee-portal.ts
copy components/employee components/employee

# ── Shared UI / layout ──
copy components/hq/HQLayout.tsx components/hq/HQLayout.tsx
copy components/providers components/providers
copy contexts contexts
copy hooks hooks
copy utils utils

# ── Backend libs ──
copy lib/middleware lib/middleware
copy lib/api lib/api
copy lib/i18n lib/i18n
copy lib/permissions lib/permissions
copy lib/hq/kpi-calculator.ts lib/hq/kpi-calculator.ts
copy scripts/migrate-multifinance-workforce.js scripts/migrate-multifinance-workforce.js 2>/dev/null || true
copy scripts/humanify-ecosystem.config.cjs scripts/humanify-ecosystem.config.cjs 2>/dev/null || true
copy scripts/humanify-healthcheck.sh scripts/humanify-healthcheck.sh 2>/dev/null || true
copy config/database.js config/database.js
copy lib/i18n.ts lib/i18n.ts
copy lib/branchFilter.ts lib/branchFilter.ts
copy lib/db.ts lib/db.ts
copy lib/logger.ts lib/logger.ts
copy lib/logger-factory.ts lib/logger-factory.ts
copy lib/hq/attendance-export-import.ts lib/hq/attendance-export-import.ts
copy lib/translations/website-builder.ts lib/translations/website-builder.ts
copy lib/sequelize.js lib/sequelize.js
copy lib/sequelize.ts lib/sequelize.ts 2>/dev/null || true
copy lib/sequelizeClient.ts lib/sequelizeClient.ts
copy lib/sfa lib/sfa
copy config/database.js config/database.js
copy lib/i18n.ts lib/i18n.ts
copy lib/branchFilter.ts lib/branchFilter.ts
copy lib/db.ts lib/db.ts
copy lib/logger.ts lib/logger.ts
copy lib/logger-factory.ts lib/logger-factory.ts
copy lib/hq/attendance-export-import.ts lib/hq/attendance-export-import.ts
copy components/permissions components/permissions
copy components/documents components/documents
copy components/hq/kpi components/hq/kpi
copy config/sidebar.config.ts config/sidebar.config.ts
copy config/esi-sidebar.config.ts config/esi-sidebar.config.ts 2>/dev/null || true
copy models models

# Translations (HRIS/HQ namespaces)
mkdir -p "$DEST/lib/translations"
for f in app.ts hq.ts hq-extended.ts hq-module-pages.ts hq-branches-extended.ts; do
  copy "lib/translations/$f" "lib/translations/$f"
done
# Copy all hq-* translation files
if [ -d "$SRC/lib/translations" ]; then
  cp "$SRC"/lib/translations/hq*.ts "$DEST/lib/translations/" 2>/dev/null || true
  cp "$SRC"/lib/translations/app.ts "$DEST/lib/translations/" 2>/dev/null || true
fi

# Documents / PDF if HR exports need it
copy lib/documents lib/documents 2>/dev/null || true

# ── App shell ──
copy pages/_app.tsx pages/_app.tsx
copy pages/_document.tsx pages/_document.tsx
copy styles styles
copy public public
copy middleware.ts middleware.ts

# Migrations & scripts
copy migrations migrations
mkdir -p "$DEST/scripts"
for s in \
  migrate-hris-core-tables.js migrate-hris-extended-tables.js migrate-hris-field-integration.js \
  migrate-hris-smoke-deps.js migrate-attendance-tables.js migrate-payroll-tables.js \
  migrate-payroll-align.js migrate-team-members-tables.js migrate-org-tables.js \
  migrate-employee-portal.js migrate-employee-lifecycle.js migrate-employee-genealogy.js migrate-workforce-analytics.js \
  migrate-kpi-scoring.js migrate-mutation-workflow.js migrate-casual-workforce.js \
  migrate-casual-supervision.js seed-hris-demo-data.js smoke-test-hris-full.js \
  smoke-test-attendance.js smoke-test-payroll.js fix-humanify-api-imports.js \
  migrate-humanify-paths.js create-demo-user.js setup-users-table.js create-super-user.js \
  ensure-superadmin.js ensure-humanify-superadmin.js sync-org-departments.js
do
  copy "scripts/$s" "scripts/$s"
done

# Root config
for f in tsconfig.json next.config.mjs tailwind.config.js postcss.config.js jsconfig.json \
  .env.example .gitignore sequelize.config.js .sequelizerc; do
  copy "$f" "$f"
done

# Humanify package.json & README
node -e "
const fs=require('fs');
const path=require('path');
const src=JSON.parse(fs.readFileSync('$SRC/package.json','utf8'));
const meta=JSON.parse(fs.readFileSync('$SRC/scripts/humanify-package.json','utf8'));
const pkg={...src, name:meta.name, version:meta.version, description:meta.description, private:true, scripts:meta.scripts, engines:meta.engines};
delete pkg.devDependencies?.cypress;
fs.writeFileSync('$DEST/package.json', JSON.stringify(pkg,null,2));
"
cp "$SRC/scripts/humanify-README.md" "$DEST/README.md"

# Root redirect → Humanify welcome
cat > "$DEST/pages/index.tsx" << 'EOF'
import type { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './api/auth/[...nextauth]';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  return {
    redirect: {
      destination: session?.user ? '/humanify' : '/humanify/welcome',
      permanent: false,
    },
  };
};

export default function Home() {
  return null;
}
EOF

# .gitignore minimal
cat >> "$DEST/.gitignore" << 'EOF'

# Humanify export
.next/
node_modules/
.env
.env.local
EOF

# Fix humanify/users paths when copied from HQ
if [ -d "$DEST/pages/humanify/users" ]; then
  for f in "$DEST/pages/humanify/users"/*.tsx; do
    [ -f "$f" ] || continue
    sed -i '' \
      -e "s|/api/hq/|/api/humanify/|g" \
      -e "s|/hq/hris|/humanify|g" \
      -e "s|/hq/users|/humanify/users|g" \
      -e "s|from '../../../components/hq/HQLayout'|from '@/components/humanify/HumanifyLayout'|g" \
      -e "s|from '../../../components/hq/ui|from '@/components/hq/ui|g" \
      -e "s|from '../../../components/permissions'|from '@/components/permissions'|g" \
      -e "s|from '../../../lib/permissions/permissions-catalog'|from '@/lib/permissions/permissions-catalog'|g" \
      "$f"
  done
  echo "  ✓ humanify/users path fixes"
fi

# Hapus duplikat nested users/users dari copy HQ
if [ -d "$DEST/pages/humanify/users/users" ]; then
  rm -rf "$DEST/pages/humanify/users/users"
  echo "  ✓ removed duplicate pages/humanify/users/users"
fi
if [ -d "$DEST/pages/api/humanify/users/users" ]; then
  rm -rf "$DEST/pages/api/humanify/users/users"
  echo "  ✓ removed duplicate pages/api/humanify/users/users"
fi
if [ -d "$DEST/pages/api/humanify/roles/roles" ]; then
  rm -rf "$DEST/pages/api/humanify/roles/roles"
  echo "  ✓ removed duplicate pages/api/humanify/roles/roles"
fi

echo ""
echo "✅ Export selesai: $DEST"
find "$DEST" -type f | wc -l | xargs echo "   files:"
