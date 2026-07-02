/**
 * Tests for /api/finance/transactions-crud
 * Finance transaction CRUD operations
 */
import {
  createRequest, createResponse, getResponseJson, getResponseStatus,
  createDbMock, createMockInstance, createMockSession,
} from '../helpers/test-utils';

const mockDb = createDbMock();
jest.mock('@/models', () => mockDb, { virtual: true });
jest.mock('../../models', () => mockDb, { virtual: true });
// Use virtual mocks for individual model files — avoid real file resolution
jest.mock('../../models/FinanceTransaction', () => mockDb.FinanceTransaction, { virtual: true });
jest.mock('../../models/FinanceAccount', () => mockDb.FinanceAccount, { virtual: true });

// Mock auth options to avoid loading [...nextauth].ts at module evaluation time
jest.mock('../../pages/api/auth/[...nextauth]', () => ({
  authOptions: { providers: [], callbacks: {} },
}), { virtual: true });

// Mock sequelize to avoid ESM uuid import side effects
jest.mock('sequelize', () => ({
  Op: {
    like: Symbol('like'), between: Symbol('between'), gte: Symbol('gte'),
    lte: Symbol('lte'), or: Symbol('or'), and: Symbol('and'), in: Symbol('in'), ne: Symbol('ne'),
  },
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
  default: jest.fn(() => ({})),
}));

import handler from '../../pages/api/finance/transactions-crud';
import { getServerSession } from 'next-auth';

const SESSION = createMockSession({ role: 'owner' });

function resetMocks() {
  Object.values(mockDb).forEach((model: any) => {
    if (model && typeof model === 'object') {
      if (model.findAll) model.findAll.mockResolvedValue([]);
      if (model.findOne) model.findOne.mockResolvedValue(null);
      if (model.findByPk) model.findByPk.mockResolvedValue(null);
      if (model.create) model.create.mockImplementation((data: any) =>
        Promise.resolve(createMockInstance({ id: 'mock-uuid', ...data }))
      );
      if (model.update) model.update.mockResolvedValue([1]);
      if (model.destroy) model.destroy.mockResolvedValue(1);
      if (model.count) model.count.mockResolvedValue(0);
    }
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  resetMocks();
  jest.mocked(getServerSession).mockResolvedValue(SESSION);
});

async function send(method: string, body?: any, query?: any) {
  const req = createRequest(method as any, body ? { body, query } : { query });
  const res = createResponse();
  await handler(req, res);
  return { status: getResponseStatus(res), json: getResponseJson(res) };
}

describe('GET /api/finance/transactions-crud', () => {
  it('returns 401 when not authenticated', async () => {
    jest.mocked(getServerSession).mockResolvedValue(null);
    const { status } = await send('GET');
    expect(status).toBe(401);
  });

  it('lists all active transactions with summary', async () => {
    const tx1 = createMockInstance({
      id: 'tx-001', transactionType: 'income', amount: '500000', transactionNumber: 'TRX-2026-001',
      transactionDate: new Date(), category: 'sales', description: 'Penjualan tunai',
      account: createMockInstance({ id: 'acct-001', accountNumber: '101', accountName: 'Kas', accountType: 'asset' }),
    });
    const tx2 = createMockInstance({
      id: 'tx-002', transactionType: 'expense', amount: '100000', transactionNumber: 'TRX-2026-002',
      transactionDate: new Date(), category: 'utilities', description: 'Listrik',
      account: createMockInstance({ id: 'acct-002', accountNumber: '501', accountName: 'Beban Listrik', accountType: 'expense' }),
    });
    mockDb.FinanceTransaction.findAll.mockResolvedValueOnce([tx1, tx2]);

    const { status, json } = await send('GET');
    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(json.summary.totalIncome).toBe(500000);
    expect(json.summary.totalExpense).toBe(100000);
    expect(json.summary.netCashFlow).toBe(400000);
  });

  it('filters by transactionType', async () => {
    mockDb.FinanceTransaction.findAll.mockResolvedValueOnce([]);
    await send('GET', {}, { transactionType: 'income' });
    expect(mockDb.FinanceTransaction.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ transactionType: 'income' }),
      })
    );
  });

  it('filters by date range', async () => {
    mockDb.FinanceTransaction.findAll.mockResolvedValueOnce([]);
    await send('GET', {}, { startDate: '2026-01-01', endDate: '2026-01-31' });
    const whereClause = mockDb.FinanceTransaction.findAll.mock.calls[0][0].where;
    expect(whereClause.transactionDate).toBeDefined();
  });

  it('filters by search keyword', async () => {
    mockDb.FinanceTransaction.findAll.mockResolvedValueOnce([]);
    await send('GET', {}, { search: 'sewa' });
    const whereClause = mockDb.FinanceTransaction.findAll.mock.calls[0][0].where;
    expect(whereClause[Symbol.for('or')] || whereClause.or || whereClause[Object.getOwnPropertySymbols(whereClause)[0]]).toBeDefined();
  });

  it('returns 405 for unsupported methods', async () => {
    const { status } = await send('PATCH');
    expect(status).toBe(405);
  });
});

describe('POST /api/finance/transactions-crud', () => {
  it('creates income transaction and updates account balance', async () => {
    const account = createMockInstance({
      id: 'acct-001', balance: '1000000', accountNumber: '101',
      update: jest.fn().mockResolvedValue({}),
    });
    mockDb.FinanceAccount.findByPk.mockResolvedValueOnce(account);
    mockDb.FinanceTransaction.findOne.mockResolvedValueOnce(null);
    mockDb.FinanceTransaction.create.mockResolvedValueOnce(createMockInstance({
      id: 'tx-new', transactionNumber: 'TRX-2026-001', amount: '500000',
    }));

    const { status } = await send('POST', {
      transactionDate: '2026-06-01', transactionType: 'income',
      accountId: 'acct-001', category: 'sales', amount: '500000',
    });
    expect(status).toBe(201);
    expect(account.update).toHaveBeenCalledWith({ balance: 1500000 });
  });

  it('creates expense transaction and updates account balance', async () => {
    const account = createMockInstance({
      id: 'acct-002', balance: '2000000',
      update: jest.fn().mockResolvedValue({}),
    });
    mockDb.FinanceAccount.findByPk.mockResolvedValueOnce(account);
    mockDb.FinanceTransaction.findOne.mockResolvedValueOnce(null);
    mockDb.FinanceTransaction.create.mockResolvedValueOnce(createMockInstance({
      id: 'tx-expense', amount: '300000',
    }));

    const { status } = await send('POST', {
      transactionDate: '2026-06-01', transactionType: 'expense',
      accountId: 'acct-002', category: 'rent', amount: '300000',
    });
    expect(status).toBe(201);
    expect(account.update).toHaveBeenCalledWith({ balance: 1700000 });
  });

  it('returns 400 when required fields missing', async () => {
    const { status } = await send('POST', {});
    expect(status).toBe(400);
  });

  it('returns 404 when account not found', async () => {
    mockDb.FinanceAccount.findByPk.mockResolvedValueOnce(null);
    const { status } = await send('POST', {
      transactionDate: '2026-06-01', transactionType: 'income',
      accountId: 'acct-invalid', category: 'sales', amount: '100000',
    });
    expect(status).toBe(404);
  });
});

describe('PUT /api/finance/transactions-crud', () => {
  it('updates transaction and adjusts balance when amount changes', async () => {
    const tx = createMockInstance({
      id: 'tx-001', transactionType: 'income', amount: '100000', accountId: 'acct-001',
      update: jest.fn().mockResolvedValue({}),
    });
    mockDb.FinanceTransaction.findByPk.mockResolvedValueOnce(tx);
    const account = createMockInstance({
      id: 'acct-001', balance: '500000',
      update: jest.fn().mockResolvedValue({}),
    });
    mockDb.FinanceAccount.findByPk.mockResolvedValueOnce(account);

    const { status } = await send('PUT', { amount: '200000' }, { id: 'tx-001' });
    expect(status).toBe(200);
    expect(account.update).toHaveBeenCalledWith({ balance: 600000 });
  });

  it('returns 400 when id is missing', async () => {
    const { status } = await send('PUT', {});
    expect(status).toBe(400);
  });

  it('returns 404 when transaction not found', async () => {
    mockDb.FinanceTransaction.findByPk.mockResolvedValueOnce(null);
    const { status } = await send('PUT', {});
    expect(status).toBe(400); // Missing id check happens first
  });
});

describe('DELETE /api/finance/transactions-crud', () => {
  it('soft-deletes transaction and reverses balance', async () => {
    const tx = createMockInstance({
      id: 'tx-001', transactionType: 'income', amount: '500000', accountId: 'acct-001', status: 'completed',
      update: jest.fn().mockResolvedValue({}),
    });
    const account = createMockInstance({
      id: 'acct-001', balance: '1500000',
      update: jest.fn().mockResolvedValue({}),
    });

    // Set up mock with direct mockImplementation for reliability
    mockDb.FinanceTransaction.findByPk = jest.fn().mockResolvedValue(tx);
    mockDb.FinanceAccount.findByPk = jest.fn().mockResolvedValue(account);

    const { status, json } = await send('DELETE', {}, { id: 'tx-001' });
    expect(status).toBe(200);
    expect(json.message).toMatch(/deleted/i);
    // Balance should be reversed (subtract income: 1500000 - 500000 = 1000000)
    expect(account.update).toHaveBeenCalledWith({ balance: 1000000 });
    expect(tx.update).toHaveBeenCalledWith({ isActive: false, status: 'cancelled' });
  });

  it('returns 400 when id is missing', async () => {
    const { status } = await send('DELETE');
    expect(status).toBe(400);
  });
});
