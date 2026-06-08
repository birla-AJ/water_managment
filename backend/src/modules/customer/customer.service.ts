import { Prisma, Weekday, NotificationAudience, NotificationType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { notificationService } from '../notification/notification.service';
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

class CustomerService {
  async list(query: {
    page: number;
    limit: number;
    skip: number;
    search?: string;
    status?: string;
    customerType?: string;
    area?: string;
  }) {
    const where: Prisma.CustomerWhereInput = {
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

  async create(dto: CreateCustomerDto, createdById?: string) {
    const existing = await customerRepository.findByMobile(dto.mobile);
    if (existing) throw ApiError.conflict('A customer with this mobile already exists');

    const customer = await customerRepository.create({
      ...dto,
      securityDeposit: new Prisma.Decimal(dto.securityDeposit),
      ratePerCamper: new Prisma.Decimal(dto.ratePerCamper),
      ...(createdById ? { createdBy: { connect: { id: createdById } } } : {}),
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
    const data: Prisma.CustomerUpdateInput = { ...dto };
    if (dto.securityDeposit !== undefined) data.securityDeposit = new Prisma.Decimal(dto.securityDeposit);
    if (dto.ratePerCamper !== undefined) data.ratePerCamper = new Prisma.Decimal(dto.ratePerCamper);
    await customerRepository.update(id, data);
    return this.getById(id);
  }

  async remove(id: string) {
    await this.getById(id);
    await customerRepository.delete(id);
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

  /** Upcoming dates (today onward) the customer marked as unavailable. */
  async getSkipDates(id: string) {
    await this.getById(id);
    const skips = await prisma.deliverySkip.findMany({
      where: { customerId: id, date: { gte: startOfTodayUtc() } },
      orderBy: { date: 'asc' },
    });
    return skips.map((s) => s.date.toISOString().slice(0, 10)); // YYYY-MM-DD
  }

  /**
   * Replace the customer's *future* skip dates with the supplied set.
   * Past dates are left untouched; only today-onward selections are synced.
   * All dates are handled as UTC date-only values to avoid timezone drift.
   */
  async setSkipDates(id: string, dates: Date[]) {
    await this.getById(id);
    const todayStart = startOfTodayUtc();

    // Unique YYYY-MM-DD keys (UTC), today or later.
    const wanted = Array.from(new Set(dates.map((d) => d.toISOString().slice(0, 10)))).filter(
      (key) => utcDate(key) >= todayStart,
    );

    await prisma.$transaction([
      prisma.deliverySkip.deleteMany({ where: { customerId: id, date: { gte: todayStart } } }),
      ...(wanted.length
        ? [prisma.deliverySkip.createMany({ data: wanted.map((key) => ({ customerId: id, date: utcDate(key) })) })]
        : []),
    ]);

    // If today is among the newly-skipped dates, let the assigned driver know.
    if (wanted.includes(new Date().toISOString().slice(0, 10))) {
      await this.notifyAssignedDriverOfSkip(id, 'marked today as unavailable');
    }

    return this.getSkipDates(id);
  }

  /** Customer self-profile update (limited fields). */
  async updateProfile(id: string, dto: UpdateCustomerDto) {
    await this.getById(id);
    const allowed: Prisma.CustomerUpdateInput = {
      name: dto.name,
      email: dto.email,
      address: dto.address,
      area: dto.area,
      landmark: dto.landmark,
      altMobile: dto.altMobile,
    };
    await customerRepository.update(id, allowed);
    return this.getById(id);
  }
}

export const customerService = new CustomerService();
