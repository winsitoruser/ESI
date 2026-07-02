import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateUser, isAuthorized } from '@/lib/auth';
import { withApiHandler, success, ApiContext } from '@/utils/api-utils';
import { ApiError } from '@/middleware/error-handler';
import { getCustomerStatistics } from '@/server/sequelize/adapters/customers-adapter';
import { mockCustomerSummary } from '@/data/mockCustomers';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  context: ApiContext
) {
  // Authenticate user
  const user = await authenticateUser(req);
  
  // Check if user has permissions to access customer data
  if (!isAuthorized(user, ['ADMIN', 'MANAGER', 'CASHIER', 'PHARMACIST'])) {
    throw new ApiError(403, 'Unauthorized access to customer statistics', 'PERMISSION_ERROR');
  }
  
  // Get tenant ID from user session
  const tenantId = user?.tenantId;
  
  if (!tenantId) {
    throw new ApiError(400, 'Tenant ID is required', 'VALIDATION_ERROR');
  }
  
  // Only allow GET method
  if (req.method !== 'GET') {
    throw new ApiError(405, 'Method not allowed', 'METHOD_ERROR');
  }
  
  try {
    // Get customer statistics
    const statistics = await getCustomerStatistics(tenantId);
    
    // Set fallback header if using mock data
    if (statistics.isFromMock) {
      res.setHeader('X-Data-Source', 'fallback');
    }
    
    return success(res, statistics);
  } catch (error) {
    console.error('Error fetching customer statistics:', error);
    
    // Fall back to mock data in case of error
    res.setHeader('X-Data-Source', 'fallback');
    return success(res, {
      ...mockCustomerSummary, 
      isFromMock: true
    });
  }
}

export default withApiHandler(handler);
