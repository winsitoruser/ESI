import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../../models');
const { Partner } = db;

/**
 * PATCH /api/admin/partners/:id/status
 * Update partner status (active, inactive, suspended)
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user?.role as string)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;
    const { status, reason } = req.body;

    // Validate status
    const validStatuses = ['active', 'inactive', 'suspended', 'pending'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be one of: active, inactive, suspended, pending'
      });
    }

    const partner = await Partner.findByPk(id as string);

    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Update status
    await partner.update({
      status,
      ...(status === 'suspended' && reason ? { rejectionReason: reason } : {})
    });

    return res.status(200).json({
      success: true,
      data: partner,
      message: `Partner status updated to ${status}`
    });
  } catch (error: any) {
    console.error('Update Partner Status Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update partner status',
      details: error.message
    });
  }
}
