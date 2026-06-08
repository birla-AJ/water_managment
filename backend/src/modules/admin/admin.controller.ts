import { Request, Response } from 'express';
import { AdminRole } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created, noContent } from '../../utils/apiResponse';
import { getPagination, buildMeta } from '../../utils/pagination';
import { adminService } from './admin.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query);
  const { items, total } = await adminService.list({
    skip,
    take: limit,
    search: req.query.search as string | undefined,
    role: req.query.role as AdminRole | undefined,
  });
  ok(res, items, 'Admins', buildMeta(total, page, limit));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await adminService.getById(req.params.id));
});

export const customers = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await adminService.customersOf(req.params.id), 'Admin customers');
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  created(res, await adminService.create(req.body), 'Admin created');
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await adminService.update(req.params.id, req.body), 'Admin updated');
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await adminService.remove(req.params.id, req.user!.sub);
  noContent(res);
});
