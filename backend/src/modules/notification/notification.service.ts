import { NotificationAudience, NotificationType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { getFirebaseAdmin } from '../../config/firebase';
import { env } from '../../config/env';
import { waSend, toWaNumber } from '../../config/whatsapp';
import { t } from '../../config/i18n';
import { logger } from '../../config/logger';

interface NotifyInput {
  audience: NotificationAudience;
  type: NotificationType;
  // Provide EITHER localization keys (preferred, rendered in the recipient's
  // language) or literal title/body (used as-is / fallback).
  titleKey?: string;
  bodyKey?: string;
  vars?: Record<string, string | number>;
  title?: string;
  body?: string;
  customerId?: string;
  driverId?: string;
  data?: Record<string, string>;
}

class NotificationService {
  /**
   * Persist a notification and (best-effort) deliver via FCM + WhatsApp. When
   * the input carries titleKey/bodyKey, the text is rendered in the recipient's
   * chosen language (customer/driver); otherwise the literal title/body is used.
   */
  async notify(input: NotifyInput) {
    // Resolve the recipient (for language + delivery targets) up front so the
    // stored text is already in their language.
    const customer =
      input.audience === NotificationAudience.CUSTOMER && input.customerId
        ? await prisma.customer.findUnique({
            where: { id: input.customerId },
            select: { fcmToken: true, mobile: true, distributorId: true, language: true },
          })
        : null;
    const driver =
      input.audience === NotificationAudience.DRIVER && input.driverId
        ? await prisma.driver.findUnique({
            where: { id: input.driverId },
            select: { fcmToken: true, language: true },
          })
        : null;

    const lang = customer?.language ?? driver?.language ?? 'en';
    const title = input.titleKey ? t(lang, input.titleKey, input.vars) : input.title ?? '';
    const body = input.bodyKey ? t(lang, input.bodyKey, input.vars) : input.body ?? '';

    const notification = await prisma.notification.create({
      data: {
        audience: input.audience,
        type: input.type,
        title,
        body,
        customerId: input.customerId,
        driverId: input.driverId,
        data: input.data ?? undefined,
      },
    });

    // Push to customer device when applicable.
    if (customer) {
      if (customer.fcmToken) {
        await this.push(customer.fcmToken, title, body, input.data);
      }
      // Also send over WhatsApp from the customer's distributor (admin) number.
      // Best-effort: the in-app notification + FCM above already delivered, so
      // if the admin's WhatsApp is offline we simply log and move on.
      if (env.whatsapp.enabled && customer.mobile && customer.distributorId) {
        const r = await waSend({
          to: toWaNumber(customer.mobile),
          text: `${title}\n${body}`,
          tenantId: customer.distributorId,
        });
        if (!r.sent) {
          logger.info(`[WhatsApp] notify not sent to ${customer.mobile} (${r.reason})`);
        }
      }
    }

    // Push to driver device when applicable.
    if (driver) {
      if (driver.fcmToken) {
        await this.push(driver.fcmToken, title, body, input.data);
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
