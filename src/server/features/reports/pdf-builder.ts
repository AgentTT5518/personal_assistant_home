import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { ReportData } from '../../../shared/types/index.js';
import { log } from './logger.js';

const PAGE_WIDTH = 595; // A4
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const LINE_HEIGHT = 16;
const HEADER_HEIGHT = 24;

interface TableColumn {
  label: string;
  width: number;
  align?: 'left' | 'right';
}

/**
 * Builds a PDF report from ReportData.
 * Returns the PDF as a Uint8Array buffer.
 */
export async function buildReportPdf(
  title: string,
  periodFrom: string,
  periodTo: string,
  data: ReportData,
): Promise<Uint8Array> {
  log.info('Building PDF report', { title });

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  function ensureSpace(needed: number) {
    if (y - needed < MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  }

  function drawText(text: string, x: number, size: number, bold = false) {
    const f = bold ? fontBold : font;
    page.drawText(text, { x, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
  }

  function drawSectionTitle(text: string) {
    ensureSpace(HEADER_HEIGHT + LINE_HEIGHT);
    y -= HEADER_HEIGHT;
    drawText(text, MARGIN, 14, true);
    y -= 4;
    // Underline
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: MARGIN + CONTENT_WIDTH, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= LINE_HEIGHT;
  }

  function drawTable(columns: TableColumn[], rows: string[][]) {
    // Header
    ensureSpace(LINE_HEIGHT * 2);
    let x = MARGIN;
    for (const col of columns) {
      drawText(col.label, x + 4, 9, true);
      x += col.width;
    }
    y -= LINE_HEIGHT;

    // Rows
    for (const row of rows) {
      ensureSpace(LINE_HEIGHT);
      x = MARGIN;
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const cellText = row[i] ?? '';
        // Truncate if too long
        const maxChars = Math.floor(col.width / 5);
        const displayText = cellText.length > maxChars ? cellText.substring(0, maxChars - 2) + '..' : cellText;
        const textX = col.align === 'right' ? x + col.width - 4 - font.widthOfTextAtSize(displayText, 8) : x + 4;
        drawText(displayText, textX, 8);
        x += col.width;
      }
      y -= LINE_HEIGHT;
    }
  }

  function formatAmount(n: number): string {
    return n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // --- Title ---
  drawText(title, MARGIN, 18, true);
  y -= 8;
  drawText(`Period: ${periodFrom} to ${periodTo}`, MARGIN, 10);
  y -= 4;
  drawText(`Generated: ${new Date().toISOString().split('T')[0]}`, MARGIN, 10);
  y -= LINE_HEIGHT;

  // --- Summary ---
  drawSectionTitle('Summary');
  const summaryLines = [
    `Income: $${formatAmount(data.summary.income)}`,
    `Expenses: $${formatAmount(data.summary.expenses)}`,
    `Net: $${formatAmount(data.summary.net)}`,
    `Transactions: ${data.summary.transactionCount}`,
  ];
  for (const line of summaryLines) {
    ensureSpace(LINE_HEIGHT);
    drawText(line, MARGIN + 8, 10);
    y -= LINE_HEIGHT;
  }

  // --- Budget vs Actual ---
  if (data.budgetVsActual.length > 0) {
    drawSectionTitle('Budget vs Actual');
    drawTable(
      [
        { label: 'Category', width: 180 },
        { label: 'Budget', width: 100, align: 'right' },
        { label: 'Actual', width: 100, align: 'right' },
        { label: '% Used', width: 80, align: 'right' },
      ],
      data.budgetVsActual.map((b) => [
        b.categoryName,
        `$${formatAmount(b.budgetAmount)}`,
        `$${formatAmount(b.actualSpent)}`,
        `${b.percentUsed}%`,
      ]),
    );
  }

  // --- Category Breakdown ---
  if (data.categoryBreakdown.length > 0) {
    drawSectionTitle('Category Breakdown');
    drawTable(
      [
        { label: 'Category', width: 200 },
        { label: 'Amount', width: 140, align: 'right' },
        { label: '% of Total', width: 100, align: 'right' },
      ],
      data.categoryBreakdown.map((c) => [
        c.categoryName,
        `$${formatAmount(c.amount)}`,
        `${c.percentage}%`,
      ]),
    );
  }

  // --- Top Merchants ---
  if (data.topMerchants.length > 0) {
    drawSectionTitle('Top Merchants');
    drawTable(
      [
        { label: 'Merchant', width: 200 },
        { label: 'Amount', width: 130, align: 'right' },
        { label: 'Transactions', width: 100, align: 'right' },
      ],
      data.topMerchants.map((m) => [
        m.merchant,
        `$${formatAmount(m.amount)}`,
        String(m.transactionCount),
      ]),
    );
  }

  // --- Monthly Comparison ---
  if (data.monthlyComparison && data.monthlyComparison.length > 1) {
    drawSectionTitle('Monthly Comparison');
    drawTable(
      [
        { label: 'Month', width: 140 },
        { label: 'Income', width: 130, align: 'right' },
        { label: 'Expenses', width: 130, align: 'right' },
      ],
      data.monthlyComparison.map((m) => [
        m.month,
        `$${formatAmount(m.income)}`,
        `$${formatAmount(m.expenses)}`,
      ]),
    );
  }

  // --- Account Breakdown ---
  if (data.accountBreakdown && data.accountBreakdown.length > 0) {
    drawSectionTitle('Account Breakdown');
    drawTable(
      [
        { label: 'Account', width: 140 },
        { label: 'Type', width: 80 },
        { label: 'Income', width: 90, align: 'right' },
        { label: 'Expenses', width: 90, align: 'right' },
        { label: 'Net', width: 90, align: 'right' },
      ],
      data.accountBreakdown.map((a) => [
        a.accountName,
        a.type,
        `$${formatAmount(a.income)}`,
        `$${formatAmount(a.expenses)}`,
        `$${formatAmount(a.net)}`,
      ]),
    );
  }

  return pdfDoc.save();
}
