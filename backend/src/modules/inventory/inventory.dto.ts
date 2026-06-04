import { z } from 'zod';

export const adjustInventorySchema = z.object({
  action: z.enum(['STOCK_IN', 'FILLED', 'EMPTIED', 'ALLOCATED', 'RETURNED', 'DAMAGED', 'LOST', 'ADJUSTMENT']),
  quantity: z.number().int().positive(),
  remarks: z.string().optional(),
});

export type AdjustInventoryDto = z.infer<typeof adjustInventorySchema>;
