/**
 * Unit tests for Tenant Isolation middleware
 * Pure utility functions — no DB required, test logic only.
 */
import { createRequest, createResponse } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getTenantContext,
  tenantQuery,
  buildTenantFilter,
  buildTenantWhere,
  requireTenantAccess,
} from '@/lib/middleware/tenantIsolation';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------
function mockReq(session: Record<string, any> = {}): NextApiRequest {
  return createRequest({
    session,
  }) as unknown as NextApiRequest;
}

function mockRes() {
  return createResponse<NextApiResponse>();
}

// ---------------------------------------------------------------------------
// getTenantContext
// ---------------------------------------------------------------------------
describe('getTenantContext', () => {
  it('extracts tenantId, userId, userName, userRole, dataScope from session', () => {
    const req = mockReq({
      user: {
        id: 42,
        tenantId: 't_abc',
        name: 'Alice',
        email: 'alice@example.com',
        role: 'Manager',
        dataScope: 'all',
      },
    });

    const ctx = getTenantContext(req);

    expect(ctx).toEqual({
      tenantId: 't_abc',
      userId: 42,
      userName: 'Alice',
      userRole: 'manager',
      dataScope: 'all',
    });
  });

  it('falls back to email when name is missing', () => {
    const req = mockReq({
      user: { email: 'bob@example.com', role: 'cashier' },
    });

    const ctx = getTenantContext(req);
    expect(ctx.userName).toBe('bob@example.com');
  });

  it('returns null tenantId when session has no tenantId', () => {
    const req = mockReq({ user: { role: 'admin' } });
    const ctx = getTenantContext(req);
    expect(ctx.tenantId).toBeNull();
  });

  it('returns defaults when session is missing entirely', () => {
    const req = mockReq(); // no session
    const ctx = getTenantContext(req);
    expect(ctx).toEqual({
      tenantId: null,
      userId: null,
      userName: 'Unknown',
      userRole: '',
      dataScope: 'own_branch',
    });
  });
});

// ---------------------------------------------------------------------------
// tenantQuery
// ---------------------------------------------------------------------------
describe('tenantQuery', () => {
  it('passes query and merged replacements to sequelize', async () => {
    const sequelize = { query: jest.fn().mockResolvedValue([['row1']]) };

    const result = await tenantQuery(
      sequelize,
      't_xyz',
      'SELECT * FROM products WHERE is_active = true',
      { extra: 'val' },
    );

    expect(sequelize.query).toHaveBeenCalledTimes(1);
    expect(sequelize.query).toHaveBeenCalledWith(
      'SELECT * FROM products WHERE is_active = true',
      { replacements: { extra: 'val', _tenantId: 't_xyz' } },
    );
    expect(result).toEqual([['row1']]);
  });

  it('works without extra replacements', async () => {
    const sequelize = { query: jest.fn().mockResolvedValue([]) };

    await tenantQuery(sequelize, 99, 'SELECT 1');

    expect(sequelize.query).toHaveBeenCalledWith('SELECT 1', {
      replacements: { _tenantId: 99 },
    });
  });

  it('forwards additional options (e.g. transaction)', async () => {
    const sequelize = { query: jest.fn().mockResolvedValue([]) };
    const txn = { id: 'txn_1' };

    await tenantQuery(sequelize, 't1', 'SELECT 1', undefined, {
      transaction: txn,
      type: 'SELECT',
    });

    expect(sequelize.query).toHaveBeenCalledWith('SELECT 1', {
      replacements: { _tenantId: 't1' },
      transaction: txn,
      type: 'SELECT',
    });
  });

  it('overrides _tenantId if caller provides it in replacements', async () => {
    const sequelize = { query: jest.fn().mockResolvedValue([]) };

    await tenantQuery(sequelize, 'correct_tenant', 'SELECT 1', {
      _tenantId: 'wrong_tenant',
    });

    // Caller's _tenantId is overwritten by the injected one
    expect(sequelize.query).toHaveBeenCalledWith('SELECT 1', {
      replacements: { _tenantId: 'correct_tenant' },
    });
  });
});

// ---------------------------------------------------------------------------
// buildTenantFilter
// ---------------------------------------------------------------------------
describe('buildTenantFilter', () => {
  it('returns AND clause with tenant_id', () => {
    const result = buildTenantFilter('t1');
    expect(result.condition).toBe(' AND tenant_id = :_tenantId');
    expect(result.replacements).toEqual({ _tenantId: 't1' });
  });

  it('includes table alias when provided', () => {
    const result = buildTenantFilter('t1', 'p');
    expect(result.condition).toBe(' AND p.tenant_id = :_tenantId');
  });

  it('returns empty string when tenantId is null', () => {
    const result = buildTenantFilter(null);
    expect(result.condition).toBe('');
    expect(result.replacements).toEqual({});
  });

  it('returns empty string when tenantId is undefined', () => {
    const result = buildTenantFilter(undefined as any);
    expect(result.condition).toBe('');
  });
});

// ---------------------------------------------------------------------------
// buildTenantWhere
// ---------------------------------------------------------------------------
describe('buildTenantWhere', () => {
  it('returns full WHERE clause', () => {
    const result = buildTenantWhere('t1');
    expect(result.where).toBe('WHERE tenant_id = :_tenantId');
    expect(result.replacements).toEqual({ _tenantId: 't1' });
  });

  it('includes table alias when provided', () => {
    const result = buildTenantWhere('t1', 'fi');
    expect(result.where).toBe('WHERE fi.tenant_id = :_tenantId');
  });

  it('returns WHERE 1=1 as no-op when tenantId is null', () => {
    const result = buildTenantWhere(null);
    expect(result.where).toBe('WHERE 1=1');
    expect(result.replacements).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// requireTenantAccess
// ---------------------------------------------------------------------------
describe('requireTenantAccess', () => {
  it('returns context when user has tenantId (non-super_admin)', () => {
    const req = mockReq({
      user: { tenantId: 't_1', id: 1, role: 'admin' },
    });
    const res = mockRes();

    const ctx = requireTenantAccess(req, res);

    expect(ctx).not.toBeNull();
    expect(ctx!.tenantId).toBe('t_1');
    expect(res._getStatusCode()).toBe(200); // no error sent
  });

  it('returns 403 when user has no tenantId (non-super_admin)', () => {
    const req = mockReq({
      user: { id: 1, role: 'admin' },
    });
    const res = mockRes();

    const ctx = requireTenantAccess(req, res);

    expect(ctx).toBeNull();
    expect(res._getStatusCode()).toBe(403);
    const data = res._getJSONData();
    expect(data).toMatchObject({
      success: false,
      error: 'NO_TENANT',
    });
  });

  it('bypasses tenant check for super_admin', () => {
    const req = mockReq({
      user: { role: 'super_admin', tenantId: null },
    });
    const res = mockRes();

    const ctx = requireTenantAccess(req, res);

    expect(ctx).not.toBeNull();
    expect(ctx!.tenantId).toBeNull(); // super_admin gets through regardless
    expect(res._getStatusCode()).toBe(200);
  });
});
