import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../../models');
const { ActivationRequest, Partner } = db;

/**
 * POST /api/admin/activations/:id/reject
 * Reject activation request
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
    const { review_notes, rejection_reason } = req.body;

    if (!rejection_reason) {
      return res.status(400).json({
        error: 'Rejection reason is required'
      });
    }

    const activationRequest = await ActivationRequest.findByPk(id as string, {
      include: [{
        model: Partner,
        as: 'partner'
      }]
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
        status: 'rejected',
        reviewedBy: session.user?.id || null,
        reviewedAt: new Date(),
        reviewNotes: review_notes
      }, { transaction });

      // 2. Update partner status
      const partner = activationRequest.partner;
      await partner.update({
        activationStatus: 'rejected',
        rejectionReason: rejection_reason
      }, { transaction });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        data: {
          activation_request: activationRequest,
          partner
        },
        message: 'Activation request rejected'
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error: any) {
    console.error('Reject Activation Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reject activation request',
      details: error.message
    });
  }
}
