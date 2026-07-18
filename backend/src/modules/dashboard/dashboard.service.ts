import dayjs from 'dayjs';
import {
  CustomerStatus,
  OrderStatus,
  InvoiceStatus,
  PaymentStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma';

// Per-distributor scoping helpers. `cf` filters the customer table directly;
// `crf` filters order/payment/invoice tables via their customer relation. Both
// are empty (`{}`) for the super-admin, leaving figures global.
const cf = (distributorId?: string) => (distributorId ? { distributorId } : {});
const crf = (distributorId?: string) => (distributorId ? { customer: { distributorId } } : {});

class DashboardService {
  async overview(distributorId?: string) {
    const todayStart = dayjs().startOf('day').toDate();
    const todayEnd = dayjs().endOf('day').toDate();
    const monthStart = dayjs().startOf('month').toDate();

    const [
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      totalOrders,
      todayOrders,
      deliveredOrders,
      pendingOrders,
      cancelledOrders,
      inventory,
      totalRevenueAgg,
      monthlyRevenueAgg,
      pendingPaymentsAgg,
      paidPaymentsAgg,
    ] = await Promise.all([
      prisma.customer.count({ where: { ...cf(distributorId) } }),
      prisma.customer.count({ where: { status: CustomerStatus.ACTIVE, ...cf(distributorId) } }),
      prisma.customer.count({ where: { status: CustomerStatus.INACTIVE, ...cf(distributorId) } }),
      prisma.order.count({ where: { ...crf(distributorId) } }),
      prisma.order.count({ where: { orderDate: { gte: todayStart, lte: todayEnd }, ...crf(distributorId) } }),
      prisma.order.count({ where: { status: OrderStatus.DELIVERED, ...crf(distributorId) } }),
      prisma.order.count({ where: { status: OrderStatus.PENDING, ...crf(distributorId) } }),
      prisma.order.count({ where: { status: OrderStatus.CANCELLED, ...crf(distributorId) } }),
      prisma.inventory.findUnique({ where: distributorId ? { adminId: distributorId } : { id: 'default' } }),
      prisma.payment.aggregate({ where: { status: PaymentStatus.SUCCESS, ...crf(distributorId) }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: PaymentStatus.SUCCESS, createdAt: { gte: monthStart }, ...crf(distributorId) }, _sum: { amount: true } }),
      prisma.invoice.aggregate({ where: { status: { in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] }, ...crf(distributorId) }, _sum: { dueAmount: true } }),
      prisma.invoice.aggregate({ where: { status: InvoiceStatus.PAID, ...crf(distributorId) }, _sum: { totalAmount: true } }),
    ]);

    return {
      customers: { total: totalCustomers, active: activeCustomers, inactive: inactiveCustomers },
      orders: {
        total: totalOrders,
        today: todayOrders,
        delivered: deliveredOrders,
        pending: pendingOrders,
        cancelled: cancelledOrders,
      },
      revenue: {
        total: Number(totalRevenueAgg._sum.amount ?? 0),
        monthly: Number(monthlyRevenueAgg._sum.amount ?? 0),
      },
      payments: {
        pending: Number(pendingPaymentsAgg._sum.dueAmount ?? 0),
        paid: Number(paidPaymentsAgg._sum.totalAmount ?? 0),
      },
      inventory: {
        total: inventory?.totalCampers ?? 0,
        filled: inventory?.filledCampers ?? 0,
        empty: inventory?.emptyCampers ?? 0,
        damaged: inventory?.damagedCampers ?? 0,
        lost: inventory?.lostCampers ?? 0,
        returned: inventory?.returnedCampers ?? 0,
        allocated: inventory?.allocatedCampers ?? 0,
      },
    };
  }

  /** Revenue per month for the last N months. */
  async revenueChart(months = 6, distributorId?: string) {
    const start = dayjs().subtract(months - 1, 'month').startOf('month').toDate();
    const payments = await prisma.payment.findMany({
      where: { status: PaymentStatus.SUCCESS, createdAt: { gte: start }, ...crf(distributorId) },
      select: { amount: true, createdAt: true },
    });
    const buckets: Record<string, number> = {};
    for (let i = 0; i < months; i++) {
      buckets[dayjs().subtract(i, 'month').format('MMM YYYY')] = 0;
    }
    payments.forEach((p) => {
      const key = dayjs(p.createdAt).format('MMM YYYY');
      if (key in buckets) buckets[key] += Number(p.amount);
    });
    return Object.entries(buckets)
      .reverse()
      .map(([month, revenue]) => ({ month, revenue }));
  }

  /** Orders per day for the last N days, split by status. */
  async ordersChart(days = 14, distributorId?: string) {
    const start = dayjs().subtract(days - 1, 'day').startOf('day').toDate();
    const orders = await prisma.order.findMany({
      where: { orderDate: { gte: start }, ...crf(distributorId) },
      select: { orderDate: true, status: true },
    });
    const buckets: Record<string, { delivered: number; pending: number; cancelled: number; total: number }> = {};
    for (let i = 0; i < days; i++) {
      buckets[dayjs().subtract(i, 'day').format('DD MMM')] = { delivered: 0, pending: 0, cancelled: 0, total: 0 };
    }
    orders.forEach((o) => {
      const key = dayjs(o.orderDate).format('DD MMM');
      if (!(key in buckets)) return;
      buckets[key].total++;
      if (o.status === OrderStatus.DELIVERED) buckets[key].delivered++;
      else if (o.status === OrderStatus.CANCELLED) buckets[key].cancelled++;
      else buckets[key].pending++;
    });
    return Object.entries(buckets)
      .reverse()
      .map(([date, v]) => ({ date, ...v }));
  }

  /** New customers per month for the last N months. */
  async customerGrowthChart(months = 6, distributorId?: string) {
    const start = dayjs().subtract(months - 1, 'month').startOf('month').toDate();
    const customers = await prisma.customer.findMany({ where: { createdAt: { gte: start }, ...cf(distributorId) }, select: { createdAt: true } });
    const buckets: Record<string, number> = {};
    for (let i = 0; i < months; i++) buckets[dayjs().subtract(i, 'month').format('MMM YYYY')] = 0;
    customers.forEach((c) => {
      const key = dayjs(c.createdAt).format('MMM YYYY');
      if (key in buckets) buckets[key]++;
    });
    return Object.entries(buckets)
      .reverse()
      .map(([month, count]) => ({ month, count }));
  }

  async inventoryChart(distributorId?: string) {
    const inv = await prisma.inventory.findUnique({ where: distributorId ? { adminId: distributorId } : { id: 'default' } });
    return [
      { name: 'Filled', value: inv?.filledCampers ?? 0 },
      { name: 'Empty', value: inv?.emptyCampers ?? 0 },
      { name: 'Allocated', value: inv?.allocatedCampers ?? 0 },
      { name: 'Damaged', value: inv?.damagedCampers ?? 0 },
      { name: 'Lost', value: inv?.lostCampers ?? 0 },
      { name: 'Returned', value: inv?.returnedCampers ?? 0 },
    ];
  }
}

export const dashboardService = new DashboardService();
