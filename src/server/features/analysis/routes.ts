import { Router } from 'express';
import { validateBody } from '../../shared/middleware/validate.js';
import { aiRateLimiter } from '../../shared/middleware/rate-limiter.js';
import { AppError } from '../../shared/middleware/error-handler.js';
import { generateAnalysisSchema } from '../../../shared/types/validation.js';
import { generateAnalysis, listSnapshots, getSnapshot, deleteSnapshot } from './analysis.service.js';
import { log } from './logger.js';

export const analysisRouter = Router();

// POST /api/analysis/generate — generate new analysis for date range
analysisRouter.post(
  '/analysis/generate',
  aiRateLimiter,
  validateBody(generateAnalysisSchema),
  async (req, res, next) => {
    try {
      const { dateFrom, dateTo } = req.body as { dateFrom?: string; dateTo?: string };
      log.info('Generate analysis request', { dateFrom, dateTo });

      const snapshot = await generateAnalysis(dateFrom, dateTo);
      res.json(snapshot);
    } catch (error) {
      if (error instanceof Error && error.message === 'No transactions found for the specified date range') {
        next(new AppError(400, 'NO_TRANSACTIONS', error.message));
        return;
      }
      if (error instanceof Error && error.message === 'Failed to parse AI response after retry') {
        next(new AppError(502, 'AI_PARSE_ERROR', 'Failed to parse AI response'));
        return;
      }
      log.error('Failed to generate analysis', error instanceof Error ? error : new Error(String(error)));
      next(error);
    }
  },
);

// GET /api/analysis/snapshots — list past snapshots (metadata only)
analysisRouter.get('/analysis/snapshots', (_req, res, next) => {
  try {
    log.info('Listing analysis snapshots');
    const snapshots = listSnapshots();
    res.json(snapshots);
  } catch (error) {
    log.error('Failed to list snapshots', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// GET /api/analysis/snapshots/:id — get full snapshot with insights data
analysisRouter.get('/analysis/snapshots/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    log.info('Getting analysis snapshot', { id });

    const snapshot = getSnapshot(id);
    if (!snapshot) {
      throw new AppError(404, 'SNAPSHOT_NOT_FOUND', `Snapshot '${id}' not found`);
    }

    res.json(snapshot);
  } catch (error) {
    if (error instanceof AppError) throw error;
    log.error('Failed to get snapshot', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// DELETE /api/analysis/snapshots/:id — delete a snapshot
analysisRouter.delete('/analysis/snapshots/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    log.info('Deleting analysis snapshot', { id });

    const deleted = deleteSnapshot(id);
    if (!deleted) {
      throw new AppError(404, 'SNAPSHOT_NOT_FOUND', `Snapshot '${id}' not found`);
    }

    res.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) throw error;
    log.error('Failed to delete snapshot', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});
