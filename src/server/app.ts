import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { errorHandler } from './shared/middleware/error-handler.js';
import { createLogger } from './lib/logger.js';

const log = createLogger('app');

export const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- API routers are mounted here (before static files) ---

// Serve static files in production (must be after all API routes)
const clientDir = path.resolve('dist/client');
if (fs.existsSync(clientDir)) {
  app.use(express.static(clientDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDir, 'index.html'));
  });
  log.info('Serving static client files', { path: clientDir });
}

// Error handling (must be last)
app.use(errorHandler);
