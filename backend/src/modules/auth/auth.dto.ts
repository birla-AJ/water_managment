import { z } from 'zod';

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const requestOtpSchema = z.object({
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
});

export const verifyOtpSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/),
  otp: z.string().length(6),
  name: z.string().min(2).optional(), // for first-time self registration
  fcmToken: z.string().optional(),
});

export const updateFcmSchema = z.object({
  fcmToken: z.string().min(1),
});

export const firebaseLoginSchema = z.object({
  firebaseToken: z.string().min(10),
  fcmToken: z.string().optional(),
});

export type AdminLoginDto = z.infer<typeof adminLoginSchema>;
export type RequestOtpDto = z.infer<typeof requestOtpSchema>;
export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;
export type FirebaseLoginDto = z.infer<typeof firebaseLoginSchema>;
