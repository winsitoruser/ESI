import type { NextApiRequest, NextApiResponse } from 'next';
import { 
  STANDARD_SCORING_LEVELS,
  calculateAchievementPercentage,
  calculateOverallScore,
  calculateWeightedScore,
  getScoreLevel,
  getKPIStatus,
  calculateBonusPenalty,
  calculateTrend
} from '../../../../lib/hq/kpi-calculator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return getScoringInfo(req, res);
      case 'POST':
        return calculateScore(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('KPI Scoring API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getScoringInfo(req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({
    standardLevels: STANDARD_SCORING_LEVELS,
    scoringMethods: [
      { id: 'linear', name: 'Linear', description: 'Skor proporsional dengan pencapaian' },
      { id: 'step', name: 'Step', description: 'Skor berdasarkan threshold level' },
      { id: 'threshold', name: 'Threshold', description: 'Pass/Fail berdasarkan minimum threshold' },
      { id: 'bell_curve', name: 'Bell Curve', description: 'Distribusi normal dengan ranking' }
    ],
    formulaTypes: [
      { id: 'simple', name: 'Simple', formula: '(actual / target) * 100', description: 'Perbandingan langsung actual vs target' },
      { id: 'weighted', name: 'Weighted', formula: 'sum(metric * weight) / totalWeight', description: 'Rata-rata tertimbang' },
      { id: 'cumulative', name: 'Cumulative', formula: 'sum(dailyActual)', description: 'Akumulasi harian/mingguan' },
      { id: 'average', name: 'Average', formula: 'sum(values) / count', description: 'Rata-rata nilai' },
      { id: 'ratio', name: 'Ratio', formula: '(numerator / denominator) * 100', description: 'Perbandingan rasio' }
    ],
    bonusStructure: {
      levels: [
        { minScore: 4.5, bonusPercent: 15, label: 'Top Performer Bonus' },
        { minScore: 4.0, bonusPercent: 10, label: 'High Performer Bonus' },
        { minScore: 3.5, bonusPercent: 5, label: 'Good Performer Bonus' }
      ]
    },
    penaltyStructure: {
      levels: [
        { maxScore: 2.0, penaltyPercent: 10, label: 'Performance Warning' },
        { maxScore: 1.5, penaltyPercent: 15, label: 'Performance Improvement Plan' }
      ]
    }
  });
}

function calculateScore(req: NextApiRequest, res: NextApiResponse) {
  const { metrics, scoringLevels, baseSalary, bonusRules, penaltyRules, previousMetrics } = req.body;

  if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
    return res.status(400).json({ error: 'Metrics array is required' });
  }

  // Validate metrics
  for (const metric of metrics) {
    if (typeof metric.actual !== 'number' || typeof metric.target !== 'number') {
      return res.status(400).json({ error: 'Each metric must have actual and target as numbers' });
    }
    if (typeof metric.weight !== 'number' || metric.weight < 0 || metric.weight > 100) {
      return res.status(400).json({ error: 'Each metric must have weight between 0 and 100' });
    }
  }

  // Validate total weight = 100
  const totalWeight = metrics.reduce((sum: number, m: any) => sum + m.weight, 0);
  if (totalWeight !== 100) {
    return res.status(400).json({ 
      error: `Total weight must equal 100, current total: ${totalWeight}`,
      suggestion: 'Adjust weights to total 100%'
    });
  }

  // Use provided scoring levels or standard
  const levels = scoringLevels || STANDARD_SCORING_LEVELS;

  // Calculate individual metric scores
  const metricResults = metrics.map((m: any, index: number) => {
    const achievement = calculateAchievementPercentage(m.actual, m.target);
    const level = getScoreLevel(achievement, levels);
    const status = getKPIStatus(achievement);
    
    // Calculate trend if previous data available
    let trend = 'stable';
    if (previousMetrics && previousMetrics[index]) {
      const prevAchievement = calculateAchievementPercentage(
        previousMetrics[index].actual, 
        previousMetrics[index].target
      );
      trend = calculateTrend(achievement, prevAchievement);
    }

    return {
      name: m.name || `Metric ${index + 1}`,
      actual: m.actual,
      target: m.target,
      weight: m.weight,
      achievement,
      level: level.level,
      levelLabel: level.label,
      levelColor: level.color,
      status,
      trend,
      weightedScore: (level.level * m.weight) / 100,
      contribution: Math.round((m.weight / totalWeight) * 100)
    };
  });

  // Calculate overall score
  const { score, level, details } = calculateOverallScore(metrics, levels);
  
  // Calculate weighted achievement
  const weightedAchievement = calculateWeightedScore(
    metricResults.map((m: any) => ({ achievement: m.achievement, weight: m.weight }))
  );

  // Calculate bonus/penalty if salary provided
  let compensation = null;
  if (baseSalary) {
    const defaultBonusRules = bonusRules || {
      enabled: true,
      thresholds: [
        { minScore: 4.5, bonusPercent: 15 },
        { minScore: 4.0, bonusPercent: 10 },
        { minScore: 3.5, bonusPercent: 5 }
      ]
    };
    const defaultPenaltyRules = penaltyRules || {
      enabled: false,
      thresholds: [
        { maxScore: 2.0, penaltyPercent: 10 },
        { maxScore: 1.5, penaltyPercent: 15 }
      ]
    };
    compensation = calculateBonusPenalty(level.level, baseSalary, defaultBonusRules, defaultPenaltyRules);
  }

  // Generate recommendations
  const recommendations = generateRecommendations(metricResults);

  return res.status(200).json({
    summary: {
      overallScore: level.level,
      overallScoreLabel: level.label,
      overallScoreColor: level.color,
      weightedAchievement,
      status: getKPIStatus(weightedAchievement),
      totalMetrics: metrics.length,
      metricsAchieved: metricResults.filter((m: any) => m.achievement >= 100).length,
      metricsPartial: metricResults.filter((m: any) => m.achievement >= 80 && m.achievement < 100).length,
      metricsNotAchieved: metricResults.filter((m: any) => m.achievement < 80).length
    },
    metrics: metricResults,
    compensation,
    recommendations,
    scoringLevelsUsed: levels,
    calculatedAt: new Date().toISOString()
  });
}

function generateRecommendations(metrics: any[]): string[] {
  const recommendations: string[] = [];
  
  // Find lowest performing metrics
  const sortedByAchievement = [...metrics].sort((a, b) => a.achievement - b.achievement);
  const lowestMetrics = sortedByAchievement.filter(m => m.achievement < 80);
  
  if (lowestMetrics.length > 0) {
    recommendations.push(`Focus improvement on: ${lowestMetrics.map(m => m.name).join(', ')}`);
  }

  // Find metrics with downward trend
  const decliningMetrics = metrics.filter(m => m.trend === 'down');
  if (decliningMetrics.length > 0) {
    recommendations.push(`Monitor declining metrics: ${decliningMetrics.map(m => m.name).join(', ')}`);
  }

  // Find high weight metrics that are underperforming
  const highWeightUnderperforming = metrics.filter(m => m.weight >= 25 && m.achievement < 100);
  if (highWeightUnderperforming.length > 0) {
    recommendations.push(`Prioritize high-impact KPIs: ${highWeightUnderperforming.map(m => m.name).join(', ')}`);
  }

  // Positive reinforcement
  const excellentMetrics = metrics.filter(m => m.achievement >= 110);
  if (excellentMetrics.length > 0) {
    recommendations.push(`Maintain excellent performance in: ${excellentMetrics.map(m => m.name).join(', ')}`);
  }

  if (recommendations.length === 0) {
    recommendations.push('Continue current performance trajectory');
  }

  return recommendations;
}
