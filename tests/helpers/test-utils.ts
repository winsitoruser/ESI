import httpMocks from 'node-mocks-http';
import { NextApiRequest, NextApiResponse } from 'next';

// =====================
// Mock model factories
// =====================

/** Create a mock Sequelize model instance with jest.fn() methods */
export function createMockModel(methods: Record<string, any> = {}) {
  return {
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findByPk: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'mock-id', toJSON: () => ({}) }),
    update: jest.fn().mockResolvedValue([1]),
    destroy: jest.fn().mockResolvedValue(1),
    findOrCreate: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    sum: jest.fn().mockResolvedValue(0),
    upsert: jest.fn(),
    findAllWithPagination: jest.fn(),
    ...methods,
  };
}

/** Create a mock model instance (row) with toJSON() */
export function createMockInstance(data: Record<string, any> = {}) {
  return {
    id: data.id || 'mock-uuid',
    toJSON: () => ({ ...data }),
    update: jest.fn().mockResolvedValue({ ...data, ...data.update }),
    destroy: jest.fn().mockResolvedValue(true),
    save: jest.fn().mockResolvedValue(true),
    reload: jest.fn(),
    get: (key: string) => data[key],
    ...data,
  };
}

/** Create the full db mock (models/index.js shape) */
export function createDbMock() {
  const modelMethods = {
    User: createMockModel(),
    Tenant: createMockModel(),
    Branch: createMockModel(),
    KybApplication: createMockModel(),
    KybDocument: createMockModel(),
    Invoice: createMockModel(),
    InvoiceItem: createMockModel(),
    PaymentTransaction: createMockModel(),
    Plan: createMockModel(),
    PlanLimit: createMockModel(),
    Subscription: createMockModel(),
    BillingCycle: createMockModel(),
    UsageMetric: createMockModel(),
    PaymentMethod: createMockModel(),
    BusinessType: createMockModel(),
    AuditLog: createMockModel(),
    FinanceTransaction: createMockModel(),
    FinanceAccount: createMockModel(),
    FinanceBudget: createMockModel(),
    FinanceInvoice: createMockModel(),
    FinanceInvoiceItem: createMockModel(),
    FinanceInvoicePayment: createMockModel(),
    FinancePayable: createMockModel(),
    FinancePayablePayment: createMockModel(),
    FinanceReceivable: createMockModel(),
    FinanceReceivablePayment: createMockModel(),
  };

  return {
    ...modelMethods,
    Sequelize: {
      Op: {
        like: Symbol('like'), between: Symbol('between'), gte: Symbol('gte'),
        lte: Symbol('lte'), or: Symbol('or'), and: Symbol('and'), in: Symbol('in'), ne: Symbol('ne'),
      },
      col: jest.fn((col: string) => col) as any,
      fn: jest.fn((fn: string, ...args: any[]) => `${fn}(${args.join(',')})`) as any,
      literal: jest.fn((val: string) => val) as any,
      where: jest.fn() as any,
      cast: jest.fn() as any,
    },
    sequelize: {
      query: jest.fn(),
      transaction: jest.fn(),
      define: jest.fn(),
      sync: jest.fn(),
      authenticate: jest.fn(),
    },
  };
}

// =====================
// Session mocks
// =====================

export interface MockSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
    branchId: string | null;
    branchName: string | null;
    branchCode: string | null;
    tenantName: string | null;
    assignedBranchId: string | null;
    kybStatus: string | null;
    dataScope: string;
    businessCode: string | null;
    businessStructure: string;
    setupCompleted: boolean;
  };
}

export function createMockSession(overrides: Partial<MockSession['user']> = {}): MockSession {
  return {
    user: {
      id: 'user-001',
      email: 'owner@test.com',
      name: 'Test Owner',
      role: 'owner',
      tenantId: 'tenant-001',
      branchId: 'branch-001',
      branchName: 'Cabang Utama',
      branchCode: 'CU-001',
      tenantName: 'Bisnis Test',
      assignedBranchId: 'branch-001',
      kybStatus: 'approved',
      dataScope: 'own_branch',
      businessCode: 'TEST-001',
      businessStructure: 'single',
      setupCompleted: true,
      ...overrides,
    },
  };
}

export const SESSION_ROLES = {
  superAdmin: { role: 'super_admin', tenantId: null },
  owner: { role: 'owner' },
  manager: { role: 'manager' },
  cashier: { role: 'cashier' },
  staff: { role: 'staff' },
} as const;

// =====================
// HTTP helpers
// =====================

export function createRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET',
  options: {
    body?: any;
    query?: any;
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
  } = {}
): NextApiRequest {
  return httpMocks.createRequest({
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: options.body,
    query: options.query || {},
    cookies: options.cookies || {},
  }) as unknown as NextApiRequest;
}

export function createResponse(): NextApiResponse {
  return httpMocks.createResponse() as unknown as NextApiResponse;
}

/** Reset all model mocks to their default behavior */
export function resetDbMocks(db: Record<string, any>) {
  Object.values(db).forEach((model: any) => {
    if (model && typeof model === 'object') {
      if (model.findAll) model.findAll.mockResolvedValue([]);
      if (model.findOne) model.findOne.mockResolvedValue(null);
      if (model.findByPk) model.findByPk.mockResolvedValue(null);
      if (model.create) {
        model.create.mockImplementation((data: any) =>
          Promise.resolve(createMockInstance({ id: 'mock-id', ...data }))
        );
      }
      if (model.update) model.update.mockResolvedValue([1]);
      if (model.destroy) model.destroy.mockResolvedValue(1);
      if (model.count) model.count.mockResolvedValue(0);
      if (model.sum) model.sum.mockResolvedValue(0);
    }
  });
}

/** Parse JSON body from response */
export function getResponseJson(res: NextApiResponse): any {
  const data = res._getData();
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
  return data;
}

/** Get response status code */
export function getResponseStatus(res: NextApiResponse): number {
  return res._getStatusCode();
}
