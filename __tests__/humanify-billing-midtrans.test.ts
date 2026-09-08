import {
  classifyMidtransStatus,
  computeMidtransSignature,
  buildHumanifySnapPayload,
  SNAP_ENABLED_PAYMENTS,
} from '@/lib/saas/midtrans';
import { computeVoucherDiscount } from '@/lib/saas/billing-vouchers';

describe('Midtrans Snap billing helpers', () => {
  it('signs notifications the Midtrans way', () => {
    const sig = computeMidtransSignature('HFY-STA-ABC', '200', '499000.00', 'SB-SECRET');
    expect(sig).toHaveLength(128);
    expect(sig).toBe(computeMidtransSignature('HFY-STA-ABC', '200', '499000.00', 'SB-SECRET'));
    expect(sig).not.toBe(computeMidtransSignature('HFY-STA-ABC', '200', '499000.00', 'OTHER'));
  });

  it('classifies settlement/capture as paid and expire as failed', () => {
    expect(classifyMidtransStatus('settlement')).toBe('paid');
    expect(classifyMidtransStatus('capture', 'accept')).toBe('paid');
    expect(classifyMidtransStatus('pending')).toBe('pending');
    expect(classifyMidtransStatus('expire')).toBe('failed');
    expect(classifyMidtransStatus('deny')).toBe('failed');
  });

  it('builds Snap payload with VA/QRIS/card and webhook URL', () => {
    const prev = process.env.NEXTAUTH_URL;
    process.env.NEXTAUTH_URL = 'https://humanify.id';
    const payload = buildHumanifySnapPayload({
      orderCode: 'HFY-GRO-1',
      amountIdr: 1_499_000,
      planId: 'growth',
      planName: 'Growth',
      interval: 'monthly',
      tenantId: 'tid-1',
      customerName: 'PT Contoh',
      customerEmail: 'owner@contoh.id',
      finishUrl: 'https://humanify.id/humanify/billing?paid=1',
    });
    expect((payload.transaction_details as any).gross_amount).toBe(1_499_000);
    expect(payload.enabled_payments).toEqual(SNAP_ENABLED_PAYMENTS);
    expect((payload.credit_card as any).secure).toBe(true);
    expect(String(payload.notification_url)).toContain('/api/humanify/billing/webhook');
    if (prev === undefined) delete process.env.NEXTAUTH_URL;
    else process.env.NEXTAUTH_URL = prev;
  });

  it('computes percent voucher discount with cap', () => {
    const voucher: any = {
      is_active: true,
      discount_type: 'percent',
      discount_value: 20,
      max_discount_idr: 100_000,
      min_amount_idr: 0,
      redemption_count: 0,
      max_redemptions: null,
      applicable_plans: ['growth'],
    };
    const r = computeVoucherDiscount(voucher, 1_499_000, 'growth');
    expect(r.ok).toBe(true);
    expect(r.discountIdr).toBe(100_000);
  });
});
