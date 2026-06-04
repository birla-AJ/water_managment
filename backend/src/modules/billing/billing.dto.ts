import { z } from 'zod';

export const generateInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  rate: z.number().nonnegative().optional(), // overrides customer rate
  taxPercent: z.number().min(0).max(100).optional(),
  dueInDays: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

export const autoGenerateSchema = z.object({
  plan: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  date: z.coerce.date().optional(),
});

export const listInvoiceSchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  status: z.enum(['PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  customerId: z.string().uuid().optional(),
});

export type GenerateInvoiceDto = z.infer<typeof generateInvoiceSchema>;
