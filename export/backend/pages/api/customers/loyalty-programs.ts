import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateUser, isAuthorized } from '@/lib/auth';
import { withApiHandler, success, ApiContext } from '@/utils/api-utils';
import { ApiError } from '@/middleware/error-handler';
import { getLoyaltyPrograms } from '@/server/sequelize/adapters/customers-adapter';
import { mockLoyaltyPrograms } from '@/data/mockCustomers';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  context: ApiContext
) {
  // Authenticate user
  const user = await authenticateUser(req);
  
  // Check if user has permissions to access loyalty program data
  if (!isAuthorized(user, ['ADMIN', 'MANAGER', 'CASHIER', 'PHARMACIST'])) {
    throw new ApiError(403, 'Unauthorized access to loyalty programs', 'PERMISSION_ERROR');
  }
  
  // Get tenant ID from user session
  const tenantId = user?.tenantId;
  
  if (!tenantId) {
    throw new ApiError(400, 'Tenant ID is required', 'VALIDATION_ERROR');
  }
  
  // Handle different HTTP methods
  if (req.method === 'GET') {
    try {
      // Get loyalty programs
      const result = await getLoyaltyPrograms(tenantId);
      
      // Set fallback header if using mock data
      if (result.isFromMock) {
        res.setHeader('X-Data-Source', 'fallback');
      }
      
      return success(res, result);
    } catch (error) {
      console.error('Error fetching loyalty programs:', error);
      
      // Fall back to mock data in case of error
      res.setHeader('X-Data-Source', 'fallback');
      return success(res, {
        programs: mockLoyaltyPrograms,
        isFromMock: true
      });
    }
  } else {
    throw new ApiError(405, 'Method not allowed', 'METHOD_ERROR');
  }
}

export default withApiHandler(handler);
