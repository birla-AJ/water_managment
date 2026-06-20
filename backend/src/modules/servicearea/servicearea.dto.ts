import { z } from 'zod';

export const createServiceAreaSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  city: z.string().optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode').optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const updateServiceAreaSchema = createServiceAreaSchema.partial();

export type CreateServiceAreaDto = z.infer<typeof createServiceAreaSchema>;
export type UpdateServiceAreaDto = z.infer<typeof updateServiceAreaSchema>;
