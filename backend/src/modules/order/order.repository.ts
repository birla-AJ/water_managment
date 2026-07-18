import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

class OrderRepository {
  findMany(args: Prisma.OrderFindManyArgs) {
    return prisma.order.findMany(args);
  }
  count(where: Prisma.OrderWhereInput) {
    return prisma.order.count({ where });
  }
  findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: { customer: { select: { id: true, name: true, mobile: true, area: true, distributorId: true } }, items: true, delivery: true },
    });
  }
  create(data: Prisma.OrderCreateInput) {
    return prisma.order.create({ data, include: { items: true } });
  }
  update(id: string, data: Prisma.OrderUpdateInput) {
    return prisma.order.update({ where: { id }, data, include: { items: true, customer: true } });
  }
}

export const orderRepository = new OrderRepository();
