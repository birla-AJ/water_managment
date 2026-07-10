import { Request, Response } from 'express';
import { PaymentStatus } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created } from '../../utils/apiResponse';
import { getPagination, buildMeta } from '../../utils/pagination';
import { verifyWebhookSignature } from '../../config/razorpay';
import { logger } from '../../config/logger';
import { scopedDistributorId } from '../../utils/scope';
import { paymentService } from './payment.service';

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
