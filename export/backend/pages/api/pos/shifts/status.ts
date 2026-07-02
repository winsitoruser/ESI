import type { NextApiRequest, NextApiResponse } from 'next';
import { withApiHandler, success, error } from '@/utils/api-utils';
import { authenticateUser, isAuthorized } from '@/lib/auth';
import { getCurrentShift } from '@/server/sequelize/adapters/pos-shift-adapter';
import logger from '@/server/monitoring/logger';

/**
 * API endpoint to check the status of a cashier's shift
 * GET /api/pos/shifts/status
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return error(res, 'Method Not Allowed', 405);
  }

  try {
    // Authenticate user
    const user = await authenticateUser(req);
    if (!user) {
      return error(res, 'Unauthenticated', 401);
    }

    // Check permissions - allow CASHIER, ADMIN, and MANAGER roles
    if (!isAuthorized(user, ['CASHIER', 'ADMIN', 'MANAGER', 'PHARMACIST'])) {
      return error(res, 'Unauthorized access to shift status', 403);
    }

    // Get query parameters
    const { userId, branchId } = req.query;
    const targetUserId = (userId as string) || user?.id;
    const targetBranchId = (branchId as string) || user?.branchId;
    const tenantId = user?.tenantId;

    if (!targetUserId || !tenantId) {
      return error(res, 'User ID and tenant ID are required', 400);
    }

    try {
      // Check for an active shift using Sequelize adapter
      const activeShift = await getCurrentShift(targetUserId, tenantId);
      
      if (activeShift) {
        logger.info('Active shift found', { userId: targetUserId, branchId: targetBranchId });
        return success(res, {
          isActive: true,
          message: 'Active shift found',
          shiftData: activeShift
        });
      } else {
        logger.info('No active shift found', { userId: targetUserId, branchId: targetBranchId });
        return success(res, {
          isActive: false,
          message: 'No active shift found',
          shiftData: null
        });
      }
    } catch (dbError) {
      console.error('Database error checking shift status:', dbError);
      logger.error('Failed to check shift status from database', { error: dbError, userId: targetUserId });
      return error(res, 'Database error - failed to check shift status', 500);
    }
  } catch (err) {
    return handleError(res, err, 'shift status API');
  }
}

// Helper function to handle error responses
function handleError(res: NextApiResponse, err: unknown, context: string) {
  const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
  const errorObj = err instanceof Error ? err : new Error(String(err));
  logger.error(`Error in ${context}:`, { error: errorObj });
  return error(res, `Failed to check shift status: ${errorMessage}`, 500);
}

export default withApiHandler(handler);
