import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created, noContent } from '../../utils/apiResponse';
import { serviceAreaService } from './servicearea.service';

export const list = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await serviceAreaService.list(), 'Service areas');
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  created(res, await serviceAreaService.create(req.body), 'Service area created');
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await serviceAreaService.update(req.params.id, req.body), 'Service area updated');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await serviceAreaService.remove(req.params.id);
  noContent(res);
});
