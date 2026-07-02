/**
 * Tests for GET /api/billing/invoices
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

import handler from '../../pages/api/billing/invoices/index';
import { getServerSession } from 'next-auth/next';

const SESSION = createMockSession({ role: 'owner', tenantId: 'tenant-001' });

beforeEach(() => { jest.resetAllMocks(); resetDbMocks(mockDb); jest.mocked(getServerSession).mockResolvedValue(SESSION); });

describe('/api/billing/invoices', () => {
  it('returns 401 when not authenticated', async () => {
    jest.mocked(getServerSession).mockResolvedValue(null);
    const { status } = await getInvoices();
    expect(status).toBe(401);
  });

  it('returns 405 for non-GET methods', async () => {
    const req = createRequest('POST');
    const res = createResponse();
    await handler(req, res);
    expect(getResponseStatus(res)).toBe(405);
  });

  it('returns invoices for the tenant', async () => {
    const invoices = [
      createMockInstance({
        id: 'inv-001', invoiceNumber: 'INV-2026-001', status: 'paid',
        subtotal: '100000', totalAmount: '110000',
        items: [], paymentTransactions: [],
      }),
      createMockInstance({
        id: 'inv-002', invoiceNumber: 'INV-2026-002', status: 'pending',
        subtotal: '200000', totalAmount: '220000',
        items: [], paymentTransactions: [],
      }),
    ];
    mockDb.Invoice.findAll.mockResolvedValueOnce(invoices);

    const { status, json } = await getInvoices();
    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
  });

  it('filters by tenantId from session', async () => {
    mockDb.Invoice.findAll.mockResolvedValueOnce([]);
    await getInvoices();
    expect(mockDb.Invoice.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'tenant-001' } })
    );
  });
});

async function getInvoices() {
  const req = createRequest('GET');
  const res = createResponse();
  await handler(req, res);
  return { status: getResponseStatus(res), json: getResponseJson(res) };
}
