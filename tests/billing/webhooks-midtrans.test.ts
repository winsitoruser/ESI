/**
 * Tests for POST /api/billing/webhooks/midtrans
 */
import {
  createRequest, createResponse, getResponseJson, getResponseStatus,
  createDbMock, createMockInstance, resetDbMocks,
} from '../helpers/test-utils';

const mockDb = createDbMock();
jest.mock('@/models', () => mockDb, { virtual: true });
jest.mock('../../models', () => mockDb, { virtual: true });

// Mock MidtransService — constructor that creates instances with handleWebhook
const mockHandleWebhook = jest.fn();
jest.mock('../../services/payment/MidtransService', () => {
  return jest.fn().mockImplementation(() => ({
    handleWebhook: mockHandleWebhook,
  }));
});

import handler from '../../pages/api/billing/webhooks/midtrans';

beforeEach(() => {
  jest.clearAllMocks();
  // Clear mock queues manually instead of resetAllMocks to preserve MidtransService constructor
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
  mockHandleWebhook.mockReset();
});

describe('POST /api/billing/webhooks/midtrans', () => {
  it('returns 405 for non-POST methods', async () => {
    const req = createRequest('GET');
    const res = createResponse();
    await handler(req, res);
    expect(getResponseStatus(res)).toBe(405);
  });

  it('returns 400 when webhook verification fails', async () => {
    mockHandleWebhook.mockResolvedValueOnce({ success: false, error: 'Invalid signature' });

    const { status, json } = await sendWebhook({ transaction_id: 'trx-001' });
    expect(status).toBe(400);
  });

  it('returns 404 when payment transaction is not found', async () => {
    mockHandleWebhook.mockResolvedValueOnce({
      success: true, transactionId: 'mt-trx-001', status: 'completed', rawTransaction: {}, paymentType: 'bank_transfer',
    });
    mockDb.PaymentTransaction.findOne.mockResolvedValueOnce(null);

    const { status } = await sendWebhook({ transaction_id: 'mt-trx-001' });
    expect(status).toBe(404);
  });

  it('processes completed payment successfully', async () => {
    mockHandleWebhook.mockResolvedValueOnce({
      success: true, transactionId: 'mt-trx-002', status: 'completed',
      rawTransaction: { gross_amount: '99000' }, paymentType: 'bank_transfer',
    });

    const paymentTx = createMockInstance({
      id: 'pt-001', status: 'pending', metadata: {},
      update: jest.fn().mockResolvedValue({}),
      invoice: createMockInstance({
        id: 'inv-001', status: 'pending',
        subscription: createMockInstance({ id: 'sub-001', status: 'active' }),
        billingCycle: createMockInstance({ id: 'bc-001' }),
      }),
    });
    mockDb.PaymentTransaction.findOne.mockResolvedValueOnce(paymentTx);

    const { status } = await sendWebhook({ transaction_id: 'mt-trx-002', status_code: '200' });
    expect(status).toBe(200);
  });

  it('handles failed payment gracefully', async () => {
    mockHandleWebhook.mockResolvedValueOnce({
      success: true, transactionId: 'mt-trx-003', status: 'failed',
      rawTransaction: {}, paymentType: 'bank_transfer',
    });

    const paymentTx = createMockInstance({
      id: 'pt-002', status: 'pending', metadata: {},
      update: jest.fn().mockResolvedValue({}),
      invoice: createMockInstance({
        id: 'inv-002', status: 'pending',
        subscription: createMockInstance({ id: 'sub-002' }),
        billingCycle: createMockInstance({ id: 'bc-002' }),
      }),
    });
    mockDb.PaymentTransaction.findOne.mockResolvedValueOnce(paymentTx);

    const { status } = await sendWebhook({ transaction_id: 'mt-trx-003', status_code: '201' });
    expect(status).toBe(200);
  });
});

async function sendWebhook(body: any) {
  const req = createRequest('POST', { body });
  const res = createResponse();
  await handler(req, res);
  return { status: getResponseStatus(res), json: getResponseJson(res) };
}
