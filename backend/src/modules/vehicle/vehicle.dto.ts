import { z } from 'zod';

export const createVehicleSchema = z.object({
  number: z.string().min(3),
  type: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export type CreateVehicleDto = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleDto = z.infer<typeof updateVehicleSchema>;
