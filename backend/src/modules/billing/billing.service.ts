import dayjs from 'dayjs';
import {
  InvoiceStatus,
  OrderStatus,
  Prisma,
  NotificationAudience,
  NotificationType,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { generateInvoiceNumber } from '../../utils/generators';
import { notificationService } from '../notification/notification.service';
import { deliveryPerCamper } from '../../utils/delivery';
import { generateInvoicePdf } from './invoice.pdf';
import { GenerateInvoiceDto } from './billing.dto';

function dec(n: number | Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(n);
}

class BillingService {
  private async nextSequence(): Promise<number> {
    const start = dayjs().startOf('month').toDate();
    const count = await prisma.invoice.count({ where: { createdAt: { gte: start } } });
    return count + 1;
  }

  private async getBusinessSetting() {
    const s = await prisma.setting.findUnique({ where: { key: 'business' } });
    return (s?.value as Record<string, string>) ?? { name: 'WaterFlow Distributors' };
  }
  private async getBillingSetting() {
    const s = await prisma.setting.findUnique({ where: { key: 'billing' } });
    return (s?.value as { defaultRate?: number; taxPercent?: number; dueDays?: number }) ?? {};
  }

  async list(query: { skip: number; take: number; status?: InvoiceStatus; customerId?: string; distributorId?: string }) {
    const where: Prisma.InvoiceWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.distributorId ? { customer: { distributorId: query.distributorId } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
        include: { customer: { select: { id: true, name: true, mobile: true } } },
      }),
      prisma.invoice.count({ where }),
    ]);
    return { items, total };
  }

  async getById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { customer: true, items: true, payments: true },
    });
    if (!invoice) throw ApiError.notFound('Invoice not found');
    return invoice;
  }

  /** Generate an invoice for a customer over a billing period from delivered orders. */
  async generate(dto: GenerateInvoiceDto) {
    const customer = await prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) throw ApiError.notFound('Customer not found');

    const billing = await this.getBillingSetting();
    const rate = dec(dto.rate ?? Number(customer.ratePerCamper) ?? billing.defaultRate ?? 0);
    const taxPercent = dto.taxPercent ?? billing.taxPercent ?? 0;
    const dueDays = dto.dueInDays ?? billing.dueDays ?? 7;

    // Sum delivered quantities in the period.
    const orders = await prisma.order.findMany({
      where: {
        customerId: dto.customerId,
        status: OrderStatus.DELIVERED,
        orderDate: { gte: dayjs(dto.periodStart).startOf('day').toDate(), lte: dayjs(dto.periodEnd).endOf('day').toDate() },
      },
    });
    const quantity = orders.reduce((s, o) => s + o.quantity, 0);
    if (quantity === 0) throw ApiError.badRequest('No delivered orders in this period to bill');

    const campersSubtotal = rate.mul(quantity);
    // Per-order delivery charges (same quantity tiers as the order screen).
    const deliveryTotal = orders.reduce((s, o) => s + deliveryPerCamper(o.quantity) * o.quantity, 0);
    const deliveryAmount = dec(deliveryTotal);
    const subTotal = campersSubtotal.add(deliveryAmount);
    const taxAmount = campersSubtotal.mul(taxPercent).div(100); // tax on campers only
    const totalAmount = subTotal.add(taxAmount);
    const seq = await this.nextSequence();
    const invoiceNumber = generateInvoiceNumber(seq);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: dto.customerId,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        quantity,
        rate,
        subTotal,
        taxAmount,
        totalAmount,
        paidAmount: dec(0),
        dueAmount: totalAmount,
        status: InvoiceStatus.PENDING,
        dueDate: dayjs(dto.periodEnd).add(dueDays, 'day').toDate(),
        notes: dto.notes,
        items: {
          create: [
            {
              description: `Water campers (${dayjs(dto.periodStart).format('DD MMM')} - ${dayjs(dto.periodEnd).format('DD MMM')})`,
              quantity,
              rate,
              amount: campersSubtotal,
            },
            ...(deliveryTotal > 0
              ? [{ description: 'Delivery charges', quantity: 1, rate: deliveryAmount, amount: deliveryAmount }]
              : []),
          ],
        },
      },
      include: { items: true, customer: true },
    });

    await this.renderPdf(invoice.id);

    await notificationService.notify({
      audience: NotificationAudience.CUSTOMER,
      type: NotificationType.BILL_GENERATED,
      titleKey: 'notify.billGenerated.title',
      bodyKey: 'notify.billGenerated.body',
      vars: { invoiceNumber, amount: totalAmount.toFixed(2) },
      customerId: dto.customerId,
      data: { invoiceId: invoice.id },
    });

    return this.getById(invoice.id);
  }

  /** Create a standalone invoice for a single (on-demand) order, payable immediately. */
  async createForOrder(orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { customer: true } });
    if (!order) throw ApiError.notFound('Order not found');

    const billing = await this.getBillingSetting();
    const rate = dec(Number(order.customer.ratePerCamper) || billing.defaultRate || 0);
    const taxPercent = billing.taxPercent ?? 0;
    const dueDays = billing.dueDays ?? 7;

    const campersSubtotal = rate.mul(order.quantity);
    const deliveryTotal = deliveryPerCamper(order.quantity) * order.quantity;
    const deliveryAmount = dec(deliveryTotal);
    const subTotal = campersSubtotal.add(deliveryAmount);
    const taxAmount = campersSubtotal.mul(taxPercent).div(100); // tax on campers only
    const totalAmount = subTotal.add(taxAmount);

    const seq = await this.nextSequence();
    const invoiceNumber = generateInvoiceNumber(seq);
    const day = order.orderDate ?? new Date();

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: order.customerId,
        periodStart: day,
        periodEnd: day,
        quantity: order.quantity,
        rate,
        subTotal,
        taxAmount,
        totalAmount,
        paidAmount: dec(0),
        dueAmount: totalAmount,
        status: InvoiceStatus.PENDING,
        dueDate: dayjs(day).add(dueDays, 'day').toDate(),
        notes: `Order ${order.orderNumber}`,
        items: {
          create: [
            { description: `Water Camper (20L) × ${order.quantity}`, quantity: order.quantity, rate, amount: campersSubtotal },
            ...(deliveryTotal > 0
              ? [{ description: 'Delivery charges', quantity: 1, rate: deliveryAmount, amount: deliveryAmount }]
              : []),
          ],
        },
      },
      include: { items: true, customer: true },
    });

    await this.renderPdf(invoice.id);

    await notificationService.notify({
      audience: NotificationAudience.CUSTOMER,
      type: NotificationType.BILL_GENERATED,
      titleKey: 'notify.billReadyToPay.title',
      bodyKey: 'notify.billReadyToPay.body',
      vars: { invoiceNumber, amount: totalAmount.toFixed(2) },
      customerId: order.customerId,
      data: { invoiceId: invoice.id },
    });

    return this.getById(invoice.id);
  }

  /** Auto-generate invoices for all active customers for a plan period. */
  async autoGenerate(plan: 'DAILY' | 'WEEKLY' | 'MONTHLY', refDate = new Date()) {
    const map = { DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month' } as const;
    const unit = map[plan];
    const periodStart = dayjs(refDate).startOf(unit).toDate();
    const periodEnd = dayjs(refDate).endOf(unit).toDate();

    const customers = await prisma.customer.findMany({ where: { status: 'ACTIVE', customerType: plan } });
    const results: Array<{ customerId: string; invoiceId?: string; skipped?: string }> = [];

    for (const c of customers) {
      try {
        const invoice = await this.generate({ customerId: c.id, periodStart, periodEnd });
        results.push({ customerId: c.id, invoiceId: invoice.id });
      } catch (err) {
        results.push({ customerId: c.id, skipped: (err as Error).message });
      }
    }
    return { plan, periodStart: dayjs(periodStart).format('YYYY-MM-DD'), periodEnd: dayjs(periodEnd).format('YYYY-MM-DD'), results };
  }

  async renderPdf(invoiceId: string): Promise<string> {
    const invoice = await this.getById(invoiceId);
    const business = await this.getBusinessSetting();

    // Delivery summary for the billing period — so the customer sees what they're billed for.
    const periodStartDate = dayjs(invoice.periodStart).startOf('day').toDate();
    const periodEndDate = dayjs(invoice.periodEnd).endOf('day').toDate();
    const [deliveryDays, skippedDays] = await Promise.all([
      prisma.order.count({
        where: { customerId: invoice.customerId, status: OrderStatus.DELIVERED, orderDate: { gte: periodStartDate, lte: periodEndDate } },
      }),
      prisma.deliverySkip.count({
        where: { customerId: invoice.customerId, date: { gte: periodStartDate, lte: periodEndDate } },
      }),
    ]);

    const pdfUrl = await generateInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      business: { name: business.name, address: business.address, phone: business.phone, email: business.email, gstin: business.gstin },
      customer: { name: invoice.customer.name, mobile: invoice.customer.mobile, address: invoice.customer.address ?? undefined },
      periodStart: dayjs(invoice.periodStart).format('DD MMM YYYY'),
      periodEnd: dayjs(invoice.periodEnd).format('DD MMM YYYY'),
      items: invoice.items.map((i) => ({ description: i.description, quantity: i.quantity, rate: Number(i.rate), amount: Number(i.amount) })),
      subTotal: Number(invoice.subTotal),
      taxAmount: Number(invoice.taxAmount),
      totalAmount: Number(invoice.totalAmount),
      paidAmount: Number(invoice.paidAmount),
      dueAmount: Number(invoice.dueAmount),
      dueDate: invoice.dueDate ? dayjs(invoice.dueDate).format('DD MMM YYYY') : undefined,
      notes: invoice.notes ?? undefined,
      summary: {
        campersReceived: invoice.quantity,
        deliveryDays: deliveryDays || (invoice.quantity > 0 ? 1 : 0),
        skippedDays,
        ratePerCamper: Number(invoice.rate),
      },
    });
    await prisma.invoice.update({ where: { id: invoiceId }, data: { pdfUrl } });
    return pdfUrl;
  }

  /** Recompute paid/due/status after a payment is recorded. */
  async applyPayment(invoiceId: string, amount: Prisma.Decimal) {
    const invoice = await this.getById(invoiceId);
    const paidAmount = invoice.paidAmount.add(amount);
    const dueAmount = invoice.totalAmount.sub(paidAmount);
    let status: InvoiceStatus = InvoiceStatus.PARTIALLY_PAID;
    if (dueAmount.lte(0)) status = InvoiceStatus.PAID;
    else if (paidAmount.lte(0)) status = InvoiceStatus.PENDING;

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount, dueAmount: dueAmount.lt(0) ? dec(0) : dueAmount, status },
    });

    if (status === InvoiceStatus.PAID) {
      await notificationService.notify({
        audience: NotificationAudience.CUSTOMER,
        type: NotificationType.GENERAL,
        titleKey: 'notify.paid.title',
        bodyKey: 'notify.paid.body',
        vars: { invoiceNumber: invoice.invoiceNumber },
        customerId: invoice.customerId,
        data: { invoiceId },
      });
    } else if (status === InvoiceStatus.PARTIALLY_PAID) {
      await notificationService.notify({
        audience: NotificationAudience.CUSTOMER,
        type: NotificationType.GENERAL,
        titleKey: 'notify.partialPaid.title',
        bodyKey: 'notify.partialPaid.body',
        vars: { invoiceNumber: invoice.invoiceNumber, amount: (dueAmount.lt(0) ? dec(0) : dueAmount).toFixed(2) },
        customerId: invoice.customerId,
        data: { invoiceId },
      });
    }

    return updated;
  }

  async myInvoices(customerId: string) {
    return prisma.invoice.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
  }

  async myDue(customerId: string) {
    const agg = await prisma.invoice.aggregate({
      where: { customerId, status: { in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] } },
      _sum: { dueAmount: true },
    });
    return { dueAmount: Number(agg._sum.dueAmount ?? 0) };
  }

  /** Flag past-due unpaid invoices as OVERDUE and remind the customer once. */
  async sendDueReminders(now = new Date()): Promise<number> {
    const due = await prisma.invoice.findMany({
      where: {
        status: { in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID] },
        dueDate: { lt: now },
        dueAmount: { gt: 0 },
      },
    });
    for (const inv of due) {
      await prisma.invoice.update({ where: { id: inv.id }, data: { status: InvoiceStatus.OVERDUE } });
      await notificationService.notify({
        audience: NotificationAudience.CUSTOMER,
        type: NotificationType.PAYMENT_DUE_REMINDER,
        titleKey: 'notify.dueReminder.title',
        bodyKey: 'notify.dueReminder.body',
        vars: { invoiceNumber: inv.invoiceNumber, amount: inv.dueAmount.toFixed(2) },
        customerId: inv.customerId,
        data: { invoiceId: inv.id },
      });
    }
    return due.length;
  }
}

export const billingService = new BillingService();
