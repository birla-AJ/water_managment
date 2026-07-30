import { Request, Response } from 'express';
import { RequestSource } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created, noContent } from '../../utils/apiResponse';
import { getPagination, buildMeta } from '../../utils/pagination';
import { ApiError } from '../../utils/apiError';
import { scopedDistributorId } from '../../utils/scope';
import { customerService } from './customer.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query);
  const { items, total } = await customerService.list({
    ...req.query,
    page,
    limit,
    skip,
    distributorId: scopedDistributorId(req.user),
  } as never);
  ok(res, items, 'Customers', buildMeta(total, page, limit));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const customer = await assertCustomerAccess(req);
  // A scoped (non-super) admin may only open their own distributor's customers.
  const scope = scopedDistributorId(req.user);
  if (scope && (customer as { distributorId?: string | null }).distributorId !== scope) {
    throw ApiError.forbidden('This customer is not assigned to you');
  }
  ok(res, customer);
});

async function assertCustomerAccess(req: Request) {
  const customer = await customerService.getById(req.params.id);
  const scope = scopedDistributorId(req.user);
  if (scope && (customer as { distributorId?: string | null }).distributorId !== scope) {
    throw ApiError.forbidden('This customer is not assigned to you');
  }
  return customer;
}

export const create = asyncHandler(async (req: Request, res: Response) => {
  // Tag the customer with the admin who created it (audit) and, for a regular
  // admin, assign them as the customer's distributor so they appear on that
  // admin's dashboard immediately.
  created(res, await customerService.create(req.body, req.user?.sub, scopedDistributorId(req.user)), 'Customer created');
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  await assertCustomerAccess(req);
  ok(res, await customerService.update(req.params.id, req.body), 'Customer updated');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await assertCustomerAccess(req);
  await customerService.remove(req.params.id);
  noContent(res);
});

export const restore = asyncHandler(async (req: Request, res: Response) => {
  await assertCustomerAccess(req);
  ok(res, await customerService.restore(req.params.id), 'Customer restored');
});

export const getSchedules = asyncHandler(async (req: Request, res: Response) => {
  await assertCustomerAccess(req);
  ok(res, await customerService.getSchedules(req.params.id));
});

export const updateSchedules = asyncHandler(async (req: Request, res: Response) => {
  await assertCustomerAccess(req);
  ok(res, await customerService.updateSchedules(req.params.id, req.body.schedules), 'Schedule updated');
});

export const pause = asyncHandler(async (req: Request, res: Response) => {
  await assertCustomerAccess(req);
  ok(res, await customerService.pause(req.params.id, req.body.pausedFrom, req.body.pausedTo), 'Deliveries paused');
});

export const resume = asyncHandler(async (req: Request, res: Response) => {
  await assertCustomerAccess(req);
  ok(res, await customerService.resume(req.params.id), 'Deliveries resumed');
});

export const getDeliveryDates = asyncHandler(async (req: Request, res: Response) => {
  await assertCustomerAccess(req);
  ok(res, await customerService.getDeliveryDates(req.params.id));
});

export const setDeliveryDates = asyncHandler(async (req: Request, res: Response) => {
  await assertCustomerAccess(req);
  ok(
    res,
    await customerService.setDeliveryDates(req.params.id, req.body.dates, RequestSource.ADMIN),
    'Delivery days updated',
  );
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

export const myDeliveryDates = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await customerService.getDeliveryDates(req.user!.sub));
});

export const setMyDeliveryDates = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await customerService.setDeliveryDates(req.user!.sub, req.body.dates), 'Delivery days updated');
});
