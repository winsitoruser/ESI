/**
 * Performance review cycle — bulk launch draft reviews for all active employees.
 */
let sequelize: any;
try { sequelize = require('../sequelize'); } catch (_) {}

export interface ReviewCycle {
  id: string;
  period: string;
  reviewType: string;
  status: string;
  launchedBy?: string;
  launchedAt?: string;
  totalEmployees: number;
  draftsCreated: number;
}

export async function ensureReviewCyclesTable(): Promise<boolean> {
  if (!sequelize) return false;
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_review_cycles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      period VARCHAR(50) NOT NULL,
      review_type VARCHAR(30) DEFAULT 'quarterly',
      status VARCHAR(20) DEFAULT 'active',
      launched_by TEXT,
      launched_at TIMESTAMPTZ DEFAULT NOW(),
      total_employees INTEGER DEFAULT 0,
      drafts_created INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  return true;
}

function currentQuarterPeriod(): string {
  const now = new Date();
  return `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`;
}

export async function launchReviewCycle(opts: {
  tenantId?: string | null;
  period?: string;
  reviewType?: string;
  launchedBy?: string;
  department?: string;
}): Promise<ReviewCycle> {
  if (!sequelize) throw new Error('Database tidak tersedia');

  await ensureReviewCyclesTable();

  const period = opts.period || currentQuarterPeriod();
  const reviewType = opts.reviewType || 'quarterly';
  const tenantId = opts.tenantId || null;

  let empSql = `
    SELECT e.id, e.name, e.position, e.department::text AS department, e.branch_id, e.tenant_id
    FROM employees e
    WHERE e.is_active = true
  `;
  const replacements: Record<string, unknown> = { period, reviewType, tenantId, launchedBy: opts.launchedBy || null };
  if (tenantId) {
    empSql += ` AND (e.tenant_id IS NULL OR e.tenant_id = :tenantId::uuid)`;
  }
  if (opts.department) {
    empSql += ` AND e.department::text = :department`;
    replacements.department = opts.department;
  }
  empSql += ' ORDER BY e.name ASC LIMIT 2000';

  const [employees] = await sequelize.query(empSql, { replacements });
  const emps = employees as any[];

  let draftsCreated = 0;
  for (const emp of emps) {
    const [existing] = await sequelize.query(
      `SELECT id FROM performance_reviews WHERE employee_id = :eid AND review_period = :period LIMIT 1`,
      { replacements: { eid: emp.id, period } }
    );
    if ((existing as any[]).length > 0) continue;

    let branchName = 'HQ';
    if (emp.branch_id) {
      const [br] = await sequelize.query(
        `SELECT name FROM branches WHERE id = :bid LIMIT 1`,
        { replacements: { bid: emp.branch_id } }
      );
      branchName = (br as any[])[0]?.name || branchName;
    }

    await sequelize.query(`
      INSERT INTO performance_reviews (
        tenant_id, employee_id, employee_name, position, department, branch_id, branch_name,
        review_period, review_type, review_date, period, status, overall_rating, overall_score,
        strengths, areas_for_improvement, goals
      ) VALUES (
        :tid, :eid, :ename, :position, :department, :branchId, :branchName,
        :period, :reviewType, CURRENT_DATE, :period, 'draft', 0, 0,
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb
      )
    `, {
      replacements: {
        tid: emp.tenant_id || tenantId,
        eid: emp.id,
        ename: emp.name,
        position: emp.position || '',
        department: emp.department || '',
        branchId: emp.branch_id || null,
        branchName,
        period,
        reviewType,
      },
    });
    draftsCreated += 1;
  }

  const [cycleRows] = await sequelize.query(`
    INSERT INTO hris_review_cycles (tenant_id, period, review_type, status, launched_by, total_employees, drafts_created)
    VALUES (:tenantId, :period, :reviewType, 'active', :launchedBy, :total, :created)
    RETURNING *
  `, {
    replacements: {
      tenantId,
      period,
      reviewType,
      launchedBy: opts.launchedBy || null,
      total: emps.length,
      created: draftsCreated,
    },
  });

  const row = (cycleRows as any[])[0];
  return {
    id: row.id,
    period: row.period,
    reviewType: row.review_type,
    status: row.status,
    launchedBy: row.launched_by,
    launchedAt: row.launched_at,
    totalEmployees: Number(row.total_employees || emps.length),
    draftsCreated,
  };
}

export async function listReviewCycles(limit = 10): Promise<ReviewCycle[]> {
  if (!sequelize) return [];
  await ensureReviewCyclesTable();
  const [rows] = await sequelize.query(
    `SELECT * FROM hris_review_cycles ORDER BY launched_at DESC LIMIT :limit`,
    { replacements: { limit } }
  );
  return (rows as any[]).map((r) => ({
    id: r.id,
    period: r.period,
    reviewType: r.review_type,
    status: r.status,
    launchedBy: r.launched_by,
    launchedAt: r.launched_at,
    totalEmployees: Number(r.total_employees || 0),
    draftsCreated: Number(r.drafts_created || 0),
  }));
}
