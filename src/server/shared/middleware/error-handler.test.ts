import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const { mockLogWarn, mockLogError } = vi.hoisted(() => ({
  mockLogWarn: vi.fn(),
  mockLogError: vi.fn(),
}));

vi.mock('../../lib/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: mockLogWarn,
    error: mockLogError,
    debug: vi.fn(),
  }),
}));

import { AppError, errorHandler } from './error-handler.js';

function createMockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

const mockReq = {} as Request;
const mockNext = vi.fn() as NextFunction;

describe('AppError', () => {
  it('sets statusCode, code, message, and name correctly', () => {
    const err = new AppError(404, 'NOT_FOUND', 'Resource not found');

    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Resource not found');
    expect(err.name).toBe('AppError');
  });

  it('is an instance of Error', () => {
    const err = new AppError(400, 'BAD_REQUEST', 'Bad request');
    expect(err).toBeInstanceOf(Error);
  });

  it('is an instance of AppError', () => {
    const err = new AppError(400, 'BAD_REQUEST', 'Bad request');
    expect(err).toBeInstanceOf(AppError);
  });
});

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles AppError with correct status code and JSON body', () => {
    const res = createMockRes();
    const err = new AppError(422, 'VALIDATION_ERROR', 'Invalid input');

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid input' },
    });
  });

  it('handles generic Error with 500 status and generic message', () => {
    const res = createMockRes();
    const err = new Error('Something broke');

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
  });

  it('logs warn for AppError', () => {
    const res = createMockRes();
    const err = new AppError(400, 'BAD_REQUEST', 'Bad');

    errorHandler(err, mockReq, res, mockNext);

    expect(mockLogWarn).toHaveBeenCalledWith('Application error', {
      code: 'BAD_REQUEST',
      status: 400,
      message: 'Bad',
    });
  });

  it('logs error for generic errors', () => {
    const res = createMockRes();
    const err = new Error('Unexpected');

    errorHandler(err, mockReq, res, mockNext);

    expect(mockLogError).toHaveBeenCalledWith('Unexpected error', err);
  });

  it('does not call next for AppError', () => {
    const res = createMockRes();
    const err = new AppError(404, 'NOT_FOUND', 'Not found');

    errorHandler(err, mockReq, res, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
  });

  it('does not call next for generic Error', () => {
    const res = createMockRes();
    const err = new Error('fail');

    errorHandler(err, mockReq, res, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
  });
});
