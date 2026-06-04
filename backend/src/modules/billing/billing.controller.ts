import { Request, Response } from 'express';
import { InvoiceStatus } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created } from '../../utils/apiResponse';
import { getPagination, buildMeta } from '../../utils/pagination';
import { billingService } from './billing.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query);
  const { items, total } = await billingService.list({
    skip,
    take: limit,
    status: req.query.status as InvoiceStatus | undefined,
    customerId: req.query.customerId as string | undefined,
  });
  ok(res, items, 'Invoices', buildMeta(total, page, limit));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await billingService.getById(req.params.id));
});

export const generate = asyncHandler(async (req: Request, res: Response) => {
  created(res, await billingService.generate(req.body), 'Invoice generated');
});

export const autoGenerate = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await billingService.autoGenerate(req.body.plan, req.body.date), 'Invoices generated');
});

export const downloadPdf = asyncHandler(async (req: Request, res: Response) => {
  const url = await billingService.renderPdf(req.params.id);
  ok(res, { pdfUrl: url }, 'PDF ready');
});

export const sendNotification = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await billingService.getById(req.params.id);
  ok(res, { invoiceNumber: invoice.invoiceNumber }, 'Invoice notification sent');
});

// ---- Customer self-service ----
export const myInvoices = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await billingService.myInvoices(req.user!.sub), 'My invoices');
});

export const myDue = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await billingService.myDue(req.user!.sub));
});
