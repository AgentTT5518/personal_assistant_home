import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const mockLogWarn = vi.fn();

vi.mock('../../lib/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: mockLogWarn,
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

function createMockReq(ip: string, pathValue: string): Request {
  return { ip, path: pathValue } as unknown as Request;
}

function createMockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('rate-limiter', () => {
  let createRateLimiter: typeof import('./rate-limiter.js')['createRateLimiter'];
  let aiRateLimiter: typeof import('./rate-limiter.js')['aiRateLimiter'];

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset modules to clear the internal store Map between tests
    vi.resetModules();
    const mod = await import('./rate-limiter.js');
    createRateLimiter = mod.createRateLimiter;
    aiRateLimiter = mod.aiRateLimiter;
  });

  it('allows the first request through and calls next', () => {
    const limiter = createRateLimiter(5, 60_000);
    const req = createMockReq('192.168.1.1', '/api/test');
    const res = createMockRes();
    const next = vi.fn();

    limiter(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows requests under the limit', () => {
    const limiter = createRateLimiter(3, 60_000);
    const req = createMockReq('10.0.0.1', '/api/data');
    const res = createMockRes();
    const next = vi.fn();

    limiter(req, res, next);
    limiter(req, res, next);
    limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(3);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks requests over the limit with 429 status', () => {
    const limiter = createRateLimiter(2, 60_000);
    const req = createMockReq('10.0.0.2', '/api/limited');
    const res = createMockRes();
    const next = vi.fn();

    limiter(req, res, next); // count 1
    limiter(req, res, next); // count 2

    // Third request should be blocked
    limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    });
  });

  it('logs a warning when rate limit is exceeded', () => {
    const limiter = createRateLimiter(1, 60_000);
    const req = createMockReq('10.0.0.3', '/api/warn');
    const res = createMockRes();
    const next = vi.fn();

    limiter(req, res, next); // count 1
    limiter(req, res, next); // blocked

    expect(mockLogWarn).toHaveBeenCalledWith('Rate limit exceeded', {
      ip: '10.0.0.3',
      path: '/api/warn',
      count: 1,
    });
  });

  it('resets counter after window expires', () => {
    vi.useFakeTimers();

    const windowMs = 1000;
    const limiter = createRateLimiter(1, windowMs);
    const req = createMockReq('10.0.0.4', '/api/reset');
    const res = createMockRes();
    const next = vi.fn();

    limiter(req, res, next); // count 1

    // Advance past the window
    vi.advanceTimersByTime(windowMs + 1);

    limiter(req, res, next); // should be allowed (window reset)

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('uses correct key format (ip-path)', () => {
    const limiter = createRateLimiter(1, 60_000);
    const next = vi.fn();

    // Same IP, different paths should be tracked separately
    const req1 = createMockReq('10.0.0.5', '/api/a');
    const req2 = createMockReq('10.0.0.5', '/api/b');
    const res = createMockRes();

    limiter(req1, res, next);
    limiter(req2, res, next);

    // Both should pass since they have different keys
    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('tracks different IPs separately for the same path', () => {
    const limiter = createRateLimiter(1, 60_000);
    const next = vi.fn();
    const res = createMockRes();

    const req1 = createMockReq('10.0.0.6', '/api/shared');
    const req2 = createMockReq('10.0.0.7', '/api/shared');

    limiter(req1, res, next);
    limiter(req2, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('aiRateLimiter is exported and is a function', () => {
    expect(aiRateLimiter).toBeDefined();
    expect(typeof aiRateLimiter).toBe('function');
  });
});
