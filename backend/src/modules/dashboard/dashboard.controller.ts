import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/apiResponse';
import { scopedDistributorId } from '../../utils/scope';
import { dashboardService } from './dashboard.service';

export const overview = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await dashboardService.overview(scopedDistributorId(req.user)));
});

export const charts = asyncHandler(async (req: Request, res: Response) => {
  const dist = scopedDistributorId(req.user);
  const [revenue, orders, customerGrowth, inventory] = await Promise.all([
    dashboardService.revenueChart(Number(req.query.months ?? 6), dist),
    dashboardService.ordersChart(Number(req.query.days ?? 14), dist),
    dashboardService.customerGrowthChart(Number(req.query.months ?? 6), dist),
    dashboardService.inventoryChart(dist),
  ]);
  ok(res, { revenue, orders, customerGrowth, inventory });
});
