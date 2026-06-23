import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { ReportResult } from './report.service';
import { streamExcel, slug, ChartSpec, Kpi } from './excelTheme';

/** Columns that should be formatted as currency in any report. */
const CURRENCY_COLUMNS = ['Amount', 'Revenue', 'Rate', 'Deposit'];

/** Build presentation-style KPIs + a chart from whatever columns the report has. */
function deriveInsights(report: ReportResult): { kpis: Kpi[]; chart: ChartSpec | null } {
  const { columns, rows } = report;
  const kpis: Kpi[] = [{ label: 'Total Records', value: String(rows.length) }];

  // Sum the first currency-ish numeric column for a headline figure.
  const amountCol = columns.find((c) => CURRENCY_COLUMNS.includes(c));
  if (amountCol) {
    const total = rows.reduce((s, r) => s + (Number(r[amountCol]) || 0), 0);
    kpis.push({ label: `Total ${amountCol}`, value: `₹${total.toLocaleString('en-IN')}`, accent: 'FF1B873F' });
  }

  // Choose a chart: time-series for revenue, otherwise a category breakdown.
  let chart: ChartSpec | null = null;
  if (columns.includes('Revenue') && columns.includes('Date')) {
    chart = {
      type: 'line',
      label: 'Revenue Trend',
      labels: rows.map((r) => String(r.Date)),
      data: rows.map((r) => Number(r.Revenue) || 0),
    };
  } else {
    const catCol = ['Status', 'Type', 'Method', 'Action'].find((c) => columns.includes(c));
    if (catCol) {
      const counts: Record<string, number> = {};
      rows.forEach((r) => {
        const k = String(r[catCol] ?? '—');
        counts[k] = (counts[k] ?? 0) + 1;
      });
      chart = {
        type: 'doughnut',
        label: `By ${catCol}`,
        labels: Object.keys(counts),
        data: Object.values(counts),
      };
    }
  }
  return { kpis, chart };
}

export async function exportExcel(res: Response, report: ReportResult) {
  const { kpis, chart } = deriveInsights(report);
  await streamExcel(res, slug(report.title), {
    title: report.title,
    subtitle: 'Business Report',
    generatedAt: report.generatedAt,
    columns: report.columns,
    rows: report.rows,
    kpis,
    chart,
    currencyColumns: CURRENCY_COLUMNS.filter((c) => report.columns.includes(c)),
    statusColumn: report.columns.includes('Status') ? 'Status' : undefined,
  });
}

export function exportCsv(res: Response, report: ReportResult) {
  const lines = [report.columns.join(',')];
  report.rows.forEach((row) => {
    lines.push(report.columns.map((c) => csvCell(row[c])).join(','));
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${slug(report.title)}.csv"`);
  res.send(lines.join('\n'));
}

export function exportPdf(res: Response, report: ReportResult) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${slug(report.title)}.pdf"`);
  doc.pipe(res);

  doc.fontSize(16).fillColor('#1565c0').text(report.title);
  doc.fontSize(9).fillColor('#777').text(`Generated: ${report.generatedAt}`);
  doc.moveDown();

  const colWidth = (760) / report.columns.length;
  let y = doc.y;
  doc.fontSize(9).fillColor('#000');
  report.columns.forEach((c, i) => doc.text(c, 40 + i * colWidth, y, { width: colWidth, ellipsis: true }));
  y += 16;
  doc.moveTo(40, y).lineTo(800, y).strokeColor('#ccc').stroke();
  y += 6;

  report.rows.slice(0, 1000).forEach((row) => {
    if (y > 540) {
      doc.addPage();
      y = 40;
    }
    report.columns.forEach((c, i) => doc.fillColor('#333').text(String(row[c] ?? ''), 40 + i * colWidth, y, { width: colWidth, ellipsis: true }));
    y += 15;
  });

  doc.end();
}

function csvCell(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
