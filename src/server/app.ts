import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { errorHandler } from './shared/middleware/error-handler.js';
import { createLogger } from './lib/logger.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };

const log = createLogger('app');

export const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    },
  },
}));

// CORS (dev only — production serves client from same origin)
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: 'http://localhost:5173' }));
}

app.use(express.json());

// Health check
app.get('/api/health', async (_req, res) => {
  let dbStatus = 'ok';
  try {
    const { sqlite } = await import('./lib/db/index.js');
    sqlite.prepare('SELECT 1').get();
  } catch {
    dbStatus = 'error';
  }

  res.json({
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: pkg.version,
    uptime: Math.floor(process.uptime()),
    database: dbStatus,
  });
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
import { goalRouter } from './features/goals/index.js';
import { reportRouter } from './features/reports/index.js';
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
app.use('/api', goalRouter);
app.use('/api', reportRouter);

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
