import multer, { type MulterError } from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../../shared/middleware/error-handler.js';

const uploadDir = process.env.UPLOAD_DIR || 'uploads';

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, _file, cb) => {
    cb(null, `${uuidv4()}.pdf`);
  },
});

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new AppError(400, 'INVALID_FILE_TYPE', 'Only PDF files are accepted'));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export const uploadSingle = upload.single('file');

export function handleMulterError(err: Error, _req: Request, res: Response, next: NextFunction): void {
  if ((err as MulterError).code) {
    const multerErr = err as MulterError;
    if (multerErr.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ error: { code: 'FILE_TOO_LARGE', message: 'File size exceeds 10MB limit' } });
      return;
    }
    res.status(400).json({ error: { code: 'UPLOAD_ERROR', message: multerErr.message } });
    return;
  }
  next(err);
}

export function getUploadDir(): string {
  return path.resolve(uploadDir);
}
