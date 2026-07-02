import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
const db = require('../../../models');

/**
 * API endpoint for subscription management
 * GET - Get current subscription
 * POST - Create or update subscription
 * PUT - Upgrade/downgrade subscription
 * DELETE - Cancel subscription
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else if (req.method === 'PUT') {
    return handlePut(req, res);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res);
  } else {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const tenantId = session.user.tenantId;
    const { Subscription, Plan, BillingCycle, Invoice, UsageMetric } = db;

    // Get current subscription
    const subscription = await Subscription.findOne({
      where: { tenantId },
      include: [
        {
          model: Plan,
          as: 'plan'
        },
        {
          model: BillingCycle,
          as: 'billingCycles',
          limit: 1,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!subscription) {
      return res.status(404).json({ 
        success: false, 
        error: 'No subscription found' 
      });
    }

    // Get usage metrics
    const usageMetrics = await UsageMetric.findAll({
      where: {
        tenantId,
        periodStart: {
          [db.Sequelize.Op.gte]: subscription.currentPeriodStart
        }
      },
      attributes: [
        'metricName',
        [db.Sequelize.fn('SUM', db.Sequelize.col('metricValue')), 'value']
      ],
      group: ['metricName']
    });

    // Get plan limits
    const planLimits = await db.PlanLimit.findAll({
      where: { planId: subscription.planId }
    });

    // Combine usage with limits
    const usageWithLimits = usageMetrics.map(metric => {
      const limit = planLimits.find(l => l.metricName === metric.metricName);
      return {
        metric: metric.metricName,
        current: parseFloat(metric.dataValues.value),
        limit: limit ? limit.maxValue : null,
        percentage: limit ? (parseFloat(metric.dataValues.value) / limit.maxValue) * 100 : 0
      };
    });

    // Calculate subscription status
    const isTrialing = subscription.isInTrial();
    const daysLeft = isTrialing ? subscription.getTrialDaysLeft() : subscription.getDaysUntilRenewal();
    const isOverdue = subscription.status === 'past_due';

    return res.status(200).json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          status: subscription.status,
          plan: {
            id: subscription.plan.id,
            name: subscription.plan.name,
            description: subscription.plan.description,
            price: parseFloat(subscription.plan.price),
            billingInterval: subscription.plan.billingInterval,
            currency: subscription.plan.currency,
            features: subscription.plan.features
          },
          currentPeriod: {
            start: subscription.currentPeriodStart,
            end: subscription.currentPeriodEnd
          },
          trial: {
            isActive: isTrialing,
            endsAt: subscription.trialEndsAt,
            daysLeft
          },
          renewal: {
            daysLeft,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
          },
          isOverdue
        },
        usage: usageWithLimits,
        billing: {
          lastBillingCycle: subscription.billingCycles[0] || null,
          nextBillingDate: subscription.currentPeriodEnd
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching subscription:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const { planId } = req.body;
    const tenantId = session.user.tenantId;
    const { Subscription, Plan, Tenant } = db;

    // Check if tenant already has subscription
    const existingSubscription = await Subscription.findOne({
      where: { tenantId }
    });

    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        error: 'Tenant already has a subscription'
      });
    }

    // Get plan details
    const plan = await Plan.findByPk(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found or inactive'
      });
    }

    // Get tenant
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
    }

    // Create subscription
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + plan.trialDays);

    const periodEnd = new Date(now);
    const days = plan.billingInterval === 'monthly' ? 30 : 365;
    periodEnd.setDate(periodEnd.getDate() + days);

    const subscription = await Subscription.create({
      tenantId,
      planId,
      status: 'trial',
      trialEndsAt: trialEnd,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd
    });

    // Update tenant with subscription info
    await tenant.update({
      subscriptionId: subscription.id
    });

    return res.status(201).json({
      success: true,
      data: {
        subscription,
        plan,
        trialEndsAt: trialEnd
      }
    });

  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const { planId, immediate = false } = req.body;
    const tenantId = session.user.tenantId;
    const { Subscription, Plan, BillingCycle } = db;

    // Get current subscription
    const subscription = await Subscription.findOne({
      where: { tenantId },
      include: [{ model: Plan, as: 'plan' }]
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No subscription found'
      });
    }

    // Get new plan
    const newPlan = await Plan.findByPk(planId);
    if (!newPlan || !newPlan.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found or inactive'
      });
    }

    // Check if upgrading or downgrading
    const isUpgrade = newPlan.price > subscription.plan.price;
    const isDowngrade = newPlan.price < subscription.plan.price;

    // If immediate change
    if (immediate) {
      // Create prorated billing cycle
      const remainingDays = Math.ceil(
        (subscription.currentPeriodEnd - new Date()) / (1000 * 60 * 60 * 24)
      );
      
      const dailyRate = subscription.plan.price / 30;
      const proratedAmount = dailyRate * remainingDays;
      
      const billingCycle = await BillingCycle.create({
        subscriptionId: subscription.id,
        periodStart: new Date(),
        periodEnd: subscription.currentPeriodEnd,
        baseAmount: proratedAmount,
        totalAmount: proratedAmount,
        status: 'pending',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      // Generate invoice for prorated amount
      const invoice = await db.Invoice.generateFromBillingCycle(billingCycle);
      
      // Update subscription
      await subscription.update({
        planId,
        status: 'past_due' // Will be active after payment
      });

      return res.status(200).json({
        success: true,
        data: {
          subscription,
          billingCycle,
          invoice,
          type: isUpgrade ? 'upgrade' : 'downgrade',
          effective: 'immediate'
        }
      });

    } else {
      // Schedule change for next billing cycle
      await subscription.update({
        metadata: {
          ...subscription.metadata,
          pendingPlanChange: planId,
          changeEffective: subscription.currentPeriodEnd
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          subscription,
          newPlan,
          type: isUpgrade ? 'upgrade' : 'downgrade',
          effective: 'next_billing_cycle'
        }
      });
    }

  } catch (error: any) {
    console.error('Error updating subscription:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const { atPeriodEnd = true, reason } = req.body;
    const tenantId = session.user.tenantId;
    const { Subscription } = db;

    // Get subscription
    const subscription = await Subscription.findOne({
      where: { tenantId }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No subscription found'
      });
    }

    // Cancel subscription
    subscription.cancel(atPeriodEnd);
    await subscription.save();

    // Add cancellation reason to metadata
    if (reason) {
      await subscription.update({
        metadata: {
          ...subscription.metadata,
          cancellationReason: reason
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        subscription,
        cancelledAt: atPeriodEnd ? null : new Date(),
        effectiveDate: atPeriodEnd ? subscription.currentPeriodEnd : new Date()
      }
    });

  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
