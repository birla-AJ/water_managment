import dayjs from 'dayjs';
import { DeliveryStatus, OrderStatus, Prisma, NotificationAudience, NotificationType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { notificationService } from '../notification/notification.service';

class DeliveryService {
  async list(query: { skip: number; take: number; status?: DeliveryStatus; customerId?: string; from?: Date; to?: Date }) {
    const where: Prisma.DeliveryWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.from || query.to
        ? { deliveryDate: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
        include: {
          customer: { select: { id: true, name: true, mobile: true, area: true } },
          order: { select: { orderNumber: true, type: true } },
        },
      }),
      prisma.delivery.count({ where }),
    ]);
    return { items, total };
  }

  async getById(id: string) {
    const d = await prisma.delivery.findUnique({
      where: { id },
      include: { customer: true, order: true },
    });
    if (!d) throw ApiError.notFound('Delivery not found');
    return d;
  }

  async mark(orderId: string, status: DeliveryStatus, payload: { quantityDelivered?: number; emptyCollected?: number; remarks?: string }) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw ApiError.notFound('Order not found');

    const delivery = await prisma.delivery.upsert({
      where: { orderId },
      update: {
        status,
        deliveryDate: status === DeliveryStatus.DELIVERED ? new Date() : null,
        quantityDelivered: payload.quantityDelivered ?? order.quantity,
        emptyCollected: payload.emptyCollected ?? 0,
        remarks: payload.remarks,
      },
      create: {
        orderId,
        customerId: order.customerId,
        status,
        deliveryDate: status === DeliveryStatus.DELIVERED ? new Date() : null,
        quantityDelivered: payload.quantityDelivered ?? order.quantity,
        emptyCollected: payload.emptyCollected ?? 0,
        remarks: payload.remarks,
      },
    });

    // Keep order status in sync.
    const orderStatus =
      status === DeliveryStatus.DELIVERED
        ? OrderStatus.DELIVERED
        : status === DeliveryStatus.CANCELLED
          ? OrderStatus.CANCELLED
          : OrderStatus.PROCESSING;
    await prisma.order.update({ where: { id: orderId }, data: { status: orderStatus } });

    if (status === DeliveryStatus.DELIVERED) {
      await notificationService.notify({
        audience: NotificationAudience.CUSTOMER,
        type: NotificationType.ORDER_DELIVERED,
        title: 'Delivery completed',
        body: `${payload.quantityDelivered ?? order.quantity} camper(s) delivered. Thank you!`,
        customerId: order.customerId,
        data: { orderId },
      });
    }
    return delivery;
  }

  /** Customer-facing list of their own deliveries within an optional range. */
  async myDeliveries(customerId: string, range?: { from?: Date; to?: Date }) {
    return prisma.delivery.findMany({
      where: {
        customerId,
        ...(range?.from || range?.to
          ? { deliveryDate: { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) } }
          : {}),
      },
      orderBy: { deliveryDate: 'desc' },
      include: { order: { select: { orderNumber: true, type: true } } },
    });
  }

  /** Summary counts for "My Deliveries" weekly / monthly views. */
  async mySummary(customerId: string, period: 'week' | 'month') {
    const from = dayjs().startOf(period).toDate();
    const to = dayjs().endOf(period).toDate();
    const deliveries = await prisma.delivery.findMany({
      where: { customerId, deliveryDate: { gte: from, lte: to } },
    });
    const totalDelivered = deliveries.reduce((s, d) => s + d.quantityDelivered, 0);
    return {
      period,
      from: dayjs(from).format('YYYY-MM-DD'),
      to: dayjs(to).format('YYYY-MM-DD'),
      count: deliveries.length,
      totalDelivered,
    };
  }
}

export const deliveryService = new DeliveryService();
