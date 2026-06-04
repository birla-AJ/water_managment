import { Request, Response } from 'express';
import { NotificationAudience } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/apiResponse';
import { getPagination, buildMeta } from '../../utils/pagination';
import { notificationService } from './notification.service';

/** Admin: list admin-audience notifications. */
export const listAdminNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query);
  const { items, total } = await notificationService.list({ audience: NotificationAudience.ADMIN, skip, take: limit });
  ok(res, items, 'Notifications', buildMeta(total, page, limit));
});

/** Customer: list their notifications. */
export const listMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPagination(req.query);
  const { items, total } = await notificationService.list({
    audience: NotificationAudience.CUSTOMER,
    customerId: req.user!.sub,
    skip,
    take: limit,
  });
  ok(res, items, 'Notifications', buildMeta(total, page, limit));
});

export const unreadCount = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = req.user!.principal === 'admin';
  const count = await notificationService.unreadCount(
    isAdmin ? { audience: NotificationAudience.ADMIN } : { audience: NotificationAudience.CUSTOMER, customerId: req.user!.sub }
  );
  ok(res, { count });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const n = await notificationService.markRead(req.params.id);
  ok(res, n, 'Marked read');
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = req.user!.principal === 'admin';
  await notificationService.markAllRead(
    isAdmin ? undefined : req.user!.sub,
    isAdmin ? NotificationAudience.ADMIN : NotificationAudience.CUSTOMER
  );
  ok(res, null, 'All marked read');
});
