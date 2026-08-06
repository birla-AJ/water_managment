import { z } from 'zod';

export const createDriverSchema = z.object({
  name: z.string().min(2),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().email().optional(),
  licenseNumber: z.string().optional(),
  address: z.string().optional(),
  zone: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  vehicleId: z.string().uuid().optional(),
});

export const updateDriverSchema = createDriverSchema.partial().omit({ mobile: true });

export const assignVehicleSchema = z.object({
  // null clears the assignment
  vehicleId: z.string().uuid().nullable(),
});

export const assignCustomersSchema = z.object({
  customerIds: z.array(z.string().uuid()).min(1),
});

export const notifyDriverSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
});

export const markDeliverySchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['DELIVERED', 'CANCELLED']).default('DELIVERED'),
  quantityDelivered: z.number().int().nonnegative().optional(),
  emptyCollected: z.number().int().nonnegative().optional(),
  remarks: z.string().optional(),
});

export const updateFcmSchema = z.object({
  fcmToken: z.string().min(1),
});

export type CreateDriverDto = z.infer<typeof createDriverSchema>;
export type UpdateDriverDto = z.infer<typeof updateDriverSchema>;
export type AssignCustomersDto = z.infer<typeof assignCustomersSchema>;
export type MarkDeliveryDto = z.infer<typeof markDeliverySchema>;
