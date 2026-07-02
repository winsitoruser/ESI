import {
  createRequest, createResponse, getResponseJson, getResponseStatus,
  createDbMock, createMockInstance,
} from '../helpers/test-utils';

const mockDb = createDbMock();
jest.mock('@/models', () => mockDb, { virtual: true });
jest.mock('../../models', () => mockDb, { virtual: true });
jest.mock('../../models/FinanceTransaction', () => {
  console.log('MOCK FACTORY CALLED for FinanceTransaction');
  return mockDb.FinanceTransaction;
});
jest.mock('../../models/FinanceAccount', () => {
  console.log('MOCK FACTORY CALLED for FinanceAccount');
  return mockDb.FinanceAccount;
});
jest.mock('../../pages/api/auth/[...nextauth]', () => ({ authOptions: { providers: [], callbacks: {} } }), { virtual: true });
jest.mock('sequelize', () => ({ Op: { like: Symbol('like'), between: Symbol('between'), gte: Symbol('gte'), lte: Symbol('lte'), or: Symbol('or'), and: Symbol('and'), in: Symbol('in'), ne: Symbol('ne') } }));
jest.mock('next-auth', () => ({ getServerSession: jest.fn(), default: jest.fn(() => ({})) }));

import handler from '../../pages/api/finance/transactions-crud';
import { getServerSession } from 'next-auth';

beforeEach(() => {
  jest.clearAllMocks();
  Object.values(mockDb).forEach((model: any) => {
    if (model && typeof model === 'object') {
      if (model.findByPk) model.findByPk.mockResolvedValue(null);
      if (model.findAll) model.findAll.mockResolvedValue([]);
      if (model.create) model.create.mockImplementation((data: any) => Promise.resolve(createMockInstance({ id: 'mock-uuid', ...data })));
    }
  });
  jest.mocked(getServerSession).mockResolvedValue({ user: { id: 'user-001', role: 'owner' } });
});

describe('TRACE: mock resolution', () => {
  it('verifies the mock is used', async () => {
    const tx = createMockInstance({ id: 'tx-001', transactionType: 'income', amount: '500000', accountId: 'acct-001', status: 'completed', update: jest.fn().mockResolvedValue({}) });
    const account = createMockInstance({ id: 'acct-001', balance: '1500000', update: jest.fn().mockResolvedValue({}) });

    // Check mockDb.findByPk is a jest.fn
    console.log('mockDb.FinanceTransaction.findByPk is jest.fn:', typeof mockDb.FinanceTransaction.findByPk);
    console.log('mockDb.FinanceTransaction.findByPk mock:', mockDb.FinanceTransaction.findByPk.getMockImplementation?.());

    mockDb.FinanceTransaction.findByPk.mockImplementation((id: string) => {
      console.log('MOCK FINANCETRANSACTION.findByPk called with:', id);
      if (id === 'tx-001') return Promise.resolve(tx);
      return Promise.resolve(null);
    });
    mockDb.FinanceAccount.findByPk.mockImplementation((id: string) => {
      console.log('MOCK FINANCEACCOUNT.findByPk called with:', id);
      if (id === 'acct-001') return Promise.resolve(account);
      return Promise.resolve(null);
    });

    const req = createRequest('DELETE', { body: {}, query: { id: 'tx-001' } });
    const res = createResponse();
    await handler(req, res);
    console.log('Response status:', getResponseStatus(res));
    console.log('Response json:', JSON.stringify(getResponseJson(res)));
  });
});
