import dayjs from 'dayjs';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';

export type ReportType =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'revenue'
  | 'customer'
  | 'inventory'
  | 'order'
  | 'payment';

interface DateRange {
  from: Date;
  to: Date;
}

export interface ReportResult {
  title: string;
  columns: string[];
  rows: Array<Record<string, string | number>>;
  generatedAt: string;
}

function rangeFor(type: ReportType, ref = new Date()): DateRange {
  switch (type) {
    case 'daily':
      return { from: dayjs(ref).startOf('day').toDate(), to: dayjs(ref).endOf('day').toDate() };
    case 'weekly':
      return { from: dayjs(ref).startOf('week').toDate(), to: dayjs(ref).endOf('week').toDate() };
    case 'monthly':
      return { from: dayjs(ref).startOf('month').toDate(), to: dayjs(ref).endOf('month').toDate() };
    case 'yearly':
      return { from: dayjs(ref).startOf('year').toDate(), to: dayjs(ref).endOf('year').toDate() };
    default:
      return { from: dayjs(ref).startOf('month').toDate(), to: dayjs(ref).endOf('month').toDate() };
  }
}

class ReportService {
  async build(type: ReportType, opts: { from?: Date; to?: Date } = {}): Promise<ReportResult> {
    const range = opts.from && opts.to ? { from: opts.from, to: opts.to } : rangeFor(type);
    const generatedAt = dayjs().format('YYYY-MM-DD HH:mm');

    switch (type) {
      case 'customer':
        return this.customerReport(generatedAt);
      case 'inventory':
        return this.inventoryReport(generatedAt);
      case 'payment':
        return this.paymentReport(range, generatedAt);
      case 'revenue':
        return this.revenueReport(range, generatedAt);
      case 'order':
      case 'daily':
      case 'weekly':
      case 'monthly':
      case 'yearly':
      default:
        return this.orderReport(type, range, generatedAt);
    }
  }

  private async orderReport(type: ReportType, range: DateRange, generatedAt: string): Promise<ReportResult> {
    const orders = await prisma.order.findMany({
      where: { orderDate: { gte: range.from, lte: range.to } },
      include: { customer: { select: { name: true, mobile: true, area: true } } },
      orderBy: { orderDate: 'desc' },
    });
    return {
      title: `${type[0].toUpperCase() + type.slice(1)} Order Report (${dayjs(range.from).format('DD MMM')} - ${dayjs(range.to).format('DD MMM YYYY')})`,
      columns: ['Order #', 'Date', 'Customer', 'Mobile', 'Area', 'Type', 'Qty', 'Status'],
      rows: orders.map((o) => ({
        'Order #': o.orderNumber,
        Date: dayjs(o.orderDate).format('YYYY-MM-DD'),
        Customer: o.customer.name,
        Mobile: o.customer.mobile,
        Area: o.customer.area ?? '',
        Type: o.type,
        Qty: o.quantity,
        Status: o.status,
      })),
      generatedAt,
    };
  }

  private async customerReport(generatedAt: string): Promise<ReportResult> {
    const customers = await prisma.customer.findMany({ orderBy: { createdAt: 'desc' } });
    return {
      title: 'Customer Report',
      columns: ['Name', 'Mobile', 'Area', 'Type', 'Status', 'Rate', 'Deposit', 'Allocated'],
      rows: customers.map((c) => ({
        Name: c.name,
        Mobile: c.mobile,
        Area: c.area ?? '',
        Type: c.customerType,
        Status: c.status,
        Rate: Number(c.ratePerCamper),
        Deposit: Number(c.securityDeposit),
        Allocated: c.allocatedCampers,
      })),
      generatedAt,
    };
  }

  private async inventoryReport(generatedAt: string): Promise<ReportResult> {
    const logs = await prisma.inventoryLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { admin: { select: { name: true } } },
    });
    return {
      title: 'Inventory Report',
      columns: ['Date', 'Action', 'Quantity', 'By', 'Remarks'],
      rows: logs.map((l) => ({
        Date: dayjs(l.createdAt).format('YYYY-MM-DD HH:mm'),
        Action: l.action,
        Quantity: l.quantity,
        By: l.admin?.name ?? 'System',
        Remarks: l.remarks ?? '',
      })),
      generatedAt,
    };
  }

  private async paymentReport(range: DateRange, generatedAt: string): Promise<ReportResult> {
    const payments = await prisma.payment.findMany({
      where: { createdAt: { gte: range.from, lte: range.to } },
      include: { customer: { select: { name: true, mobile: true } }, invoice: { select: { invoiceNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      title: `Payment Report (${dayjs(range.from).format('DD MMM')} - ${dayjs(range.to).format('DD MMM YYYY')})`,
      columns: ['Date', 'Customer', 'Mobile', 'Invoice', 'Amount', 'Method', 'Status'],
      rows: payments.map((p) => ({
        Date: dayjs(p.createdAt).format('YYYY-MM-DD'),
        Customer: p.customer.name,
        Mobile: p.customer.mobile,
        Invoice: p.invoice?.invoiceNumber ?? '',
        Amount: Number(p.amount),
        Method: p.method,
        Status: p.status,
      })),
      generatedAt,
    };
  }

  private async revenueReport(range: DateRange, generatedAt: string): Promise<ReportResult> {
    const payments = await prisma.payment.findMany({
      where: { status: PaymentStatus.SUCCESS, createdAt: { gte: range.from, lte: range.to } },
      select: { amount: true, createdAt: true },
    });
    const byDay: Record<string, number> = {};
    payments.forEach((p) => {
      const k = dayjs(p.createdAt).format('YYYY-MM-DD');
      byDay[k] = (byDay[k] ?? 0) + Number(p.amount);
    });
    return {
      title: `Revenue Report (${dayjs(range.from).format('DD MMM')} - ${dayjs(range.to).format('DD MMM YYYY')})`,
      columns: ['Date', 'Revenue'],
      rows: Object.entries(byDay)
        .sort()
        .map(([date, revenue]) => ({ Date: date, Revenue: revenue })),
      generatedAt,
    };
  }

  // Quick summary endpoints for KPI tiles in the report screen.
  async summary(type: ReportType) {
    const range = rangeFor(type === 'revenue' ? 'monthly' : (type as ReportType));
    const [orders, delivered, revenue] = await Promise.all([
      prisma.order.count({ where: { orderDate: { gte: range.from, lte: range.to } } }),
      prisma.order.count({ where: { status: OrderStatus.DELIVERED, orderDate: { gte: range.from, lte: range.to } } }),
      prisma.payment.aggregate({ where: { status: PaymentStatus.SUCCESS, createdAt: { gte: range.from, lte: range.to } }, _sum: { amount: true } }),
    ]);
    return { orders, delivered, revenue: Number(revenue._sum.amount ?? 0) };
  }
}

export const reportService = new ReportService();
