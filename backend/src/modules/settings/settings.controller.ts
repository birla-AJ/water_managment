import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/apiResponse';
import { ApiError } from '../../utils/apiError';
import { settingsService } from './settings.service';

export const getAll = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await settingsService.getAll());
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await settingsService.get(req.params.key));
});

export const upsert = asyncHandler(async (req: Request, res: Response) => {
  if (typeof req.body !== 'object' || Array.isArray(req.body)) throw ApiError.badRequest('Body must be a settings object');
  ok(res, await settingsService.upsert(req.params.key, req.body), 'Setting saved');
});
