/**
 * OKR (Objectives & Key Results) — cascading alignment company → team → individual
 */
let sequelize: any;
try { sequelize = require('../sequelize'); } catch (_) {}

export type OkrLevel = 'company' | 'department' | 'team' | 'individual';
export type OkrCycle = 'quarterly' | 'annual' | 'monthly';
export type OkrConfidence = 'on_track' | 'at_risk' | 'off_track';

export interface KeyResult {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  weight: number;
  confidence: OkrConfidence;
}

export interface OkrObjective {
  id: string;
  title: string;
  description?: string;
  level: OkrLevel;
  ownerId?: string;
  ownerName?: string;
  department?: string;
  parentId?: string;
  cycle: OkrCycle;
  period: string;
  progress: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  keyResults: KeyResult[];
  checkIns?: { date: string; note: string; confidence: OkrConfidence }[];
  createdAt?: string;
}

export async function ensureOkrTables(): Promise<boolean> {
  if (!sequelize) return false;
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS hris_okr_objectives (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID,
      title VARCHAR(300) NOT NULL,
      description TEXT,
      level VARCHAR(20) NOT NULL DEFAULT 'individual',
      owner_id TEXT,
      owner_name VARCHAR(200),
      department VARCHAR(50),
      parent_id UUID,
      cycle VARCHAR(20) DEFAULT 'quarterly',
      period VARCHAR(20) NOT NULL,
      progress NUMERIC(5,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active',
      key_results JSONB DEFAULT '[]',
      check_ins JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  return true;
}

function mapOkr(row: any): OkrObjective {
  const krs = typeof row.key_results === 'string' ? JSON.parse(row.key_results) : (row.key_results || []);
  const checkIns = typeof row.check_ins === 'string' ? JSON.parse(row.check_ins) : (row.check_ins || []);
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    level: row.level,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    department: row.department,
    parentId: row.parent_id,
    cycle: row.cycle,
    period: row.period,
    progress: parseFloat(row.progress || 0),
    status: row.status,
    keyResults: krs,
    checkIns,
    createdAt: row.created_at,
  };
}

export async function listOkrs(filters?: { level?: OkrLevel; period?: string; department?: string }): Promise<OkrObjective[]> {
  if (!sequelize) return getMockOkrs(filters);
  await ensureOkrTables();
  let sql = 'SELECT * FROM hris_okr_objectives WHERE 1=1';
  const params: any[] = [];
  if (filters?.level) { params.push(filters.level); sql += ` AND level = $${params.length}`; }
  if (filters?.period) { params.push(filters.period); sql += ` AND period = $${params.length}`; }
  if (filters?.department) { params.push(filters.department); sql += ` AND department = $${params.length}`; }
  sql += ' ORDER BY level ASC, created_at DESC';
  const [rows] = await sequelize.query(sql, { bind: params });
  if (!rows?.length) return getMockOkrs(filters);
  return rows.map(mapOkr);
}

export async function createOkr(data: Partial<OkrObjective>): Promise<OkrObjective | null> {
  if (!sequelize) return null;
  await ensureOkrTables();
  const progress = calcProgress(data.keyResults || []);
  const [rows] = await sequelize.query(`
    INSERT INTO hris_okr_objectives
      (title, description, level, owner_id, owner_name, department, parent_id, cycle, period, progress, status, key_results)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING *
  `, {
    bind: [
      data.title, data.description || null, data.level || 'individual',
      data.ownerId || null, data.ownerName || null, data.department || null,
      data.parentId || null, data.cycle || 'quarterly', data.period || 'Q1-2026',
      progress, data.status || 'active', JSON.stringify(data.keyResults || []),
    ],
  });
  return rows?.[0] ? mapOkr(rows[0]) : null;
}

export function calcProgress(keyResults: KeyResult[]): number {
  if (!keyResults.length) return 0;
  let total = 0, weightSum = 0;
  for (const kr of keyResults) {
    const w = kr.weight || 1;
    const pct = kr.targetValue > 0 ? Math.min(100, (kr.currentValue / kr.targetValue) * 100) : 0;
    total += pct * w;
    weightSum += w;
  }
  return Math.round((total / (weightSum || 1)) * 10) / 10;
}

function getMockOkrs(filters?: { level?: OkrLevel; period?: string }): OkrObjective[] {
  const all: OkrObjective[] = [
    {
      id: 'okr-c1', title: 'Tingkatkan revenue platform pet ecosystem 30%', level: 'company', period: 'Q1-2026', cycle: 'quarterly', progress: 68, status: 'active',
      keyResults: [
        { id: 'kr1', title: 'Onboard 50 partner baru', targetValue: 50, currentValue: 34, unit: 'partner', weight: 1, confidence: 'on_track' },
        { id: 'kr2', title: 'GMV teleconsult Rp 2M', targetValue: 2000000000, currentValue: 1200000000, unit: 'IDR', weight: 1, confidence: 'at_risk' },
      ],
    },
    {
      id: 'okr-d1', title: 'Optimalkan operasional HR', level: 'department', department: 'HR', period: 'Q1-2026', cycle: 'quarterly', progress: 82, status: 'active', parentId: 'okr-c1',
      keyResults: [
        { id: 'kr3', title: 'Reduce time-to-hire to 21 hari', targetValue: 21, currentValue: 28, unit: 'hari', weight: 1, confidence: 'at_risk' },
        { id: 'kr4', title: 'Employee satisfaction ≥ 4.2', targetValue: 4.2, currentValue: 4.1, unit: 'skor', weight: 1, confidence: 'on_track' },
      ],
    },
    {
      id: 'okr-i1', title: 'Selesaikan migrasi modul Humanify', level: 'individual', ownerName: 'Tim HRIS', department: 'IT', period: 'Q1-2026', cycle: 'quarterly', progress: 90, status: 'active', parentId: 'okr-d1',
      keyResults: [
        { id: 'kr5', title: 'Deploy 15 modul baru', targetValue: 15, currentValue: 12, unit: 'modul', weight: 1, confidence: 'on_track' },
      ],
    },
  ];
  let result = all;
  if (filters?.level) result = result.filter(o => o.level === filters.level);
  if (filters?.period) result = result.filter(o => o.period === filters.period);
  return result;
}
