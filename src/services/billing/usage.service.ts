import { UsageMetric, PlanLimit, Subscription, Plan } from '../../types/models';
const db = require('../../../models');

/**
 * Usage Service
 * Handles all usage tracking and analytics
 */
export class UsageService {
  /**
   * Track usage metric
   */
  static async trackUsage(tenantId: string, metricName: string, value: number, options: {
    periodStart?: Date;
    periodEnd?: Date;
    metadata?: Record<string, any>;
  } = {}) {
    const { periodStart, periodEnd, metadata } = options;

    const usage = await db.UsageMetric.create({
      tenantId,
      metricName,
      metricValue: value.toString(),
      periodStart: periodStart || new Date(),
      periodEnd: periodEnd || new Date(),
      metadata: metadata || {}
    });

    return usage;
  }

  /**
   * Get usage metrics for tenant
   */
  static async getUsageMetrics(tenantId: string, options: {
    metricName?: string;
    periodStart?: Date;
    periodEnd?: Date;
    limit?: number;
  } = {}) {
    const { metricName, periodStart, periodEnd, limit } = options;

    const whereClause: any = { tenantId };
    if (metricName) {
      whereClause.metricName = metricName;
    }
    if (periodStart || periodEnd) {
      whereClause.periodStart = {};
      if (periodStart) whereClause.periodStart[db.Sequelize.Op.gte] = periodStart;
      if (periodEnd) whereClause.periodStart[db.Sequelize.Op.lte] = periodEnd;
    }

    const metrics = await db.UsageMetric.findAll({
      where: whereClause,
      order: [['periodStart', 'DESC']],
      limit
    });

    return metrics.map((metric: any) => ({
      id: metric.id,
      metricName: metric.metricName,
      value: parseFloat(metric.metricValue),
      periodStart: metric.periodStart,
      periodEnd: metric.periodEnd,
      metadata: metric.metadata || {}
    }));
  }

  /**
   * Get usage analytics
   */
  static async getUsageAnalytics(tenantId: string, period: string = 'current_month') {
    const dateRange = this.getDateRange(period);

    // Get total usage by metric
    const totalUsage = await db.UsageMetric.findAll({
      where: {
        tenantId,
        periodStart: {
          [db.Sequelize.Op.between]: [dateRange.start, dateRange.end]
        }
      },
      attributes: [
        'metricName',
        [db.Sequelize.fn('SUM', db.Sequelize.literal(`CAST(metricValue AS DECIMAL)`)), 'totalValue']
      ],
      group: ['metricName'],
      raw: true
    });

    // Get top usage metrics
    const topUsage = totalUsage
      .sort((a: any, b: any) => parseFloat(b.totalValue) - parseFloat(a.totalValue))
      .slice(0, 5)
      .map((metric: any) => ({
        metric: metric.metricName,
        value: parseFloat(metric.totalValue),
        percentage: 0
      }));

    const totalValue = totalUsage.reduce((sum: number, m: any) => sum + parseFloat(m.totalValue), 0);
    topUsage.forEach((metric: any) => {
      metric.percentage = totalValue > 0 ? (metric.value / totalValue) * 100 : 0;
    });

    // Get usage trends
    const trends = await this.getUsageTrends(tenantId, period);

    return {
      period: dateRange,
      totalMetrics: totalUsage.length,
      totalValue,
      topUsage,
      trends
    };
  }

  /**
   * Get usage trends
   */
  static async getUsageTrends(tenantId: string, period: string = 'current_month') {
    const dateRange = this.getDateRange(period);
    const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const interval = days > 30 ? 'week' : 'day';

    let dateFormat: string;
    switch (interval) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-%u';
        break;
      default:
        dateFormat = '%Y-%m';
    }

    const trends = await db.UsageMetric.findAll({
      where: {
        tenantId,
        periodStart: {
          [db.Sequelize.Op.between]: [dateRange.start, dateRange.end]
        }
      },
      attributes: [
        [db.Sequelize.fn('DATE_FORMAT', db.Sequelize.col('periodStart'), dateFormat), 'period'],
        'metricName',
        [db.Sequelize.fn('SUM', db.Sequelize.literal(`CAST(metricValue AS DECIMAL)`)), 'totalValue']
      ],
      group: ['period', 'metricName'],
      order: [[db.Sequelize.fn('DATE_FORMAT', db.Sequelize.col('periodStart'), dateFormat), 'ASC']],
      raw: true
    });

    // Group by period
    const groupedTrends: Record<string, Record<string, number>> = {};
    trends.forEach((trend: any) => {
      const period = trend.period;
      if (!groupedTrends[period]) {
        groupedTrends[period] = {};
      }
      groupedTrends[period][trend.metricName] = parseFloat(trend.totalValue);
    });

    return groupedTrends;
  }

  /**
   * Check usage against plan limits
   */
  static async checkUsageAgainstLimits(tenantId: string, subscriptionId: string) {
    // Get subscription with plan
    const subscription = await db.Subscription.findOne({
      where: { id: subscriptionId },
      include: [
        { model: db.Plan, as: 'plan', include: [{ model: db.PlanLimit, as: 'planLimits' }] }
      ]
    });

    if (!subscription || !subscription.plan) {
      throw new Error('Subscription or plan not found');
    }

    // Get current period usage
    const currentUsage = await this.getUsageMetrics(tenantId, {
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd
    });

    // Check against limits
    const overages: Array<{
      metric: string;
      current: number;
      limit: number;
      unit: string;
      overage: number;
    }> = [];

    for (const limit of subscription.plan.planLimits || []) {
      const usage = currentUsage
        .filter((m: any) => m.metricName === limit.metricName)
        .reduce((sum: number, m: any) => sum + m.value, 0);

      if (limit.maxValue !== -1 && usage > limit.maxValue) {
        overages.push({
          metric: limit.metricName,
          current: usage,
          limit: limit.maxValue,
          unit: limit.unit,
          overage: usage - limit.maxValue
        });
      }
    }

    return {
      withinLimits: overages.length === 0,
      overages,
      usage: currentUsage
    };
  }

  /**
   * Calculate overage charges
   */
  static async calculateOverageCharges(tenantId: string, periodStart: Date, periodEnd: Date) {
    const dateRange = { start: periodStart, end: periodEnd };
    const overageMetrics = await db.UsageMetric.findAll({
      where: {
        tenantId,
        metricName: { [db.Sequelize.Op.like]: 'overage_%' },
        periodStart: { [db.Sequelize.Op.gte]: dateRange.start },
        periodEnd: { [db.Sequelize.Op.lte]: dateRange.end }
      }
    });
    
    return overageMetrics.reduce((total: number, metric: any) => total + parseFloat(metric.metricValue), 0);
  }

  /**
   * Get subscription analytics
   */
  static async getSubscriptionAnalytics(tenantId: string, period: string = 'current_month') {
    // Get current usage analytics
    const usageAnalytics = await this.getUsageAnalytics(tenantId, period);
    
    return {
      usage: usageAnalytics,
      period: this.getDateRange(period)
    };
  }

  /**
   * Helper: Get date range for period
   */
  private static getDateRange(period: string) {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    switch (period) {
      case 'current_month':
        start.setDate(1);
        end.setMonth(end.getMonth() + 1, 0);
        break;
      case 'last_month':
        start.setMonth(start.getMonth() - 1, 1);
        end.setMonth(end.getMonth(), 0);
        break;
      case 'current_year':
        start.setMonth(0, 1);
        end.setMonth(11, 31);
        break;
      case 'last_30_days':
        start.setDate(start.getDate() - 30);
        break;
      case 'last_90_days':
        start.setDate(start.getDate() - 90);
        break;
      default:
        // Default to current month
        start.setDate(1);
        end.setMonth(end.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }
}
