import { Request, Response } from 'express';
import { DeliveryStatus } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/apiResponse';
import { getPagination, buildMeta } from '../../utils/pagination';
import { deliveryService } from './delivery.service';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query);
  const { items, total } = await deliveryService.list({
    skip,
    take: limit,
    status: req.query.status as DeliveryStatus | undefined,
    customerId: req.query.customerId as string | undefined,
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
  });
  ok(res, items, 'Deliveries', buildMeta(total, page, limit));
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await deliveryService.getById(req.params.id));
});

export const mark = asyncHandler(async (req: Request, res: Response) => {
  const { orderId, status, ...rest } = req.body;
  ok(res, await deliveryService.mark(orderId, status, rest), 'Delivery updated');
});

// ---- Customer self-service ----
export const myDeliveries = asyncHandler(async (req: Request, res: Response) => {
  const items = await deliveryService.myDeliveries(req.user!.sub, {
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
  });
  ok(res, items, 'My deliveries');
});

export const mySummary = asyncHandler(async (req: Request, res: Response) => {
  const period = (req.query.period === 'month' ? 'month' : 'week') as 'week' | 'month';
  ok(res, await deliveryService.mySummary(req.user!.sub, period));
});
