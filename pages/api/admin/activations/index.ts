import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
const db = require('../../../../models');
const { ActivationRequest, Partner, SubscriptionPackage, Op } = db;

/**
 * GET /api/admin/activations
 * List all activation requests + tenant onboarding entries
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const userRole = (session.user?.role as string)?.toLowerCase();
    const allowedRoles = ['admin', 'super_admin', 'superadmin'];
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Access denied - Admin access required' });
    }

    const {
      page = 1,
      limit = 50,
      status = 'pending',
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const combined: any[] = [];

    // ── 1. Traditional ActivationRequests (from Partner flow) ──
    try {
      const arWhere: any = {};
      if (status === 'pending') arWhere.status = 'pending';
      else if (status === 'approved') arWhere.status = 'approved';
      else if (status === 'rejected') arWhere.status = 'rejected';

      const { rows: requests } = await ActivationRequest.findAndCountAll({
        where: arWhere,
        include: [
          { model: Partner, as: 'partner', attributes: ['id', 'business_name', 'owner_name', 'email', 'phone', 'city'] },
          { model: SubscriptionPackage, as: 'package', attributes: ['id', 'name', 'price_monthly', 'max_outlets', 'max_users'] }
        ],
        order: [[sort_by as string, sort_order as string]],
        limit: parseInt(limit as string)
      });

      for (const r of requests) {
        const d = r.toJSON ? r.toJSON() : r;
        combined.push({ ...d, source: 'partner' });
      }
    } catch (e: any) {
      console.log('[Activations] ActivationRequest fetch skipped:', e.message);
    }

    // ── 2. Tenant onboarding entries (from register/welcome flow) ──
    try {
      // Map status filter to kybStatus values
      const kybStatusMap: Record<string, string[]> = {
        pending: ['pending_kyb', 'not_started'],
        under_review: ['in_review'],
        approved: ['approved', 'active'],
        rejected: ['rejected'],
      };
      const kybStatuses = kybStatusMap[status as string] || ['pending_kyb', 'not_started'];

      const tenants = await db.Tenant.findAll({
        where: { kybStatus: kybStatuses },
        include: [
          { model: db.BusinessType, as: 'businessType', required: false },
          { model: db.User, as: 'users', attributes: ['id', 'name', 'email', 'phone', 'role'], required: false },
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit as string)
      });

      for (const t of tenants) {
        const td = t.toJSON ? t.toJSON() : t;
        const owner = td.users?.find((u: any) => u.role === 'owner') || td.users?.[0] || {};

        // Fetch KYB application for this tenant
        let kyb = null;
        try {
          kyb = await db.KybApplication.findOne({
            where: { tenantId: td.id },
            attributes: ['id', 'status', 'currentStep', 'completionPercentage', 'submittedAt'],
            order: [['created_at', 'DESC']]
          });
        } catch (e) {}

        // Determine display status
        let displayStatus = 'pending';
        if (td.kybStatus === 'in_review' || kyb?.status === 'submitted') displayStatus = 'under_review';
        else if (td.kybStatus === 'approved' || td.kybStatus === 'active') displayStatus = 'approved';
        else if (td.kybStatus === 'rejected') displayStatus = 'rejected';

        combined.push({
          id: `tenant-${td.id}`,
          tenantId: td.id,
          source: 'onboarding',
          status: displayStatus,
          created_at: td.created_at,
          notes: kyb ? `KYB Step ${kyb.currentStep}/6 • ${kyb.completionPercentage}% selesai` : 'Belum memulai KYB',
          partner: {
            id: td.id,
            business_name: td.businessName || td.name || 'Unnamed',
            owner_name: owner.name || '-',
            email: owner.email || '-',
            phone: owner.phone || '-',
            city: td.city || '-',
          },
          package: {
            id: '-',
            name: td.businessType?.name || 'Onboarding',
            price_monthly: 0,
            max_outlets: td.maxBranches || 1,
            max_users: td.maxUsers || 5,
          },
          kyb: kyb ? {
            id: kyb.id,
            status: kyb.status,
            currentStep: kyb.currentStep,
            completionPercentage: kyb.completionPercentage,
            submittedAt: kyb.submittedAt,
          } : null,
          business_documents: null,
        });
      }
    } catch (e: any) {
      console.log('[Activations] Tenant onboarding fetch skipped:', e.message);
    }

    // Sort combined by date
    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return res.status(200).json({
      success: true,
      data: combined,
      pagination: {
        total: combined.length,
        page: 1,
        limit: parseInt(limit as string),
        total_pages: 1
      }
    });

  } catch (error: any) {
    console.error('Get Activation Requests Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch activation requests',
      details: error.message
    });
  }
}
