/**
 * 9-Box Talent Matrix — Performance (Y) × Potential (X)
 */

export type NineBoxQuadrant =
  | 'star' | 'high_performer' | 'high_potential'
  | 'core' | 'effective' | 'develop'
  | 'underperformer' | 'inconsistent' | 'risk';

export interface NineBoxEmployee {
  employeeId: string;
  employeeName: string;
  department?: string;
  position?: string;
  performanceScore: number; // 1-5
  potentialScore: number;   // 1-5
  quadrant: NineBoxQuadrant;
  quadrantLabel: string;
  quadrantColor: string;
  reviewPeriod?: string;
  overallRating?: number;
  kpiAchievement?: number;
}

export const NINE_BOX_GRID: Record<string, { label: string; color: string; action: string }> = {
  star: { label: 'Star / Future Leader', color: 'bg-green-600 text-white', action: 'Retain & accelerate' },
  high_performer: { label: 'High Performer', color: 'bg-green-400 text-white', action: 'Reward & stretch' },
  high_potential: { label: 'High Potential', color: 'bg-teal-500 text-white', action: 'Develop rapidly' },
  core: { label: 'Core Player', color: 'bg-blue-500 text-white', action: 'Maintain engagement' },
  effective: { label: 'Effective', color: 'bg-blue-300 text-gray-800', action: 'Coach & support' },
  develop: { label: 'Develop', color: 'bg-yellow-400 text-gray-800', action: 'Training plan' },
  underperformer: { label: 'Underperformer', color: 'bg-orange-400 text-white', action: 'PIP / coaching' },
  inconsistent: { label: 'Inconsistent', color: 'bg-orange-300 text-gray-800', action: 'Monitor closely' },
  risk: { label: 'Risk / Exit', color: 'bg-red-500 text-white', action: 'Intervention or exit' },
};

export function getQuadrant(performance: number, potential: number): NineBoxQuadrant {
  const p = Math.min(5, Math.max(1, performance));
  const pot = Math.min(5, Math.max(1, potential));
  const pHigh = p >= 3.5;
  const pMid = p >= 2.5 && p < 3.5;
  const potHigh = pot >= 3.5;
  const potMid = pot >= 2.5 && pot < 3.5;

  if (pHigh && potHigh) return 'star';
  if (pHigh && potMid) return 'high_performer';
  if (pHigh && !potMid && !potHigh) return 'underperformer';
  if (pMid && potHigh) return 'high_potential';
  if (pMid && potMid) return 'core';
  if (pMid && !potMid && !potHigh) return 'inconsistent';
  if (!pHigh && !pMid && potHigh) return 'develop';
  if (!pHigh && !pMid && potMid) return 'effective';
  return 'risk';
}

export function buildNineBoxFromReviews(reviews: any[], kpiData?: any[]): NineBoxEmployee[] {
  const kpiMap = new Map<string, number>();
  (kpiData || []).forEach(k => kpiMap.set(String(k.employeeId || k.employee_id), k.achievement || k.avgAchievement || 70));

  return reviews.map(r => {
    const perf = parseFloat(r.overallRating) || 3;
    const kpiAch = kpiMap.get(String(r.employeeId)) ?? 70;
    const potential = Math.min(5, Math.max(1, (kpiAch / 100) * 4 + 1));
    const quadrant = getQuadrant(perf, potential);
    const cfg = NINE_BOX_GRID[quadrant];
    return {
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      department: r.department,
      position: r.position,
      performanceScore: Math.round(perf * 10) / 10,
      potentialScore: Math.round(potential * 10) / 10,
      quadrant,
      quadrantLabel: cfg.label,
      quadrantColor: cfg.color,
      reviewPeriod: r.reviewPeriod,
      overallRating: perf,
      kpiAchievement: kpiAch,
    };
  });
}

export function getNineBoxSummary(employees: NineBoxEmployee[]) {
  const byQuadrant: Record<string, number> = {};
  for (const e of employees) {
    byQuadrant[e.quadrant] = (byQuadrant[e.quadrant] || 0) + 1;
  }
  return {
    total: employees.length,
    stars: byQuadrant.star || 0,
    highPerformers: (byQuadrant.high_performer || 0) + (byQuadrant.star || 0),
    develop: (byQuadrant.develop || 0) + (byQuadrant.high_potential || 0),
    risk: (byQuadrant.risk || 0) + (byQuadrant.underperformer || 0),
    byQuadrant,
  };
}

/** Grid layout: row 0 = high potential, row 2 = low potential */
export const NINE_BOX_LAYOUT: NineBoxQuadrant[][] = [
  ['develop', 'high_potential', 'star'],
  ['effective', 'core', 'high_performer'],
  ['risk', 'inconsistent', 'underperformer'],
];

export function getMockNineBox(): NineBoxEmployee[] {
  const mock = [
    { employeeId: '1', employeeName: 'Ahmad Wijaya', department: 'MANAGEMENT', position: 'GM', overallRating: 4.5, reviewPeriod: 'Q1 2026' },
    { employeeId: '2', employeeName: 'Siti Rahayu', department: 'OPERATIONS', position: 'Branch Manager', overallRating: 4.2, reviewPeriod: 'Q1 2026' },
    { employeeId: '3', employeeName: 'Made Wirawan', department: 'OPERATIONS', position: 'Branch Manager', overallRating: 4.8, reviewPeriod: 'Q1 2026' },
    { employeeId: '4', employeeName: 'Lisa Permata', department: 'FINANCE', position: 'Finance Manager', overallRating: 4.3, reviewPeriod: 'Q1 2026' },
    { employeeId: '5', employeeName: 'Fajar Setiawan', department: 'SALES', position: 'Sales Supervisor', overallRating: 3.2, reviewPeriod: 'Q1 2026' },
    { employeeId: '6', employeeName: 'Budi Santoso', department: 'FINANCE', position: 'Accountant', overallRating: 3.8, reviewPeriod: 'Q1 2026' },
    { employeeId: '7', employeeName: 'Maya Putri', department: 'HR', position: 'HR Officer', overallRating: 3.5, reviewPeriod: 'Q1 2026' },
    { employeeId: '8', employeeName: 'Dimas Prasetyo', department: 'IT', position: 'Developer', overallRating: 4.0, reviewPeriod: 'Q1 2026' },
    { employeeId: '9', employeeName: 'Rani Kusuma', department: 'WAREHOUSE', position: 'Staff', overallRating: 2.8, reviewPeriod: 'Q1 2026' },
  ];
  const kpi = mock.map((m, i) => ({ employeeId: m.employeeId, achievement: [95, 88, 92, 85, 62, 78, 75, 90, 55][i] }));
  return buildNineBoxFromReviews(mock, kpi);
}
