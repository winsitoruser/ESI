/**
 * KPI Calculator & Formula Engine
 * Provides scoring calculations, formulas, and standard metrics
 */

// Standard KPI Categories
export const KPI_CATEGORIES = {
  sales: { name: 'Sales', color: '#3B82F6', icon: 'TrendingUp' },
  marketing: { name: 'Marketing', color: '#E11D48', icon: 'Megaphone' },
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
  // Extended Sales KPIs - Product & Group Targets
  {
    code: 'KPI-SALES-005',
    name: 'Target Penjualan per Produk',
    category: 'sales',
    unit: 'Rp',
    dataType: 'currency',
    formulaType: 'product_target',
    formula: 'sum(productActual) / sum(productTarget) * 100',
    defaultWeight: 25,
    measurementFrequency: 'monthly',
    applicableTo: ['sales_staff', 'branch_manager', 'cashier'],
    parameters: [
      { name: 'products', label: 'Daftar Produk & Target', type: 'product_list', required: true },
      { name: 'minThreshold', label: 'Minimum Threshold (%)', type: 'percentage', default: 60 }
    ]
  },
  {
    code: 'KPI-SALES-006',
    name: 'Target Penjualan per Grup Produk',
    category: 'sales',
    unit: 'Rp',
    dataType: 'currency',
    formulaType: 'group_target',
    formula: 'sum(groupActual) / sum(groupTarget) * 100',
    defaultWeight: 20,
    measurementFrequency: 'monthly',
    applicableTo: ['sales_staff', 'branch_manager'],
    parameters: [
      { name: 'productGroups', label: 'Grup Produk & Target', type: 'product_group_list', required: true },
      { name: 'minGroupThreshold', label: 'Min Threshold per Grup (%)', type: 'percentage', default: 70 }
    ]
  },
  {
    code: 'KPI-SALES-007',
    name: 'Target Kunjungan',
    category: 'sales',
    unit: 'kunjungan',
    dataType: 'count',
    formulaType: 'simple',
    formula: '(actual / target) * 100',
    defaultWeight: 15,
    measurementFrequency: 'weekly',
    applicableTo: ['sales_staff', 'marketing_staff'],
    parameters: [
      { name: 'target', label: 'Target Kunjungan/Minggu', type: 'number', required: true, default: 20 },
      { name: 'minQualifiedVisits', label: 'Min. Kunjungan Qualified (%)', type: 'percentage', default: 60 },
      { name: 'visitTypes', label: 'Tipe Kunjungan', type: 'multi_select', default: ['new_prospect', 'existing_customer', 'follow_up'] }
    ]
  },
  {
    code: 'KPI-SALES-008',
    name: 'Akuisisi Pelanggan Baru',
    category: 'sales',
    unit: 'pelanggan',
    dataType: 'count',
    formulaType: 'simple',
    formula: '(actual / target) * 100',
    defaultWeight: 15,
    measurementFrequency: 'monthly',
    applicableTo: ['sales_staff', 'marketing_staff', 'branch_manager'],
    parameters: [
      { name: 'target', label: 'Target Pelanggan Baru/Bulan', type: 'number', required: true, default: 10 },
      { name: 'retentionPeriod', label: 'Periode Retensi (hari)', type: 'number', default: 30 }
    ]
  },
  {
    code: 'KPI-SALES-009',
    name: 'Conversion Rate',
    category: 'sales',
    unit: '%',
    dataType: 'percentage',
    formulaType: 'ratio',
    formula: '(closedDeals / totalLeads) * 100',
    defaultWeight: 15,
    measurementFrequency: 'monthly',
    applicableTo: ['sales_staff'],
    parameters: [
      { name: 'target', label: 'Target Conversion Rate (%)', type: 'percentage', required: true, default: 25 }
    ]
  },
  {
    code: 'KPI-SALES-010',
    name: 'Retensi Pelanggan',
    category: 'sales',
    unit: '%',
    dataType: 'percentage',
    formulaType: 'ratio',
    formula: '(activeCustomers / totalCustomers) * 100',
    defaultWeight: 10,
    measurementFrequency: 'quarterly',
    applicableTo: ['sales_staff', 'branch_manager'],
    parameters: [
      { name: 'target', label: 'Target Retensi (%)', type: 'percentage', required: true, default: 85 },
      { name: 'inactivePeriod', label: 'Periode Inaktif (hari)', type: 'number', default: 90 }
    ]
  },
  {
    code: 'KPI-SALES-011',
    name: 'Pertumbuhan Revenue per Area',
    category: 'sales',
    unit: '%',
    dataType: 'percentage',
    formulaType: 'growth',
    formula: '((currentRevenue - previousRevenue) / previousRevenue) * 100',
    defaultWeight: 15,
    measurementFrequency: 'monthly',
    applicableTo: ['branch_manager', 'area_manager'],
    parameters: [
      { name: 'target', label: 'Target Growth (%)', type: 'percentage', required: true, default: 10 },
      { name: 'areaType', label: 'Tipe Area', type: 'select', default: 'branch' }
    ]
  },
  // Marketing KPIs
  {
    code: 'KPI-MKT-001',
    name: 'Lead Generation',
    category: 'marketing',
    unit: 'leads',
    dataType: 'count',
    formulaType: 'simple',
    formula: '(actual / target) * 100',
    defaultWeight: 20,
    measurementFrequency: 'monthly',
    applicableTo: ['marketing_staff', 'marketing_manager'],
    parameters: [
      { name: 'target', label: 'Target Leads/Bulan', type: 'number', required: true, default: 100 },
      { name: 'qualifiedRate', label: 'Target Qualified Rate (%)', type: 'percentage', default: 30 }
    ]
  },
  {
    code: 'KPI-MKT-002',
    name: 'Cost per Acquisition (CPA)',
    category: 'marketing',
    unit: 'Rp',
    dataType: 'currency',
    formulaType: 'ratio',
    formula: 'target / (marketingCost / newCustomers) * 100',
    defaultWeight: 15,
    measurementFrequency: 'monthly',
    applicableTo: ['marketing_manager'],
    parameters: [
      { name: 'target', label: 'Target CPA (Rp)', type: 'currency', required: true, default: 50000 },
      { name: 'maxBudget', label: 'Budget Maksimum', type: 'currency', default: 10000000 }
    ]
  },
  {
    code: 'KPI-MKT-003',
    name: 'ROI Marketing Campaign',
    category: 'marketing',
    unit: '%',
    dataType: 'percentage',
    formulaType: 'ratio',
    formula: '((revenue - cost) / cost) * 100',
    defaultWeight: 20,
    measurementFrequency: 'monthly',
    applicableTo: ['marketing_manager'],
    parameters: [
      { name: 'target', label: 'Target ROI (%)', type: 'percentage', required: true, default: 300 }
    ]
  },
  {
    code: 'KPI-MKT-004',
    name: 'Brand Awareness',
    category: 'marketing',
    unit: '%',
    dataType: 'percentage',
    formulaType: 'average',
    formula: 'surveyScore',
    defaultWeight: 15,
    measurementFrequency: 'quarterly',
    applicableTo: ['marketing_manager'],
    parameters: [
      { name: 'target', label: 'Target Awareness (%)', type: 'percentage', required: true, default: 60 }
    ]
  },
  {
    code: 'KPI-MKT-005',
    name: 'Social Media Engagement',
    category: 'marketing',
    unit: '%',
    dataType: 'percentage',
    formulaType: 'ratio',
    formula: '(engagements / impressions) * 100',
    defaultWeight: 10,
    measurementFrequency: 'weekly',
    applicableTo: ['marketing_staff'],
    parameters: [
      { name: 'target', label: 'Target Engagement Rate (%)', type: 'percentage', required: true, default: 5 }
    ]
  },
  {
    code: 'KPI-MKT-006',
    name: 'Conversion Rate Marketing',
    category: 'marketing',
    unit: '%',
    dataType: 'percentage',
    formulaType: 'ratio',
    formula: '(conversions / visitors) * 100',
    defaultWeight: 15,
    measurementFrequency: 'monthly',
    applicableTo: ['marketing_staff', 'marketing_manager'],
    parameters: [
      { name: 'target', label: 'Target Conversion (%)', type: 'percentage', required: true, default: 3 }
    ]
  },
  {
    code: 'KPI-MKT-007',
    name: 'Event & Promo Effectiveness',
    category: 'marketing',
    unit: '%',
    dataType: 'percentage',
    formulaType: 'ratio',
    formula: '(promoSales / totalSales) * 100',
    defaultWeight: 10,
    measurementFrequency: 'monthly',
    applicableTo: ['marketing_staff', 'branch_manager'],
    parameters: [
      { name: 'target', label: 'Target Promo Contribution (%)', type: 'percentage', required: true, default: 20 },
      { name: 'maxDiscount', label: 'Max Average Discount (%)', type: 'percentage', default: 15 }
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

// ─── AI Analysis Functions ───

// Sales & Marketing Role Presets
export const ROLE_KPI_PRESETS: Record<string, { role: string; label: string; kpis: { code: string; weight: number }[] }> = {
  sales_staff: {
    role: 'sales_staff',
    label: 'Staff Penjualan',
    kpis: [
      { code: 'KPI-SALES-001', weight: 25 },
      { code: 'KPI-SALES-005', weight: 20 },
      { code: 'KPI-SALES-007', weight: 15 },
      { code: 'KPI-SALES-008', weight: 10 },
      { code: 'KPI-SALES-009', weight: 10 },
      { code: 'KPI-CUST-001', weight: 10 },
      { code: 'KPI-OPS-002', weight: 10 },
    ]
  },
  branch_manager: {
    role: 'branch_manager',
    label: 'Manajer Cabang',
    kpis: [
      { code: 'KPI-SALES-001', weight: 20 },
      { code: 'KPI-SALES-006', weight: 15 },
      { code: 'KPI-SALES-011', weight: 10 },
      { code: 'KPI-FIN-001', weight: 15 },
      { code: 'KPI-FIN-002', weight: 10 },
      { code: 'KPI-OPS-001', weight: 10 },
      { code: 'KPI-CUST-001', weight: 10 },
      { code: 'KPI-OPS-002', weight: 10 },
    ]
  },
  marketing_staff: {
    role: 'marketing_staff',
    label: 'Staff Marketing',
    kpis: [
      { code: 'KPI-MKT-001', weight: 20 },
      { code: 'KPI-MKT-003', weight: 15 },
      { code: 'KPI-MKT-005', weight: 15 },
      { code: 'KPI-MKT-006', weight: 15 },
      { code: 'KPI-MKT-007', weight: 10 },
      { code: 'KPI-SALES-007', weight: 15 },
      { code: 'KPI-OPS-002', weight: 10 },
    ]
  },
  marketing_manager: {
    role: 'marketing_manager',
    label: 'Manajer Marketing',
    kpis: [
      { code: 'KPI-MKT-001', weight: 15 },
      { code: 'KPI-MKT-002', weight: 15 },
      { code: 'KPI-MKT-003', weight: 20 },
      { code: 'KPI-MKT-004', weight: 10 },
      { code: 'KPI-MKT-006', weight: 10 },
      { code: 'KPI-SALES-008', weight: 10 },
      { code: 'KPI-SALES-011', weight: 10 },
      { code: 'KPI-OPS-002', weight: 10 },
    ]
  },
  cashier: {
    role: 'cashier',
    label: 'Kasir',
    kpis: [
      { code: 'KPI-SALES-002', weight: 25 },
      { code: 'KPI-SALES-003', weight: 15 },
      { code: 'KPI-SALES-004', weight: 15 },
      { code: 'KPI-CUST-001', weight: 15 },
      { code: 'KPI-CUST-002', weight: 10 },
      { code: 'KPI-OPS-002', weight: 20 },
    ]
  },
};

// AI Weight Optimization
export interface AIWeightRecommendation {
  code: string;
  name: string;
  currentWeight: number;
  recommendedWeight: number;
  reason: string;
  impact: 'high' | 'medium' | 'low';
}

export function analyzeWeightDistribution(
  metrics: { code: string; name: string; weight: number; category: string; achievement?: number }[]
): {
  isBalanced: boolean;
  totalWeight: number;
  categoryBreakdown: Record<string, { weight: number; count: number; avgAchievement: number }>;
  recommendations: AIWeightRecommendation[];
  overallHealth: 'excellent' | 'good' | 'needs_improvement' | 'poor';
  insights: string[];
} {
  const totalWeight = metrics.reduce((s, m) => s + m.weight, 0);
  const categoryBreakdown: Record<string, { weight: number; count: number; totalAchievement: number; avgAchievement: number }> = {};

  for (const m of metrics) {
    if (!categoryBreakdown[m.category]) {
      categoryBreakdown[m.category] = { weight: 0, count: 0, totalAchievement: 0, avgAchievement: 0 };
    }
    categoryBreakdown[m.category].weight += m.weight;
    categoryBreakdown[m.category].count += 1;
    categoryBreakdown[m.category].totalAchievement += m.achievement || 0;
  }

  for (const cat in categoryBreakdown) {
    const c = categoryBreakdown[cat];
    c.avgAchievement = c.count > 0 ? Math.round(c.totalAchievement / c.count) : 0;
  }

  const recommendations: AIWeightRecommendation[] = [];
  const insights: string[] = [];

  // Check total weight
  if (totalWeight !== 100) {
    insights.push(`Total bobot saat ini ${totalWeight}%, seharusnya 100%. Sesuaikan distribusi bobot.`);
  }

  // Check if any single metric has too high weight
  for (const m of metrics) {
    if (m.weight > 40) {
      recommendations.push({
        code: m.code, name: m.name, currentWeight: m.weight, recommendedWeight: 30,
        reason: `Bobot ${m.weight}% terlalu dominan. Distribusikan ke metrik lain untuk penilaian lebih seimbang.`,
        impact: 'high'
      });
    }
    if (m.weight < 5 && m.weight > 0) {
      recommendations.push({
        code: m.code, name: m.name, currentWeight: m.weight, recommendedWeight: 10,
        reason: `Bobot ${m.weight}% terlalu kecil, tidak akan berpengaruh signifikan pada skor keseluruhan.`,
        impact: 'low'
      });
    }
  }

  // Check category distribution
  const salesWeight = categoryBreakdown['sales']?.weight || 0;
  const marketingWeight = categoryBreakdown['marketing']?.weight || 0;
  const opsWeight = categoryBreakdown['operations']?.weight || 0;

  if (salesWeight + marketingWeight > 70) {
    insights.push(`Bobot Sales+Marketing (${salesWeight + marketingWeight}%) sangat tinggi. Pertimbangkan menambah metrik operasional atau customer.`);
  }
  if (salesWeight + marketingWeight < 30 && metrics.some(m => m.category === 'sales' || m.category === 'marketing')) {
    insights.push(`Bobot Sales+Marketing hanya ${salesWeight + marketingWeight}%. Untuk role sales/marketing, bobot ideal 40-60%.`);
  }

  // Check for underperforming high-weight metrics
  const underperformingHigh = metrics.filter(m => m.weight >= 20 && (m.achievement || 0) < 70);
  if (underperformingHigh.length > 0) {
    for (const m of underperformingHigh) {
      insights.push(`"${m.name}" berbobot ${m.weight}% tetapi pencapaian hanya ${m.achievement || 0}%. Perlu perhatian khusus karena dampak besar pada skor total.`);
    }
  }

  // Determine overall health
  let overallHealth: 'excellent' | 'good' | 'needs_improvement' | 'poor' = 'good';
  if (totalWeight === 100 && recommendations.length === 0 && metrics.length >= 4) overallHealth = 'excellent';
  else if (totalWeight !== 100 || recommendations.length > 2) overallHealth = 'needs_improvement';
  else if (metrics.length < 3) overallHealth = 'poor';

  const isBalanced = totalWeight === 100 && recommendations.length === 0;

  return {
    isBalanced,
    totalWeight,
    categoryBreakdown,
    recommendations,
    overallHealth,
    insights
  };
}

// Product Target Analysis
export interface ProductTargetConfig {
  productId: string;
  productName: string;
  groupId?: string;
  groupName?: string;
  targetQty: number;
  targetRevenue: number;
  weight: number;
  actualQty?: number;
  actualRevenue?: number;
}

export function analyzeProductTargets(
  products: ProductTargetConfig[]
): {
  totalTargetRevenue: number;
  totalActualRevenue: number;
  overallAchievement: number;
  groupAnalysis: Record<string, { target: number; actual: number; achievement: number; productCount: number }>;
  topPerformers: ProductTargetConfig[];
  underPerformers: ProductTargetConfig[];
  recommendations: string[];
} {
  const totalTargetRevenue = products.reduce((s, p) => s + p.targetRevenue, 0);
  const totalActualRevenue = products.reduce((s, p) => s + (p.actualRevenue || 0), 0);
  const overallAchievement = totalTargetRevenue > 0 ? Math.round((totalActualRevenue / totalTargetRevenue) * 100) : 0;

  const groupAnalysis: Record<string, { target: number; actual: number; achievement: number; productCount: number }> = {};
  for (const p of products) {
    const gid = p.groupId || 'ungrouped';
    if (!groupAnalysis[gid]) groupAnalysis[gid] = { target: 0, actual: 0, achievement: 0, productCount: 0 };
    groupAnalysis[gid].target += p.targetRevenue;
    groupAnalysis[gid].actual += p.actualRevenue || 0;
    groupAnalysis[gid].productCount += 1;
  }
  for (const g in groupAnalysis) {
    groupAnalysis[g].achievement = groupAnalysis[g].target > 0 ? Math.round((groupAnalysis[g].actual / groupAnalysis[g].target) * 100) : 0;
  }

  const productsWithAchievement = products.map(p => ({
    ...p,
    _achievement: p.targetRevenue > 0 ? (p.actualRevenue || 0) / p.targetRevenue * 100 : 0
  }));
  const sorted = [...productsWithAchievement].sort((a, b) => b._achievement - a._achievement);
  const topPerformers = sorted.slice(0, 5);
  const underPerformers = sorted.filter(p => p._achievement < 70).slice(-5).reverse();

  const recommendations: string[] = [];
  if (underPerformers.length > 0) {
    recommendations.push(`${underPerformers.length} produk di bawah 70% target: ${underPerformers.map(p => p.productName).join(', ')}`);
  }
  const overAchievers = sorted.filter(p => p._achievement > 120);
  if (overAchievers.length > 0) {
    recommendations.push(`${overAchievers.length} produk melebihi 120% target. Pertimbangkan menaikkan target: ${overAchievers.map(p => p.productName).join(', ')}`);
  }

  return { totalTargetRevenue, totalActualRevenue, overallAchievement, groupAnalysis, topPerformers, underPerformers, recommendations };
}

// Sales Visit Analysis
export function analyzeVisitTargets(
  visits: { date: string; type: string; qualified: boolean; resultedInSale: boolean }[],
  target: number
): {
  totalVisits: number;
  qualifiedVisits: number;
  qualifiedRate: number;
  conversionRate: number;
  achievement: number;
  byType: Record<string, number>;
  recommendations: string[];
} {
  const totalVisits = visits.length;
  const qualifiedVisits = visits.filter(v => v.qualified).length;
  const salesVisits = visits.filter(v => v.resultedInSale).length;
  const qualifiedRate = totalVisits > 0 ? Math.round((qualifiedVisits / totalVisits) * 100) : 0;
  const conversionRate = totalVisits > 0 ? Math.round((salesVisits / totalVisits) * 100) : 0;
  const achievement = target > 0 ? Math.round((totalVisits / target) * 100) : 0;

  const byType: Record<string, number> = {};
  for (const v of visits) {
    byType[v.type] = (byType[v.type] || 0) + 1;
  }

  const recommendations: string[] = [];
  if (qualifiedRate < 50) recommendations.push(`Qualified visit rate hanya ${qualifiedRate}%. Tingkatkan kualitas kunjungan dengan persiapan lebih baik.`);
  if (conversionRate < 15) recommendations.push(`Conversion rate dari kunjungan hanya ${conversionRate}%. Perbaiki teknik closing.`);
  if (!byType['new_prospect'] || byType['new_prospect'] < totalVisits * 0.2) {
    recommendations.push(`Proporsi kunjungan prospek baru rendah. Alokasikan minimal 20% kunjungan untuk prospek baru.`);
  }

  return { totalVisits, qualifiedVisits, qualifiedRate, conversionRate, achievement, byType, recommendations };
}

export default {
  KPI_CATEGORIES,
  STANDARD_SCORING_LEVELS,
  KPI_TEMPLATES,
  ROLE_KPI_PRESETS,
  calculateAchievementPercentage,
  getScoreLevel,
  calculateWeightedScore,
  calculateOverallScore,
  evaluateFormula,
  getKPIStatus,
  calculateTrend,
  calculateBonusPenalty,
  analyzeWeightDistribution,
  analyzeProductTargets,
  analyzeVisitTargets
};
