/**
 * Humanify billing API
 * GET  ?action=plans|current|invoice|voucher-preview
 * POST ?action=checkout|sync-order|confirm-manual|dunning-scan
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  activatePaidOrder,
  createHumanifyCheckout,
  getMidtransPublicConfig,
  getPaidOrderInvoice,
  getTenantBillingStatus,
  listBillablePlans,
  listExpiringTrials,
  quoteAmount,
  quoteHumanifyCheckout,
  runDunningScan,
  syncOrderFromMidtrans,
} from '@/lib/saas/humanify-billing';
import { computeVoucherDiscount, findBillingVoucherByCode } from '@/lib/saas/billing-vouchers';
import { applyPlanChange, previewPlanChange } from '@/lib/saas/plan-change';
import { isPlatformOperator } from '@/lib/middleware/tenantIsolation';
import { withHQAuth } from '@/lib/middleware/withHQAuth';

const PLAN_CHANGE_ROLES = new Set([
  'owner', 'hq_admin', 'super_admin', 'superadmin', 'platform_admin', 'hr_admin',
]);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = (req as any).session;
  if (!session?.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const role = (session.user as any).role;
  const tenantId = (session.user as any).tenantId as string | null;
  const action = String(req.query.action || (req.method === 'GET' ? 'current' : 'checkout'));

  try {
    if (req.method === 'GET' && action === 'plans') {
      const midtrans = getMidtransPublicConfig();
      const plans = await listBillablePlans();
      return res.json({
        success: true,
        data: {
          plans,
          seatPricing: plans[0]?.seatPricing || null,
          midtrans,
          midtransConfigured: midtrans.configured,
        },
      });
    }

    if (req.method === 'GET' && action === 'current') {
      if (!tenantId) return res.status(400).json({ success: false, error: 'No tenant' });
      const data = await getTenantBillingStatus(tenantId);
      return res.json({ success: true, data });
    }

    if (req.method === 'GET' && action === 'expiring-trials') {
      if (!isPlatformOperator(role)) return res.status(403).json({ success: false, error: 'Platform only' });
      const days = Math.min(30, Math.max(1, Number(req.query.days) || 7));
      const data = await listExpiringTrials(days);
      return res.json({ success: true, data });
    }

    if (req.method === 'GET' && action === 'plan-change-preview') {
      if (!tenantId) return res.status(400).json({ success: false, error: 'No tenant' });
      const plan = String(req.query.plan || '');
      if (!plan) return res.status(400).json({ success: false, error: 'plan required' });
      const preview = await previewPlanChange(tenantId, plan);
      return res.json({ success: true, data: preview });
    }

    if (req.method === 'GET' && action === 'checkout-quote') {
      if (!tenantId) return res.status(400).json({ success: false, error: 'No tenant' });
      const plan = String(req.query.plan || '');
      if (!plan) return res.status(400).json({ success: false, error: 'plan required' });
      const interval = req.query.interval === 'yearly' ? 'yearly' : 'monthly';
      const voucherCode = String(req.query.voucherCode || req.query.code || '');
      const seats = req.query.seats != null ? Number(req.query.seats) : undefined;
      const addons = {
        lms: String(req.query.lms || '') === '1' || String(req.query.lms || '').toLowerCase() === 'true',
        ai: String(req.query.ai || '') === '1' || String(req.query.ai || '').toLowerCase() === 'true',
      };
      const data = await quoteHumanifyCheckout({
        tenantId,
        plan,
        interval,
        voucherCode: voucherCode || undefined,
        seats: Number.isFinite(seats as number) ? seats : undefined,
        addons,
      });
      return res.json({ success: true, data });
    }

    if (req.method === 'GET' && action === 'voucher-preview') {
      if (!tenantId) return res.status(400).json({ success: false, error: 'No tenant' });
      const code = String(req.query.code || '');
      const plan = String(req.query.plan || 'growth');
      const interval = req.query.interval === 'yearly' ? 'yearly' : 'monthly';
      const voucher = await findBillingVoucherByCode(code);
      if (!voucher) return res.status(404).json({ success: false, error: 'Voucher tidak ditemukan' });
      const listPrice = quoteAmount(plan, interval as 'monthly' | 'yearly', Number(req.query.seats) || 1);
      const applied = computeVoucherDiscount(voucher, listPrice, plan);
      if (!applied.ok) return res.status(400).json({ success: false, error: applied.error });
      return res.json({
        success: true,
        data: {
          code: voucher.code,
          label: voucher.label,
          listPriceIdr: listPrice,
          discountIdr: applied.discountIdr,
          payableIdr: Math.max(0, listPrice - applied.discountIdr),
        },
      });
    }

    if (req.method === 'GET' && action === 'invoice') {
      if (!tenantId) return res.status(400).json({ success: false, error: 'No tenant' });
      const orderCode = String(req.query.orderCode || req.query.orderId || '');
      if (!orderCode) return res.status(400).json({ success: false, error: 'orderCode required' });
      try {
        const data = await getPaidOrderInvoice(tenantId, orderCode);
        return res.json({ success: true, data });
      } catch (e: any) {
        const code = e.statusCode || 500;
        return res.status(code).json({ success: false, error: e.message || 'Invoice error' });
      }
    }

    if (req.method === 'POST' && action === 'change-plan') {
      if (!tenantId) return res.status(400).json({ success: false, error: 'No tenant' });
      if (!PLAN_CHANGE_ROLES.has(String(role || '').toLowerCase()) && !isPlatformOperator(role)) {
        return res.status(403).json({ success: false, error: 'Hanya owner/HR admin dapat mengubah paket' });
      }
      const plan = String(req.body?.plan || '');
      if (!plan) return res.status(400).json({ success: false, error: 'plan required' });
      const result = await applyPlanChange(tenantId, plan);
      if (result.applied) {
        try {
          const { logAdminAction } = await import('@/lib/saas/admin-audit');
          await logAdminAction({
            tenantId,
            actorUserId: (session.user as any).id,
            actorEmail: session.user.email,
            action: 'billing.plan_change',
            resourceType: 'plan',
            resourceId: plan,
            meta: result as any,
          });
        } catch { /* ignore */ }
      }
      const status = result.applied ? 200 : (result.requiresCheckout ? 409 : 422);
      return res.status(status).json({ success: result.applied, data: result, message: result.message });
    }

    if (req.method === 'POST' && action === 'checkout') {
      if (!tenantId) return res.status(400).json({ success: false, error: 'No tenant' });
      const { plan, interval, forceManual, voucherCode, seats, addons } = req.body || {};
      if (!plan) return res.status(400).json({ success: false, error: 'Pilih paket (starter/growth/enterprise)' });
      const origin = (req.headers.origin as string) || process.env.NEXTAUTH_URL || 'https://humanify.id';
      const checkout = await createHumanifyCheckout({
        tenantId,
        plan,
        interval,
        voucherCode,
        seats: seats != null ? Number(seats) : undefined,
        addons: addons && typeof addons === 'object' ? { lms: Boolean(addons.lms), ai: Boolean(addons.ai) } : undefined,
        customerName: (session.user as any).name || (session.user as any).businessName,
        customerEmail: session.user.email || undefined,
        successUrl: `${origin}/humanify/billing?paid=1`,
        forceManual: Boolean(forceManual) && (
          isPlatformOperator(role)
          || process.env.HUMANIFY_BILLING_ALLOW_MANUAL === 'true'
          || !process.env.MIDTRANS_SERVER_KEY
        ),
      });
      return res.status(201).json({ success: true, data: checkout });
    }

    if (req.method === 'POST' && action === 'sync-order') {
      if (!tenantId) return res.status(400).json({ success: false, error: 'No tenant' });
      const code = String(req.body?.orderCode || req.body?.orderId || '');
      if (!code) return res.status(400).json({ success: false, error: 'orderCode required' });
      try {
        const result = await syncOrderFromMidtrans(code, tenantId);
        return res.json({ success: true, data: result });
      } catch (e: any) {
        return res.status(e.statusCode || 400).json({ success: false, error: e.message });
      }
    }

    if (req.method === 'POST' && action === 'confirm-manual') {
      const { orderCode, orderId } = req.body || {};
      const code = orderCode || orderId;
      if (!code) return res.status(400).json({ success: false, error: 'orderCode required' });

      const allow =
        isPlatformOperator(role)
        || process.env.HUMANIFY_BILLING_ALLOW_MANUAL === 'true'
        || !process.env.MIDTRANS_SERVER_KEY;
      if (!allow) {
        return res.status(403).json({ success: false, error: 'Manual confirm disabled — set Midtrans or HUMANIFY_BILLING_ALLOW_MANUAL' });
      }

      // Owners may only confirm their own pending order when manual allowed
      if (!isPlatformOperator(role) && tenantId) {
        const status = await getTenantBillingStatus(tenantId);
        const owned = (status?.orders || []).some(
          (o: any) => (o.order_code === code || o.id === code) && o.status === 'pending',
        );
        if (!owned) return res.status(403).json({ success: false, error: 'Order bukan milik tenant Anda' });
      }

      const result = await activatePaidOrder(code, { raw: { via: 'manual', by: session.user.email } });
      return res.json({ success: true, message: result.alreadyPaid ? 'Sudah terbayar' : 'Paket diaktifkan', data: result });
    }

    if (req.method === 'POST' && action === 'dunning-scan') {
      if (!isPlatformOperator(role)) return res.status(403).json({ success: false, error: 'Platform only' });
      const result = await runDunningScan();
      return res.json({ success: true, data: result });
    }

    // Alias on platform billing path for ops
    if (req.method === 'POST' && action === 'run-dunning') {
      if (!isPlatformOperator(role)) return res.status(403).json({ success: false, error: 'Platform only' });
      const result = await runDunningScan();
      return res.json({ success: true, data: result });
    }

    return res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (e: any) {
    console.error('[humanify/billing]', e);
    const code = e.statusCode || 500;
    return res.status(code).json({
      success: false,
      error: e.message || 'Billing error',
      data: e.quote || undefined,
    });
  }
}

export default withHQAuth(handler);
