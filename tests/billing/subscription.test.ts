/**
 * Tests for /api/billing/subscription
 * Subscription lifecycle: GET, POST, PUT, DELETE
 */
import {
  createRequest, createResponse, getResponseJson, getResponseStatus,
  createDbMock, createMockInstance, resetDbMocks, createMockSession,
} from '../helpers/test-utils';

const mockDb = createDbMock();
jest.mock('@/models', () => mockDb, { virtual: true });
jest.mock('../../models', () => mockDb, { virtual: true });

jest.mock('next-auth', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));

import handler from '../../pages/api/billing/subscription';
import { getServerSession } from 'next-auth/next';

const SESSION = createMockSession({ role: 'owner', tenantId: 'tenant-001' });

beforeEach(() => {
  jest.clearAllMocks();
  // Re-stock default returns without resetting constructor mocks
  Object.values(mockDb).forEach((model: any) => {
    if (model && typeof model === 'object') {
      if (model.findAll) model.findAll.mockResolvedValue([]);
      if (model.findOne) model.findOne.mockResolvedValue(null);
      if (model.findByPk) model.findByPk.mockResolvedValue(null);
      if (model.create) model.create.mockImplementation((data: any) => Promise.resolve(createMockInstance({ id: 'mock-id', ...data })));
      if (model.update) model.update.mockResolvedValue([1]);
      if (model.destroy) model.destroy.mockResolvedValue(1);
      if (model.count) model.count.mockResolvedValue(0);
    }
  });
  jest.mocked(getServerSession).mockResolvedValue(SESSION);
});

describe('/api/billing/subscription', () => {
  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      jest.mocked(getServerSession).mockResolvedValue(null);
      const { status } = await sendRequest('GET');
      expect(status).toBe(401);
    });

    it('returns 404 when no subscription exists', async () => {
      const { status } = await sendRequest('GET');
      expect(status).toBe(404);
    });

    it('returns subscription with plan and billing cycle', async () => {
      const sub = createMockInstance({
        id: 'sub-001', tenantId: 'tenant-001', status: 'active', planId: 'plan-basic',
        currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30*86400000),
        cancelAtPeriodEnd: false,
        isInTrial: () => false, getTrialDaysLeft: () => 0, getDaysUntilRenewal: () => 25,
        plan: createMockInstance({ id: 'plan-basic', name: 'Basic', price: '99000', description: 'Basic plan', billingInterval: 'monthly', currency: 'IDR', features: {} }),
        billingCycles: [createMockInstance({ id: 'bc-001', periodStart: new Date(), amount: '99000' })],
      });
      mockDb.Subscription.findOne.mockResolvedValueOnce(sub);
      mockDb.UsageMetric.findAll.mockResolvedValueOnce([]);
      mockDb.PlanLimit.findAll.mockResolvedValueOnce([]);

      const { status, json } = await sendRequest('GET');
      expect(status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.subscription.id).toBe('sub-001');
    });

    it('queries by tenantId from session', async () => {
      mockDb.Subscription.findOne.mockResolvedValueOnce(createMockInstance({
        isInTrial: () => false, getTrialDaysLeft: () => 0, getDaysUntilRenewal: () => 25,
        billingCycles: [],
      }));
      mockDb.UsageMetric.findAll.mockResolvedValueOnce([]);
      mockDb.PlanLimit.findAll.mockResolvedValueOnce([]);
      await sendRequest('GET');
      expect(mockDb.Subscription.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-001' } })
      );
    });
  });

  describe('POST - create subscription', () => {
    it('creates subscription with plan selection', async () => {
      mockDb.Subscription.findOne.mockResolvedValueOnce(null);
      mockDb.Plan.findByPk.mockResolvedValueOnce(createMockInstance({
        id: 'plan-pro', price: '199000', isActive: true, billingInterval: 'monthly', trialDays: 14,
      }));
      mockDb.Tenant.findByPk.mockResolvedValueOnce(createMockInstance({
        id: 'tenant-001', update: jest.fn().mockResolvedValue({}),
      }));
      mockDb.Subscription.create.mockResolvedValueOnce(createMockInstance({
        id: 'sub-new', tenantId: 'tenant-001', planId: 'plan-pro', status: 'trial',
      }));
      mockDb.PlanLimit.findAll.mockResolvedValueOnce([]);
      mockDb.UsageMetric.create.mockResolvedValueOnce(createMockInstance());

      const { status } = await sendRequest('POST', { planId: 'plan-pro' });
      expect(status).toBe(201);
    });

    it('returns 404 when planId is missing', async () => {
      mockDb.Subscription.findOne.mockResolvedValueOnce(null); // no existing sub check
      // No planId in body → Plan.findByPk(undefined) returns null
      const { status, json } = await sendRequest('POST', {});
      expect(status).toBe(404);
    });

    it('returns 404 when plan not found', async () => {
      mockDb.Subscription.findOne.mockResolvedValueOnce(null);
      mockDb.Plan.findByPk.mockResolvedValueOnce(null);
      const { status } = await sendRequest('POST', { planId: 'plan-invalid' });
      expect(status).toBe(404);
    });

    it('returns 400 when tenant already has a subscription', async () => {
      mockDb.Subscription.findOne.mockResolvedValueOnce(createMockInstance({ id: 'sub-existing' }));
      const { status } = await sendRequest('POST', { planId: 'plan-pro' });
      expect(status).toBe(400);
    });
  });

  describe('PUT - upgrade/downgrade', () => {
    it('upgrades to new plan', async () => {
      mockDb.Subscription.findOne.mockResolvedValueOnce(createMockInstance({
        id: 'sub-001', planId: 'plan-basic', status: 'active',
        currentPeriodEnd: new Date(Date.now() + 15*86400000),
        price: '50000', // used by subscription.plan.price
        plan: createMockInstance({ id: 'plan-basic', price: '50000' }),
        update: jest.fn().mockResolvedValue({}),
      }));
      mockDb.Plan.findByPk.mockResolvedValueOnce(createMockInstance({
        id: 'plan-pro', price: '199000', isActive: true, billingInterval: 'monthly',
      }));
      mockDb.BillingCycle.create.mockResolvedValueOnce(createMockInstance({}));
      mockDb.Invoice.create.mockResolvedValueOnce(createMockInstance({}));

      const { status } = await sendRequest('PUT', { planId: 'plan-pro' });
      expect(status).toBe(200);
    });

    it('returns 404 when no active subscription', async () => {
      mockDb.Subscription.findOne.mockResolvedValueOnce(null);
      const { status } = await sendRequest('PUT', { planId: 'plan-pro' });
      expect(status).toBe(404);
    });
  });

  describe('DELETE - cancel subscription', () => {
    it('cancels active subscription', async () => {
      mockDb.Subscription.findOne.mockResolvedValueOnce(createMockInstance({
        id: 'sub-001', status: 'active',
        cancel: jest.fn().mockResolvedValue(true),
        update: jest.fn().mockResolvedValue({}),
      }));
      mockDb.AuditLog.create.mockResolvedValueOnce(createMockInstance());

      const { status } = await sendRequest('DELETE');
      expect(status).toBe(200);
    });

    it('returns 404 when no subscription to cancel', async () => {
      const { status } = await sendRequest('DELETE');
      expect(status).toBe(404);
    });
  });

  describe('method validation', () => {
    it('returns 405 for unsupported methods', async () => {
      const { status } = await sendRequest('PATCH');
      expect(status).toBe(405);
    });
  });
});

async function sendRequest(method: string, body?: any) {
  const req = createRequest(method as any, body ? { body } : {});
  const res = createResponse();
  await handler(req, res);
  return { status: getResponseStatus(res), json: getResponseJson(res) };
}
