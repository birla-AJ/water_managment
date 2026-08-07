import { Prisma, Weekday, NotificationAudience, NotificationType, RequestSource } from '@prisma/client';
import dayjs from 'dayjs';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { t } from '../../config/i18n';
import { notificationService } from '../notification/notification.service';
import { orderService } from '../order/order.service';
import { customerRepository } from './customer.repository';
import { CreateCustomerDto, UpdateCustomerDto } from './customer.dto';

const ALL_DAYS: Weekday[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

/** UTC midnight for a YYYY-MM-DD key — stable date-only value regardless of server timezone. */
const utcDate = (key: string): Date => new Date(`${key}T00:00:00.000Z`);

/** UTC midnight for the current day. */
const startOfTodayUtc = (): Date => {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
};

/** "30 Jul, 1 Aug" — readable date list for notification bodies (first 5 + count). */
const formatDateList = (keys: string[]): string => {
  const sorted = [...keys].sort();
  const shown = sorted.slice(0, 5).map((k) => dayjs(k).format('D MMM'));
  const rest = sorted.length - shown.length;
  return rest > 0 ? `${shown.join(', ')} +${rest} more` : shown.join(', ');
};

class CustomerService {
  async list(query: {
    page: number;
    limit: number;
    skip: number;
    search?: string;
    status?: string;
    customerType?: string;
    area?: string;
    distributorId?: string;
  }) {
    const where: Prisma.CustomerWhereInput = {
      // Removed (soft-deleted) customers never appear in listings.
      blockedAt: null,
      // Per-distributor scoping: a regular admin sees only their customers.
      ...(query.distributorId ? { distributorId: query.distributorId } : {}),
      ...(query.status ? { status: query.status as Prisma.EnumCustomerStatusFilter } : {}),
      ...(query.customerType ? { customerType: query.customerType as Prisma.EnumCustomerTypeFilter } : {}),
      ...(query.area ? { area: { contains: query.area, mode: 'insensitive' } } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { mobile: { contains: query.search } },
              { area: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      customerRepository.findMany({ where, orderBy: { createdAt: 'desc' }, skip: query.skip, take: query.limit }),
      customerRepository.count(where),
    ]);
    return { items, total };
  }

  async getById(id: string) {
    const customer = await customerRepository.findById(id);
    if (!customer) throw ApiError.notFound('Customer not found');
    return customer;
  }

  async create(dto: CreateCustomerDto, createdById?: string, defaultDistributorId?: string) {
    const existing = await customerRepository.findByMobile(dto.mobile);
    if (existing) throw ApiError.conflict('A customer with this mobile already exists');

    // distributorId is a relation — keep it out of the scalar spread.
    const { distributorId, ...rest } = dto;
    // Explicit choice wins; otherwise a regular admin becomes the distributor.
    const distId = distributorId ?? defaultDistributorId;

    const customer = await customerRepository.create({
      ...rest,
      securityDeposit: new Prisma.Decimal(dto.securityDeposit),
      ratePerCamper: new Prisma.Decimal(dto.ratePerCamper),
      ...(createdById ? { createdBy: { connect: { id: createdById } } } : {}),
      ...(distId ? { distributor: { connect: { id: distId } } } : {}),
    });

    // Seed a default schedule (weekdays on, Sunday off).
    await prisma.customerSchedule.createMany({
      data: ALL_DAYS.map((weekday) => ({
        customerId: customer.id,
        weekday,
        enabled: weekday !== 'SUNDAY',
        quantity: dto.allocatedCampers || 1,
      })),
      skipDuplicates: true,
    });

    return this.getById(customer.id);
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.getById(id);
    // distributorId / decimals need relation/Decimal handling — keep them out of the spread.
    const { distributorId, securityDeposit, ratePerCamper, ...rest } = dto;
    const data: Prisma.CustomerUpdateInput = { ...rest };
    if (securityDeposit !== undefined) data.securityDeposit = new Prisma.Decimal(securityDeposit);
    if (ratePerCamper !== undefined) data.ratePerCamper = new Prisma.Decimal(ratePerCamper);
    if (distributorId !== undefined) data.distributor = { connect: { id: distributorId } };
    await customerRepository.update(id, data);
    return this.getById(id);
  }

  /**
   * Soft-remove a customer: mark them blocked (hidden from lists, blocked from
   * logging in) and revoke their sessions. Orders/invoices/payments are kept.
   */
  async remove(id: string) {
    await this.getById(id);
    await prisma.customer.delete({
      where: {
        id,
      },
    });
    // await prisma.notification.deleteMany({
    //   where: {
    //     customerId: id,
    //   },
    // }),
    // await prisma.customer.update({
    //   where: { id },
    //   data: { blockedAt: new Date(), status: 'INACTIVE',driverId: null },
    // });
    // Kick any existing sessions so they can't keep using the app.
    // await prisma.refreshToken.updateMany({ where: { customerId: id }, data: { revoked: true } });
    return { id };
  }

  /** Restore a previously removed customer (re-enables login + listings). */
  async restore(id: string) {
    await this.getById(id);
    await prisma.customer.update({
      where: { id },
      data: { blockedAt: null, status: 'ACTIVE' },
    });
    return { id };
  }

  async getSchedules(id: string) {
    await this.getById(id);
    let schedules = await customerRepository.getSchedules(id);
    // Mobile self-signups have no schedule rows; seed the default (weekdays on,
    // Sunday off) on first read so the delivery calendar is meaningful.
    if (schedules.length === 0) {
      await prisma.customerSchedule.createMany({
        data: ALL_DAYS.map((weekday) => ({
          customerId: id,
          weekday,
          enabled: weekday !== 'SUNDAY',
          quantity: 1,
        })),
        skipDuplicates: true,
      });
      schedules = await customerRepository.getSchedules(id);
    }
    return schedules;
  }

  async updateSchedules(id: string, schedules: Array<{ weekday: Weekday; enabled: boolean; quantity: number }>) {
    await this.getById(id);
    await prisma.$transaction(
      schedules.map((s) =>
        prisma.customerSchedule.upsert({
          where: { customerId_weekday: { customerId: id, weekday: s.weekday } },
          update: { enabled: s.enabled, quantity: s.quantity },
          create: { customerId: id, weekday: s.weekday, enabled: s.enabled, quantity: s.quantity },
        })
      )
    );
    return this.getSchedules(id);
  }

  /** Notify the customer's assigned driver that the customer won't be receiving water. */
  private async notifyAssignedDriverOfSkip(customerId: string, detail: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { name: true, area: true, driverId: true },
    });
    if (!customer?.driverId) return;
    await notificationService.notify({
      audience: NotificationAudience.DRIVER,
      type: NotificationType.CUSTOMER_SKIPPED,
      driverId: customer.driverId,
      title: 'Customer skipped delivery',
      body: `${customer.name}${customer.area ? ` (${customer.area})` : ''} ${detail}. Skip this stop.`,
      data: { customerId },
    });
  }

  /**
   * Tell the customer's driver and distributor which days the customer just
   * asked for water on / no longer wants water on. Both audiences get the same
   * dates so the driver knows where to go and the admin can plan the load.
   */
  private async notifyDeliveryDateChange(
    customerId: string,
    change: { added: string[]; removed: string[] },
  ) {
    if (!change.added.length && !change.removed.length) return;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { name: true, area: true, driverId: true, distributorId: true },
    });
    if (!customer) return;

    const who = `${customer.name}${customer.area ? ` (${customer.area})` : ''}`;
    const todayKey = new Date().toISOString().slice(0, 10);

    for (const [type, dates] of [
      [NotificationType.DELIVERY_REQUESTED, change.added],
      [NotificationType.DELIVERY_CANCELLED, change.removed],
    ] as const) {
      if (!dates.length) continue;
      const requested = type === NotificationType.DELIVERY_REQUESTED;
      const key = requested
        ? dates.includes(todayKey)
          ? 'notify.deliveryRequestedToday'
          : 'notify.deliveryRequested'
        : 'notify.deliveryCancelled';
      const vars = { who, dates: formatDateList(dates) };
      const data = { customerId, dates: dates.join(',') };

      if (customer.driverId) {
        // Rendered in the driver's own language.
        await notificationService.notify({
          audience: NotificationAudience.DRIVER,
          type,
          driverId: customer.driverId,
          titleKey: `${key}.title`,
          bodyKey: `${key}.body`,
          vars,
          data,
        });
      }
      // The distributor (admin) who owns this customer — admin UI is English.
      await notificationService.notify({
        audience: NotificationAudience.ADMIN,
        type,
        adminId: customer.distributorId ?? undefined,
        title: t('en', `${key}.title`, vars),
        body: t('en', `${key}.body`, vars),
        data,
      });
    }
  }

  async pause(id: string, pausedFrom?: Date, pausedTo?: Date) {
    await this.getById(id);
    const updated = await customerRepository.update(id, { isPaused: true, pausedFrom, pausedTo });
    await this.notifyAssignedDriverOfSkip(id, 'paused their deliveries');
    return updated;
  }

  async resume(id: string) {
    await this.getById(id);
    return customerRepository.update(id, { isPaused: false, pausedFrom: null, pausedTo: null });
  }

  /**
   * Upcoming dates (today onward) the customer asked for water on. Deliveries are
   * opt-in: any date NOT in this list means no delivery.
   */
  async getDeliveryDates(id: string) {
    await this.getById(id);
    const requests = await prisma.deliveryRequest.findMany({
      where: { customerId: id, date: { gte: startOfTodayUtc() } },
      orderBy: { date: 'asc' },
    });
    return requests.map((r) => r.date.toISOString().slice(0, 10)); // YYYY-MM-DD
  }

  /**
   * Replace the customer's *future* delivery days with the supplied set — the
   * days they want water on. Past dates are left untouched; only today-onward
   * selections are synced. All dates are handled as UTC date-only values to avoid
   * timezone drift.
   *
   * Today's order is created / withdrawn straight away so the driver's worklist
   * reflects the change without waiting for the daily generator, and both the
   * driver and the distributor are notified about what changed.
   */
  async setDeliveryDates(id: string, dates: Date[], source: RequestSource = RequestSource.CUSTOMER) {
    await this.getById(id);
    const todayStart = startOfTodayUtc();
    const todayKey = new Date().toISOString().slice(0, 10);

    // Unique YYYY-MM-DD keys (UTC), today or later.
    const wanted = Array.from(new Set(dates.map((d) => d.toISOString().slice(0, 10)))).filter(
      (key) => utcDate(key) >= todayStart,
    );

    const existing = (
      await prisma.deliveryRequest.findMany({
        where: { customerId: id, date: { gte: todayStart } },
        select: { date: true },
      })
    ).map((r) => r.date.toISOString().slice(0, 10));

    const added = wanted.filter((key) => !existing.includes(key));
    const removed = existing.filter((key) => !wanted.includes(key));

    await prisma.$transaction([
      prisma.deliveryRequest.deleteMany({ where: { customerId: id, date: { gte: todayStart } } }),
      ...(wanted.length
        ? [
            prisma.deliveryRequest.createMany({
              data: wanted.map((key) => ({ customerId: id, date: utcDate(key), source })),
            }),
          ]
        : []),
    ]);

    // Keep today's order in step with the customer's choice.
    if (added.includes(todayKey)) await orderService.ensureRegularOrder(id, new Date());
    if (removed.includes(todayKey)) await orderService.cancelRegularOrder(id, new Date());

    await this.notifyDeliveryDateChange(id, { added, removed });

    return this.getDeliveryDates(id);
  }

  /** Customer self-profile update (limited fields, incl. location & distributor). */
  async updateProfile(id: string, dto: UpdateCustomerDto) {
    const before = await this.getById(id);
    const allowed: Prisma.CustomerUpdateInput = {
      name: dto.name,
      email: dto.email,
      address: dto.address,
      area: dto.area,
      landmark: dto.landmark,
      pincode: dto.pincode,
      latitude: dto.latitude,
      longitude: dto.longitude,
      // The customer picks their distributor from the suggestion list.
      ...(dto.distributorId ? { distributor: { connect: { id: dto.distributorId } } } : {}),
    };
    await customerRepository.update(id, allowed);
    const updated = await this.getById(id);

    // First time the customer picks (or changes) a distributor, tell that
    // admin a new customer has joined their group.
    if (dto.distributorId && dto.distributorId !== before.distributorId) {
      await this.notifyDistributorOfNewCustomer(updated, dto.distributorId);
    }

    return updated;
  }

  /** Tell the chosen admin/distributor a customer has just registered under them. */
  private async notifyDistributorOfNewCustomer(
    customer: { id: string; name: string; area?: string | null },
    distributorId: string,
  ) {
    const who = `${customer.name}${customer.area ? ` (${customer.area})` : ''}`;
    await notificationService.notify({
      audience: NotificationAudience.ADMIN,
      type: NotificationType.NEW_CUSTOMER,
      adminId: distributorId,
      title: 'New customer registered',
      body: `${who} has registered and added you as their distributor.`,
      data: { customerId: customer.id },
    });
  }
}

export const customerService = new CustomerService();
