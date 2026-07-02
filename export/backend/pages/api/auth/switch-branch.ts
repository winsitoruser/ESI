import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { canAccessBranch } from '@/lib/branchFilter';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized' 
      });
    }

    const { branchId } = req.body;

    if (!branchId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Branch ID is required' 
      });
    }

    // Check if user can access the requested branch
    const hasAccess = await canAccessBranch(req, res, branchId);
    
    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        error: 'Access denied to this branch' 
      });
    }

    // Get branch details
    const db = require('@/models');
    const branch = await db.Branch.findByPk(branchId);

    if (!branch) {
      return res.status(404).json({ 
        success: false, 
        error: 'Branch not found' 
      });
    }

    if (!branch.isActive) {
      return res.status(400).json({ 
        success: false, 
        error: 'Branch is not active' 
      });
    }

    // Update user's assigned branch if they have permission
    if (['super_admin', 'admin'].includes(session.user.role)) {
      await db.User.update(
        { assignedBranchId: branchId },
        { where: { id: session.user.id } }
      );
    }

    // Log the branch switch
    await db.AuditLog.create({
      userId: session.user.id,
      action: 'SWITCH_BRANCH',
      entityType: 'BRANCH',
      entityId: branchId,
      oldValues: { branchId: session.user.branchId },
      newValues: { branchId: branchId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(200).json({
      success: true,
      message: 'Branch switched successfully',
      data: {
        branchId: branch.id,
        branchName: branch.name,
        branchCode: branch.code
      }
    });

  } catch (error: any) {
    console.error('Switch branch API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
