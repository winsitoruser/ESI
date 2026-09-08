/**
 * OKR (Objectives & Key Results) — cascading alignment company → team → individual
 */
import { allowHrMockFallback, type HrisDataSource } from './data-source';
import { withDbSavepoint } from '@/lib/saas/tenant-request-bound';
import {
  calcProgress, currentOkrPeriod, objectiveHealth,
  type OkrObjective, type OkrListFilters, type OkrCheckIn, type OkrConfidence,
} from './okr-model';

export {
  calcProgress, currentOkrPeriod, okrPeriodOptions, krProgressPct, objectiveHealth, summarizeOkrs, buildOkrTree,
} from './okr-model';
export type {
  OkrLevel, OkrCycle, OkrConfidence, OkrStatus, KeyResult, OkrCheckIn, OkrObjective, OkrNode, OkrListFilters, OkrSummary,
} from './okr-model';

let sequelize: any;
try { sequelize = require('../sequelize'); } catch (_) {}

export async function ensureOkrTables(): Promise<boolean> {
  if (!sequelize) return false;
  const ok = await withDbSavepoint(sequelize, async () => {
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
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_hris_okr_objectives_tenant ON hris_okr_objectives(tenant_id);
    `);
    return true;
  }, 'okr-ddl');
  return !!ok;
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

export interface OkrListResult {
  okrs: OkrObjective[];
  dataSource: HrisDataSource;
}

export async function listOkrs(
  tenantId: string | null | undefined,
  filters?: OkrListFilters,
): Promise<OkrListResult> {
  if (!sequelize) {
    return {
      okrs: allowHrMockFallback() ? getMockOkrs(filters) : [],
      dataSource: allowHrMockFallback() ? 'demo' : 'empty',
    };
  }
  await ensureOkrTables();
  if (!tenantId) {
    return { okrs: [], dataSource: 'empty' };
  }
  let sql = 'SELECT * FROM hris_okr_objectives WHERE tenant_id = $1';
  const params: any[] = [tenantId];
  if (filters?.level) { params.push(filters.level); sql += ` AND level = $${params.length}`; }
  if (filters?.period) { params.push(filters.period); sql += ` AND period = $${params.length}`; }
  if (filters?.department) { params.push(filters.department); sql += ` AND department = $${params.length}`; }
  if (filters?.status && filters.status !== 'all') {
    params.push(filters.status);
    sql += ` AND status = $${params.length}`;
  }
  sql += ' ORDER BY level ASC, created_at DESC';
  const [rows] = await sequelize.query(sql, { bind: params });
  if (!rows?.length) {
    return { okrs: [], dataSource: 'empty' };
  }
  return { okrs: rows.map(mapOkr), dataSource: 'live' };
}

export async function getOkrById(
  tenantId: string | null | undefined,
  id: string,
): Promise<OkrObjective | null> {
  if (!sequelize || !tenantId || !id) return null;
  await ensureOkrTables();
  const [rows] = await sequelize.query(
    'SELECT * FROM hris_okr_objectives WHERE id = $1 AND tenant_id = $2 LIMIT 1',
    { bind: [id, tenantId] },
  );
  return rows?.[0] ? mapOkr(rows[0]) : null;
}

export async function createOkr(
  data: Partial<OkrObjective> & { tenantId?: string | null },
): Promise<OkrObjective | null> {
  if (!sequelize) return null;
  await ensureOkrTables();
  const progress = calcProgress(data.keyResults || []);
  const [rows] = await sequelize.query(`
    INSERT INTO hris_okr_objectives
      (tenant_id, title, description, level, owner_id, owner_name, department, parent_id, cycle, period, progress, status, key_results)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING *
  `, {
    bind: [
      data.tenantId || null,
      data.title, data.description || null, data.level || 'individual',
      data.ownerId || null, data.ownerName || null, data.department || null,
      data.parentId || null, data.cycle || 'quarterly', data.period || currentOkrPeriod(),
      progress, data.status || 'active', JSON.stringify(data.keyResults || []),
    ],
  });
  return rows?.[0] ? mapOkr(rows[0]) : null;
}

export async function updateOkr(
  tenantId: string | null | undefined,
  id: string,
  patch: Partial<OkrObjective>,
): Promise<OkrObjective | null> {
  if (!sequelize || !tenantId || !id) return null;
  await ensureOkrTables();
  const existing = await getOkrById(tenantId, id);
  if (!existing) return null;
  const next: OkrObjective = {
    ...existing,
    ...patch,
    id: existing.id,
    keyResults: patch.keyResults ?? existing.keyResults,
    checkIns: patch.checkIns ?? existing.checkIns,
  };
  const progress = calcProgress(next.keyResults || []);
  const [rows] = await sequelize.query(`
    UPDATE hris_okr_objectives SET
      title = $3, description = $4, level = $5, owner_id = $6, owner_name = $7,
      department = $8, parent_id = $9, cycle = $10, period = $11, progress = $12,
      status = $13, key_results = $14, check_ins = $15, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING *
  `, {
    bind: [
      id, tenantId,
      next.title, next.description || null, next.level,
      next.ownerId || null, next.ownerName || null, next.department || null,
      next.parentId || null, next.cycle, next.period, progress,
      next.status, JSON.stringify(next.keyResults || []), JSON.stringify(next.checkIns || []),
    ],
  });
  return rows?.[0] ? mapOkr(rows[0]) : null;
}

export async function addOkrCheckIn(
  tenantId: string | null | undefined,
  id: string,
  payload: {
    note?: string;
    confidence?: OkrConfidence;
    byName?: string;
    keyResults?: Array<{ id: string; currentValue?: number; confidence?: OkrConfidence }>;
  },
): Promise<OkrObjective | null> {
  const existing = await getOkrById(tenantId, id);
  if (!existing) return null;
  let keyResults = existing.keyResults || [];
  if (payload.keyResults?.length) {
    const byId = new Map(payload.keyResults.map((k) => [k.id, k]));
    keyResults = keyResults.map((kr) => {
      const upd = byId.get(kr.id);
      if (!upd) return kr;
      return {
        ...kr,
        currentValue: upd.currentValue != null ? Number(upd.currentValue) : kr.currentValue,
        confidence: upd.confidence || kr.confidence,
      };
    });
  }
  const checkIns: OkrCheckIn[] = [
    {
      date: new Date().toISOString(),
      note: payload.note || '',
      confidence: payload.confidence || objectiveHealth({ progress: calcProgress(keyResults), keyResults }),
      byName: payload.byName,
    },
    ...(existing.checkIns || []),
  ].slice(0, 50);
  return updateOkr(tenantId, id, { keyResults, checkIns });
}

export async function deleteOkr(
  tenantId: string | null | undefined,
  id: string,
): Promise<boolean> {
  if (!sequelize || !tenantId || !id) return false;
  await ensureOkrTables();
  const [rows] = await sequelize.query(
    'DELETE FROM hris_okr_objectives WHERE id = $1 AND tenant_id = $2 RETURNING id',
    { bind: [id, tenantId] },
  );
  return !!(rows?.length);
}

function getMockOkrs(filters?: OkrListFilters): OkrObjective[] {
  const period = currentOkrPeriod();
  const all: OkrObjective[] = [
    {
      id: 'okr-c1',
      title: 'Jadikan Humanify HRIS andalan operasional SDM tenant',
      description: 'Fokus adopsi modul inti: karyawan, absensi, payroll, dan kinerja.',
      level: 'company',
      period,
      cycle: 'quarterly',
      progress: 68,
      status: 'active',
      ownerName: 'Direktur SDM',
      keyResults: [
        { id: 'kr1', title: 'Aktifkan 40 tenant dengan payroll live', targetValue: 40, currentValue: 27, unit: 'tenant', weight: 1, confidence: 'on_track' },
        { id: 'kr2', title: 'NPS pelanggan ≥ 50', targetValue: 50, currentValue: 41, unit: 'skor', weight: 1, confidence: 'at_risk' },
      ],
      checkIns: [
        { date: new Date().toISOString(), note: 'Payroll live bertambah 3 tenant minggu ini.', confidence: 'on_track', byName: 'Direktur SDM' },
      ],
    },
    {
      id: 'okr-d1',
      title: 'Percepat siklus kinerja & alignment OKR',
      level: 'department',
      department: 'HR',
      period,
      cycle: 'quarterly',
      progress: 72,
      status: 'active',
      parentId: 'okr-c1',
      ownerName: 'HRBP',
      keyResults: [
        { id: 'kr3', title: '100% manager selesaikan check-in bulanan', targetValue: 100, currentValue: 74, unit: '%', weight: 1, confidence: 'at_risk' },
        { id: 'kr4', title: 'Waktu siklus review ≤ 14 hari', targetValue: 14, currentValue: 16, unit: 'hari', weight: 1, confidence: 'at_risk' },
      ],
    },
    {
      id: 'okr-t1',
      title: 'Stabilkan payroll closing tanpa koreksi manual',
      level: 'team',
      department: 'FINANCE',
      period,
      cycle: 'quarterly',
      progress: 81,
      status: 'active',
      parentId: 'okr-c1',
      ownerName: 'Lead Payroll',
      keyResults: [
        { id: 'kr5', title: 'Closing H+2 setiap periode', targetValue: 2, currentValue: 2, unit: 'hari', weight: 1, confidence: 'on_track' },
      ],
    },
    {
      id: 'okr-i1',
      title: 'Selesaikan adopsi modul kinerja di tim HRIS',
      level: 'individual',
      ownerName: 'People Partner',
      department: 'HR',
      period,
      cycle: 'quarterly',
      progress: 90,
      status: 'active',
      parentId: 'okr-d1',
      keyResults: [
        { id: 'kr6', title: 'Dampingi 12 manager menulis KR terukur', targetValue: 12, currentValue: 11, unit: 'orang', weight: 1, confidence: 'on_track' },
      ],
    },
  ];
  let result = all;
  if (filters?.level) result = result.filter((o) => o.level === filters.level);
  if (filters?.period) result = result.filter((o) => o.period === filters.period);
  if (filters?.department) result = result.filter((o) => o.department === filters.department);
  if (filters?.status && filters.status !== 'all') result = result.filter((o) => o.status === filters.status);
  return result;
}
