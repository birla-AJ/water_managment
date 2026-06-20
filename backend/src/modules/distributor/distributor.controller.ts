import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/apiResponse';
import { distributorService } from './distributor.service';

const num = (v: unknown): number | undefined => {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** GET /me/distributors/suggest?lat&lng&pincode&area */
export const suggest = asyncHandler(async (req: Request, res: Response) => {
  const data = await distributorService.suggest({
    latitude: num(req.query.lat),
    longitude: num(req.query.lng),
    pincode: req.query.pincode as string | undefined,
    area: req.query.area as string | undefined,
  });
  ok(res, data, 'Suggested distributors');
});

/** GET /me/distributors — every active distributor (manual picker). */
export const listAll = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await distributorService.listPublic(), 'Distributors');
});
