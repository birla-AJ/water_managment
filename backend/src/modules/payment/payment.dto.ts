import { z } from 'zod';

export const createOrderSchema = z.object({
  invoiceId: z.string().uuid().optional(),
  amount: z.number().positive(),
});

export const verifySchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

export const manualPaymentSchema = z.object({
  customerId: z.string().uuid(),
  invoiceId: z.string().uuid().optional(),
  amount: z.number().positive(),
  method: z.enum(['CASH', 'UPI', 'CARD', 'ADJUSTMENT']).default('CASH'),
  notes: z.string().optional(),
});

export const refundSchema = z.object({
  amount: z.number().positive().optional(),
  notes: z.string().optional(),
});
