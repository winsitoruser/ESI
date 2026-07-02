import { Plan, PlanLimit } from '../../types/models';
const db = require('../../../models');

/**
 * Plan Service
 * Handles all plan-related operations
 */
export class PlanService {
  /**
   * Get all available plans
   */
  static async getAvailablePlans() {
    return await db.Plan.findAll({
      where: { isActive: true },
      include: [{ model: db.PlanLimit, as: 'planLimits' }],
      order: [['price', 'ASC']]
    });
  }

  /**
   * Get plan by ID
   */
  static async getPlanById(planId: string) {
    const plan = await db.Plan.findOne({
      where: { id: planId },
      include: [{ model: db.PlanLimit, as: 'planLimits' }]
    });

    if (!plan) {
      throw new Error('Plan not found');
    }

    return plan;
  }

  /**
   * Create new plan
   */
  static async createPlan(planData: {
    name: string;
    description: string;
    price: number;
    currency: string;
    billingInterval: 'monthly' | 'yearly';
    trialDays: number;
    features: string[];
    limits: Array<{
      metric: string;
      max: number;
      unit: string;
    }>;
    isActive?: boolean;
  }) {
    const plan = await db.Plan.create({
      name: planData.name,
      description: planData.description,
      price: planData.price,
      currency: planData.currency,
      billingInterval: planData.billingInterval,
      trialDays: planData.trialDays,
      features: planData.features,
      isActive: planData.isActive ?? true
    });

    // Create plan limits
    for (const limit of planData.limits) {
      await db.PlanLimit.create({
        planId: plan.id,
        metricName: limit.metric,
        maxValue: limit.max,
        unit: limit.unit
      });
    }

    return this.getPlanById(plan.id);
  }

  /**
   * Update plan
   */
  static async updatePlan(planId: string, updateData: Partial<{
    name: string;
    description: string;
    price: number;
    currency: string;
    billingInterval: 'monthly' | 'yearly';
    trialDays: number;
    features: string[];
    isActive: boolean;
  }>) {
    const plan = await db.Plan.findByPk(planId);
    
    if (!plan) {
      throw new Error('Plan not found');
    }

    await plan.update(updateData);

    return this.getPlanById(planId);
  }

  /**
   * Update plan limits
   */
  static async updatePlanLimits(planId: string, limits: Array<{
    metric: string;
    max: number;
    unit: string;
  }>) {
    // Remove existing limits
    await db.PlanLimit.destroy({ where: { planId } });

    // Create new limits
    for (const limit of limits) {
      await db.PlanLimit.create({
        planId,
        metricName: limit.metric,
        maxValue: limit.max,
        unit: limit.unit
      });
    }

    return this.getPlanById(planId);
  }

  /**
   * Delete plan
   */
  static async deletePlan(planId: string) {
    const plan = await db.Plan.findByPk(planId);
    
    if (!plan) {
      throw new Error('Plan not found');
    }

    // Check if plan has active subscriptions
    const activeSubscriptions = await db.Subscription.count({
      where: { planId, status: ['trial', 'active'] }
    });

    if (activeSubscriptions > 0) {
      throw new Error('Cannot delete plan with active subscriptions');
    }

    await plan.update({ isActive: false });

    return { message: 'Plan deactivated successfully' };
  }

  /**
   * Get plan usage statistics
   */
  static async getPlanStats(planId: string) {
    const stats = await db.Subscription.findAll({
      where: { planId },
      attributes: [
        [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'totalSubscriptions'],
        [db.Sequelize.fn('COUNT', db.Sequelize.literal(`CASE WHEN status = 'active' THEN 1 END`)), 'activeSubscriptions'],
        [db.Sequelize.fn('COUNT', db.Sequelize.literal(`CASE WHEN status = 'trial' THEN 1 END`)), 'trialSubscriptions'],
        [db.Sequelize.fn('COUNT', db.Sequelize.literal(`CASE WHEN status = 'cancelled' THEN 1 END`)), 'cancelledSubscriptions']
      ],
      raw: true
    });

    const result = stats[0] as any;

    return {
      totalSubscriptions: parseInt(result.totalSubscriptions) || 0,
      activeSubscriptions: parseInt(result.activeSubscriptions) || 0,
      trialSubscriptions: parseInt(result.trialSubscriptions) || 0,
      cancelledSubscriptions: parseInt(result.cancelledSubscriptions) || 0
    };
  }

  /**
   * Get plan comparison
   */
  static async comparePlans(planIds: string[]) {
    const plans = await db.Plan.findAll({
      where: { id: { [db.Sequelize.Op.in]: planIds } },
      include: [{ model: db.PlanLimit, as: 'planLimits' }]
    });

    return plans.map((plan: any) => ({
      id: plan.id,
      name: plan.name,
      price: parseFloat(plan.price),
      billingInterval: plan.billingInterval,
      features: plan.features,
      limits: plan.planLimits?.reduce((acc: any, limit: any) => {
        acc[limit.metricName] = {
          max: limit.maxValue,
          unit: limit.unit
        };
        return acc;
      }, {}) || {}
    }));
  }

  /**
   * Get recommended plan based on usage
   */
  static async getRecommendedPlan(usageData: Record<string, number>) {
    const allPlans = await this.getAvailablePlans();
    const recommendations: Array<{
      plan: any;
      score: number;
      overages: string[];
    }> = [];

    for (const plan of allPlans) {
      let score = 0;
      const overages: string[] = [];

      // Check each usage metric against plan limits
      for (const [metric, value] of Object.entries(usageData)) {
        const limit = plan.planLimits?.find((l: any) => l.metricName === metric);
        
        if (limit && limit.maxValue !== -1) {
          if (value <= limit.maxValue) {
            // Within limit - increase score based on utilization
            const utilization = value / limit.maxValue;
            score += utilization * 10;
          } else {
            // Over limit - record overage
            overages.push(`${metric}: ${value} > ${limit.maxValue}`);
            score -= 20; // Penalty for overage
          }
        }
      }

      // Add price factor (lower price = higher score)
      score += (1000 - parseFloat(plan.price)) / 100;

      recommendations.push({
        plan,
        score: Math.max(0, score),
        overages
      });
    }

    // Sort by score (highest first)
    recommendations.sort((a, b) => b.score - a.score);

    return recommendations;
  }
}
