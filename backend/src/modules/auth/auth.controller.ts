import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/apiResponse';
import { authService } from './auth.service';

export const adminLogin = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.adminLogin(req.body);
  ok(res, result, 'Login successful');
});

export const requestOtp = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.requestOtp(req.body);
  ok(res, result, 'OTP sent');
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.verifyOtp(req.body);
  ok(res, result, 'OTP verified');
});

export const firebaseLogin = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.firebaseLogin(req.body);
  ok(res, result, 'Login successful');
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.refresh(req.body.refreshToken);
  ok(res, result, 'Token refreshed');
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.logout(req.body.refreshToken);
  ok(res, result, 'Logged out');
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.me(req.user!);
  ok(res, result);
});

export const updateFcm = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.updateFcmToken(req.user!.sub, req.body.fcmToken);
  ok(res, result, 'FCM token updated');
});
