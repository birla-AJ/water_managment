import { Response } from 'express';
import ExcelJS from 'exceljs';

/**
 * Presentation-grade Excel builder shared by every export in the app.
 *
 * Produces a two-sheet workbook:
 *   1. "Summary"  – branded banner, KPI cards and a real chart image.
 *   2. "Data"     – fully styled, filterable, frozen-header data table.
 *
 * Charts are rendered as PNGs via QuickChart (no extra npm dependency – uses
 * Node 18+ global fetch) and embedded as images, because ExcelJS cannot author
 * native Excel charts. If the chart service is unreachable the summary falls
 * back to in-cell data-bar conditional formatting, so the file is always useful.
 */

// WaterFlow brand palette (ARGB, no leading '#').
const BRAND = 'FF0E8388';
const BRAND_DARK = 'FF0B5E62';
const BAND = 'FFF1F7F7';
const INK = 'FF1A2B2B';
const MUTED = 'FF6B7C7C';
const WHITE = 'FFFFFFFF';
const BORDER = 'FFD9E5E5';

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: 'FF1B873F',
  PAID: 'FF1B873F',
  DELIVERED: 'FF1B873F',
  PENDING: 'FFB7791F',
  PARTIALLY_PAID: 'FFB7791F',
  FAILED: 'FFC0392B',
  CANCELLED: 'FFC0392B',
  REFUNDED: 'FF6B7C7C',
  OVERDUE: 'FFC0392B',
};

export interface Kpi {
  label: string;
  value: string;
  /** Optional accent colour (ARGB) for the value text. */
  accent?: string;
}

export interface ChartSpec {
  type: 'bar' | 'line' | 'doughnut' | 'pie';
  labels: string[];
  data: number[];
  /** Dataset label shown in the legend / title. */
  label?: string;
  /** Optional per-slice colours; defaults to a brand-derived palette. */
  colors?: string[];
}

export interface WorkbookSpec {
  title: string;
  subtitle?: string;
  generatedAt: string;
  columns: string[];
  rows: Array<Record<string, string | number>>;
  kpis?: Kpi[];
  chart?: ChartSpec | null;
  /** Columns rendered as Indian-Rupee currency. */
  currencyColumns?: string[];
  /** Column whose values get colour-coded status pills. */
  statusColumn?: string;
}

const CHART_PALETTE = ['#0E8388', '#2E9E9B', '#5BB8A6', '#B7791F', '#C0392B', '#6B7C7C', '#1B873F'];

/** Render a chart to a PNG buffer via QuickChart. Returns null on any failure. */
async function renderChartPng(chart: ChartSpec): Promise<Buffer | null> {
  const colors = chart.colors ?? chart.labels.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]);
  const isCircular = chart.type === 'doughnut' || chart.type === 'pie';
  const config = {
    type: chart.type,
    data: {
      labels: chart.labels,
      datasets: [
        {
          label: chart.label ?? '',
          data: chart.data,
          backgroundColor: isCircular ? colors : '#0E8388',
          borderColor: isCircular ? '#ffffff' : '#0B5E62',
          borderWidth: isCircular ? 2 : 0,
          fill: chart.type === 'line' ? false : true,
          tension: 0.35,
          pointBackgroundColor: '#0E8388',
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: isCircular, position: 'right' },
        title: { display: !!chart.label, text: chart.label, font: { size: 16, weight: 'bold' } },
      },
      scales: isCircular
        ? {}
        : { y: { beginAtZero: true, grid: { color: '#e6efef' } }, x: { grid: { display: false } } },
    },
  };

  try {
    const res = await fetch('https://quickchart.io/chart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chart: config, width: 640, height: 320, backgroundColor: 'white', format: 'png' }),
      // Don't let a slow chart service hold the export hostage.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const side: ExcelJS.Border = { style: 'thin', color: { argb: BORDER } };
  return { top: side, left: side, bottom: side, right: side };
}

export async function buildWorkbook(spec: WorkbookSpec): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'WaterFlow';
  wb.created = new Date();

  await buildSummarySheet(wb, spec);
  buildDataSheet(wb, spec);
  return wb;
}

async function buildSummarySheet(wb: ExcelJS.Workbook, spec: WorkbookSpec) {
  const ws = wb.addWorksheet('Summary', {
    views: [{ showGridLines: false }],
    properties: { defaultRowHeight: 18 },
  });
  for (let c = 1; c <= 8; c++) ws.getColumn(c).width = 16;

  // --- Banner ---------------------------------------------------------------
  ws.mergeCells('A1:H3');
  const banner = ws.getCell('A1');
  banner.value = spec.title;
  banner.font = { bold: true, size: 22, color: { argb: WHITE } };
  banner.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  banner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
  ws.getRow(1).height = 24;
  ws.getRow(2).height = 24;
  ws.getRow(3).height = 24;

  ws.mergeCells('A4:H4');
  const sub = ws.getCell('A4');
  sub.value = `${spec.subtitle ? spec.subtitle + '  •  ' : ''}Generated ${spec.generatedAt}`;
  sub.font = { italic: true, size: 10, color: { argb: MUTED } };
  sub.alignment = { indent: 1 };

  // --- KPI cards ------------------------------------------------------------
  let row = 6;
  const kpis = spec.kpis ?? [];
  if (kpis.length) {
    // Two cards per "block" of 4 columns; each card is a label row + value row.
    const perRow = 4;
    for (let i = 0; i < kpis.length; i += perRow) {
      const labelRow = row;
      const valueRow = row + 1;
      ws.getRow(labelRow).height = 16;
      ws.getRow(valueRow).height = 28;
      kpis.slice(i, i + perRow).forEach((kpi, j) => {
        const c1 = j * 2 + 1; // each card spans 2 columns
        const c2 = c1 + 1;
        ws.mergeCells(labelRow, c1, labelRow, c2);
        ws.mergeCells(valueRow, c1, valueRow, c2);
        const lc = ws.getCell(labelRow, c1);
        lc.value = kpi.label.toUpperCase();
        lc.font = { size: 9, bold: true, color: { argb: MUTED } };
        lc.alignment = { horizontal: 'left', indent: 1, vertical: 'middle' };
        lc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BAND } };
        lc.border = { top: thinBorder().top, left: thinBorder().left, right: thinBorder().right };
        const vc = ws.getCell(valueRow, c1);
        vc.value = kpi.value;
        vc.font = { size: 18, bold: true, color: { argb: kpi.accent ?? BRAND_DARK } };
        vc.alignment = { horizontal: 'left', indent: 1, vertical: 'middle' };
        vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BAND } };
        vc.border = { bottom: thinBorder().bottom, left: thinBorder().left, right: thinBorder().right };
      });
      row += 3; // two rows + spacer
    }
  }

  // --- Chart ----------------------------------------------------------------
  if (spec.chart && spec.chart.labels.length) {
    const png = await renderChartPng(spec.chart);
    const headingRow = row;
    ws.mergeCells(headingRow, 1, headingRow, 8);
    const h = ws.getCell(headingRow, 1);
    h.value = spec.chart.label ?? 'Overview';
    h.font = { bold: true, size: 13, color: { argb: INK } };
    row += 1;

    if (png) {
      const imageId = wb.addImage({ buffer: png, extension: 'png' });
      ws.addImage(imageId, {
        tl: { col: 0.2, row: row - 0.6 },
        ext: { width: 640, height: 320 },
      });
      row += 18;
    } else {
      // Fallback: in-cell data bars so there's still a visual when offline.
      ws.getCell(row, 1).value = 'Label';
      ws.getCell(row, 2).value = 'Value';
      ws.getCell(row, 1).font = { bold: true, color: { argb: MUTED } };
      ws.getCell(row, 2).font = { bold: true, color: { argb: MUTED } };
      const start = row + 1;
      spec.chart.labels.forEach((lbl, i) => {
        ws.getCell(start + i, 1).value = lbl;
        ws.getCell(start + i, 2).value = spec.chart!.data[i];
      });
      ws.addConditionalFormatting({
        ref: `B${start}:B${start + spec.chart.labels.length - 1}`,
        rules: [{ type: 'dataBar', cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: BRAND }, priority: 1 }] as any,
      });
      row += spec.chart.labels.length + 2;
    }
  }
}

function buildDataSheet(wb: ExcelJS.Workbook, spec: WorkbookSpec) {
  const ws = wb.addWorksheet('Data', { views: [{ state: 'frozen', ySplit: 1 }] });
  const { columns, rows } = spec;
  const currencySet = new Set(spec.currencyColumns ?? []);

  // Header
  const header = ws.addRow(columns);
  header.height = 22;
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
    cell.font = { bold: true, color: { argb: WHITE }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    cell.border = thinBorder();
  });

  // Body
  rows.forEach((r, i) => {
    const row = ws.addRow(columns.map((c) => r[c] ?? ''));
    row.eachCell((cell, colNumber) => {
      const colName = columns[colNumber - 1];
      cell.border = thinBorder();
      cell.alignment = { vertical: 'middle', indent: 1 };
      cell.font = { size: 11, color: { argb: INK } };
      if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BAND } };
      if (currencySet.has(colName) && typeof cell.value === 'number') {
        cell.numFmt = '₹#,##0.00';
        cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
      }
      if (colName === spec.statusColumn) {
        const key = String(cell.value).toUpperCase();
        const color = STATUS_COLORS[key];
        if (color) cell.font = { size: 11, bold: true, color: { argb: color } };
      }
    });
  });

  // Column widths from content
  ws.columns.forEach((col, idx) => {
    const name = columns[idx] ?? '';
    let max = name.length;
    rows.forEach((r) => {
      const len = String(r[name] ?? '').length;
      if (len > max) max = len;
    });
    col.width = Math.min(Math.max(max + 4, 12), 42);
  });

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
}

/** Stream a styled workbook to the HTTP response as an .xlsx download. */
export async function streamExcel(res: Response, filenameBase: string, spec: WorkbookSpec) {
  const wb = await buildWorkbook(spec);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${slug(filenameBase)}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
}

export function slug(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, '_').toLowerCase().replace(/^_|_$/g, '');
}
