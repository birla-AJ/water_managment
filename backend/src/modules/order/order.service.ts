import dayjs from 'dayjs';
import {
  OrderStatus,
  OrderType,
  Prisma,
  Weekday,
  NotificationAudience,
  NotificationType,
  DeliveryStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { generateOrderNumber } from '../../utils/generators';
import { deliveryPerCamper } from '../../utils/delivery';
import { logger } from '../../config/logger';
import { notificationService } from '../notification/notification.service';
import { billingService } from '../billing/billing.service';
import { orderRepository } from './order.repository';
import { CreateOrderDto } from './order.dto';

const WEEKDAY_INDEX: Weekday[] = [
  'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY',
];


class OrderService {
  private async nextSequence(): Promise<number> {
    const start = dayjs().startOf('day').toDate();
    const end = dayjs().endOf('day').toDate();
    const count = await prisma.order.count({ where: { createdAt: { gte: start, lte: end } } });
    return count + 1;
  }

  async list(query: {
    skip: number;
    take: number;
    status?: OrderStatus;
    type?: OrderType;
    customerId?: string;
    from?: Date;
    to?: Date;
    distributorId?: string;
  }) {
    const where: Prisma.OrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      // Per-distributor scoping: only orders from this distributor's customers.
      ...(query.distributorId ? { customer: { distributorId: query.distributorId } } : {}),
      ...(query.from || query.to
        ? { orderDate: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } }
        : {}),
    };
    const [items, total] = await Promise.all([
      orderRepository.findMany({
        where,
        orderBy: { orderDate: 'desc' },
        skip: query.skip,
        take: query.take,
        include: { customer: { select: { id: true, name: true, mobile: true, area: true } }, items: true },
      }),
      orderRepository.count(where),
    ]);
    return { items, total };
  }

  async getById(id: string) {
    const order = await orderRepository.findById(id);
    if (!order) throw ApiError.notFound('Order not found');
    return order;
  }

  async create(dto: CreateOrderDto, opts: { customerId: string; bySelf: boolean }) {
    const customer = await prisma.customer.findUnique({ where: { id: opts.customerId } });
    if (!customer) throw ApiError.notFound('Customer not found');

    const rate = customer.ratePerCamper;
    const amount = rate.mul(dto.quantity);
    const seq = await this.nextSequence();

    // Quantity-based delivery charge, billed as a separate line item.
    const deliveryTotal = deliveryPerCamper(dto.quantity) * dto.quantity;
    const deliveryAmount = new Prisma.Decimal(deliveryTotal);

    const order = await orderRepository.create({
      orderNumber: generateOrderNumber(seq),
      customer: { connect: { id: customer.id } },
      type: (dto.type as OrderType) ?? OrderType.EXTRA,
      status: OrderStatus.PENDING,
      quantity: dto.quantity,
      orderDate: dto.orderDate ?? new Date(),
      remarks: dto.remarks,
      items: {
        create: [
          { name: 'Water Camper (20L)', quantity: dto.quantity, rate, amount },
          ...(deliveryTotal > 0
            ? [{ name: 'Delivery Charge', quantity: 1, rate: deliveryAmount, amount: deliveryAmount }]
            : []),
        ],
      },
    });

    // Notify admins of a new (self-placed) request.
    if (opts.bySelf) {
      await notificationService.notify({
        audience: NotificationAudience.ADMIN,
        type: NotificationType.NEW_ORDER_REQUEST,
        title: 'New order request',
        body: `${customer.name} requested ${dto.quantity} camper(s).`,
        adminId: customer.distributorId ?? undefined,
        data: { orderId: order.id },
      });
    }

    // Confirm to the customer that their order was placed.
    await notificationService.notify({
      audience: NotificationAudience.CUSTOMER,
      type: NotificationType.GENERAL,
      title: 'Order placed',
      body: `Your order ${order.orderNumber} for ${dto.quantity} camper(s) has been placed.`,
      customerId: customer.id,
      data: { orderId: order.id, status: 'PENDING' },
    });

    // Immediately generate an invoice so the order shows in Bills, payable now.
    try {
      await billingService.createForOrder(order.id);
    } catch (err) {
      logger.error(`Failed to auto-create invoice for order ${order.orderNumber}: ${(err as Error).message}`);
    }

    return this.getById(order.id);
  }

  async updateStatus(id: string, status: OrderStatus, remarks?: string) {
    const order = await this.getById(id);

    const updated = await orderRepository.update(id, { status, ...(remarks ? { remarks } : {}) });

    // Create / sync a delivery row when accepted or delivered.
    if (status === OrderStatus.DELIVERED) {
      await prisma.delivery.upsert({
        where: { orderId: id },
        update: { status: DeliveryStatus.DELIVERED, deliveryDate: new Date(), quantityDelivered: order.quantity },
        create: {
          orderId: id,
          customerId: order.customerId,
          status: DeliveryStatus.DELIVERED,
          deliveryDate: new Date(),
          quantityDelivered: order.quantity,
        },
      });
    }

    // Notify the customer on every status transition.
    const STATUS_MSG: Partial<Record<OrderStatus, { type: NotificationType; title: string; body: string }>> = {
      [OrderStatus.ACCEPTED]: {
        type: NotificationType.ORDER_ACCEPTED,
        title: 'Order accepted',
        body: `Your order ${order.orderNumber} has been accepted.`,
      },
      [OrderStatus.PROCESSING]: {
        type: NotificationType.GENERAL,
        title: 'Order in progress',
        body: `Your order ${order.orderNumber} is being prepared for delivery.`,
      },
      [OrderStatus.DELIVERED]: {
        type: NotificationType.ORDER_DELIVERED,
        title: 'Order delivered',
        body: `Your order ${order.orderNumber} was delivered. Thank you!`,
      },
      [OrderStatus.CANCELLED]: {
        type: NotificationType.GENERAL,
        title: 'Order cancelled',
        body: `Your order ${order.orderNumber} has been cancelled.`,
      },
    };
    const msg = STATUS_MSG[status];
    if (msg) {
      await notificationService.notify({
        audience: NotificationAudience.CUSTOMER,
        type: msg.type,
        title: msg.title,
        body: msg.body,
        customerId: order.customerId,
        data: { orderId: id, status },
      });
    }
    return updated;
  }

  /**
   * How many campers to deliver to a customer on a given weekday: the customer's
   * per-weekday quantity when set, otherwise their allocated campers (min 1).
   */
  private async quantityFor(customerId: string, date: Date, allocatedCampers: number): Promise<number> {
    const schedule = await prisma.customerSchedule.findUnique({
      where: { customerId_weekday: { customerId, weekday: WEEKDAY_INDEX[dayjs(date).day()] } },
      select: { quantity: true },
    });
    return schedule?.quantity || allocatedCampers || 1;
  }

  /**
   * Idempotently generate REGULAR orders for every active, non-paused customer
   * who asked for water on this date (deliveries are opt-in — a customer with no
   * request for the date gets nothing). Safe to run multiple times.
   */
  async generateRegularOrdersForDate(date: Date) {
    const weekday = WEEKDAY_INDEX[dayjs(date).day()];
    const dayStart = dayjs(date).startOf('day').toDate();
    const dayEnd = dayjs(date).endOf('day').toDate();

    const requests = await prisma.deliveryRequest.findMany({
      where: {
        date: { gte: dayStart, lte: dayEnd },
        customer: { status: 'ACTIVE', isPaused: false },
      },
      select: { customerId: true },
    });

    let created = 0;
    for (const req of requests) {
      if (await this.ensureRegularOrder(req.customerId, date)) created++;
    }
    return { date: dayjs(date).format('YYYY-MM-DD'), weekday, requested: requests.length, created };
  }

  /**
   * Create the customer's REGULAR order for a date if it doesn't exist yet.
   * Returns true when an order was created. Used by the daily generator and when
   * a customer marks a day as "water needed" so the driver sees it immediately.
   */
  async ensureRegularOrder(customerId: string, date: Date): Promise<boolean> {
    const dayStart = dayjs(date).startOf('day').toDate();
    const dayEnd = dayjs(date).endOf('day').toDate();

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer || customer.status !== 'ACTIVE' || customer.isPaused) return false;

    const existing = await prisma.order.findFirst({
      where: { customerId, type: OrderType.REGULAR, orderDate: { gte: dayStart, lte: dayEnd } },
      orderBy: { createdAt: 'desc' },
    });
    // A day un-marked and marked again reuses the cancelled order instead of
    // creating a second one for the same date.
    if (existing) {
      if (existing.status !== OrderStatus.CANCELLED) return false;
      await prisma.order.update({ where: { id: existing.id }, data: { status: OrderStatus.ACCEPTED } });
      return true;
    }

    const quantity = await this.quantityFor(customerId, date, customer.allocatedCampers);
    const rate = customer.ratePerCamper;
    const seq = await this.nextSequence();
    await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(seq),
        customerId,
        type: OrderType.REGULAR,
        status: OrderStatus.ACCEPTED,
        quantity,
        orderDate: dayjs(date).startOf('day').toDate(),
        items: {
          create: [{ name: 'Water Camper (20L)', quantity, rate, amount: rate.mul(quantity) }],
        },
      },
    });
    return true;
  }

  /**
   * Withdraw the customer's REGULAR order for a date — used when they un-mark a
   * day they had asked water for. Already-delivered orders are left alone.
   */
  async cancelRegularOrder(customerId: string, date: Date): Promise<boolean> {
    const dayStart = dayjs(date).startOf('day').toDate();
    const dayEnd = dayjs(date).endOf('day').toDate();

    const order = await prisma.order.findFirst({
      where: {
        customerId,
        type: OrderType.REGULAR,
        orderDate: { gte: dayStart, lte: dayEnd },
        status: { notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] },
      },
      include: { delivery: { select: { status: true } } },
    });
    if (!order || order.delivery?.status === DeliveryStatus.DELIVERED) return false;

    await prisma.order.update({ where: { id: order.id }, data: { status: OrderStatus.CANCELLED } });
    return true;
  }
}

export const orderService = new OrderService();
