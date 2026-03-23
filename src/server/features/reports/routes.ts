import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { db } from '../../lib/db/index.js';
import { reports } from '../../lib/db/schema/index.js';
import { validateBody } from '../../shared/middleware/validate.js';
import { AppError } from '../../shared/middleware/error-handler.js';
import { generateReportSchema } from '../../../shared/types/validation.js';
import type { ReportType, ReportData, ReportResponse, ReportListItem } from '../../../shared/types/index.js';
import { generateReportData } from './report-generator.js';
import { buildReportPdf } from './pdf-builder.js';
import { log } from './logger.js';

export const reportRouter = Router();

const REPORTS_DIR = path.resolve('data/reports');

function ensureReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

function buildTitle(reportType: ReportType, periodFrom: string, periodTo: string): string {
  switch (reportType) {
    case 'monthly': {
      const d = new Date(periodFrom + 'T00:00:00');
      return `Monthly Report — ${d.toLocaleString('en-AU', { month: 'long', year: 'numeric' })}`;
    }
    case 'quarterly': {
      const from = new Date(periodFrom + 'T00:00:00');
      const quarter = Math.ceil((from.getMonth() + 1) / 3);
      return `Q${quarter} ${from.getFullYear()} Report`;
    }
    case 'yearly': {
      return `Annual Report — ${new Date(periodFrom + 'T00:00:00').getFullYear()}`;
    }
    default:
      return `Custom Report — ${periodFrom} to ${periodTo}`;
  }
}

// POST /api/reports/generate — generate a new report
reportRouter.post('/reports/generate', validateBody(generateReportSchema), (req, res, next) => {
  try {
    const { periodFrom, periodTo, reportType } = req.body as {
      periodFrom: string;
      periodTo: string;
      reportType: ReportType;
    };

    if (periodFrom > periodTo) {
      throw new AppError(400, 'INVALID_DATE_RANGE', 'periodFrom must be before periodTo');
    }

    log.info('Generating report', { reportType, periodFrom, periodTo });

    const data = generateReportData(periodFrom, periodTo);
    const title = buildTitle(reportType, periodFrom, periodTo);
    const now = new Date().toISOString();
    const id = uuidv4();

    db.insert(reports)
      .values({
        id,
        title,
        reportType,
        periodFrom,
        periodTo,
        data: JSON.stringify(data),
        generatedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    log.info('Report generated', { id, title });

    const result: ReportResponse = {
      id,
      title,
      reportType,
      periodFrom,
      periodTo,
      data,
      pdfPath: null,
      generatedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    res.status(201).json(result);
  } catch (error) {
    log.error('Failed to generate report', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// GET /api/reports — list reports (metadata only)
reportRouter.get('/reports', (_req, res, next) => {
  try {
    log.info('Listing reports');
    const rows = db
      .select({
        id: reports.id,
        title: reports.title,
        reportType: reports.reportType,
        periodFrom: reports.periodFrom,
        periodTo: reports.periodTo,
        pdfPath: reports.pdfPath,
        generatedAt: reports.generatedAt,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .orderBy(desc(reports.createdAt))
      .all();

    const result: ReportListItem[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      reportType: r.reportType as ReportType,
      periodFrom: r.periodFrom,
      periodTo: r.periodTo,
      hasPdf: r.pdfPath !== null,
      generatedAt: r.generatedAt,
      createdAt: r.createdAt,
    }));

    res.json(result);
  } catch (error) {
    log.error('Failed to list reports', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// GET /api/reports/:id — get full report data
reportRouter.get('/reports/:id', (req, res, next) => {
  try {
    const id = req.params.id as string;
    log.info('Fetching report', { id });

    const row = db.select().from(reports).where(eq(reports.id, id)).get();
    if (!row) {
      throw new AppError(404, 'NOT_FOUND', 'Report not found');
    }

    const result: ReportResponse = {
      id: row.id,
      title: row.title,
      reportType: row.reportType as ReportType,
      periodFrom: row.periodFrom,
      periodTo: row.periodTo,
      data: JSON.parse(row.data) as ReportData,
      pdfPath: row.pdfPath,
      generatedAt: row.generatedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    res.json(result);
  } catch (error) {
    log.error('Failed to fetch report', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// GET /api/reports/:id/pdf — download or generate PDF
reportRouter.get('/reports/:id/pdf', async (req, res, next) => {
  try {
    const id = req.params.id as string;
    log.info('Downloading report PDF', { id });

    const row = db.select().from(reports).where(eq(reports.id, id)).get();
    if (!row) {
      throw new AppError(404, 'NOT_FOUND', 'Report not found');
    }

    // If PDF already generated, serve it
    if (row.pdfPath && fs.existsSync(row.pdfPath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${row.title.replace(/[^a-zA-Z0-9 _-]/g, '')}.pdf"`);
      const stream = fs.createReadStream(row.pdfPath);
      stream.pipe(res);
      return;
    }

    // Generate PDF
    const data = JSON.parse(row.data) as ReportData;
    const pdfBytes = await buildReportPdf(row.title, row.periodFrom, row.periodTo, data);

    // Save to disk
    ensureReportsDir();
    const pdfPath = path.join(REPORTS_DIR, `${id}.pdf`);
    fs.writeFileSync(pdfPath, pdfBytes);

    // Update record with path
    db.update(reports)
      .set({ pdfPath, updatedAt: new Date().toISOString() })
      .where(eq(reports.id, id))
      .run();

    log.info('PDF generated and saved', { id, pdfPath });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${row.title.replace(/[^a-zA-Z0-9 _-]/g, '')}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    log.error('Failed to generate PDF', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});

// DELETE /api/reports/:id — delete report and PDF file
reportRouter.delete('/reports/:id', (req, res, next) => {
  try {
    const id = req.params.id as string;
    log.info('Deleting report', { id });

    const row = db.select().from(reports).where(eq(reports.id, id)).get();
    if (!row) {
      throw new AppError(404, 'NOT_FOUND', 'Report not found');
    }

    // Delete PDF file if exists
    if (row.pdfPath && fs.existsSync(row.pdfPath)) {
      fs.unlinkSync(row.pdfPath);
      log.info('PDF file deleted', { pdfPath: row.pdfPath });
    }

    db.delete(reports).where(eq(reports.id, id)).run();
    log.info('Report deleted', { id });

    res.status(204).end();
  } catch (error) {
    log.error('Failed to delete report', error instanceof Error ? error : new Error(String(error)));
    next(error);
  }
});
