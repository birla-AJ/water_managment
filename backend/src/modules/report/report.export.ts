import { Response } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { ReportResult } from './report.service';

export async function exportExcel(res: Response, report: ReportResult) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Report');

  ws.mergeCells(1, 1, 1, report.columns.length);
  ws.getCell('A1').value = report.title;
  ws.getCell('A1').font = { bold: true, size: 14 };

  ws.addRow([]);
  const header = ws.addRow(report.columns);
  header.font = { bold: true };
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });

  report.rows.forEach((row) => ws.addRow(report.columns.map((c) => row[c])));
  ws.columns.forEach((col) => {
    col.width = 18;
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${slug(report.title)}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
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
function slug(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
}
