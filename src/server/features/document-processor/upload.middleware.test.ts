import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import type { MulterError } from 'multer';
import path from 'path';

vi.mock('multer', () => {
  const singleFn = vi.fn().mockReturnValue(vi.fn());
  const multerFn = Object.assign(vi.fn().mockReturnValue({ single: singleFn }), {
    diskStorage: vi.fn().mockReturnValue({}),
  });
  return { default: multerFn };
});

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
  },
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
}));

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid-1234'),
}));

vi.mock('../../shared/middleware/error-handler.js', () => ({
  AppError: class AppError extends Error {
    constructor(
      public statusCode: number,
      public code: string,
      message: string,
    ) {
      super(message);
      this.name = 'AppError';
    }
  },
}));

function createMockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

const mockReq = {} as Request;

describe('upload.middleware', () => {
  let handleMulterError: typeof import('./upload.middleware.js')['handleMulterError'];
  let getUploadDir: typeof import('./upload.middleware.js')['getUploadDir'];
  let uploadSingle: typeof import('./upload.middleware.js')['uploadSingle'];

  beforeEach(async () => {
    vi.resetModules();

    // Re-mock after resetModules
    vi.doMock('multer', () => {
      const singleFn = vi.fn().mockReturnValue(vi.fn());
      const multerFn = Object.assign(vi.fn().mockReturnValue({ single: singleFn }), {
        diskStorage: vi.fn().mockReturnValue({}),
      });
      return { default: multerFn };
    });

    vi.doMock('fs', () => ({
      default: {
        existsSync: vi.fn().mockReturnValue(true),
        mkdirSync: vi.fn(),
      },
      existsSync: vi.fn().mockReturnValue(true),
      mkdirSync: vi.fn(),
    }));

    vi.doMock('uuid', () => ({
      v4: vi.fn().mockReturnValue('test-uuid-1234'),
    }));

    vi.doMock('../../shared/middleware/error-handler.js', () => ({
      AppError: class AppError extends Error {
        constructor(
          public statusCode: number,
          public code: string,
          message: string,
        ) {
          super(message);
          this.name = 'AppError';
        }
      },
    }));

    const mod = await import('./upload.middleware.js');
    handleMulterError = mod.handleMulterError;
    getUploadDir = mod.getUploadDir;
    uploadSingle = mod.uploadSingle;
  });

  describe('handleMulterError', () => {
    it('handles LIMIT_FILE_SIZE error with 400 status', () => {
      const res = createMockRes();
      const next = vi.fn();
      const err = new Error('File too large') as Error & { code: string };
      err.code = 'LIMIT_FILE_SIZE';

      handleMulterError(err, mockReq, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: { code: 'FILE_TOO_LARGE', message: 'File size exceeds 10MB limit' },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('handles other multer errors with 400 status', () => {
      const res = createMockRes();
      const next = vi.fn();
      const err = new Error('Unexpected field') as Error & { code: string };
      err.code = 'LIMIT_UNEXPECTED_FILE';

      handleMulterError(err, mockReq, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: { code: 'UPLOAD_ERROR', message: 'Unexpected field' },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('passes non-multer errors to next()', () => {
      const res = createMockRes();
      const next = vi.fn();
      const err = new Error('Some other error');

      handleMulterError(err, mockReq, res, next);

      expect(next).toHaveBeenCalledWith(err);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('getUploadDir', () => {
    it('returns resolved upload path', () => {
      const result = getUploadDir();
      expect(result).toBe(path.resolve('uploads'));
    });
  });

  describe('uploadSingle', () => {
    it('is exported as a function', () => {
      expect(uploadSingle).toBeDefined();
      expect(typeof uploadSingle).toBe('function');
    });
  });
});
