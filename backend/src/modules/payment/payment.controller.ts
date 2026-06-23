import { Request, Response } from 'express';
import { PaymentStatus } from '@prisma/client';
import dayjs from 'dayjs';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created } from '../../utils/apiResponse';
import { getPagination, buildMeta } from '../../utils/pagination';
import { verifyWebhookSignature } from '../../config/razorpay';
import { logger } from '../../config/logger';
import { scopedDistributorId } from '../../utils/scope';
import { paymentService } from './payment.service';
import { streamExcel, Kpi, ChartSpec } from '../report/excelTheme';

// ---- Admin ----
export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query);
  const { items, total } = await paymentService.list({
    skip,
    take: limit,
    status: req.query.status as PaymentStatus | undefined,
    customerId: req.query.customerId as string | undefined,
    distributorId: scopedDistributorId(req.user),
  });
  ok(res, items, 'Payments', buildMeta(total, page, limit));
});

export const exportPayments = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as PaymentStatus | undefined;
  // Pull the full (filtered) set — exports shouldn't be paginated.
  const { items } = await paymentService.list({
    skip: 0,
    take: 10000,
    status,
    customerId: req.query.customerId as string | undefined,
    distributorId: scopedDistributorId(req.user),
  });

  const columns = ['Date', 'Customer', 'Mobile', 'Invoice', 'Amount', 'Method', 'Status'];
  const rows = items.map((p) => ({
    Date: dayjs(p.createdAt).format('YYYY-MM-DD HH:mm'),
    Customer: p.customer?.name ?? '—',
    Mobile: p.customer?.mobile ?? '',
    Invoice: p.invoice?.invoiceNumber ?? '',
    Amount: Number(p.amount),
    Method: p.method,
    Status: p.status,
  }));

  // KPIs: total collected (success), pending and refunded amounts, count.
  const sumWhere = (s: PaymentStatus) =>
    items.filter((p) => p.status === s).reduce((a, p) => a + Number(p.amount), 0);
  const collected = sumWhere('SUCCESS' as PaymentStatus);
  const pending = sumWhere('PENDING' as PaymentStatus);
  const refunded = sumWhere('REFUNDED' as PaymentStatus);
  const kpis: Kpi[] = [
    { label: 'Transactions', value: String(items.length) },
    { label: 'Collected', value: `₹${collected.toLocaleString('en-IN')}`, accent: 'FF1B873F' },
    { label: 'Pending', value: `₹${pending.toLocaleString('en-IN')}`, accent: 'FFB7791F' },
    { label: 'Refunded', value: `₹${refunded.toLocaleString('en-IN')}`, accent: 'FF6B7C7C' },
  ];

  const byStatus: Record<string, number> = {};
  items.forEach((p) => { byStatus[p.status] = (byStatus[p.status] ?? 0) + 1; });
  const chart: ChartSpec = {
    type: 'doughnut',
    label: 'Payments by Status',
    labels: Object.keys(byStatus),
    data: Object.values(byStatus),
  };

  const title = status ? `Payments Report — ${status}` : 'Payments Report';
  await streamExcel(res, title, {
    title,
    subtitle: 'Razorpay & manual payments',
    generatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    columns,
    rows,
    kpis,
    chart,
    currencyColumns: ['Amount'],
    statusColumn: 'Status',
  });
});

export const recordManual = asyncHandler(async (req: Request, res: Response) => {
  created(res, await paymentService.recordManual(req.body), 'Payment recorded');
});

export const refund = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await paymentService.refund(req.params.id, req.body.amount, req.body.notes), 'Payment refunded');
});

// ---- Customer ----
export const createRazorpayOrder = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.createRazorpayOrder(req.user!.sub, req.body.amount, req.body.invoiceId);
  created(res, result, 'Razorpay order created');
});

export const verify = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await paymentService.verifyAndCapture(req.body), 'Payment verified');
});

export const myPayments = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await paymentService.myPayments(req.user!.sub), 'My payments');
});

// ---- Webhook (no auth; signature verified) ----
export const webhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  const raw = req.body instanceof Buffer ? req.body.toString('utf-8') : JSON.stringify(req.body);

  if (!verifyWebhookSignature(raw, signature)) {
    logger.warn('Invalid Razorpay webhook signature');
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }
  await paymentService.handleWebhook(JSON.parse(raw));
  res.json({ success: true });
});
