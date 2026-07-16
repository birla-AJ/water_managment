import { Request, Response } from 'express';
import { DriverStatus } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created, noContent } from '../../utils/apiResponse';
import { getPagination, buildMeta } from '../../utils/pagination';
import { driverService } from './driver.service';

// ---- Admin CRUD ----
export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query);
  const { items, total } = await driverService.list({
    skip,
    take: limit,
    search: req.query.search as string | undefined,
    status: req.query.status as DriverStatus | undefined,
    zone: req.query.zone as string | undefined,
  });
  ok(res, items, 'Drivers', buildMeta(total, page, limit));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await driverService.getById(req.params.id));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  created(res, await driverService.create(req.body), 'Driver created');
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await driverService.update(req.params.id, req.body), 'Driver updated');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await driverService.remove(req.params.id);
  noContent(res);
});

export const restore = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await driverService.restore(req.params.id), 'Driver restored');
});

// ---- Admin assignment ----
export const assignVehicle = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await driverService.assignVehicle(req.params.id, req.body.vehicleId), 'Vehicle assigned');
});

export const assignCustomers = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await driverService.assignCustomers(req.params.id, req.body.customerIds), 'Customers assigned');
});

export const unassignCustomer = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await driverService.unassignCustomer(req.params.id, req.params.customerId), 'Customer unassigned');
});

export const notifyDriver = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await driverService.notifyDriver(req.params.id, req.body.title, req.body.body), 'Notification sent');
});
