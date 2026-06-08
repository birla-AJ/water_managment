import { z } from 'zod';

export const createAdminSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN']).default('ADMIN'),
  phone: z.string().optional(),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number').optional(),
  isActive: z.boolean().default(true),
});

export const updateAdminSchema = z.object({
  name: z.string().min(2).optional(),
  // New password (optional on update).
  password: z.string().min(6).optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN']).optional(),
  phone: z.string().optional(),
  mobile: z.string().regex(/^[6-9]\d{9}$/).nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CreateAdminDto = z.infer<typeof createAdminSchema>;
export type UpdateAdminDto = z.infer<typeof updateAdminSchema>;
