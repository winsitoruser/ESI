/**
 * KPI Calculator & Formula Engine
 * Provides scoring calculations, formulas, and standard metrics
 */

// Standard KPI Categories
export const KPI_CATEGORIES = {
  sales: { name: 'Sales', color: '#3B82F6', icon: 'TrendingUp' },
  operations: { name: 'Operations', color: '#10B981', icon: 'Settings' },
  customer: { name: 'Customer', color: '#F59E0B', icon: 'Users' },
  financial: { name: 'Financial', color: '#8B5CF6', icon: 'DollarSign' },
  hr: { name: 'HR', color: '#EC4899', icon: 'UserCheck' },
  quality: { name: 'Quality', color: '#06B6D4', icon: 'Award' }
};

// Standard Scoring Levels
export const STANDARD_SCORING_LEVELS = [
  { level: 5, label: 'Excellent', minPercent: 110, maxPercent: 999, color: '#10B981', multiplier: 1.2 },
  { level: 4, label: 'Good', minPercent: 100, maxPercent: 109, color: '#3B82F6', multiplier: 1.0 },
  { level: 3, label: 'Average', minPercent: 80, maxPercent: 99, color: '#F59E0B', multiplier: 0.8 },
  { level: 2, label: 'Below Average', minPercent: 60, maxPercent: 79, color: '#F97316', multiplier: 0.6 },
  { level: 1, label: 'Poor', minPercent: 0, maxPercent: 59, color: '#EF4444', multiplier: 0.4 }
];

// KPI Template Definitions
export const KPI_TEMPLATES = [
  // Sales KPIs
  {
    code: 'KPI-SALES-001',
    name: 'Target Penjualan',
    category: 'sales',
    unit: 'Rp',
    dataType: 'currency',
    formulaType: 'simple',
    formula: '(actual / target) * 100',
    defaultWeight: 40,
    measurementFrequency: 'monthly',
    applicableTo: ['branch_manager', 'sales_staff', 'cashier'],
    parameters: [
      { name: 'target', label: 'Target Penjualan', type: 'currency', required: true },
      { name: 'minThreshold', label: 'Minimum Threshold', type: 'percentage', default: 60 }
    ]
  },
  {
    code: 'KPI-SALES-002',
    name: 'Jumlah Transaksi',
    category: 'sales',
    unit: 'transaksi',
    dataType: 'count',
    formulaType: 'simple',
    formula: '(actual / target) * 100',
    defaultWeight: 20,
    measurementFrequency: 'daily',
    applicableTo: ['cashier', 'sales_staff'],
    parameters: [
      { name: 'target', label: 'Target Transaksi Harian', type: 'number', required: true },
      { name: 'bonusThreshold', label: 'Bonus jika melebihi (%)', type: 'percentage', default: 120 }
    ]
  },
  {
    code: 'KPI-SALES-003',
    name: 'Nilai Rata-rata Transaksi',
    category: 'sales',
    unit: 'Rp',
    dataType: 'currency',
    formulaType: 'average',
    formula: 'totalSales / transactionCount',
    defaultWeight: 15,
    measurementFrequency: 'monthly',
    applicableTo: ['cashier', 'sales_staff'],
    parameters: [
      { name: 'target', label: 'Target Avg Transaction', type: 'currency', required: true }
    ]
  },
  {
    code: 'KPI-SALES-004',
    name: 'Upselling Rate',
    category: 'sales',
    unit: '%',
    dataType: 'percentage',
    formulaType: 'ratio',
    formula: '(upsellTransactions / totalTransactions) * 100',
    defaultWeight: 10,
    measurementFrequency: 'monthly',
    applicableTo: ['cashier', 'sales_staff'],
    parameters: [
      { name: 'target', label: 'Target Upselling (%)', type: 'percentage', required: true, default: 15 }
    ]
  },
  // Operations KPIs
  {
    code: 'KPI-OPS-001',
    name: 'Efisiensi Operasional',
    category: 'operations',
    unit: '%',
    dataType: 'percentage',
    formulaType: 'ratio',
    formula: '(actualOutput / expectedOutput) * 100',
    defaultWeight: 20,
    measurementFrequency: 'monthly',
    applicableTo: ['branch_manager', 'warehouse_staff'],
    parameters: [
      { name: 'target', label: 'Target Efisiensi (%)', type: 'percentage', required: true, default: 85 }
    ]
  },
  {
    code: 'KPI-OPS-002',
    name: 'Kehadiran',
    category: 'operations',
    unit: '%',
    dataType: 'percentage',
    formulaType: 'ratio',
    formula: '(daysPresent / workingDays) * 100',
    defaultWeight: 15,
    measurementFrequency: 'monthly',
    applicableTo: ['all'],
    parameters: [
      { name: 'target', label: 'Target Kehadiran (%)', type: 'percentage', required: true, default: 95 },
      { name: 'maxLateAllowed', label: 'Maks. Terlambat (hari)', type: 'number', default: 3 }
    ]
  },
  {
    code: 'KPI-OPS-003',
    name: 'Akurasi Stok',
    category: 'operations',
    unit: '%',
    dataType: 'percentage',
    formulaType: 'ratio',
    formula: '(matchedItems / totalItems) * 100',
    defaultWeight: 15,
    measurementFrequency: 'monthly',
    applicableTo: ['warehouse_staff', 'inventory_manager'],
    parameters: [
      { name: 'target', label: 'Target Akurasi (%)', type: 'percentage', required: true, default: 98 }
    ]
  },
  // Customer KPIs
  {
    code: 'KPI-CUST-001',
    name: 'Kepuasan Pelanggan',
    category: 'customer',
    unit: '%',
    dataType: 'percentage',
    formulaType: 'average',
    formula: 'averageRating * 20', // Convert 1-5 to percentage
    defaultWeight: 20,
    measurementFrequency: 'monthly',
    applicableTo: ['all'],
    parameters: [
      { name: 'target', label: 'Target CSAT (%)', type: 'percentage', required: true, default: 90 }
    ]
  },
  {
    code: 'KPI-CUST-002',
    name: 'Waktu Pelayanan',
    category: 'customer',
    unit: 'menit',
    dataType: 'number',
    formulaType: 'average',
    formula: 'target / actualTime * 100', // Inverse - lower is better
    defaultWeight: 15,
    measurementFrequency: 'daily',
    applicableTo: ['cashier', 'service_staff'],
    parameters: [
      { name: 'target', label: 'Target Waktu (menit)', type: 'number', required: true, default: 5 }
    ]
  },
  {
    code: 'KPI-CUST-003',
    name: 'Tingkat Komplain',
    category: 'customer',
    unit: '%',
    dataType: 'percentage',
    formulaType: 'ratio',
    formula: '100 - ((complaints / transactions) * 100)', // Inverse - lower is better
    defaultWeight: 10,
    measurementFrequency: 'monthly',
    applicableTo: ['all'],
    parameters: [
      { name: 'maxComplaints', label: 'Maks. Komplain (%)', type: 'percentage', required: true, default: 2 }
    ]
  },
  // Financial KPIs
  {
    code: 'KPI-FIN-001',
    name: 'Profit Margin',
    category: 'financial',
    unit: '%',
    dataType: 'percentage',
    formulaType: 'ratio',
    formula: '((revenue - cost) / revenue) * 100',
    defaultWeight: 25,
    measurementFrequency: 'monthly',
    applicableTo: ['branch_manager'],
    parameters: [
      { name: 'target', label: 'Target Margin (%)', type: 'percentage', required: true, default: 20 }
    ]
  },
  {
    code: 'KPI-FIN-002',
    name: 'Pengendalian Biaya',
    category: 'financial',
    unit: '%',
    dataType: 'percentage',
    formulaType: 'ratio',
    formula: '(budgetUsed / budgetAllocated) * 100',
    defaultWeight: 15,
    measurementFrequency: 'monthly',
    applicableTo: ['branch_manager'],
    parameters: [
      { name: 'budget', label: 'Budget Bulanan', type: 'currency', required: true },
      { name: 'target', label: 'Target Penghematan (%)', type: 'percentage', default: 10 }
    ]
  }
];

// Scoring Functions
export function calculateAchievementPercentage(actual: number, target: number): number {
  if (target === 0) return 0;
  return Math.round((actual / target) * 100 * 10) / 10;
}

export function getScoreLevel(achievementPercent: number, scoringLevels = STANDARD_SCORING_LEVELS) {
  for (const level of scoringLevels) {
    if (achievementPercent >= level.minPercent && achievementPercent <= level.maxPercent) {
      return level;
    }
  }
  return scoringLevels[scoringLevels.length - 1]; // Return lowest level if not found
}

export function calculateWeightedScore(metrics: { achievement: number; weight: number }[]): number {
  const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
  if (totalWeight === 0) return 0;
  
  const weightedSum = metrics.reduce((sum, m) => sum + (m.achievement * m.weight), 0);
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}

export function calculateOverallScore(
  metrics: { actual: number; target: number; weight: number }[],
  scoringLevels = STANDARD_SCORING_LEVELS
): { score: number; level: typeof STANDARD_SCORING_LEVELS[0]; details: any[] } {
  const details = metrics.map(m => {
    const achievement = calculateAchievementPercentage(m.actual, m.target);
    const level = getScoreLevel(achievement, scoringLevels);
    return {
      achievement,
      level: level.level,
      label: level.label,
      weight: m.weight,
      weightedScore: (level.level * m.weight) / 100
    };
  });

  const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
  const totalWeightedScore = details.reduce((sum, d) => sum + d.weightedScore, 0);
  const score = totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100 * 10) / 10 : 0;
  
  const overallAchievement = calculateWeightedScore(
    metrics.map((m, i) => ({ achievement: details[i].achievement, weight: m.weight }))
  );
  const level = getScoreLevel(overallAchievement, scoringLevels);

  return { score, level, details };
}

// Formula Evaluator
export function evaluateFormula(formula: string, variables: Record<string, number>): number {
  try {
    let expression = formula;
    for (const [key, value] of Object.entries(variables)) {
      expression = expression.replace(new RegExp(key, 'g'), value.toString());
    }
    // Simple math evaluation (safe for basic arithmetic)
    const result = Function(`"use strict"; return (${expression})`)();
    return typeof result === 'number' && !isNaN(result) ? result : 0;
  } catch {
    return 0;
  }
}

// Status Determination
export function getKPIStatus(achievementPercent: number): 'exceeded' | 'achieved' | 'partial' | 'not_achieved' {
  if (achievementPercent >= 110) return 'exceeded';
  if (achievementPercent >= 100) return 'achieved';
  if (achievementPercent >= 80) return 'partial';
  return 'not_achieved';
}

// Trend Calculation
export function calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  const change = ((current - previous) / previous) * 100;
  if (change > 5) return 'up';
  if (change < -5) return 'down';
  return 'stable';
}

// Bonus/Penalty Calculation
export function calculateBonusPenalty(
  score: number,
  baseSalary: number,
  bonusRules: { enabled: boolean; thresholds: { minScore: number; bonusPercent: number }[] },
  penaltyRules: { enabled: boolean; thresholds: { maxScore: number; penaltyPercent: number }[] }
): { bonus: number; penalty: number; netAdjustment: number } {
  let bonus = 0;
  let penalty = 0;

  if (bonusRules.enabled) {
    for (const threshold of bonusRules.thresholds) {
      if (score >= threshold.minScore) {
        bonus = (baseSalary * threshold.bonusPercent) / 100;
        break;
      }
    }
  }

  if (penaltyRules.enabled) {
    for (const threshold of penaltyRules.thresholds) {
      if (score <= threshold.maxScore) {
        penalty = (baseSalary * threshold.penaltyPercent) / 100;
        break;
      }
    }
  }

  return { bonus, penalty, netAdjustment: bonus - penalty };
}

export default {
  KPI_CATEGORIES,
  STANDARD_SCORING_LEVELS,
  KPI_TEMPLATES,
  calculateAchievementPercentage,
  getScoreLevel,
  calculateWeightedScore,
  calculateOverallScore,
  evaluateFormula,
  getKPIStatus,
  calculateTrend,
  calculateBonusPenalty
};
