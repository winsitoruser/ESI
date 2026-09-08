/**
 * Humanify CSAT/NPS pulse — store satisfaction responses (Wave-83 UX-83-1)
 */
let sequelize: any;
try { sequelize = require('../sequelize'); } catch {}

let ready = false;

export async function ensureSatisfactionTable(db?: any): Promise<boolean> {
  const seq = db || sequelize;
  if (!seq) return false;
  if (ready) return true;
  try {
    await seq.query(`
      CREATE TABLE IF NOT EXISTS humanify_satisfaction_responses (
        id UUID PRIMARY KEY,
        tenant_id UUID,
        user_id VARCHAR(64),
        employee_id VARCHAR(64),
        channel VARCHAR(32) NOT NULL DEFAULT 'ess',
        score SMALLINT NOT NULL,
        comment TEXT,
        context VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await seq.query(`
      CREATE INDEX IF NOT EXISTS idx_hf_sat_tenant_created
      ON humanify_satisfaction_responses (tenant_id, created_at DESC)
    `);
    ready = true;
    return true;
  } catch (e: any) {
    console.warn('[satisfaction]', e?.message || e);
    return false;
  }
}

export async function recordSatisfaction(opts: {
  tenantId?: string | null;
  userId?: string | null;
  employeeId?: string | null;
  score: number;
  comment?: string | null;
  channel?: string;
  context?: string | null;
  db?: any;
}): Promise<{ id: string }> {
  const seq = opts.db || sequelize;
  if (!seq) throw new Error('Database unavailable');
  await ensureSatisfactionTable(seq);
  const score = Math.max(0, Math.min(10, Math.round(Number(opts.score))));
  const id = require('crypto').randomUUID();
  await seq.query(
    `INSERT INTO humanify_satisfaction_responses
      (id, tenant_id, user_id, employee_id, channel, score, comment, context)
     VALUES (:id, :tid, :uid, :eid, :channel, :score, :comment, :context)`,
    {
      replacements: {
        id,
        tid: opts.tenantId || null,
        uid: opts.userId || null,
        eid: opts.employeeId || null,
        channel: opts.channel || 'ess',
        score,
        comment: opts.comment || null,
        context: opts.context || null,
      },
    },
  );
  return { id };
}
