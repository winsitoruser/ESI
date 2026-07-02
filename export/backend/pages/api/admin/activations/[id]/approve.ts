import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../../models');
const { ActivationRequest, Partner, PartnerSubscription, SubscriptionPackage } = db;

/**
 * POST /api/admin/activations/:id/approve
 * Approve activation request and create subscription
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    const userRole = (session?.user?.role as string)?.toLowerCase();
    if (!session || !['admin', 'super_admin', 'superadmin'].includes(userRole)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const { review_notes, subscription_months = 1 } = req.body;

    const activationRequest = await ActivationRequest.findByPk(id as string, {
      include: [
        {
          model: Partner,
          as: 'partner'
        },
        {
          model: SubscriptionPackage,
          as: 'package'
        }
      ]
    });

    if (!activationRequest) {
      return res.status(404).json({ error: 'Activation request not found' });
    }

    if (activationRequest.status !== 'pending') {
      return res.status(400).json({
        error: `Activation request already ${activationRequest.status}`
      });
    }

    // Start transaction
    const transaction = await db.sequelize.transaction();

    try {
      // 1. Update activation request
      await activationRequest.update({
        status: 'approved',
        reviewedBy: session.user?.id || null,
        reviewedAt: new Date(),
        reviewNotes: review_notes
      }, { transaction });

      // 2. Update partner status
      const partner = activationRequest.partner;
      await partner.update({
        status: 'active',
        activationStatus: 'approved',
        activationApprovedAt: new Date(),
        activationApprovedBy: session.user?.id || null
      }, { transaction });

      // 3. Create subscription
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + parseInt(subscription_months as string));

      const packageData = activationRequest.package;
      const price = subscription_months === 12 
        ? parseFloat(packageData.priceYearly || packageData.priceMonthly * 12)
        : parseFloat(packageData.priceMonthly) * subscription_months;

      const subscription = await PartnerSubscription.create({
        partnerId: partner.id,
        packageId: packageData.id,
        status: 'active',
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        autoRenew: true,
        paymentMethod: 'bank_transfer',
        nextBillingDate: endDate.toISOString().split('T')[0],
        totalPaid: 0
      }, { transaction });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        data: {
          activation_request: activationRequest,
          partner,
          subscription
        },
        message: 'Activation request approved successfully'
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error: any) {
    console.error('Approve Activation Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to approve activation request',
      details: error.message
    });
  }
}
