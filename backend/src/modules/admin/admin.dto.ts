import { z } from 'zod';

// Distributor location / service-area fields shared by create & update.
const distributorFields = {
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  serviceRadiusKm: z.number().min(0).max(500).nullable().optional(),
  pincodes: z.array(z.string().regex(/^\d{6}$/, 'Enter valid 6-digit pincodes')).optional(),
  serviceAreas: z.array(z.string().min(1)).optional(),
  // IDs from the shared ServiceArea master list to link to this distributor.
  areaIds: z.array(z.string().uuid()).optional(),
};

export const createAdminSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN']).default('ADMIN'),
  phone: z.string().optional(),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number').optional(),
  isActive: z.boolean().default(true),
  ...distributorFields,
});

export const updateAdminSchema = z.object({
  name: z.string().min(2).optional(),
  // New password (optional on update).
  password: z.string().min(6).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN']).optional(),
  phone: z.string().optional(),
  mobile: z.string().regex(/^[6-9]\d{9}$/).nullable().optional(),
  isActive: z.boolean().optional(),
  ...distributorFields,
});

export type CreateAdminDto = z.infer<typeof createAdminSchema>;
export type UpdateAdminDto = z.infer<typeof updateAdminSchema>;
