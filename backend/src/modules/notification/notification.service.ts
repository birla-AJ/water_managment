import { NotificationAudience, NotificationType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { getFirebaseAdmin } from '../../config/firebase';
import { logger } from '../../config/logger';

interface NotifyInput {
  audience: NotificationAudience;
  type: NotificationType;
  title: string;
  body: string;
  customerId?: string;
  driverId?: string;
  data?: Record<string, string>;
}

class NotificationService {
  /** Persist a notification and (best-effort) deliver via FCM. */
  async notify(input: NotifyInput) {
    const notification = await prisma.notification.create({
      data: {
        audience: input.audience,
        type: input.type,
        title: input.title,
        body: input.body,
        customerId: input.customerId,
        driverId: input.driverId,
        data: input.data ?? undefined,
      },
    });

    // Push to customer device when applicable.
    if (input.audience === NotificationAudience.CUSTOMER && input.customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
      if (customer?.fcmToken) {
        await this.push(customer.fcmToken, input.title, input.body, input.data);
      }
    }

    // Push to driver device when applicable.
    if (input.audience === NotificationAudience.DRIVER && input.driverId) {
      const driver = await prisma.driver.findUnique({ where: { id: input.driverId } });
      if (driver?.fcmToken) {
        await this.push(driver.fcmToken, input.title, input.body, input.data);
      }
    }
    return notification;
  }

  async push(token: string, title: string, body: string, data?: Record<string, string>) {
    const fb = getFirebaseAdmin();
    if (!fb) {
      logger.debug(`[FCM skipped] ${title} -> ${token.slice(0, 8)}…`);
      return;
    }
    try {
      await fb.messaging().send({
        token,
        notification: { title, body },
        data: data ?? {},
        android: { priority: 'high' },
      });
    } catch (err) {
      logger.warn(`FCM send failed: ${(err as Error).message}`);
    }
  }

  async list(params: { audience?: NotificationAudience; customerId?: string; driverId?: string; skip: number; take: number }) {
    const where = {
      ...(params.audience ? { audience: params.audience } : {}),
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(params.driverId ? { driverId: params.driverId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: params.skip, take: params.take }),
      prisma.notification.count({ where }),
    ]);
    return { items, total };
  }

  async markRead(id: string) {
    return prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(opts: { customerId?: string; driverId?: string; audience?: NotificationAudience }) {
    return prisma.notification.updateMany({
      where: {
        ...(opts.customerId ? { customerId: opts.customerId } : {}),
        ...(opts.driverId ? { driverId: opts.driverId } : {}),
        ...(opts.audience ? { audience: opts.audience } : {}),
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  async unreadCount(params: { audience?: NotificationAudience; customerId?: string; driverId?: string }) {
    return prisma.notification.count({
      where: {
        isRead: false,
        ...(params.audience ? { audience: params.audience } : {}),
        ...(params.customerId ? { customerId: params.customerId } : {}),
        ...(params.driverId ? { driverId: params.driverId } : {}),
      },
    });
  }
}

export const notificationService = new NotificationService();
