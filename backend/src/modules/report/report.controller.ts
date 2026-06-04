import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/apiResponse';
import { ApiError } from '../../utils/apiError';
import { reportService, ReportType } from './report.service';
import { exportExcel, exportCsv, exportPdf } from './report.export';

const VALID: ReportType[] = ['daily', 'weekly', 'monthly', 'yearly', 'revenue', 'customer', 'inventory', 'order', 'payment'];

function parseType(raw: unknown): ReportType {
  const t = String(raw) as ReportType;
  if (!VALID.includes(t)) throw ApiError.badRequest(`Invalid report type. Allowed: ${VALID.join(', ')}`);
  return t;
}

export const getReport = asyncHandler(async (req: Request, res: Response) => {
  const type = parseType(req.params.type);
  const report = await reportService.build(type, {
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
  });
  ok(res, report);
});

export const summary = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await reportService.summary(parseType(req.params.type)));
});

export const exportReport = asyncHandler(async (req: Request, res: Response) => {
  const type = parseType(req.params.type);
  const format = String(req.query.format ?? 'excel').toLowerCase();
  const report = await reportService.build(type, {
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
  });

  if (format === 'csv') return exportCsv(res, report);
  if (format === 'pdf') return exportPdf(res, report);
  return exportExcel(res, report);
});
