import { Prisma, Weekday } from '@prisma/client';
import { prisma } from '../../config/prisma';

/** Data-access layer for customers (Repository pattern). */
class CustomerRepository {
  findMany(args: Prisma.CustomerFindManyArgs) {
    return prisma.customer.findMany(args);
  }
  count(where: Prisma.CustomerWhereInput) {
    return prisma.customer.count({ where });
  }
  findById(id: string) {
    return prisma.customer.findUnique({
      where: { id },
      include: { schedules: { orderBy: { weekday: 'asc' } } },
    });
  }
  findByMobile(mobile: string) {
    return prisma.customer.findUnique({ where: { mobile } });
  }
  create(data: Prisma.CustomerCreateInput) {
    return prisma.customer.create({ data });
  }
  update(id: string, data: Prisma.CustomerUpdateInput) {
    return prisma.customer.update({ where: { id }, data });
  }
  delete(id: string) {
    return prisma.customer.delete({ where: { id } });
  }
  upsertSchedule(customerId: string, weekday: Weekday, enabled: boolean, quantity: number) {
    return prisma.customerSchedule.upsert({
      where: { customerId_weekday: { customerId, weekday } },
      update: { enabled, quantity },
      create: { customerId, weekday, enabled, quantity },
    });
  }
  getSchedules(customerId: string) {
    return prisma.customerSchedule.findMany({ where: { customerId }, orderBy: { weekday: 'asc' } });
  }
}

export const customerRepository = new CustomerRepository();
