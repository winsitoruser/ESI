import { pipelineTotals, type SalesLead } from '@/lib/saas/sales-leads';
import { refundNeedsApproval, LARGE_REFUND_IDR } from '@/lib/saas/platform-approvals';
import { funnelRates } from '@/lib/saas/marketing-campaigns';
import { nextFaqStatus } from '@/lib/saas/cms-content';
import { computeArpu, computeChurnPct, computeConversionPct } from '@/lib/saas/platform-analytics';
import { deskHasPermission, permissionForAction } from '@/lib/saas/platform-desks';
import { slugifyArticle } from '@/lib/saas/cms-articles';
import { forecastRevenue, growthFromCounts } from '@/lib/saas/platform-insights';

function lead(partial: Partial<SalesLead>): SalesLead {
  return {
    id: '1',
    company: 'PT Contoh',
    pic: 'Ayu',
    email: null,
    phone: null,
    source: 'web',
    interest: null,
    estimatedDealIdr: 10_000_000,
    ownerEmail: null,
    nextFollowUp: null,
    status: 'new',
    note: null,
    createdAt: '',
    updatedAt: '',
    ...partial,
  };
}

describe('control center commercial helpers', () => {
  it('sums open CRM pipeline and expected closing', () => {
    const totals = pipelineTotals([
      lead({ id: 'a', status: 'proposal', estimatedDealIdr: 700_000_000 }),
      lead({ id: 'b', status: 'qualified', estimatedDealIdr: 300_000_000 }),
      lead({ id: 'c', status: 'won', estimatedDealIdr: 50_000_000 }),
      lead({ id: 'd', status: 'lost', estimatedDealIdr: 20_000_000 }),
    ]);
    expect(totals.totalPipelineIdr).toBe(1_000_000_000);
    expect(totals.qualifiedPipelineIdr).toBe(1_000_000_000);
    expect(totals.proposalIdr).toBe(700_000_000);
    expect(totals.expectedClosingIdr).toBe(420_000_000);
    expect(totals.wonCount).toBe(1);
  });

  it('requires approval only for large refunds', () => {
    expect(refundNeedsApproval(LARGE_REFUND_IDR)).toBe(true);
    expect(refundNeedsApproval(LARGE_REFUND_IDR - 1)).toBe(false);
  });

  it('computes marketing funnel rates', () => {
    const rates = funnelRates({ visitors: 10000, registrations: 2000, trials: 800, paid: 200 });
    expect(rates.conversionRegisterPct).toBe(20);
    expect(rates.conversionPaidPct).toBe(10);
  });

  it('advances FAQ draft → review → approved → published', () => {
    expect(nextFaqStatus('draft')).toBe('review');
    expect(nextFaqStatus('review')).toBe('approved');
    expect(nextFaqStatus('approved')).toBe('published');
    expect(nextFaqStatus('published')).toBeNull();
  });

  it('computes analytics rates', () => {
    expect(computeConversionPct(20, 100)).toBe(20);
    expect(computeArpu(1_000_000, 4)).toBe(250000);
    expect(computeChurnPct(2, 20)).toBe(10);
    expect(computeConversionPct(1, 0)).toBe(0);
  });

  it('enforces desk permission matrix', () => {
    expect(deskHasPermission(null, 'finance.refund')).toBe(true);
    expect(deskHasPermission('cs', 'finance.refund')).toBe(false);
    expect(deskHasPermission('finance', 'finance.refund')).toBe(true);
    expect(deskHasPermission('finance', 'roles.assign')).toBe(false);
    expect(deskHasPermission('management', 'roles.assign')).toBe(true);
    expect(permissionForAction('finance-refund', 'POST')).toBe('finance.refund');
    expect(permissionForAction('overview', 'GET')).toBeNull();
  });

  it('slugifies articles and forecasts MRR', () => {
    expect(slugifyArticle('HRIS untuk UKM 2026')).toBe('hris-untuk-ukm-2026');
    expect(forecastRevenue(1_000_000, 3, 10)).toBe(3_300_000);
    expect(growthFromCounts(100, 118)).toBe(18);
  });
});
