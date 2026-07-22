import { z } from 'zod';

export const expenseSchema = z.object({
  title: z.string().trim().min(2).max(120),
  category: z.enum(['FUEL', 'VEHICLE_MAINTENANCE', 'SALARY', 'RENT', 'UTILITIES', 'SUPPLIES', 'DELIVERY', 'OTHER']),
  amount: z.number().positive(),
  expenseDate: z.coerce.date(),
  paymentMode: z.enum(['CASH', 'UPI', 'CARD', 'ADJUSTMENT']).default('CASH'),
  notes: z.string().trim().max(500).optional(),
});

export type ExpenseDto = z.infer<typeof expenseSchema>;
