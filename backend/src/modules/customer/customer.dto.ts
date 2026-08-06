import { z } from 'zod';

const weekday = z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']);

export const createCustomerSchema = z.object({
  name: z.string().min(2),
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  email: z.string().email().nullable().optional(),
  address: z.string().optional(),
  area: z.string().nullable().optional(),
  landmark: z.string().nullable().optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode').nullable().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  customerType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('DAILY'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  securityDeposit: z.number().nonnegative().default(0),
  ratePerCamper: z.number().nonnegative().default(0),
  allocatedCampers: z.number().int().nonnegative().default(0),
  notes: z.string().nullable().optional(),
  // Chosen distributor (admin id). Optional on admin-create (defaults to the
  // creating admin); required-ish on mobile self-assignment via the profile route.
  distributorId: z.string().uuid().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial().omit({ mobile: true });

export const listCustomerSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  customerType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  area: z.string().optional(),
});

export const scheduleItemSchema = z.object({
  weekday,
  enabled: z.boolean(),
  quantity: z.number().int().positive().default(1),
});

export const updateScheduleSchema = z.object({
  schedules: z.array(scheduleItemSchema).min(1),
});

export const pauseSchema = z.object({
  pausedFrom: z.coerce.date().optional(),
  pausedTo: z.coerce.date().optional(),
});

// Dates the customer wants water on (opt-in). Any date not listed = no delivery.
export const deliveryDatesSchema = z.object({
  dates: z.array(z.coerce.date()).max(366),
});

export type CreateCustomerDto = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerDto = z.infer<typeof updateCustomerSchema>;
