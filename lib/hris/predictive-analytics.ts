/**
 * HR Predictive Analytics — rule-based scoring with extensible ML hook.
 * Computes attrition risk, absenteeism forecast, and headcount projections from HR data.
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AttritionRiskEmployee {
  employeeId: string;
  employeeName: string;
  department?: string;
  position?: string;
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
  factors: { factor: string; weight: number; detail: string }[];
  recommendation: string;
  tenureMonths: number;
}

export interface AbsenteeismForecast {
  period: string;
  predictedRate: number;
  trend: 'improving' | 'stable' | 'worsening';
  confidence: number;
  drivers: string[];
}

export interface HeadcountForecast {
  month: string;
  current: number;
  projected: number;
  hiresNeeded: number;
  resignationsExpected: number;
}

export interface PredictiveOverview {
  attritionRisk: {
    highRiskCount: number;
    criticalCount: number;
    avgRiskScore: number;
    topRisks: AttritionRiskEmployee[];
  };
  absenteeism: AbsenteeismForecast;
  headcount: HeadcountForecast[];
  leaveForecast?: LeaveForecast;
  insights: { type: string; severity: RiskLevel; title: string; description: string; action: string }[];
  generatedAt: string;
  dataSource: 'live' | 'partial' | 'demo';
}

function riskLevel(score: number): RiskLevel {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

export function computeAttritionRisk(employee: {
  id: string;
  name: string;
  department?: string;
  position?: string;
  join_date?: string | Date;
  created_at?: string | Date;
  status?: string;
}, signals: {
  lateCount?: number;
  absentCount?: number;
  attendanceTotal?: number;
  kpiAchievement?: number;
  leavePending?: number;
  hasDisciplinary?: boolean;
  monthsSincePromotion?: number;
  overtimeHours?: number;
}): AttritionRiskEmployee {
  const factors: AttritionRiskEmployee['factors'] = [];
  let score = 15; // baseline

  const joinDate = employee.join_date || employee.created_at;
  const tenureMonths = joinDate
    ? Math.max(0, Math.round((Date.now() - new Date(joinDate).getTime()) / (30 * 86400000)))
    : 12;

  // Tenure risk — highest at 12-24 months (common resignation window)
  if (tenureMonths >= 12 && tenureMonths <= 24) {
    factors.push({ factor: 'Tenure Window', weight: 20, detail: `${tenureMonths} bulan — periode resignasi umum` });
    score += 20;
  } else if (tenureMonths < 6) {
    factors.push({ factor: 'Onboarding Risk', weight: 12, detail: 'Karyawan baru < 6 bulan' });
    score += 12;
  }

  const attTotal = signals.attendanceTotal || 0;
  if (attTotal > 0) {
    const lateRate = (signals.lateCount || 0) / attTotal;
    const absentRate = (signals.absentCount || 0) / attTotal;
    if (lateRate > 0.15) {
      factors.push({ factor: 'Keterlambatan', weight: 15, detail: `${Math.round(lateRate * 100)}% keterlambatan` });
      score += 15;
    }
    if (absentRate > 0.1) {
      factors.push({ factor: 'Absensi', weight: 18, detail: `${Math.round(absentRate * 100)}% absen` });
      score += 18;
    }
  }

  const kpi = signals.kpiAchievement ?? 100;
  if (kpi < 60) {
    factors.push({ factor: 'KPI Rendah', weight: 22, detail: `Pencapaian KPI ${kpi}%` });
    score += 22;
  } else if (kpi < 75) {
    factors.push({ factor: 'KPI Di Bawah Target', weight: 10, detail: `Pencapaian KPI ${kpi}%` });
    score += 10;
  }

  if (signals.hasDisciplinary) {
    factors.push({ factor: 'Disiplin', weight: 25, detail: 'Memiliki surat peringatan aktif' });
    score += 25;
  }

  if ((signals.monthsSincePromotion ?? 24) > 24) {
    factors.push({ factor: 'Stagnasi Karir', weight: 12, detail: 'Tidak ada promosi > 24 bulan' });
    score += 12;
  }

  if ((signals.overtimeHours ?? 0) > 40) {
    factors.push({ factor: 'Burnout', weight: 14, detail: `${signals.overtimeHours} jam lembur/bulan` });
    score += 14;
  }

  const riskScore = Math.min(100, Math.round(score));
  const level = riskLevel(riskScore);

  const recMap: Record<RiskLevel, string> = {
    critical: 'Segera lakukan stay interview & review kompensasi',
    high: 'Jadwalkan 1-on-1 dengan manajer langsung',
    medium: 'Monitor engagement & beban kerja',
    low: 'Pertahankan — karyawan stabil',
  };

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    department: employee.department,
    position: employee.position,
    riskScore,
    riskLevel: level,
    factors,
    recommendation: recMap[level],
    tenureMonths,
  };
}

export function forecastAbsenteeism(
  monthlyRates: { month: string; rate: number }[],
  period: string,
): AbsenteeismForecast {
  if (monthlyRates.length === 0) {
    return { period, predictedRate: 5, trend: 'stable', confidence: 40, drivers: ['Data historis terbatas'] };
  }

  const rates = monthlyRates.map(m => m.rate);
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  const recent = rates.slice(-3);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const delta = recent.length >= 2 ? recent[recent.length - 1] - recent[0] : 0;

  let trend: AbsenteeismForecast['trend'] = 'stable';
  if (delta > 2) trend = 'worsening';
  else if (delta < -2) trend = 'improving';

  const predictedRate = Number(Math.max(0, Math.min(100, recentAvg + delta * 0.3)).toFixed(1));
  const drivers: string[] = [];
  if (trend === 'worsening') drivers.push('Tren absensi memburuk 3 bulan terakhir');
  if (avg > 8) drivers.push('Rata-rata absensi di atas 8%');
  if (drivers.length === 0) drivers.push('Pola kehadiran dalam batas normal');

  return {
    period,
    predictedRate,
    trend,
    confidence: Math.min(92, 50 + monthlyRates.length * 8),
    drivers,
  };
}

export function forecastHeadcount(
  currentHeadcount: number,
  monthlyHires: number[],
  monthlyExits: number[],
  monthsAhead = 6,
): HeadcountForecast[] {
  const avgHires = monthlyHires.length ? monthlyHires.reduce((a, b) => a + b, 0) / monthlyHires.length : 0;
  const avgExits = monthlyExits.length ? monthlyExits.reduce((a, b) => a + b, 0) / monthlyExits.length : 0;
  const net = avgHires - avgExits;

  const result: HeadcountForecast[] = [];
  let projected = currentHeadcount;
  const now = new Date();

  for (let i = 1; i <= monthsAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    projected = Math.max(0, Math.round(projected + net));
    result.push({
      month: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
      current: currentHeadcount,
      projected,
      hiresNeeded: Math.max(0, Math.round(avgHires)),
      resignationsExpected: Math.max(0, Math.round(avgExits)),
    });
  }
  return result;
}

export interface LeaveForecast {
  period: string;
  predictedRequests: number;
  peakMonths: string[];
  operationalRisk: 'low' | 'medium' | 'high';
  recommendation: string;
}

export function forecastLeaveDemand(
  monthlyRequests: { month: string; count: number }[],
  period: string,
): LeaveForecast {
  if (monthlyRequests.length === 0) {
    return { period, predictedRequests: 0, peakMonths: [], operationalRisk: 'low', recommendation: 'Data cuti terbatas — pantau pengajuan manual' };
  }
  const avg = monthlyRequests.reduce((s, m) => s + m.count, 0) / monthlyRequests.length;
  const sorted = [...monthlyRequests].sort((a, b) => b.count - a.count);
  const peakMonths = sorted.slice(0, 2).map(m => m.month);
  const recent = monthlyRequests.slice(-3);
  const recentAvg = recent.reduce((s, m) => s + m.count, 0) / recent.length;
  const predicted = Math.round(recentAvg * 1.1);

  let operationalRisk: LeaveForecast['operationalRisk'] = 'low';
  if (predicted > avg * 1.5) operationalRisk = 'high';
  else if (predicted > avg * 1.2) operationalRisk = 'medium';

  const rec = operationalRisk === 'high'
    ? 'Rencanakan backup staff untuk periode peak cuti'
    : operationalRisk === 'medium'
      ? 'Monitor approval cuti mingguan'
      : 'Pola cuti normal';

  return { period, predictedRequests: predicted, peakMonths, operationalRisk, recommendation: rec };
}

export function buildPredictiveInsights(
  attritionRisks: AttritionRiskEmployee[],
  absenteeism: AbsenteeismForecast,
  headcount: HeadcountForecast[],
): PredictiveOverview['insights'] {
  const insights: PredictiveOverview['insights'] = [];
  const critical = attritionRisks.filter(e => e.riskLevel === 'critical');
  const high = attritionRisks.filter(e => e.riskLevel === 'high');

  if (critical.length > 0) {
    insights.push({
      type: 'attrition',
      severity: 'critical',
      title: `${critical.length} karyawan risiko resignasi kritis`,
      description: `${critical.map(c => c.employeeName).slice(0, 3).join(', ')}${critical.length > 3 ? '...' : ''}`,
      action: 'Jalankan stay interview minggu ini',
    });
  }

  if (high.length > 2) {
    insights.push({
      type: 'attrition',
      severity: 'high',
      title: `${high.length} karyawan berisiko tinggi`,
      description: 'Kombinasi KPI rendah, absensi buruk, atau stagnasi karir terdeteksi',
      action: 'Review beban kerja & kompensasi departemen terdampak',
    });
  }

  if (absenteeism.trend === 'worsening') {
    insights.push({
      type: 'attendance',
      severity: absenteeism.predictedRate > 10 ? 'high' : 'medium',
      title: 'Prediksi peningkatan absensi',
      description: `Perkiraan tingkat absen ${absenteeism.predictedRate}% — ${absenteeism.drivers.join(', ')}`,
      action: 'Audit shift & kebijakan WFH',
    });
  }

  const lastProj = headcount[headcount.length - 1];
  if (lastProj && lastProj.projected < lastProj.current * 0.9) {
    insights.push({
      type: 'headcount',
      severity: 'medium',
      title: 'Proyeksi penurunan headcount',
      description: `Headcount diproyeksikan turun ke ${lastProj.projected} dalam ${headcount.length} bulan`,
      action: 'Percepat rekrutmen atau review retensi',
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: 'general',
      severity: 'low',
      title: 'Workforce dalam kondisi stabil',
      description: 'Tidak ada anomali signifikan terdeteksi pada periode ini',
      action: 'Lanjutkan monitoring rutin',
    });
  }

  return insights;
}
