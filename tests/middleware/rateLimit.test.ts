/**
 * Unit tests for Rate Limiter middleware.
 * In-memory sliding window — tests control time via Date.now() mocking.
 * Each test uses jest.resetModules() + fresh require() for store isolation.
 */
import { createRequest, createResponse } from 'node-mocks-http';
import type { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';

// Capture real Date.now BEFORE any mock
const _realDateNow = Date.now.bind(Date);

// ---------------------------------------------------------------------------
// Helper: fresh module + patched Date.now
// ---------------------------------------------------------------------------
interface RateLimitModule {
  withRateLimit: (
    handler: NextApiHandler,
    config?: any,
  ) => NextApiHandler;
  checkLimit: (
    req: NextApiRequest,
    res: NextApiResponse,
    config?: any,
  ) => boolean;
  RateLimitTier: Record<string, { windowMs: number; maxRequests: number }>;
}

/** Load a fresh module (resets the internal store) */
function freshModule(): RateLimitModule {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('@/lib/middleware/rateLimit');
}

/** Create a date spy that returns a clamped value (no self-recursion) */
function mockNow(now: number): jest.SpyInstance {
  return jest.spyOn(Date, 'now').mockImplementation(() => now);
}

// ---------------------------------------------------------------------------
// Helpers: req + res
// ---------------------------------------------------------------------------
function mockReq(
  ip = '127.0.0.1',
  path = '/api/test',
): NextApiRequest {
  return createRequest({
    headers: { 'x-forwarded-for': ip },
    url: path,
    socket: { remoteAddress: ip },
  }) as unknown as NextApiRequest;
}

function mockRes() {
  return createResponse<NextApiResponse>();
}

const passthrough: NextApiHandler = async (_req, res) => {
  res.status(200).json({ success: true });
};

// =========================================================================
// RateLimitTier constants
// =========================================================================
describe('RateLimitTier', () => {
  it('STANDARD = 100 req/min', () => {
    const rl = freshModule();
    expect(rl.RateLimitTier.STANDARD).toEqual({
      windowMs: 60000,
      maxRequests: 100,
    });
  });

  it('SENSITIVE = 30 req/min', () => {
    const rl = freshModule();
    expect(rl.RateLimitTier.SENSITIVE).toEqual({
      windowMs: 60000,
      maxRequests: 30,
    });
  });

  it('AUTH = 10 req/min', () => {
    const rl = freshModule();
    expect(rl.RateLimitTier.AUTH).toEqual({
      windowMs: 60000,
      maxRequests: 10,
    });
  });

  it('HEAVY = 5 req/min', () => {
    const rl = freshModule();
    expect(rl.RateLimitTier.HEAVY).toEqual({
      windowMs: 60000,
      maxRequests: 5,
    });
  });

  it('WEBHOOK = 200 req/min', () => {
    const rl = freshModule();
    expect(rl.RateLimitTier.WEBHOOK).toEqual({
      windowMs: 60000,
      maxRequests: 200,
    });
  });
});

// =========================================================================
// withRateLimit — basic behaviour
// =========================================================================
describe('withRateLimit — basic', () => {
  it('passes through when under limit', async () => {
    const rl = freshModule();
    const spy = mockNow(_realDateNow());
    const handler = rl.withRateLimit(passthrough, rl.RateLimitTier.STANDARD);
    const res = mockRes();
    await handler(mockReq(), res);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ success: true });
    spy.mockRestore();
  });

  it('sets X-RateLimit headers with correct remaining count', async () => {
    const rl = freshModule();
    const spy = mockNow(_realDateNow());
    const handler = rl.withRateLimit(passthrough, rl.RateLimitTier.STANDARD);
    const res = mockRes();
    await handler(mockReq(), res);
    expect(res._getHeaders()).toMatchObject({
      'x-ratelimit-limit': 100,
      'x-ratelimit-remaining': 99,
      'x-ratelimit-reset': expect.any(Number),
    });
    spy.mockRestore();
  });

  it('returns 429 when limit is exceeded', async () => {
    const rl = freshModule();
    const now = _realDateNow();
    const spy = mockNow(now);
    const handler = rl.withRateLimit(passthrough, {
      windowMs: 60000,
      maxRequests: 2,
    });
    const req = mockReq();

    // 1st — pass
    let res = mockRes();
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);

    // 2nd — pass (last allowed)
    res = mockRes();
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);

    // 3rd — blocked
    res = mockRes();
    await handler(req, res);
    expect(res._getStatusCode()).toBe(429);
    expect(res._getJSONData()).toMatchObject({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
    });
    expect(res._getHeaders()['retry-after']).toBeDefined();
    spy.mockRestore();
  });

  it('resets the window after windowMs has elapsed', async () => {
    const rl = freshModule();
    const now = _realDateNow();
    const spy = mockNow(now);
    const handler = rl.withRateLimit(passthrough, {
      windowMs: 60000,
      maxRequests: 2,
    });
    const req = mockReq();

    // Use both allowed requests
    await handler(req, mockRes());
    await handler(req, mockRes());

    // 3rd — blocked
    let res = mockRes();
    await handler(req, res);
    expect(res._getStatusCode()).toBe(429);

    // Advance time past the window
    mockNow(now + 60001);

    // 4th — allowed again (new window)
    res = mockRes();
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    spy.mockRestore();
  });

  it('uses custom message when provided', async () => {
    const rl = freshModule();
    const now = _realDateNow();
    const spy = mockNow(now);
    const handler = rl.withRateLimit(passthrough, {
      windowMs: 60000,
      maxRequests: 1,
      message: 'Custom rate limit message',
    });
    const req = mockReq();

    // 1st request — allowed (window created)
    await handler(req, mockRes());

    // 2nd request — blocked with custom message
    const res = mockRes();
    await handler(req, res);
    expect(res._getStatusCode()).toBe(429);
    expect(res._getJSONData().message).toBe('Custom rate limit message');
    spy.mockRestore();
  });

  it('uses custom key generator when provided', async () => {
    const rl = freshModule();
    const spy = mockNow(_realDateNow());
    const customKeyGen = jest.fn().mockReturnValue('custom-key');
    const handler = rl.withRateLimit(passthrough, {
      windowMs: 60000,
      maxRequests: 1,
      keyGenerator: customKeyGen,
    });
    const req = mockReq();

    // 1st request — pass
    await handler(req, mockRes());
    expect(customKeyGen).toHaveBeenCalledTimes(1);

    // 2nd request with same custom key — blocked
    const res = mockRes();
    await handler(req, res);
    expect(res._getStatusCode()).toBe(429);
    spy.mockRestore();
  });
});

// =========================================================================
// withRateLimit — different tiers
// =========================================================================
describe('withRateLimit — different tiers', () => {
  it('AUTH tier blocks at 11th request', async () => {
    const rl = freshModule();
    const now = _realDateNow();
    const spy = mockNow(now);
    const handler = rl.withRateLimit(passthrough, rl.RateLimitTier.AUTH);
    const req = mockReq();

    for (let i = 0; i < 10; i++) {
      const res = mockRes();
      await handler(req, res);
      expect(res._getStatusCode()).toBe(200);
    }

    // 11th — blocked
    const res = mockRes();
    await handler(req, res);
    expect(res._getStatusCode()).toBe(429);
    spy.mockRestore();
  });

  it('HEAVY tier blocks at 6th request', async () => {
    const rl = freshModule();
    const now = _realDateNow();
    const spy = mockNow(now);
    const handler = rl.withRateLimit(passthrough, rl.RateLimitTier.HEAVY);
    const req = mockReq();

    for (let i = 0; i < 5; i++) {
      await handler(req, mockRes());
    }

    const res = mockRes();
    await handler(req, res);
    expect(res._getStatusCode()).toBe(429);
    spy.mockRestore();
  });

  it('different IP keys have independent counters', async () => {
    const rl = freshModule();
    const now = _realDateNow();
    const spy = mockNow(now);
    const handler = rl.withRateLimit(passthrough, {
      windowMs: 60000,
      maxRequests: 1,
    });

    // User A (IP 10.0.0.1)
    let res = mockRes();
    await handler(mockReq('10.0.0.1'), res);
    expect(res._getStatusCode()).toBe(200);

    // User B (IP 10.0.0.2) — independent counter
    res = mockRes();
    await handler(mockReq('10.0.0.2'), res);
    expect(res._getStatusCode()).toBe(200);

    // User A again — blocked (already used his 1)
    res = mockRes();
    await handler(mockReq('10.0.0.1'), res);
    expect(res._getStatusCode()).toBe(429);

    // User B again — blocked too
    res = mockRes();
    await handler(mockReq('10.0.0.2'), res);
    expect(res._getStatusCode()).toBe(429);
    spy.mockRestore();
  });

  it('different endpoint paths have independent counters', async () => {
    const rl = freshModule();
    const now = _realDateNow();
    const spy = mockNow(now);
    const handler = rl.withRateLimit(passthrough, {
      windowMs: 60000,
      maxRequests: 1,
    });

    // /api/alpha — pass
    let res = mockRes();
    await handler(mockReq('10.0.0.1', '/api/alpha'), res);
    expect(res._getStatusCode()).toBe(200);

    // /api/beta — still pass (different path = different key)
    res = mockRes();
    await handler(mockReq('10.0.0.1', '/api/beta'), res);
    expect(res._getStatusCode()).toBe(200);

    // /api/alpha again — blocked
    res = mockRes();
    await handler(mockReq('10.0.0.1', '/api/alpha'), res);
    expect(res._getStatusCode()).toBe(429);
    spy.mockRestore();
  });
});

// =========================================================================
// checkLimit — standalone
// =========================================================================
describe('checkLimit — standalone', () => {
  it('returns true when under limit and sets headers', () => {
    const rl = freshModule();
    const now = _realDateNow();
    const spy = mockNow(now);
    const req = mockReq();
    const res = mockRes();

    const allowed = rl.checkLimit(req, res, {
      windowMs: 60000,
      maxRequests: 5,
    });

    expect(allowed).toBe(true);
    expect(res._getHeaders()['x-ratelimit-limit']).toBe(5);
    expect(res._getHeaders()['x-ratelimit-remaining']).toBe(4);
    spy.mockRestore();
  });

  it('returns false when over limit and sends 429', () => {
    const rl = freshModule();
    const now = _realDateNow();
    const spy = mockNow(now);
    const req = mockReq();
    const config = { windowMs: 60000, maxRequests: 1 };

    expect(rl.checkLimit(req, mockRes(), config)).toBe(true);
    expect(rl.checkLimit(req, mockRes(), config)).toBe(false);

    const res = mockRes();
    rl.checkLimit(req, res, config);
    expect(res._getStatusCode()).toBe(429);
    expect(res._getJSONData().error).toBe('RATE_LIMIT_EXCEEDED');
    spy.mockRestore();
  });

  it('uses custom message in 429 response', () => {
    const rl = freshModule();
    const now = _realDateNow();
    const spy = mockNow(now);
    const req = mockReq();
    const config = {
      windowMs: 60000,
      maxRequests: 1,
      message: 'Custom RL msg',
    };

    // 1st call — allowed (new window created)
    rl.checkLimit(req, mockRes(), config);

    // 2nd call — blocked with custom message
    const res = mockRes();
    rl.checkLimit(req, res, config);
    expect(res._getJSONData().message).toBe('Custom RL msg');
    spy.mockRestore();
  });

  it('sets Retry-After header on block', () => {
    const rl = freshModule();
    const now = _realDateNow();
    const spy = mockNow(now);
    const req = mockReq();
    const config = { windowMs: 60000, maxRequests: 1 };

    // 1st call — allowed
    rl.checkLimit(req, mockRes(), config);

    // 2nd call — blocked with Retry-After
    const res = mockRes();
    rl.checkLimit(req, res, config);
    expect(res._getHeaders()['retry-after']).toBeDefined();
    expect(typeof res._getHeaders()['retry-after']).toBe('number');
    spy.mockRestore();
  });
});
