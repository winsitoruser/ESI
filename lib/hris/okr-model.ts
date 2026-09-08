/**
 * Client-safe OKR model (no sequelize).
 */
export type OkrLevel = 'company' | 'department' | 'team' | 'individual';
export type OkrCycle = 'quarterly' | 'annual' | 'monthly';
export type OkrConfidence = 'on_track' | 'at_risk' | 'off_track';
export type OkrStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export interface KeyResult {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  weight: number;
  confidence: OkrConfidence;
}

export interface OkrCheckIn {
  date: string;
  note: string;
  confidence: OkrConfidence;
  byName?: string;
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
  status: OkrStatus;
  keyResults: KeyResult[];
  checkIns?: OkrCheckIn[];
  createdAt?: string;
}

export type OkrNode = OkrObjective & { children: OkrNode[] };

export interface OkrListFilters {
  level?: OkrLevel;
  period?: string;
  department?: string;
  status?: OkrStatus | 'all';
}

export interface OkrSummary {
  total: number;
  avgProgress: number;
  onTrack: number;
  atRisk: number;
  offTrack: number;
  byLevel: Record<OkrLevel, number>;
  checkInsThisPeriod: number;
  completed: number;
}

const LEVEL_ORDER: Record<OkrLevel, number> = {
  company: 0, department: 1, team: 2, individual: 3,
};

export function currentOkrPeriod(d = new Date()): string {
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q}-${d.getFullYear()}`;
}

export function okrPeriodOptions(d = new Date()): string[] {
  const y = d.getFullYear();
  const opts: string[] = [];
  for (const year of [y - 1, y, y + 1]) {
    for (const q of [1, 2, 3, 4]) opts.push(`Q${q}-${year}`);
    opts.push(`${year}`);
  }
  const current = currentOkrPeriod(d);
  return Array.from(new Set([current, ...opts]));
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

export function krProgressPct(kr: KeyResult): number {
  if (!kr.targetValue || kr.targetValue <= 0) return 0;
  return Math.min(100, Math.round((kr.currentValue / kr.targetValue) * 100));
}

export function objectiveHealth(o: Pick<OkrObjective, 'progress' | 'keyResults'>): OkrConfidence {
  const krs = o.keyResults || [];
  if (krs.some((k) => k.confidence === 'off_track')) return 'off_track';
  if (krs.some((k) => k.confidence === 'at_risk')) return 'at_risk';
  if (o.progress < 40) return 'off_track';
  if (o.progress < 70) return 'at_risk';
  return 'on_track';
}

export function summarizeOkrs(okrs: OkrObjective[], period?: string): OkrSummary {
  const active = okrs.filter((o) => o.status === 'active' || o.status === 'draft');
  const pool = active.length ? active : okrs;
  const health = pool.map(objectiveHealth);
  const byLevel: Record<OkrLevel, number> = { company: 0, department: 0, team: 0, individual: 0 };
  for (const o of okrs) byLevel[o.level] = (byLevel[o.level] || 0) + 1;
  const year = (period || '').slice(-4);
  const checkInsThisPeriod = okrs.reduce((n, o) => {
    const ins = o.checkIns || [];
    if (!year) return n + ins.length;
    return n + ins.filter((c) => String(c.date || '').includes(year)).length;
  }, 0);
  return {
    total: okrs.length,
    avgProgress: pool.length ? Math.round(pool.reduce((s, o) => s + (o.progress || 0), 0) / pool.length) : 0,
    onTrack: health.filter((h) => h === 'on_track').length,
    atRisk: health.filter((h) => h === 'at_risk').length,
    offTrack: health.filter((h) => h === 'off_track').length,
    byLevel,
    checkInsThisPeriod,
    completed: okrs.filter((o) => o.status === 'completed').length,
  };
}

export function buildOkrTree(okrs: OkrObjective[]): OkrNode[] {
  const map = new Map<string, OkrNode>();
  for (const o of okrs) map.set(o.id, { ...o, children: [] });
  const roots: OkrNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortNodes = (nodes: OkrNode[]) => {
    nodes.sort((a, b) => (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9) || a.title.localeCompare(b.title));
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);
  return roots;
}
