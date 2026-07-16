import dayjs from 'dayjs';
import {
  Prisma,
  DriverStatus,
  DeliveryStatus,
  NotificationAudience,
  NotificationType,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { notificationService } from '../notification/notification.service';
import { deliveryService } from '../delivery/delivery.service';
import { CreateDriverDto, UpdateDriverDto, MarkDeliveryDto } from './driver.dto';

const driverPublicSelect = {
  id: true,
  name: true,
  mobile: true,
  altMobile: true,
  email: true,
  licenseNumber: true,
  address: true,
  zone: true,
  status: true,
  vehicleId: true,
  isOnDuty: true,
  dutyStartedAt: true,
  lastSeenAt: true,
  createdAt: true,
  vehicle: { select: { id: true, number: true, type: true, capacity: true } },
};

class DriverService {
  // ===================== ADMIN =====================
  async list(query: { skip: number; take: number; search?: string; status?: DriverStatus; zone?: string }) {
    const where: Prisma.DriverWhereInput = {
      // Removed (soft-deleted) drivers never appear in listings.
      blockedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.zone ? { zone: { equals: query.zone, mode: 'insensitive' } } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { mobile: { contains: query.search } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
        select: { ...driverPublicSelect, _count: { select: { customers: true } } },
      }),
      prisma.driver.count({ where }),
    ]);
    return { items, total };
  }

  async getById(id: string) {
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: {
        ...driverPublicSelect,
        customers: {
          select: { id: true, name: true, mobile: true, area: true, status: true, isPaused: true },
          orderBy: { name: 'asc' },
        },
        _count: { select: { customers: true } },
      },
    });
    if (!driver) throw ApiError.notFound('Driver not found');
    return driver;
  }

  async create(dto: CreateDriverDto) {
    const existing = await prisma.driver.findUnique({ where: { mobile: dto.mobile } });
    if (existing) throw ApiError.conflict('A driver with this mobile already exists');
    // Also block numbers already used by a customer to avoid login ambiguity.
    const asCustomer = await prisma.customer.findUnique({ where: { mobile: dto.mobile } });
    if (asCustomer) throw ApiError.conflict('This mobile is already registered as a customer');

    if (dto.vehicleId) await this.assertVehicleFree(dto.vehicleId);
    return prisma.driver.create({ data: dto, select: driverPublicSelect });
  }

  async update(id: string, dto: UpdateDriverDto) {
    await this.getById(id);
    if (dto.vehicleId) await this.assertVehicleFree(dto.vehicleId, id);
    return prisma.driver.update({ where: { id }, data: dto, select: driverPublicSelect });
  }

  /**
   * Soft-remove a driver: unassign their customers and free their vehicle, mark
   * them blocked (hidden from lists, blocked from logging in), and revoke their
   * sessions. History (deliveries etc.) is preserved.
   */
  async remove(id: string) {
    await this.getById(id);
    await prisma.customer.updateMany({ where: { driverId: id }, data: { driverId: null } });
    await prisma.driver.update({
      where: { id },
      data: { blockedAt: new Date(), status: 'INACTIVE', vehicleId: null, isOnDuty: false },
    });
    await prisma.refreshToken.updateMany({ where: { driverId: id }, data: { revoked: true } });
    return { id };
  }

  /** Restore a previously removed driver (re-enables login + listings). */
  async restore(id: string) {
    await this.getById(id);
    await prisma.driver.update({
      where: { id },
      data: { blockedAt: null, status: 'ACTIVE' },
    });
    return { id };
  }

  private async assertVehicleFree(vehicleId: string, exceptDriverId?: string) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId }, include: { driver: true } });
    if (!vehicle) throw ApiError.notFound('Vehicle not found');
    if (vehicle.driver && vehicle.driver.id !== exceptDriverId) {
      throw ApiError.conflict(`Vehicle ${vehicle.number} is already assigned to ${vehicle.driver.name}`);
    }
  }

  async assignVehicle(id: string, vehicleId: string | null) {
    await this.getById(id);
    if (vehicleId) await this.assertVehicleFree(vehicleId, id);
    return prisma.driver.update({ where: { id }, data: { vehicleId }, select: driverPublicSelect });
  }

  /** Assign a set of customers to this driver (overwrites their previous driver). */
  async assignCustomers(id: string, customerIds: string[]) {
    const driver = await this.getById(id);
    await prisma.customer.updateMany({ where: { id: { in: customerIds } }, data: { driverId: id } });

    await notificationService.notify({
      audience: NotificationAudience.DRIVER,
      type: NotificationType.DRIVER_ASSIGNED,
      driverId: id,
      title: 'New customers assigned',
      body: `${customerIds.length} customer(s) have been assigned to you.`,
      data: { count: String(customerIds.length) },
    });
    return { driverId: driver.id, assigned: customerIds.length };
  }

  async unassignCustomer(driverId: string, customerId: string) {
    await prisma.customer.updateMany({ where: { id: customerId, driverId }, data: { driverId: null } });
    return { driverId, customerId };
  }

  /** Admin sends an ad-hoc notification to a driver. */
  async notifyDriver(id: string, title: string, body: string) {
    await this.getById(id);
    await notificationService.notify({
      audience: NotificationAudience.DRIVER,
      type: NotificationType.GENERAL,
      driverId: id,
      title,
      body,
    });
    return { success: true };
  }

  // ===================== DRIVER SELF-SERVICE =====================
  async profile(driverId: string) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: { ...driverPublicSelect, _count: { select: { customers: true } } },
    });
    if (!driver) throw ApiError.notFound('Driver not found');

    const start = dayjs().startOf('day').toDate();
    const end = dayjs().endOf('day').toDate();
    const deliveredToday = await prisma.delivery.count({
      where: { driverId, status: DeliveryStatus.DELIVERED, deliveryDate: { gte: start, lte: end } },
    });
    return { ...driver, stats: { assignedCustomers: driver._count.customers, deliveredToday } };
  }

  async myCustomers(driverId: string) {
    return prisma.customer.findMany({
      where: { driverId },
      select: {
        id: true,
        name: true,
        mobile: true,
        area: true,
        address: true,
        landmark: true,
        status: true,
        isPaused: true,
        allocatedCampers: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Today's delivery worklist for a driver: every assigned customer with the
   * day's order (if generated), its delivery status, and a `skipped` flag so the
   * driver knows not to visit paused / opted-out customers.
   */
  async todayDeliveries(driverId: string, dateStr?: string) {
    const day = dateStr ? dayjs(dateStr) : dayjs();
    const start = day.startOf('day').toDate();
    const end = day.endOf('day').toDate();

    const customers = await prisma.customer.findMany({
      where: { driverId },
      select: {
        id: true,
        name: true,
        mobile: true,
        area: true,
        address: true,
        landmark: true,
        isPaused: true,
        allocatedCampers: true,
        orders: {
          where: { orderDate: { gte: start, lte: end } },
          select: {
            id: true,
            orderNumber: true,
            quantity: true,
            status: true,
            type: true,
            delivery: { select: { id: true, status: true, quantityDelivered: true, emptyCollected: true } },
          },
        },
        deliverySkips: { where: { date: { gte: start, lte: end } }, select: { id: true } },
      },
      orderBy: { name: 'asc' },
    });

    return customers.map((c) => {
      const order = c.orders[0] ?? null;
      const skipped = c.isPaused || c.deliverySkips.length > 0;
      return {
        customer: {
          id: c.id,
          name: c.name,
          mobile: c.mobile,
          area: c.area,
          address: c.address,
          landmark: c.landmark,
          allocatedCampers: c.allocatedCampers,
        },
        order: order
          ? { id: order.id, orderNumber: order.orderNumber, quantity: order.quantity, status: order.status, type: order.type }
          : null,
        delivery: order?.delivery ?? null,
        skipped,
        // The driver should attempt this stop only if there's an order and it isn't skipped/already delivered.
        deliverable: Boolean(order) && !skipped && order?.delivery?.status !== DeliveryStatus.DELIVERED,
      };
    });
  }

  async markDelivered(driverId: string, dto: MarkDeliveryDto) {
    const order = await prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { customer: { select: { id: true, name: true, driverId: true } } },
    });
    if (!order) throw ApiError.notFound('Order not found');
    if (order.customer.driverId !== driverId) {
      throw ApiError.forbidden('This delivery is not assigned to you');
    }

    const delivery = await deliveryService.mark(dto.orderId, dto.status as DeliveryStatus, {
      quantityDelivered: dto.quantityDelivered,
      emptyCollected: dto.emptyCollected,
      remarks: dto.remarks,
      driverId,
    });

    // Inform admins that the driver completed/updated a delivery.
    await notificationService.notify({
      audience: NotificationAudience.ADMIN,
      type:
        dto.status === 'DELIVERED' ? NotificationType.ORDER_DELIVERED : NotificationType.GENERAL,
      title: dto.status === 'DELIVERED' ? 'Delivery completed' : 'Delivery updated',
      body: `${order.customer.name}: order ${order.orderNumber} marked ${dto.status.toLowerCase()}.`,
      data: { orderId: order.id, driverId },
    });
    return delivery;
  }

  async updateFcmToken(driverId: string, fcmToken: string) {
    await prisma.driver.update({ where: { id: driverId }, data: { fcmToken } });
    return { success: true };
  }
}

export const driverService = new DriverService();
