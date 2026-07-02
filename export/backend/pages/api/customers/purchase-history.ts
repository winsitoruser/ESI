import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateUser, isAuthorized } from '@/lib/auth';
import { withApiHandler, success, parseQueryParams, ApiContext } from '@/utils/api-utils';
import { ApiError } from '@/middleware/error-handler';
import { getCustomerPurchaseHistory } from '@/server/sequelize/adapters/customers-adapter';
import { mockPurchaseHistory } from '@/data/mockCustomers';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  context: ApiContext
) {
  // Authenticate user
  const user = await authenticateUser(req);
  
  // Check if user has permissions to access customer data
  if (!isAuthorized(user, ['ADMIN', 'MANAGER', 'CASHIER', 'PHARMACIST'])) {
    throw new ApiError(403, 'Unauthorized access to customer purchase history', 'PERMISSION_ERROR');
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
  
  // Parse query parameters
  const params = parseQueryParams<{
    customerId: string;
    page: number;
    limit: number;
  }>(req, {
    customerId: { type: 'string', required: true },
    page: { type: 'number', default: 1 },
    limit: { type: 'number', default: 10 }
  });
  
  const offset = (params.page - 1) * params.limit;
  
  try {
    // Get customer purchase history
    const result = await getCustomerPurchaseHistory(
      params.customerId,
      tenantId,
      params.limit,
      offset
    );
    
    // Set fallback header if using mock data
    if (result.isFromMock) {
      res.setHeader('X-Data-Source', 'fallback');
    }
    
    return success(res, result);
  } catch (error) {
    console.error('Error fetching customer purchase history:', error);
    
    // Fall back to mock data in case of error
    const filteredHistory = mockPurchaseHistory.filter(p => p.customerId === params.customerId);
    
    res.setHeader('X-Data-Source', 'fallback');
    return success(res, {
      history: filteredHistory,
      total: filteredHistory.length,
      hasMore: false,
      isFromMock: true
    });
  }
}

export default withApiHandler(handler);
