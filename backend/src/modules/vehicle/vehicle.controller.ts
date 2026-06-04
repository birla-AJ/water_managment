import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created, noContent } from '../../utils/apiResponse';
import { getPagination, buildMeta } from '../../utils/pagination';
import { vehicleService } from './vehicle.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query);
  const isActive =
    req.query.isActive === undefined ? undefined : req.query.isActive === 'true';
  const { items, total } = await vehicleService.list({
    skip,
    take: limit,
    search: req.query.search as string | undefined,
    isActive,
  });
  ok(res, items, 'Vehicles', buildMeta(total, page, limit));
});

export const available = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await vehicleService.available(), 'Available vehicles');
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await vehicleService.getById(req.params.id));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  created(res, await vehicleService.create(req.body), 'Vehicle created');
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await vehicleService.update(req.params.id, req.body), 'Vehicle updated');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await vehicleService.remove(req.params.id);
  noContent(res);
});
