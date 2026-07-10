import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { created, ok } from '../../utils/apiResponse';
import { trackingService } from './tracking.service';

export const dutyStatus = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await trackingService.dutyStatus(req.user!.sub), 'Duty status');
});

export const setDuty = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await trackingService.setDuty(req.user!.sub, req.body), 'Duty updated');
});

export const updateLocation = asyncHandler(async (req: Request, res: Response) => {
  created(res, await trackingService.updateLocation(req.user!.sub, req.body), 'Location recorded');
});

export const adminLive = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await trackingService.adminLive(req.user!), 'Live tracking');
});

export const customerActive = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await trackingService.customerActive(req.user!.sub), 'Active delivery tracking');
});

export const createPolygon = asyncHandler(async (req: Request, res: Response) => {
  created(res, await trackingService.createPolygon(req.user!, req.body), 'Service polygon created');
});

export const updatePolygon = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await trackingService.updatePolygon(req.user!, req.params.id, req.body), 'Service polygon updated');
});

export const deletePolygon = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await trackingService.deletePolygon(req.user!, req.params.id), 'Service polygon deleted');
});
