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

// --- API routers ---
import { documentRouter } from './features/document-processor/index.js';
import { transactionRouter, categoryRouter } from './features/transactions/index.js';
import { settingsRouter } from './features/settings/index.js';
import { analysisRouter } from './features/analysis/index.js';
import { budgetRouter } from './features/budgets/index.js';
import { accountRouter } from './features/accounts/index.js';
import { tagRouter } from './features/tags/index.js';
import { importRouter } from './features/import/index.js';
import { billRouter } from './features/bills/index.js';
app.use('/api', documentRouter);
app.use('/api', transactionRouter);
app.use('/api', categoryRouter);
app.use('/api', settingsRouter);
app.use('/api', analysisRouter);
app.use('/api', budgetRouter);
app.use('/api', accountRouter);
app.use('/api', tagRouter);
app.use('/api', importRouter);
app.use('/api', billRouter);

// Serve static files in production (must be after all API routes)
const clientDir = path.resolve('dist/client');
if (fs.existsSync(clientDir)) {
  app.use(express.static(clientDir));
  app.get('{*path}', (_req, res) => {
    res.sendFile(path.join(clientDir, 'index.html'));
  });
  log.info('Serving static client files', { path: clientDir });
}

// Error handling (must be last)
app.use(errorHandler);
