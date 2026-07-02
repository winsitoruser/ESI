import { Subscription, Plan, BillingCycle, Invoice, UsageMetric } from '../../types/models';
const db = require('../../../models');
import { PlanService } from './plan.service';
import { BillingService } from './billing.service';
import { UsageService } from './usage.service';

/**
 * Subscription Service
 * Handles all subscription-related operations
 */
export class SubscriptionService {
  /**
   * Create new subscription
   */
  static async createSubscription(tenantId: string, planId: string, options: {
    trialDays?: number;
    paymentMethodId?: string;
    metadata?: Record<string, any>;
  } = {}) {
    const { trialDays, paymentMethodId, metadata } = options;

    // Get plan
    const plan = await db.Plan.findByPk(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    if (!plan.isActive) {
      throw new Error('Plan is not active');
    }

    // Check if tenant already has active subscription
    const existingSubscription = await db.Subscription.findOne({
      where: {
        tenantId,
        status: ['trial', 'active']
      }
    });

    if (existingSubscription) {
      throw new Error('Tenant already has an active subscription');
    }

    // Create subscription
    const now = new Date();
    const trialEndsAt = trialDays ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : null;
    const periodEnd = new Date(now);
    const days = plan.billingInterval === 'monthly' ? 30 : 365;
    periodEnd.setDate(periodEnd.getDate() + days);

    const subscription = await db.Subscription.create({
      tenantId,
      planId,
      status: trialDays ? 'trial' : 'active',
      trialEndsAt,
      startedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      metadata: metadata || {}
    });

    // Create initial billing cycle if not in trial
    if (!trialDays) {
      await BillingService.createBillingCycle(subscription);
    }

    return this.getSubscriptionById(subscription.id);
  }

  /**
   * Get subscription by ID
   */
  static async getSubscriptionById(subscriptionId: string) {
    const subscription = await db.Subscription.findOne({
      where: { id: subscriptionId },
      include: [
        { model: db.Plan, as: 'plan' },
        { model: db.BillingCycle, as: 'billingCycles' },
        { model: db.Invoice, as: 'invoices' }
      ]
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    return subscription;
  }

  /**
   * Get tenant's subscription
   */
  static async getTenantSubscription(tenantId: string) {
    const subscription = await db.Subscription.findOne({
      where: { tenantId },
      include: [
        { model: db.Plan, as: 'plan' },
        { model: db.BillingCycle, as: 'billingCycles', order: [['createdAt', 'DESC']] },
        { model: db.Invoice, as: 'invoices', order: [['createdAt', 'DESC']] }
      ]
    });

    return subscription;
  }

  /**
   * Update subscription plan
   */
  static async updateSubscriptionPlan(subscriptionId: string, newPlanId: string, options: {
    immediate?: boolean;
    prorate?: boolean;
  } = {}) {
    const { immediate = false, prorate = true } = options;

    const subscription = await this.getSubscriptionById(subscriptionId);
    const newPlan = await db.Plan.findByPk(newPlanId);

    if (!newPlan) {
      throw new Error('New plan not found');
    }

    if (!newPlan.isActive) {
      throw new Error('Plan is not active');
    }

    // Check if upgrading or downgrading
    const isUpgrade = parseFloat(newPlan.price) > parseFloat(subscription.plan?.price || '0');
    const isDowngrade = parseFloat(newPlan.price) < parseFloat(subscription.plan?.price || '0');

    if (immediate && isUpgrade) {
      // Create prorated billing cycle
      const remainingDays = Math.ceil(
        (subscription.currentPeriodEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const dailyRate = parseFloat(subscription.plan?.price || '0') / 30;
      const proratedAmount = dailyRate * remainingDays;
      
      const billingCycle = await BillingService.createBillingCycle(subscription, {
        baseAmount: proratedAmount,
        description: `Prorated upgrade to ${newPlan.name}`
      });

      // Update subscription
      await db.Subscription.update(
        { planId: newPlanId },
        { where: { id: subscriptionId } }
      );

      // Generate invoice for proration
      await BillingService.generateInvoice(billingCycle);
    } else if (isDowngrade) {
      // Schedule downgrade for next period
      await db.Subscription.update(
        { 
          pendingPlanId: newPlanId,
          planChangeDate: subscription.currentPeriodEnd
        },
        { where: { id: subscriptionId } }
      );
    } else {
      // Immediate update without proration
      await db.Subscription.update(
        { planId: newPlanId },
        { where: { id: subscriptionId } }
      );
    }

    return this.getSubscriptionById(subscriptionId);
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(subscriptionId: string, options: {
    atPeriodEnd?: boolean;
    reason?: string;
  } = {}) {
    const { atPeriodEnd = false, reason } = options;

    const subscription = await this.getSubscriptionById(subscriptionId);

    if (atPeriodEnd) {
      await db.Subscription.update(
        { cancelAtPeriodEnd: true },
        { where: { id: subscriptionId } }
      );
    } else {
      await db.Subscription.update(
        {
          status: 'cancelled',
          cancelledAt: new Date(),
          metadata: {
            ...subscription.metadata,
            cancellationReason: reason
          }
        },
        { where: { id: subscriptionId } }
      );

      // Cancel pending billing cycles
      await db.BillingCycle.update(
        { status: 'cancelled' },
        {
          where: {
            subscriptionId,
            status: ['pending', 'processing']
          }
        }
      );
    }

    return this.getSubscriptionById(subscriptionId);
  }

  /**
   * Reactivate subscription
   */
  static async reactivateSubscription(subscriptionId: string) {
    const subscription = await this.getSubscriptionById(subscriptionId);

    if (subscription.status !== 'cancelled') {
      throw new Error('Cannot reactivate non-cancelled subscription');
    }

    // Create new subscription period
    const now = new Date();
    const periodEnd = new Date(now);
    const days = subscription.plan?.billingInterval === 'monthly' ? 30 : 365;
    periodEnd.setDate(periodEnd.getDate() + days);

    await db.Subscription.update(
      {
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        cancelledAt: null
      },
      { where: { id: subscriptionId } }
    );

    // Create new billing cycle
    await BillingService.createBillingCycle(subscription);

    return this.getSubscriptionById(subscriptionId);
  }

  /**
   * Pause subscription
   */
  static async pauseSubscription(subscriptionId: string, options: {
    reason?: string;
    resumeDate?: Date;
  } = {}) {
    const { reason, resumeDate } = options;

    const subscription = await this.getSubscriptionById(subscriptionId);

    if (subscription.status !== 'active') {
      throw new Error('Can only pause active subscriptions');
    }

    await db.Subscription.update(
      {
        status: 'past_due',
        metadata: {
          ...subscription.metadata,
          pauseReason: reason,
          resumeDate
        }
      },
      { where: { id: subscriptionId } }
    );

    return this.getSubscriptionById(subscriptionId);
  }

  /**
   * Resume subscription
   */
  static async resumeSubscription(subscriptionId: string) {
    const subscription = await this.getSubscriptionById(subscriptionId);

    if (subscription.status !== 'past_due') {
      throw new Error('Can only resume paused subscriptions');
    }

    await db.Subscription.update(
      { status: 'active' },
      { where: { id: subscriptionId } }
    );

    return this.getSubscriptionById(subscriptionId);
  }

  /**
   * Get expiring subscriptions
   */
  static async getExpiringSubscriptions(days: number = 7) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    const subscriptions = await db.Subscription.findAll({
      where: {
        status: ['trial', 'active'],
        currentPeriodEnd: {
          [db.Sequelize.Op.lte]: expiryDate
        }
      },
      include: [
        { model: db.Plan, as: 'plan' },
        { model: db.Tenant, as: 'tenant' }
      ]
    });

    return subscriptions.map((sub: any) => ({
      id: sub.id,
      tenant: sub.tenant,
      plan: sub.plan,
      currentPeriodEnd: sub.currentPeriodEnd,
      daysLeft: Math.ceil((sub.currentPeriodEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      willCancel: sub.cancelAtPeriodEnd
    }));
  }

  /**
   * Get subscription analytics
   */
  static async getSubscriptionAnalytics(tenantId: string, period: string = 'current_month') {
    const subscription = await db.Subscription.findOne({
      where: { tenantId },
      include: [{ model: db.Plan, as: 'plan' }]
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Get usage analytics
    const usageAnalytics = await UsageService.getUsageAnalytics(tenantId, period);

    // Get billing analytics
    const billingAnalytics = await BillingService.getBillingAnalytics(tenantId, period);

    // Calculate subscription health
    const health = await this.calculateSubscriptionHealth(subscription);

    return {
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: subscription.plan,
        currentPeriod: {
          start: subscription.currentPeriodStart,
          end: subscription.currentPeriodEnd,
          daysLeft: Math.ceil((subscription.currentPeriodEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        },
        trialEndsAt: subscription.trialEndsAt,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
      },
      usage: usageAnalytics,
      billing: billingAnalytics,
      health
    };
  }

  /**
   * Calculate subscription health score
   */
  private static async calculateSubscriptionHealth(subscription: any) {
    let score = 100;
    const issues: string[] = [];

    // Check payment status
    if (subscription.status === 'past_due') {
      score -= 30;
      issues.push('Payment overdue');
    }

    // Check usage against limits
    try {
      const usageCheck = await UsageService.checkUsageAgainstLimits(
        subscription.tenantId,
        subscription.id
      );

      if (!usageCheck.withinLimits) {
        score -= usageCheck.overages.length * 10;
        issues.push(`Overages: ${usageCheck.overages.map((o: any) => o.metric).join(', ')}`);
      }
    } catch (error) {
      // Skip usage check if error
    }

    // Check if expiring soon
    const daysLeft = Math.ceil((subscription.currentPeriodEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 7 && subscription.cancelAtPeriodEnd) {
      score -= 20;
      issues.push('Expiring soon with cancellation scheduled');
    }

    return {
      score: Math.max(0, score),
      status: score >= 80 ? 'healthy' : score >= 60 ? 'warning' : 'critical',
      issues
    };
  }
}
