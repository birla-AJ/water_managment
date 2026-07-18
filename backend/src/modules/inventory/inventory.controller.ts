import { Request, Response } from 'express';
import { InventoryAction } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/apiResponse';
import { getPagination, buildMeta } from '../../utils/pagination';
import { inventoryService } from './inventory.service';
import { scopedDistributorId } from '../../utils/scope';

export const get = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await inventoryService.get(scopedDistributorId(req.user)));
});

export const logs = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query);
  const { items, total } = await inventoryService.logs({
    skip,
    take: limit,
    action: req.query.action as InventoryAction | undefined,
    adminId: scopedDistributorId(req.user),
  });
  ok(res, items, 'Inventory logs', buildMeta(total, page, limit));
});

export const adjust = asyncHandler(async (req: Request, res: Response) => {
  const inv = await inventoryService.adjust(req.body.action, req.body.quantity, scopedDistributorId(req.user), req.body.remarks);
  ok(res, inv, 'Inventory updated');
});
