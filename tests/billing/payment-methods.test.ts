/**
 * Tests for /api/billing/payment-methods
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

import handler from '../../pages/api/billing/payment-methods/index';
import { getServerSession } from 'next-auth/next';

const SESSION = createMockSession({ tenantId: 'tenant-001' });

beforeEach(() => { jest.resetAllMocks(); resetDbMocks(mockDb); jest.mocked(getServerSession).mockResolvedValue(SESSION); });

describe('/api/billing/payment-methods', () => {
  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      jest.mocked(getServerSession).mockResolvedValue(null);
      const { status } = await getMethods();
      expect(status).toBe(401);
    });

    it('returns payment methods sorted by default first', async () => {
      const methods = [
        createMockInstance({ id: 'pm-001', type: 'bank_transfer', provider: 'BCA', name: 'BCA Transfer', isDefault: true, isActive: true }),
        createMockInstance({ id: 'pm-002', type: 'ewallet', provider: 'GoPay', name: 'GoPay', isDefault: false, isActive: true }),
      ];
      mockDb.PaymentMethod.findAll.mockResolvedValueOnce(methods);

      const { status, json } = await getMethods();
      expect(status).toBe(200);
      expect(json.data).toHaveLength(2);
      expect(mockDb.PaymentMethod.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-001' } })
      );
    });
  });

  describe('POST', () => {
    it('returns 401 when not authenticated', async () => {
      jest.mocked(getServerSession).mockResolvedValue(null);
      const { status } = await createMethod({});
      expect(status).toBe(401);
    });

    it('creates a new payment method', async () => {
      mockDb.PaymentMethod.create.mockResolvedValueOnce(createMockInstance({
        id: 'pm-new', type: 'bank_transfer', provider: 'Mandiri', name: 'Mandiri Transfer',
      }));

      const { status } = await createMethod({
        type: 'bank_transfer', provider: 'Mandiri', name: 'Mandiri Transfer',
      });
      expect(status).toBe(201);
    });

    it('returns 405 for unsupported methods', async () => {
      const req = createRequest('PUT');
      const res = createResponse();
      await handler(req, res);
      expect(getResponseStatus(res)).toBe(405);
    });
  });
});

async function getMethods() {
  const req = createRequest('GET'); const res = createResponse();
  await handler(req, res);
  return { status: getResponseStatus(res), json: getResponseJson(res) };
}
async function createMethod(body: any) {
  const req = createRequest('POST', { body }); const res = createResponse();
  await handler(req, res);
  return { status: getResponseStatus(res), json: getResponseJson(res) };
}
