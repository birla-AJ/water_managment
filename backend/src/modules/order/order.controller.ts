import { Request, Response } from 'express';
import { OrderStatus, OrderType } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created } from '../../utils/apiResponse';
import { getPagination, buildMeta } from '../../utils/pagination';
import { ApiError } from '../../utils/apiError';
import { orderService } from './order.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query);
  const { items, total } = await orderService.list({
    skip,
    take: limit,
    status: req.query.status as OrderStatus | undefined,
    type: req.query.type as OrderType | undefined,
    customerId: req.query.customerId as string | undefined,
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
  });
  ok(res, items, 'Orders', buildMeta(total, page, limit));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await orderService.getById(req.params.id));
});

// Admin creates an order on behalf of a customer.
export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.body.customerId) throw ApiError.badRequest('customerId is required');
  const order = await orderService.create(req.body, { customerId: req.body.customerId, bySelf: false });
  created(res, order, 'Order created');
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await orderService.updateStatus(req.params.id, req.body.status, req.body.remarks), 'Order updated');
});

// ---- Customer self-service ----
export const createMine = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.create(
    { ...req.body, type: 'EXTRA' },
    { customerId: req.user!.sub, bySelf: true }
  );
  created(res, order, 'Order placed');
});

export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query);
  const { items, total } = await orderService.list({
    skip,
    take: limit,
    customerId: req.user!.sub,
    status: req.query.status as OrderStatus | undefined,
  });
  ok(res, items, 'My orders', buildMeta(total, page, limit));
});
