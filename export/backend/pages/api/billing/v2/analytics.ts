import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { SubscriptionService } from '../../../../src/services/billing';
import { InvoiceService } from '../../../../src/services/billing';
import { BillingService } from '../../../../src/services/billing';

/**
 * API endpoint for billing analytics (v2 with service layer)
 * GET - Get analytics data
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
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

    const tenantId = session.user.tenantId!;
    const { period = 'current_month', type = 'overview' } = req.query;

    let data;

    switch (type) {
      case 'subscription':
        data = await SubscriptionService.getSubscriptionAnalytics(tenantId, period as string);
        break;
      
      case 'billing':
        data = await BillingService.getBillingAnalytics(tenantId, period as string);
        break;
      
      case 'invoices':
        data = await InvoiceService.getInvoiceAnalytics(tenantId, period as string);
        break;
      
      case 'mrr':
        data = await BillingService.getMRR(tenantId);
        break;
      
      case 'churn':
        data = await BillingService.getChurnRate(period as string);
        break;
      
      case 'arpu':
        data = await BillingService.getARPU(period as string);
        break;
      
      default:
        // Return overview with all data
        const [subscriptionData, billingData, invoiceData, mrrData] = await Promise.all([
          SubscriptionService.getSubscriptionAnalytics(tenantId, period as string),
          BillingService.getBillingAnalytics(tenantId, period as string),
          InvoiceService.getInvoiceAnalytics(tenantId, period as string),
          BillingService.getMRR(tenantId)
        ]);

        data = {
          subscription: subscriptionData,
          billing: billingData,
          invoices: invoiceData,
          mrr: mrrData
        };
    }

    return res.status(200).json({
      success: true,
      data,
      period,
      type
    });

  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
