/**
 * Tests for POST /api/auth/register
 * Registration with tenant isolation, validation, duplicate detection
 */
import { createRequest, createResponse, getResponseJson, getResponseStatus, createDbMock, createMockInstance } from '../helpers/test-utils';

// ---- Mock models ----
// Paths: from tests/auth/ -> ../../models = project root models/
const mockDb = createDbMock();
jest.mock('../../models', () => mockDb, { virtual: true });

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$10$hashedpassword'),
  compare: jest.fn(),
}));

import handler from '../../pages/api/auth/register';

beforeEach(() => {
  // Clear call history but keep mock implementations
  jest.clearAllMocks();
  // Re-stock default mock return values (clearAllMocks preserves mockResolvedValueOnce chains)
  // We need to explicitly reset the mockResolvedValueOnce queues to prevent cross-test leakage
  jest.resetAllMocks();
  // Re-apply default behavior
  Object.values(mockDb).forEach((model: any) => {
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
    }
  });
});

describe('POST /api/auth/register', () => {
  async function callRegister(body: any) {
    const req = createRequest('POST', { body });
    const res = createResponse();
    await handler(req, res);
    return { status: getResponseStatus(res), json: getResponseJson(res) };
  }

  describe('validation', () => {
    it('returns 400 when name is missing', async () => {
      const { status, json } = await callRegister({ email: 'test@test.com', password: '123456' });
      expect(status).toBe(400);
      expect(json.message).toMatch(/nama/i);
    });

    it('returns 400 when email is missing', async () => {
      const { status, json } = await callRegister({ name: 'Test', password: '123456' });
      expect(status).toBe(400);
      expect(json.message).toMatch(/email/i);
    });

    it('returns 400 when password is missing', async () => {
      const { status, json } = await callRegister({ name: 'Test', email: 'test@test.com' });
      expect(status).toBe(400);
      expect(json.message).toMatch(/password/i);
    });

    it('returns 400 when password is too short (< 6 chars)', async () => {
      const { status, json } = await callRegister({ name: 'Test', email: 'test@test.com', password: '12345' });
      expect(status).toBe(400);
      expect(json.message).toMatch(/minimal 6 karakter/i);
    });

    it('returns 405 for non-POST methods', async () => {
      const req = createRequest('GET');
      const res = createResponse();
      await handler(req, res);
      expect(getResponseStatus(res)).toBe(405);
    });
  });

  describe('duplicate detection', () => {
    it('returns 400 when email already exists', async () => {
      mockDb.User.findOne.mockResolvedValueOnce(
        createMockInstance({ id: 1, email: 'existing@test.com' })
      );

      const { status, json } = await callRegister({
        name: 'Test', email: 'existing@test.com', password: '123456',
      });

      expect(status).toBe(400);
      expect(json.message).toMatch(/sudah terdaftar/i);
    });
  });

  describe('successful registration', () => {
    it('creates tenant with trial status', async () => {
      mockDb.User.findOne.mockResolvedValueOnce(null);
      mockDb.BusinessType.findOne.mockResolvedValueOnce(null);
      mockDb.Tenant.create.mockResolvedValueOnce(
        createMockInstance({ id: 'tenant-001', businessName: 'Warung Test', status: 'trial', kybStatus: 'pending_kyb', setupCompleted: false })
      );
      mockDb.User.create.mockResolvedValueOnce(createMockInstance({ id: 1 }));
      mockDb.KybApplication.create.mockResolvedValueOnce(createMockInstance({ id: 'kyb-001' }));

      const { status, json } = await callRegister({
        name: 'Budi', email: 'budi@warung.com', businessName: 'Warung Test', password: 'rahasia123',
      });

      expect(status).toBe(201);
      expect(json.message).toMatch(/berhasil/i);
      expect(json.user).toBeDefined();
      expect(json.tenantId).toBe('tenant-001');
      expect(mockDb.Tenant.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'trial', kybStatus: 'pending_kyb' }));
    });

    it('creates user with owner role linked to the new tenant', async () => {
      mockDb.User.findOne.mockResolvedValueOnce(null);
      mockDb.BusinessType.findOne.mockResolvedValueOnce(null);
      mockDb.Tenant.create.mockResolvedValueOnce(createMockInstance({ id: 'tenant-002' }));
      mockDb.KybApplication.create.mockResolvedValueOnce(createMockInstance());

      let capturedData: any;
      mockDb.User.create.mockImplementationOnce((data: any) => {
        capturedData = data;
        return Promise.resolve(createMockInstance({ id: 2, ...data }));
      });

      await callRegister({ name: 'Siti', email: 'siti@toko.com', password: 'pass123456' });

      expect(capturedData.role).toBe('owner');
      expect(capturedData.tenantId).toBe('tenant-002');
      expect(capturedData.isActive).toBe(true);
    });

    it('excludes password from response', async () => {
      mockDb.User.findOne.mockResolvedValueOnce(null);
      mockDb.BusinessType.findOne.mockResolvedValueOnce(null);
      mockDb.Tenant.create.mockResolvedValueOnce(createMockInstance({ id: 'tenant-003' }));
      mockDb.KybApplication.create.mockResolvedValueOnce(createMockInstance());

      const mockUser = createMockInstance({ id: 3, name: 'Test', email: 'test@test.com', role: 'owner' });
      mockUser.toJSON = () => ({ id: 3, name: 'Test', email: 'test@test.com', role: 'owner' });
      mockDb.User.create.mockResolvedValueOnce(mockUser);

      const { json } = await callRegister({ name: 'Test', email: 'test@test.com', password: 'rahasia' });
      expect(json.user.password).toBeUndefined();
    });

    it('links business type when provided', async () => {
      mockDb.User.findOne.mockResolvedValueOnce(null);
      mockDb.BusinessType.findOne.mockResolvedValueOnce(createMockInstance({ id: 'bt-retail' }));
      mockDb.Tenant.create.mockResolvedValueOnce(createMockInstance({ id: 'tenant-004' }));
      mockDb.User.create.mockResolvedValueOnce(createMockInstance({ id: 4 }));
      mockDb.KybApplication.create.mockResolvedValueOnce(createMockInstance());

      await callRegister({ name: 'Test', email: 'test2@test.com', businessType: 'retail', password: 'pass123456' });

      expect(mockDb.Tenant.create).toHaveBeenCalledWith(expect.objectContaining({ businessTypeId: 'bt-retail' }));
    });

    it('creates KYB application in draft status', async () => {
      mockDb.User.findOne.mockResolvedValueOnce(null);
      mockDb.BusinessType.findOne.mockResolvedValueOnce(null);
      mockDb.Tenant.create.mockResolvedValueOnce(createMockInstance({ id: 'tenant-005' }));
      mockDb.User.create.mockResolvedValueOnce(createMockInstance({ id: 5 }));

      let capturedKyb: any;
      mockDb.KybApplication.create.mockImplementationOnce((data: any) => {
        capturedKyb = data;
        return Promise.resolve(createMockInstance(data));
      });

      await callRegister({ name: 'Test', email: 'test3@test.com', password: 'pass123456' });

      expect(capturedKyb.status).toBe('draft');
      expect(capturedKyb.tenantId).toBe('tenant-005');
      expect(capturedKyb.currentStep).toBe(1);
    });
  });

  describe('error handling', () => {
    it('returns 500 on unexpected database errors', async () => {
      mockDb.User.findOne.mockRejectedValueOnce(new Error('DB connection lost'));

      const { status, json } = await callRegister({
        name: 'Test', email: 'test@test.com', password: '123456',
      });

      expect(status).toBe(500);
      expect(json.message).toBeDefined();
    });
  });
});
