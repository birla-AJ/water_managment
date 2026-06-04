import { z } from 'zod';

export const createOrderSchema = z.object({
  customerId: z.string().uuid().optional(), // admin supplies; customers use their own id
  quantity: z.number().int().positive().default(1),
  orderDate: z.coerce.date().optional(),
  remarks: z.string().optional(),
  type: z.enum(['REGULAR', 'EXTRA']).default('EXTRA'),
});

export const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'PROCESSING', 'DELIVERED', 'CANCELLED']),
  remarks: z.string().optional(),
});

export const listOrderSchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  status: z.enum(['PENDING', 'ACCEPTED', 'PROCESSING', 'DELIVERED', 'CANCELLED']).optional(),
  type: z.enum(['REGULAR', 'EXTRA']).optional(),
  customerId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
