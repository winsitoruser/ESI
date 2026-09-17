/**
 * Humanify tenants are often single-site with zero `branches` rows.
 * Device/attendance forms require a branch — ensure one HQ row per tenant.
 */
import { withAutocommitQuery } from '@/lib/saas/tenant-request-bound';

export type TenantBranchOption = {
  id: string;
  code: string;
  name: string;
  city: string;
};

const HQ_CODE = 'HQ';
const HQ_NAME = 'Kantor Pusat';

async function listTenantBranches(sequelize: any, tenantId: string): Promise<TenantBranchOption[]> {
  try {
    const [rows] = await sequelize.query(
      `SELECT id, code, name, city FROM branches
       WHERE tenant_id = :tenantId AND COALESCE(is_active, true) IS NOT FALSE
       ORDER BY name ASC LIMIT 100`,
      { replacements: { tenantId } },
    );
    return (rows || []).map((b: any) => ({
      id: String(b.id),
      code: b.code || '',
      name: b.name || HQ_NAME,
      city: b.city || '',
    }));
  } catch {
    try {
      const [rows] = await sequelize.query(
        `SELECT id, code, name FROM branches WHERE tenant_id = :tenantId ORDER BY name ASC LIMIT 100`,
        { replacements: { tenantId } },
      );
      return (rows || []).map((b: any) => ({
        id: String(b.id),
        code: b.code || '',
        name: b.name || HQ_NAME,
        city: '',
      }));
    } catch {
      return [];
    }
  }
}

export async function ensureTenantDefaultBranch(
  sequelize: any,
  tenantId: string | null | undefined,
): Promise<TenantBranchOption[]> {
  if (!sequelize || !tenantId) return [];
  const existing = await listTenantBranches(sequelize, tenantId);
  if (existing.length) return existing;

  await withAutocommitQuery(sequelize, async (query) => {
    await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"').catch(() => null);
    const [cols] = await query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'branches'`,
    );
    const colSet = new Set((cols || []).map((r: any) => String(r.column_name)));
    if (!colSet.has('tenant_id') || !colSet.has('name')) return false;

    const fields: string[] = ['id', 'tenant_id', 'name'];
    const values: string[] = ['gen_random_uuid()', ':tid', ':name'];
    const replacements: Record<string, unknown> = { tid: tenantId, name: HQ_NAME };
    if (colSet.has('code')) {
      fields.push('code');
      values.push(':code');
      replacements.code = HQ_CODE;
    }
    if (colSet.has('city')) {
      fields.push('city');
      values.push(`'Jakarta'`);
    }
    if (colSet.has('is_active')) {
      fields.push('is_active');
      values.push('true');
    }
    if (colSet.has('created_at')) {
      fields.push('created_at');
      values.push('NOW()');
    }
    if (colSet.has('updated_at')) {
      fields.push('updated_at');
      values.push('NOW()');
    }

    await query(
      `INSERT INTO branches (${fields.join(', ')})
       SELECT ${values.join(', ')}
       WHERE NOT EXISTS (
         SELECT 1 FROM branches WHERE tenant_id = :tid LIMIT 1
       )`,
      { replacements },
    );
    return true;
  }, 'ensure_hq_branch');

  return listTenantBranches(sequelize, tenantId);
}
