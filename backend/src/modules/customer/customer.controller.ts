import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created, noContent } from '../../utils/apiResponse';
import { getPagination, buildMeta } from '../../utils/pagination';
import { customerService } from './customer.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query);
  const { items, total } = await customerService.list({ ...req.query, page, limit, skip } as never);
  ok(res, items, 'Customers', buildMeta(total, page, limit));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await customerService.getById(req.params.id));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  created(res, await customerService.create(req.body), 'Customer created');
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await customerService.update(req.params.id, req.body), 'Customer updated');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await customerService.remove(req.params.id);
  noContent(res);
});

export const getSchedules = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await customerService.getSchedules(req.params.id));
});

export const updateSchedules = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await customerService.updateSchedules(req.params.id, req.body.schedules), 'Schedule updated');
});

export const pause = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await customerService.pause(req.params.id, req.body.pausedFrom, req.body.pausedTo), 'Deliveries paused');
});

export const resume = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await customerService.resume(req.params.id), 'Deliveries resumed');
});

export const getSkipDates = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await customerService.getSkipDates(req.params.id));
});

export const setSkipDates = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await customerService.setSkipDates(req.params.id, req.body.dates), 'Unavailable days updated');
});

// ---- Customer self-service (mobile app) ----
export const myProfile = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await customerService.getById(req.user!.sub));
});

export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await customerService.updateProfile(req.user!.sub, req.body), 'Profile updated');
});

export const mySchedules = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await customerService.getSchedules(req.user!.sub));
});

export const pauseMine = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await customerService.pause(req.user!.sub, req.body.pausedFrom, req.body.pausedTo), 'Deliveries paused');
});

export const resumeMine = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await customerService.resume(req.user!.sub), 'Deliveries resumed');
});

export const mySkipDates = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await customerService.getSkipDates(req.user!.sub));
});

export const setMySkipDates = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await customerService.setSkipDates(req.user!.sub, req.body.dates), 'Unavailable days updated');
});
