/**
 * Company policy acknowledgment — publish (status=active) → ESS tanda terima.
 */
import crypto from 'crypto';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch { /* */ }

let ready = false;

export async function ensurePolicyAckTable(db?: any): Promise<boolean> {
  const seq = db || sequelize;
  if (!seq) return false;
  if (ready) return true;
  try {
    await seq.query(`
      CREATE TABLE IF NOT EXISTS policy_acknowledgments (
        id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL,
        regulation_id UUID NOT NULL,
        user_id VARCHAR(64),
        employee_id UUID,
        acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id, regulation_id, user_id)
      )
    `);
    await seq.query(`
      CREATE INDEX IF NOT EXISTS idx_policy_ack_tenant_user
      ON policy_acknowledgments (tenant_id, user_id, acknowledged_at DESC)
    `);
    ready = true;
    return true;
  } catch (e: any) {
    console.warn('[policy-ack] ensure:', e?.message || e);
    return false;
  }
}

export async function listPublishedPolicies(tenantId: string | null, db?: any) {
  const seq = db || sequelize;
  if (!seq || !tenantId) return [];
  const [rows] = await seq.query(
    `SELECT id, title, regulation_number, category, description, content,
            effective_date, status, version, updated_at
     FROM company_regulations
     WHERE tenant_id = :tid
       AND LOWER(COALESCE(status,'')) IN ('active', 'published')
     ORDER BY effective_date DESC NULLS LAST, updated_at DESC`,
    { replacements: { tid: tenantId } },
  );
  return rows || [];
}

export async function listMyPolicyStatus(opts: {
  tenantId: string;
  userId: string;
  db?: any;
}) {
  const seq = opts.db || sequelize;
  if (!seq) return { pending: [], acknowledged: [] };
  await ensurePolicyAckTable(seq);
  const policies = await listPublishedPolicies(opts.tenantId, seq);
  const [acks] = await seq.query(
    `SELECT regulation_id, acknowledged_at
     FROM policy_acknowledgments
     WHERE tenant_id = :tid AND user_id = :uid`,
    { replacements: { tid: opts.tenantId, uid: String(opts.userId) } },
  );
  const ackMap = new Map((acks || []).map((a: any) => [String(a.regulation_id), a.acknowledged_at]));
  const pending: any[] = [];
  const acknowledged: any[] = [];
  for (const p of policies as any[]) {
    const at = ackMap.get(String(p.id));
    if (at) acknowledged.push({ ...p, acknowledged_at: at });
    else pending.push(p);
  }
  return { pending, acknowledged };
}

export async function acknowledgePolicy(opts: {
  tenantId: string;
  userId: string;
  regulationId: string;
  employeeId?: string | null;
  db?: any;
}) {
  const seq = opts.db || sequelize;
  if (!seq) throw new Error('Database unavailable');
  await ensurePolicyAckTable(seq);

  const [regs] = await seq.query(
    `SELECT id FROM company_regulations
     WHERE id = :id AND tenant_id = :tid
       AND LOWER(COALESCE(status,'')) IN ('active', 'published')
     LIMIT 1`,
    { replacements: { id: opts.regulationId, tid: opts.tenantId } },
  );
  if (!regs?.[0]) throw new Error('Kebijakan tidak ditemukan atau belum dipublikasikan');

  const id = crypto.randomUUID();
  await seq.query(
    `INSERT INTO policy_acknowledgments (id, tenant_id, regulation_id, user_id, employee_id, acknowledged_at)
     VALUES (:id, :tid, :rid, :uid, :eid, NOW())
     ON CONFLICT (tenant_id, regulation_id, user_id) DO NOTHING`,
    {
      replacements: {
        id,
        tid: opts.tenantId,
        rid: opts.regulationId,
        uid: String(opts.userId),
        eid: opts.employeeId || null,
      },
    },
  );
  return { acknowledged: true, regulationId: opts.regulationId };
}
