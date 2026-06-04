import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/apiResponse';
import { dashboardService } from './dashboard.service';

export const overview = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await dashboardService.overview());
});

export const charts = asyncHandler(async (req: Request, res: Response) => {
  const [revenue, orders, customerGrowth, inventory] = await Promise.all([
    dashboardService.revenueChart(Number(req.query.months ?? 6)),
    dashboardService.ordersChart(Number(req.query.days ?? 14)),
    dashboardService.customerGrowthChart(Number(req.query.months ?? 6)),
    dashboardService.inventoryChart(),
  ]);
  ok(res, { revenue, orders, customerGrowth, inventory });
});
