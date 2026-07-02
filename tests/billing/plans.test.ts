/**
 * Tests for GET/POST /api/billing/plans
 * Plan listing and creation
 */
import {
  createRequest, createResponse, getResponseJson, getResponseStatus,
  createDbMock, createMockInstance, resetDbMocks, createMockSession,
} from '../helpers/test-utils';
// Mock models
const mockDb = createDbMock();
jest.mock('@/models', () => mockDb, { virtual: true });
jest.mock('../../models', () => mockDb, { virtual: true });

jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

import handler from '../../pages/api/billing/plans/index';
import { getServerSession } from 'next-auth/next';

const SESSION_ADMIN = createMockSession({ role: 'super_admin' });
const SESSION_USER = createMockSession({ role: 'owner' });

beforeEach(() => {
  jest.resetAllMocks();
  resetDbMocks(mockDb);
  jest.mocked(getServerSession).mockResolvedValue(SESSION_USER);
});

describe('/api/billing/plans', () => {
  describe('GET - list plans', () => {
    it('returns active plans with formatted data', async () => {
      const plans = [
        createMockInstance({
          id: 'plan-basic', name: 'Basic', price: '99000',
          billingInterval: 'monthly', currency: 'IDR',
          features: { pos: true }, metadata: {},
          getFormattedPrice: () => 'Rp99.000',
          getIntervalDisplay: () => '/bulan',
          planLimits: [{ metricName: 'branches', maxValue: 1, unit: 'count', isSoftLimit: false }],
        }),
        createMockInstance({
          id: 'plan-pro', name: 'Pro', price: '199000',
          billingInterval: 'monthly', currency: 'IDR',
          features: { pos: true, inventory: true }, metadata: { isPopular: true },
          getFormattedPrice: () => 'Rp199.000',
          getIntervalDisplay: () => '/bulan',
          planLimits: [],
        }),
      ];
      mockDb.Plan.findAll.mockResolvedValueOnce(plans);

      const req = createRequest('GET');
      const res = createResponse();
      await handler(req, res);

      expect(getResponseStatus(res)).toBe(200);
      const json = getResponseJson(res);
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(2);
      expect(json.data[0].name).toBe('Basic');
      expect(json.data[1].name).toBe('Pro');
    });

    it('filters plans by interval when specified', async () => {
      mockDb.Plan.findAll.mockResolvedValueOnce([createMockInstance({
        id: 'plan-yearly', name: 'Pro Yearly', price: '1990000',
        billingInterval: 'yearly',
        getFormattedPrice: () => 'Rp1.990.000',
        getIntervalDisplay: () => '/tahun',
        planLimits: [],
      })]);

      const req = createRequest('GET', { query: { interval: 'yearly' } });
      const res = createResponse();
      await handler(req, res);

      expect(mockDb.Plan.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ billingInterval: 'yearly', isActive: true }),
        })
      );
      expect(getResponseStatus(res)).toBe(200);
    });

    it('includes inactive plans when includeInactive=true', async () => {
      mockDb.Plan.findAll.mockResolvedValueOnce([]);
      const req = createRequest('GET', { query: { includeInactive: 'true' } });
      const res = createResponse();
      await handler(req, res);

      // Should not filter by isActive
      const whereClause = mockDb.Plan.findAll.mock.calls[0][0].where;
      expect(whereClause.isActive).toBeUndefined();
    });

    it('returns sorted plans by sortOrder then price', async () => {
      mockDb.Plan.findAll.mockResolvedValueOnce([]);
      const req = createRequest('GET');
      const res = createResponse();
      await handler(req, res);

      expect(mockDb.Plan.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: [['sortOrder', 'ASC'], ['price', 'ASC']],
        })
      );
    });

    it('returns 405 for unsupported methods', async () => {
      const req = createRequest('PUT');
      const res = createResponse();
      await handler(req, res);
      expect(getResponseStatus(res)).toBe(405);
    });
  });

  describe('POST - create plan (admin only)', () => {
    it('returns 401 when not authenticated', async () => {
      jest.mocked(getServerSession).mockResolvedValue(null);
      const req = createRequest('POST', { body: { name: 'Premium', price: 299000 } });
      const res = createResponse();
      await handler(req, res);
      expect(getResponseStatus(res)).toBe(401);
    });

    it('creates plan with valid data', async () => {
      jest.mocked(getServerSession).mockResolvedValue(SESSION_ADMIN);
      const planData = { name: 'Enterprise', price: 499000, billingInterval: 'monthly' };
      mockDb.Plan.create.mockResolvedValueOnce(createMockInstance({
        ...planData, id: 'plan-new',
        planLimits: [],
        getFormattedPrice: () => 'Rp499.000',
        getIntervalDisplay: () => '/bulan',
      }));

      const req = createRequest('POST', { body: planData });
      const res = createResponse();
      await handler(req, res);

      expect(getResponseStatus(res)).toBe(201);
      expect(mockDb.Plan.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Enterprise' }));
    });
  });
});
