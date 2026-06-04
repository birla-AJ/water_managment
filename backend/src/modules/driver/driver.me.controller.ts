import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/apiResponse';
import { driverService } from './driver.service';

/** Driver self-service handlers (mobile app). `req.user!.sub` is the driver id. */
export const myProfile = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await driverService.profile(req.user!.sub));
});

export const myCustomers = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await driverService.myCustomers(req.user!.sub), 'My customers');
});

export const myDeliveries = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await driverService.todayDeliveries(req.user!.sub, req.query.date as string | undefined), "Today's deliveries");
});

export const markDelivered = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await driverService.markDelivered(req.user!.sub, req.body), 'Delivery updated');
});

export const updateFcm = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await driverService.updateFcmToken(req.user!.sub, req.body.fcmToken), 'FCM token updated');
});
