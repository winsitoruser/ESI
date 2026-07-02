import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
const db = require('../../../models');

/**
 * API endpoint for plan management
 * GET - Get all available plans
 * POST - Create new plan (admin only)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { interval, includeInactive = false } = req.query;
    const { Plan, PlanLimit } = db;

    // Build query
    const whereClause: any = {};
    if (!includeInactive || includeInactive === 'false') {
      whereClause.isActive = true;
    }
    if (interval) {
      whereClause.billingInterval = interval;
    }

    // Get plans
    const plans = await Plan.findAll({
      where: whereClause,
      include: [{
        model: PlanLimit,
        as: 'planLimits'
      }],
      order: [
        ['sortOrder', 'ASC'],
        ['price', 'ASC']
      ]
    });

    // Format response
    const formattedPlans = plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: parseFloat(plan.price),
      billingInterval: plan.billingInterval,
      currency: plan.currency,
      trialDays: plan.trialDays,
      features: plan.features,
      limits: plan.planLimits?.map(limit => ({
        metric: limit.metricName,
        max: limit.maxValue,
        unit: limit.unit,
        isSoftLimit: limit.isSoftLimit,
        overageRate: limit.overageRate ? parseFloat(limit.overageRate) : null
      })) || [],
      metadata: plan.metadata,
      // Computed fields
      formattedPrice: plan.getFormattedPrice(),
      intervalDisplay: plan.getIntervalDisplay(),
      isPopular: plan.metadata?.isPopular || false,
      badge: plan.metadata?.badge || null
    }));

    return res.status(200).json({
      success: true,
      data: formattedPlans
    });

  } catch (error: any) {
    console.error('Error fetching plans:', error);
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

    // Check if user is admin
    if (!['super_admin', 'owner'].includes(session.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    const {
      name,
      description,
      price,
      billingInterval,
      currency = 'IDR',
      trialDays = 14,
      features,
      limits,
      metadata,
      sortOrder = 0
    } = req.body;

    // Validate required fields
    if (!name || !price || !billingInterval) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, price, billingInterval'
      });
    }

    const { Plan, PlanLimit } = db;

    // Create plan
    const plan = await Plan.create({
      name,
      description,
      price,
      billingInterval,
      currency,
      trialDays,
      features: features || {},
      metadata: metadata || {},
      sortOrder
    });

    // Create limits if provided
    if (limits && Array.isArray(limits)) {
      const planLimits = limits.map(limit => ({
        planId: plan.id,
        metricName: limit.metric,
        maxValue: limit.max,
        unit: limit.unit || null,
        isSoftLimit: limit.isSoftLimit || false,
        overageRate: limit.overageRate || null
      }));

      await PlanLimit.bulkCreate(planLimits);
    }

    // Get created plan with limits
    const createdPlan = await Plan.findByPk(plan.id, {
      include: [{ model: PlanLimit, as: 'planLimits' }]
    });

    return res.status(201).json({
      success: true,
      data: createdPlan
    });

  } catch (error: any) {
    console.error('Error creating plan:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
