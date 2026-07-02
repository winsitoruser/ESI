# withHQAuth Migration Pattern

## Why

Standardize all HQ API endpoints behind `withHQAuth()` middleware instead of manual `getServerSession()` calls. Benefits:
- Consistent 401 response format across all endpoints
- Module-level permission checking (`module: 'dms'`, `module: 'bumdes'`)
- Session auto-injected into `(req as any).session` — no need to re-verify in handlers
- Future-proof: permission system upgrades apply to all endpoints at once

## Migration Steps

### Before (manual auth)

```typescript
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  // ... handler logic
}
```

### After (withHQAuth)

```typescript
import { withHQAuth } from '@/lib/middleware/withHQAuth';

async function handler(req, res) {
  // Session is available via (req as any).session
  // Auth check handled by middleware
  // ... handler logic
}

export default withHQAuth(handler, { module: 'dms' });
```

### Common Pitfalls

1. **Named function required**: The handler must be a named function (`async function handler()`), not anonymous default export. The wrapper needs to reference it by name.

2. **Remove local errorResponse naming conflicts**: If the handler has a local helper called `errorResponse`, rename it to `sendError` or similar to avoid collision with the import from `@/lib/api/response`.

3. **Module name**: Use kebab-case module names matching the sidebar config: `'dms'`, `'bumdes'`, `'finance_pro'`, `'hris'`.

4. **Session reference**: After migration, access session via `(req as any).session` instead of `getServerSession()`.

5. **Import path**: `withHQAuth` lives at `@/lib/middleware/withHQAuth`. Error response utilities at `@/lib/api/response`.

### Files Migrated

| File | Module | Lines |
|------|--------|-------|
| `pages/api/hq/dms.ts` | `dms` | 517 |
| `pages/api/hq/bumdes.ts` | `bumdes` | 640 |

### Reference Pattern

Gold standard: `pages/api/hq/finance/transactions.ts` (153 lines) — uses `withHQAuth`, `getTenantContext`, `buildTenantFilter`, `validateBody`, `logAudit`, and transaction-safe writes.
