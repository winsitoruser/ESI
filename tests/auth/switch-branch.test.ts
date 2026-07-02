/**
 * Tests for POST /api/auth/switch-branch
 * Branch switching with access control, audit logging
 */
import {
  createRequest, createResponse, getResponseJson, getResponseStatus,
  createDbMock, createMockInstance, resetDbMocks, createMockSession,
} from '../helpers/test-utils';

// Mock next-auth FIRST (before any imports from source)
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    handlers: {},
    auth: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  }),
}));

// Mock models — switch-branch.ts uses require('@/models')
const mockDb = createDbMock();
jest.mock('@/models', () => mockDb, { virtual: true });

// Also mock relative path for safety
jest.mock('../../models', () => mockDb, { virtual: true });

// Mock next-auth/next
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

// Mock branchFilter
jest.mock('../../lib/branchFilter', () => ({
  canAccessBranch: jest.fn(),
}));

import handler from '../../pages/api/auth/switch-branch';
import { getServerSession } from 'next-auth/next';
import { canAccessBranch } from '../../lib/branchFilter';

const SESSION_OWNER = createMockSession({ role: 'owner', branchId: 'branch-001' });

beforeEach(() => {
  jest.resetAllMocks();
  resetDbMocks(mockDb);
  jest.mocked(getServerSession).mockResolvedValue(SESSION_OWNER);
});

describe('POST /api/auth/switch-branch', () => {
  async function callSwitchBranch(branchId: string, sessionOverride?: any) {
    if (sessionOverride) {
      jest.mocked(getServerSession).mockResolvedValue(sessionOverride);
    }
    const req = createRequest('POST', { body: { branchId } });
    const res = createResponse();
    await handler(req, res);
    return { status: getResponseStatus(res), json: getResponseJson(res) };
  }

  describe('method validation', () => {
    it('returns 405 for non-POST methods', async () => {
      const req = createRequest('GET');
      const res = createResponse();
      await handler(req, res);
      expect(getResponseStatus(res)).toBe(405);
    });
  });

  describe('authentication', () => {
    it('returns 401 when not authenticated', async () => {
      jest.mocked(getServerSession).mockResolvedValue(null);

      const { status, json } = await callSwitchBranch('branch-002');
      expect(status).toBe(401);
      expect(json.error).toMatch(/unauthorized/i);
    });
  });

  describe('input validation', () => {
    it('returns 400 when branchId is missing', async () => {
      const req = createRequest('POST', { body: {} });
      const res = createResponse();
      await handler(req, res);
      expect(getResponseStatus(res)).toBe(400);
    });
  });

  describe('branch access control', () => {
    it('returns 403 when user cannot access the branch', async () => {
      jest.mocked(canAccessBranch).mockResolvedValue(false);

      const { status, json } = await callSwitchBranch('branch-999');
      expect(status).toBe(403);
      expect(json.error).toMatch(/access denied/i);
    });

    it('returns 404 when branch does not exist', async () => {
      jest.mocked(canAccessBranch).mockResolvedValue(true);
      mockDb.Branch.findByPk.mockResolvedValueOnce(null);

      const { status, json } = await callSwitchBranch('branch-999');
      expect(status).toBe(404);
      expect(json.error).toMatch(/branch not found/i);
    });

    it('returns 400 when branch is not active', async () => {
      jest.mocked(canAccessBranch).mockResolvedValue(true);
      mockDb.Branch.findByPk.mockResolvedValueOnce(
        createMockInstance({ id: 'branch-inactive', name: 'Cabang Nonaktif', isActive: false })
      );

      const { status, json } = await callSwitchBranch('branch-inactive');
      expect(status).toBe(400);
      expect(json.error).toMatch(/not active/i);
    });
  });

  describe('successful switch', () => {
    it('returns 200 with branch details when switching succeeds', async () => {
      jest.mocked(canAccessBranch).mockResolvedValue(true);
      const branchData = { id: 'branch-002', name: 'Cabang Dua', code: 'CD-002', isActive: true };
      mockDb.Branch.findByPk.mockResolvedValueOnce(createMockInstance(branchData));
      mockDb.User.update.mockResolvedValueOnce([1]);
      mockDb.AuditLog.create.mockResolvedValueOnce(createMockInstance({ id: 'log-001' }));

      const { status, json } = await callSwitchBranch('branch-002');

      expect(status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.branchId).toBe('branch-002');
      expect(json.data.branchName).toBe('Cabang Dua');
      expect(json.data.branchCode).toBe('CD-002');
    });

    it('updates assignedBranchId for super_admin and admin roles', async () => {
      jest.mocked(canAccessBranch).mockResolvedValue(true);
      const branchData = { id: 'branch-005', name: 'Cabang Lima', isActive: true };
      mockDb.Branch.findByPk.mockResolvedValueOnce(createMockInstance(branchData));
      mockDb.User.update.mockResolvedValueOnce([1]);
      mockDb.AuditLog.create.mockResolvedValueOnce(createMockInstance());

      await callSwitchBranch('branch-005', createMockSession({ role: 'super_admin' }));

      expect(mockDb.User.update).toHaveBeenCalledWith(
        { assignedBranchId: 'branch-005' },
        { where: { id: 'user-001' } }
      );
    });

    it('skips user update for non-admin roles (owner, manager, cashier)', async () => {
      jest.mocked(canAccessBranch).mockResolvedValue(true);
      const branchData = { id: 'branch-003', name: 'Cabang Tiga', isActive: true };
      mockDb.Branch.findByPk.mockResolvedValueOnce(createMockInstance(branchData));
      mockDb.AuditLog.create.mockResolvedValueOnce(createMockInstance());

      await callSwitchBranch('branch-003', createMockSession({ role: 'owner' }));

      // User.update should NOT be called for owner role
      expect(mockDb.User.update).not.toHaveBeenCalled();
    });
  });

  describe('audit logging', () => {
    it('creates audit log entry on switch', async () => {
      jest.mocked(canAccessBranch).mockResolvedValue(true);
      const branchData = { id: 'branch-004', name: 'Cabang Empat', code: 'CE-004', isActive: true };
      mockDb.Branch.findByPk.mockResolvedValueOnce(createMockInstance(branchData));
      mockDb.AuditLog.create.mockResolvedValueOnce(createMockInstance());

      await callSwitchBranch('branch-004');

      expect(mockDb.AuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-001',
          action: 'SWITCH_BRANCH',
          entityType: 'BRANCH',
          entityId: 'branch-004',
        })
      );
    });
  });

  describe('error handling', () => {
    it('returns 500 on unexpected errors', async () => {
      jest.mocked(canAccessBranch).mockRejectedValue(new Error('Unexpected error'));

      const { status } = await callSwitchBranch('branch-001');
      expect(status).toBe(500);
    });
  });
});
