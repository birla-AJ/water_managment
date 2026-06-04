import { z } from 'zod';

export const markDeliverySchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['PENDING', 'DELIVERED', 'CANCELLED']),
  quantityDelivered: z.number().int().nonnegative().optional(),
  emptyCollected: z.number().int().nonnegative().optional(),
  remarks: z.string().optional(),
});
