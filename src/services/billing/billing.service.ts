import { BillingCycle, Subscription, Plan, UsageMetric } from '../../types/models';
const db = require('../../../models');
import { UsageService } from './usage.service';
import { InvoiceService } from './invoice.service';

/**
 * Billing Service
 * Handles billing cycles and automated billing processes
 */
export class BillingService {
  /**
   * Create billing cycle
   */
  static async createBillingCycle(subscription: Subscription, options: {
    baseAmount?: number;
    overageAmount?: number;
    taxAmount?: number;
    discountAmount?: number;
    description?: string;
  } = {}) {
    const {
      baseAmount = parseFloat(subscription.plan?.price || '0'),
      overageAmount = 0,
      taxAmount = 0,
      discountAmount = 0,
      description
    } = options;

    const totalAmount = parseFloat(baseAmount.toString()) + overageAmount + taxAmount - discountAmount;

    const billingCycle = await db.BillingCycle.create({
      subscriptionId: subscription.id,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      baseAmount,
      overageAmount,
      taxAmount,
      discountAmount,
      totalAmount,
      currency: subscription.plan?.currency || 'USD',
      dueDate: subscription.currentPeriodEnd,
      status: 'pending',
      metadata: {
        description
      }
    });

    return billingCycle;
  }

  /**
   * Process billing for all active subscriptions
   */
  static async processBillingCycle() {
    // Get subscriptions ending soon
    const expiringSubscriptions = await db.Subscription.findAll({
      where: {
        status: ['trial', 'active'],
        currentPeriodEnd: { [db.Sequelize.Op.lt]: new Date() }
      },
      include: [{
        model: db.Plan,
        as: 'plan'
      }]
    });

    const results = [];

    for (const subscription of expiringSubscriptions) {
      try {
        // Calculate overage charges
        const overageCharges = await UsageService.calculateOverageCharges(
          subscription.tenantId,
          subscription.currentPeriodStart,
          subscription.currentPeriodEnd
        );

        // Create billing cycle
        const billingCycle = await this.createBillingCycle(subscription, {
          baseAmount: parseFloat(subscription.plan?.price || '0'),
          overageAmount: overageCharges,
          description: `Billing cycle ${subscription.currentPeriodStart} - ${subscription.currentPeriodEnd}`
        });

        // Generate invoice
        const invoice = await this.generateInvoice(billingCycle);

        // Update subscription period
        await this.updateSubscriptionPeriod(subscription);

        results.push({
          subscriptionId: subscription.id,
          success: true,
          billingCycleId: billingCycle.id,
          invoiceId: invoice.id
        });

      } catch (error: any) {
        console.error(`Failed to process billing for subscription ${subscription.id}:`, error);
        results.push({
          subscriptionId: subscription.id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Update subscription period
   */
  static async updateSubscriptionPeriod(subscription: Subscription) {
    const now = new Date();
    const periodEnd = new Date(now);
    const days = subscription.plan?.billingInterval === 'monthly' ? 30 : 365;
    periodEnd.setDate(periodEnd.getDate() + days);

    await db.Subscription.update({
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      status: subscription.status === 'trial' && now >= (subscription.trialEndsAt || now) ? 'active' : subscription.status
    }, {
      where: { id: subscription.id }
    });

    return subscription;
  }

  /**
   * Generate invoice for billing cycle
   */
  static async generateInvoice(billingCycle: any) {
    const subscription = billingCycle.subscription;
    
    const invoice = await db.Invoice.create({
      tenantId: subscription.tenantId,
      billingCycleId: billingCycle.id,
      subscriptionId: subscription.id,
      invoiceNumber: `INV-${Date.now()}-${subscription.id.slice(-6)}`,
      status: 'draft',
      issuedDate: new Date(),
      dueDate: billingCycle.dueDate,
      subtotal: billingCycle.baseAmount + billingCycle.overageAmount,
      taxAmount: billingCycle.taxAmount,
      discountAmount: billingCycle.discountAmount,
      totalAmount: billingCycle.totalAmount,
      currency: billingCycle.currency,
      customerName: subscription.tenant?.businessName || 'Customer',
      customerEmail: subscription.tenant?.businessEmail || '',
      metadata: {}
    });

    // Create invoice items
    await db.InvoiceItem.create({
      invoiceId: invoice.id,
      description: `Subscription - ${subscription.plan?.name || 'Unknown'}`,
      quantity: 1,
      unitPrice: billingCycle.baseAmount,
      amount: billingCycle.baseAmount,
      type: 'subscription',
      referenceType: 'subscription',
      referenceId: subscription.id
    });

    if (billingCycle.overageAmount > 0) {
      await db.InvoiceItem.create({
        invoiceId: invoice.id,
        description: 'Usage overage charges',
        quantity: 1,
        unitPrice: billingCycle.overageAmount,
        amount: billingCycle.overageAmount,
        type: 'overage'
      });
    }

    // Update billing cycle status
    await db.BillingCycle.update(
      { status: 'processing' },
      { where: { id: billingCycle.id } }
    );

    return invoice;
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
   * Get pending billing cycles
   */
  static async getPendingBillingCycles() {
    return await db.BillingCycle.findAll({
      where: { status: 'pending' },
      include: [
        {
          model: db.Subscription,
          as: 'subscription',
          include: [
            {
              model: db.Tenant,
              as: 'tenant'
            }
          ]
        }
      ],
      order: [['dueDate', 'ASC']]
    });
  }

  /**
   * Get overdue billing cycles
   */
  static async getOverdueBillingCycles() {
    return await db.BillingCycle.findAll({
      where: {
        status: { [db.Sequelize.Op.notIn]: ['paid', 'cancelled', 'refunded'] },
        dueDate: { [db.Sequelize.Op.lt]: new Date() }
      },
      include: [
        {
          model: db.Subscription,
          as: 'subscription',
          include: [
            {
              model: db.Tenant,
              as: 'tenant'
            }
          ]
        }
      ],
      order: [['dueDate', 'ASC']]
    });
  }

  /**
   * Process dunning for overdue payments
   */
  static async processDunning() {
    const overdueCycles = await this.getOverdueBillingCycles();
    const results = [];

    for (const billingCycle of overdueCycles) {
      const daysOverdue = Math.ceil((new Date().getTime() - billingCycle.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysOverdue >= 30) {
        // Suspend subscription
        await this.handleSuspension(billingCycle);
        console.log(`Suspending subscription ${billingCycle.subscriptionId} due to overdue payment`);
      }
    }

    return results;
  }

  /**
   * Handle subscription suspension
   */
  static async handleSuspension(billingCycle: any) {
    await db.Subscription.update(
      { status: 'cancelled' },
      { where: { id: billingCycle.subscriptionId } }
    );
    
    await db.BillingCycle.update(
      { status: 'cancelled' },
      { where: { id: billingCycle.id } }
    );
  }

  /**
   * Get billing analytics
   */
  static async getBillingAnalytics(tenantId: string, period: string = 'current_month') {
    const dateRange = this.getDateRange(period);
    
    // Get billing cycles
    const billingCycles = await db.BillingCycle.findAll({
      where: {
        subscriptionId: {
          [db.Sequelize.Op.in]: db.Sequelize.literal(`
            (SELECT id FROM subscriptions WHERE tenantId = '${tenantId}')
          `)
        },
        periodStart: {
          [db.Sequelize.Op.between]: [dateRange.start, dateRange.end]
        }
      },
      include: [{
        model: db.Subscription,
        as: 'subscription',
        include: [{ model: db.Plan, as: 'plan' }]
      }]
    });

    // Calculate metrics
    const totalBilled = billingCycles.reduce((sum: number, cycle: any) => sum + parseFloat(cycle.totalAmount), 0);
    const totalPaid = billingCycles
      .filter((cycle: any) => cycle.status === 'paid')
      .reduce((sum: number, cycle: any) => sum + parseFloat(cycle.totalAmount), 0);
    const totalOverdue = billingCycles
      .filter((cycle: any) => cycle.status === 'overdue')
      .reduce((sum: number, cycle: any) => sum + parseFloat(cycle.totalAmount), 0);

    return {
      period: dateRange,
      totalBilled,
      totalPaid,
      totalOverdue,
      outstanding: totalBilled - totalPaid,
      collectionRate: totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0,
      cyclesProcessed: billingCycles.length,
      cyclesPaid: billingCycles.filter((cycle: any) => cycle.status === 'paid').length,
      cyclesOverdue: billingCycles.filter((cycle: any) => cycle.status === 'overdue').length
    };
  }

  /**
   * Get MRR (Monthly Recurring Revenue)
   */
  static async getMRR(tenantId?: string) {
    const whereClause: any = {
      status: 'active'
    };
    
    if (tenantId) {
      whereClause.tenantId = tenantId;
    }

    const activeSubscriptions = await db.Subscription.findAll({
      where: whereClause,
      include: [{
        model: db.Plan,
        as: 'plan'
      }]
    });

    let totalMRR = 0;
    const mrrByPlan: Record<string, number> = {};

    for (const subscription of activeSubscriptions) {
      const monthlyAmount = subscription.plan?.billingInterval === 'monthly' 
        ? parseFloat(subscription.plan?.price || '0')
        : parseFloat(subscription.plan?.price || '0') / 12;
      
      totalMRR += monthlyAmount;
      
      const planName = subscription.plan?.name || 'Unknown';
      mrrByPlan[planName] = (mrrByPlan[planName] || 0) + monthlyAmount;
    }

    return {
      totalMRR,
      mrrByPlan,
      activeSubscriptions: activeSubscriptions.length
    };
  }

  /**
   * Get churn rate
   */
  static async getChurnRate(period: string = 'current_month') {
    const dateRange = this.getDateRange(period);
    
    // Get subscriptions that cancelled in period
    const cancelledSubscriptions = await db.Subscription.count({
      where: {
        status: 'cancelled',
        cancelledAt: {
          [db.Sequelize.Op.between]: [dateRange.start, dateRange.end]
        }
      }
    });

    // Get active subscriptions at start of period
    const activeAtStart = await db.Subscription.count({
      where: {
        status: ['trial', 'active'],
        startedAt: {
          [db.Sequelize.Op.lte]: dateRange.start
        }
      }
    });

    const churnRate = activeAtStart > 0 ? (cancelledSubscriptions / activeAtStart) * 100 : 0;

    return {
      period: dateRange,
      cancelledSubscriptions,
      activeAtStart,
      churnRate
    };
  }

  /**
   * Get ARPU (Average Revenue Per User)
   */
  static async getARPU(period: string = 'current_month') {
    const mrr = await this.getMRR();
    const dateRange = this.getDateRange(period);
    
    // Get unique active tenants in period
    const activeTenants = await db.Subscription.findAll({
      where: {
        status: ['trial', 'active'],
        [db.Sequelize.Op.or]: [
          {
            currentPeriodStart: {
              [db.Sequelize.Op.lte]: dateRange.end
            },
            currentPeriodEnd: {
              [db.Sequelize.Op.gte]: dateRange.start
            }
          }
        ]
      },
      attributes: [[db.Sequelize.fn('DISTINCT', db.Sequelize.col('tenantId')), 'tenantId']]
    });

    const arpu = activeTenants.length > 0 ? mrr.totalMRR / activeTenants.length : 0;

    return {
      period: dateRange,
      totalMRR: mrr.totalMRR,
      activeTenants: activeTenants.length,
      arpu
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
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }
}
