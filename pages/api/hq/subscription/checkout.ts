import type { NextApiRequest, NextApiResponse } from 'next';
import { withHQAuth } from '../../../../lib/middleware/withHQAuth';
import SubscriptionService from '../../../../lib/services/SubscriptionService';
import type { PaymentProvider } from '../../../../lib/services/payment';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  const tenantId = session?.user?.tenantId;
  if (!tenantId) {
    return res.status(400).json({ success: false, error: 'Tenant not found in session' });
  }

  if (req.method === 'GET') {
    // Preview
    const { planId, interval, addonModuleIds, extraUsers, extraBranches } = req.query as any;
    const preview = await SubscriptionService.previewCheckout({
      tenantId,
      planId,
      interval: (interval as any) || 'monthly',
      addonModuleIds: addonModuleIds ? String(addonModuleIds).split(',').filter(Boolean) : undefined,
      extraUsers: extraUsers ? parseInt(extraUsers as string, 10) : undefined,
      extraBranches: extraBranches ? parseInt(extraBranches as string, 10) : undefined,
      provider: 'manual'
    });
    return res.status(200).json({ success: true, data: preview });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const {
    planId,
    interval = 'monthly',
    addonModuleIds,
    extraUsers,
    extraBranches,
    provider = 'midtrans' as PaymentProvider,
    successUrl,
    failureUrl
  } = req.body || {};

  try {
    const origin = (req.headers.origin as string) || '';
    const result = await SubscriptionService.createCheckout({
      tenantId,
      planId,
      interval,
      addonModuleIds,
      extraUsers,
      extraBranches,
      provider,
      successUrl: successUrl || `${origin}/hq/billing-info/payment/success`,
      failureUrl: failureUrl || `${origin}/hq/billing-info/payment/failure`,
      userId: session?.user?.id
    });
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Checkout failed' });
  }
}

export default withHQAuth(handler);
