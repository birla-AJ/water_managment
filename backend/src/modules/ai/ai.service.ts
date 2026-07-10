import dayjs from 'dayjs';
import { DeliveryStatus, InvoiceStatus, OrderStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { ApiError } from '../../utils/apiError';
import { JwtPayload } from '../../utils/jwt';
import { customerRelationScope, customerScope, scopedDistributorId } from '../../utils/scope';
import { AiChatResponse, AiChart, AiTable } from './ai.types';
import { polishWithOpenAi } from './ai.provider';

type AdminIntent =
  | 'monthly_earning'
  | 'daily_performance'
  | 'pending_payments'
  | 'driver_performance'
  | 'area_delivery'
  | 'customer_growth'
  | 'inventory_status'
  | 'billing_summary'
  | 'overview';

type CustomerIntent = 'monthly_deliveries' | 'billing_due' | 'payment_history' | 'active_delivery' | 'orders' | 'account_summary';

const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const number = (v: unknown) => Number(v ?? 0);

function detectLanguage(message: string) {
  if (/[\u0900-\u097F]/.test(message)) return 'hi';
  const lower = message.toLowerCase();
  if (/\b(kya|kitna|kitne|mahine|paisa|paise|hisab|baki|aaj|kal|driver|kamai)\b/.test(lower)) return 'hi-Latn';
  return 'en';
}

function adminIntent(message: string, explicit?: string): AdminIntent {
  const m = `${explicit ?? ''} ${message}`.toLowerCase();
  if (m.includes('inventory') || m.includes('stock') || m.includes('camper')) return 'inventory_status';
  if (m.includes('driver')) return 'driver_performance';
  if (m.includes('area') || m.includes('zone') || m.includes('locality')) return 'area_delivery';
  if (m.includes('growth') || m.includes('new customer')) return 'customer_growth';
  if (m.includes('billing') || m.includes('invoice')) return 'billing_summary';
  if (m.includes('pending') || m.includes('due') || m.includes('payment')) return 'pending_payments';
  if (m.includes('daily') || m.includes('today') || m.includes('aaj')) return 'daily_performance';
  if (m.includes('earning') || m.includes('revenue') || m.includes('kamai') || m.includes('month')) return 'monthly_earning';
  return 'overview';
}

function customerIntent(message: string, explicit?: string): CustomerIntent {
  const m = `${explicit ?? ''} ${message}`.toLowerCase();
  if (m.includes('delivery') || m.includes('received') || m.includes('recieved') || m.includes('camp') || m.includes('kitne')) return 'monthly_deliveries';
  if (m.includes('track') || m.includes('driver') || m.includes('time')) return 'active_delivery';
  if (m.includes('pay') || m.includes('paid') || m.includes('payment')) return 'payment_history';
  if (m.includes('bill') || m.includes('invoice') || m.includes('due') || m.includes('baki')) return 'billing_due';
  if (m.includes('order')) return 'orders';
  return 'account_summary';
}

function answerText(language: string, en: string, hi: string) {
  return language === 'en' ? en : hi;
}

class AiService {
  adminSuggestions = [
    'Monthly earning',
    'Daily performance',
    'Pending payments',
    'Driver performance',
    'Area-wise delivery',
    'Customer growth',
    'Inventory status',
    'Billing summary',
  ];

  async askAdmin(user: JwtPayload, message: string, explicitIntent?: string): Promise<AiChatResponse> {
    const language = detectLanguage(message);
    const intent = adminIntent(message, explicitIntent);
    const distributorId = scopedDistributorId(user);
    const response = await this.buildAdminResponse(intent, language, user, distributorId);
    return this.polish(response, message, language, 'ADMIN');
  }

  async askCustomer(customerId: string, message: string, explicitIntent?: string): Promise<AiChatResponse> {
    const remainingQuestions = await this.consumeCustomerQuestion(customerId);
    const language = detectLanguage(message);
    const intent = customerIntent(message, explicitIntent);
    const response = await this.buildCustomerResponse(intent, language, customerId);
    const polished = await this.polish(response, message, language, 'CUSTOMER');
    return { ...polished, remainingQuestions };
  }

  async customerUsage(customerId: string) {
    const date = dayjs().startOf('day').toDate();
    const usage = await prisma.aiChatUsage.findUnique({ where: { customerId_date: { customerId, date } } });
    return { used: usage?.count ?? 0, limit: env.ai.customerDailyLimit, remaining: Math.max(0, env.ai.customerDailyLimit - (usage?.count ?? 0)) };
  }

  private async consumeCustomerQuestion(customerId: string) {
    const date = dayjs().startOf('day').toDate();
    const usage = await prisma.aiChatUsage.findUnique({ where: { customerId_date: { customerId, date } } });
    if ((usage?.count ?? 0) >= env.ai.customerDailyLimit) {
      throw new ApiError(429, `Daily AI chat limit reached. You can ask ${env.ai.customerDailyLimit} questions per day.`);
    }
    if (usage) {
      const updated = await prisma.aiChatUsage.update({ where: { id: usage.id }, data: { count: { increment: 1 } } });
      return Math.max(0, env.ai.customerDailyLimit - updated.count);
    }
    await prisma.aiChatUsage.create({ data: { customerId, date, count: 1 } });
    return Math.max(0, env.ai.customerDailyLimit - 1);
  }

  private async polish(base: AiChatResponse, userQuestion: string, language: string, scope: 'ADMIN' | 'CUSTOMER') {
    const facts = JSON.stringify({ cards: base.cards, table: base.table, chart: base.chart });
    const fallback = base.answer;
    const polished = await polishWithOpenAi(
      [
        {
          role: 'system',
          content:
            'You are WaterFlow ERP assistant. Answer only from supplied facts. Keep it short, practical, and in the same language/script as the user. Never invent data. If facts are empty, say data is not available.',
        },
        {
          role: 'user',
          content: `Scope: ${scope}\nLanguage: ${language}\nQuestion: ${userQuestion}\nFacts: ${facts}\nDraft answer: ${fallback}`,
        },
      ],
      fallback,
    );
    return { ...base, answer: polished.text, provider: polished.provider };
  }

  private async buildAdminResponse(intent: AdminIntent, language: string, user: JwtPayload, distributorId?: string): Promise<AiChatResponse> {
    const monthStart = dayjs().startOf('month').toDate();
    const todayStart = dayjs().startOf('day').toDate();
    const todayEnd = dayjs().endOf('day').toDate();
    const crf = customerRelationScope(user);
    const cf = customerScope(user);

    if (intent === 'inventory_status') {
      const inv = await prisma.inventory.findUnique({ where: { id: 'default' } });
      const rows = [
        { status: 'Filled', campers: inv?.filledCampers ?? 0 },
        { status: 'Empty', campers: inv?.emptyCampers ?? 0 },
        { status: 'Allocated', campers: inv?.allocatedCampers ?? 0 },
        { status: 'Damaged', campers: inv?.damagedCampers ?? 0 },
        { status: 'Lost', campers: inv?.lostCampers ?? 0 },
        { status: 'Returned', campers: inv?.returnedCampers ?? 0 },
      ];
      return {
        answer: answerText(language, `Inventory has ${inv?.totalCampers ?? 0} total campers, ${inv?.filledCampers ?? 0} filled and ${inv?.emptyCampers ?? 0} empty.`, `Inventory me total ${inv?.totalCampers ?? 0} camper hain, ${inv?.filledCampers ?? 0} filled aur ${inv?.emptyCampers ?? 0} empty hain.`),
        language,
        scope: 'ADMIN',
        intent,
        provider: 'local',
        cards: [
          { label: 'Total', value: inv?.totalCampers ?? 0, tone: 'info' },
          { label: 'Filled', value: inv?.filledCampers ?? 0, tone: 'success' },
          { label: 'Empty', value: inv?.emptyCampers ?? 0, tone: 'warning' },
        ],
        table: { title: 'Inventory status', columns: ['status', 'campers'], rows },
        chart: { title: 'Inventory split', type: 'pie', xKey: 'status', yKey: 'campers', data: rows },
      };
    }

    if (intent === 'driver_performance') {
      const drivers = await prisma.driver.findMany({
        where: distributorId ? { customers: { some: { distributorId } } } : {},
        take: 12,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          isOnDuty: true,
          _count: { select: { customers: true } },
          deliveries: { where: { createdAt: { gte: monthStart } }, select: { status: true, quantityDelivered: true } },
        },
      });
      const rows = drivers.map((d) => ({
        driver: d.name,
        duty: d.isOnDuty ? 'ON' : 'OFF',
        customers: d._count.customers,
        deliveries: d.deliveries.length,
        delivered: d.deliveries.filter((x) => x.status === DeliveryStatus.DELIVERED).length,
        campers: d.deliveries.reduce((sum, x) => sum + x.quantityDelivered, 0),
      }));
      return {
        answer: answerText(language, `Driver report found ${rows.length} drivers. The table shows monthly deliveries, delivered count and camper quantity.`, `Driver report me ${rows.length} drivers mile. Table me monthly deliveries, delivered count aur camper quantity hai.`),
        language,
        scope: 'ADMIN',
        intent,
        provider: 'local',
        table: { title: 'Driver performance', columns: ['driver', 'duty', 'customers', 'deliveries', 'delivered', 'campers'], rows },
        chart: { title: 'Campers delivered by driver', type: 'bar', xKey: 'driver', yKey: 'campers', data: rows },
      };
    }

    if (intent === 'area_delivery') {
      const deliveries = await prisma.delivery.findMany({
        where: { createdAt: { gte: monthStart }, ...crf },
        select: { quantityDelivered: true, status: true, customer: { select: { area: true } } },
      });
      const map = new Map<string, { area: string; deliveries: number; delivered: number; campers: number }>();
      deliveries.forEach((d) => {
        const area = d.customer.area || 'Unknown';
        const row = map.get(area) ?? { area, deliveries: 0, delivered: 0, campers: 0 };
        row.deliveries += 1;
        row.delivered += d.status === DeliveryStatus.DELIVERED ? 1 : 0;
        row.campers += d.quantityDelivered;
        map.set(area, row);
      });
      const rows = [...map.values()].sort((a, b) => b.campers - a.campers).slice(0, 10);
      return {
        answer: answerText(language, `Area-wise delivery is ready for this month. Top area: ${rows[0]?.area ?? 'No data'}.`, `Is month ka area-wise delivery ready hai. Top area: ${rows[0]?.area ?? 'data nahi'}.`),
        language,
        scope: 'ADMIN',
        intent,
        provider: 'local',
        table: { title: 'Area-wise delivery', columns: ['area', 'deliveries', 'delivered', 'campers'], rows },
        chart: { title: 'Campers by area', type: 'bar', xKey: 'area', yKey: 'campers', data: rows },
      };
    }

    if (intent === 'customer_growth') {
      const rows = await this.customerGrowthRows(cf);
      const total = rows.reduce((sum, r) => sum + Number(r.customers), 0);
      return {
        answer: answerText(language, `Customer growth added ${total} customers in the last 6 months.`, `Last 6 months me ${total} naye customers add hue.`),
        language,
        scope: 'ADMIN',
        intent,
        provider: 'local',
        cards: [{ label: 'New customers', value: total, tone: 'success' }],
        table: { title: 'Customer growth', columns: ['month', 'customers'], rows },
        chart: { title: 'Customer growth', type: 'line', xKey: 'month', yKey: 'customers', data: rows },
      };
    }

    if (intent === 'billing_summary') {
      const [total, paid, pending, overdue, amount] = await Promise.all([
        prisma.invoice.count({ where: { ...crf, createdAt: { gte: monthStart } } }),
        prisma.invoice.count({ where: { ...crf, createdAt: { gte: monthStart }, status: InvoiceStatus.PAID } }),
        prisma.invoice.count({ where: { ...crf, createdAt: { gte: monthStart }, status: { in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID] } } }),
        prisma.invoice.count({ where: { ...crf, status: InvoiceStatus.OVERDUE } }),
        prisma.invoice.aggregate({ where: { ...crf, createdAt: { gte: monthStart } }, _sum: { totalAmount: true, dueAmount: true } }),
      ]);
      const rows = [
        { metric: 'Invoices', value: total },
        { metric: 'Paid', value: paid },
        { metric: 'Pending/partial', value: pending },
        { metric: 'Overdue', value: overdue },
        { metric: 'Month bill amount', value: number(amount._sum.totalAmount) },
        { metric: 'Due amount', value: number(amount._sum.dueAmount) },
      ];
      return {
        answer: answerText(language, `This month billing is ${money(number(amount._sum.totalAmount))}; due amount is ${money(number(amount._sum.dueAmount))}.`, `Is month billing ${money(number(amount._sum.totalAmount))} hai; due amount ${money(number(amount._sum.dueAmount))} hai.`),
        language,
        scope: 'ADMIN',
        intent,
        provider: 'local',
        table: { title: 'Billing summary', columns: ['metric', 'value'], rows },
      };
    }

    if (intent === 'pending_payments') {
      const invoices = await prisma.invoice.findMany({
        where: { status: { in: [InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] }, ...crf },
        take: 10,
        orderBy: { dueAmount: 'desc' },
        select: { invoiceNumber: true, dueAmount: true, status: true, customer: { select: { name: true, mobile: true } } },
      });
      const totalDue = invoices.reduce((sum, x) => sum + number(x.dueAmount), 0);
      const rows = invoices.map((i) => ({ customer: i.customer.name, mobile: i.customer.mobile, invoice: i.invoiceNumber, status: i.status, due: number(i.dueAmount) }));
      return {
        answer: answerText(language, `Top pending invoices total ${money(totalDue)} in this list.`, `Is list me top pending invoices ka total ${money(totalDue)} hai.`),
        language,
        scope: 'ADMIN',
        intent,
        provider: 'local',
        cards: [{ label: 'Listed due', value: money(totalDue), tone: 'warning' }],
        table: { title: 'Pending payments', columns: ['customer', 'mobile', 'invoice', 'status', 'due'], rows },
        chart: { title: 'Due by customer', type: 'bar', xKey: 'customer', yKey: 'due', data: rows },
      };
    }

    const [monthlyRevenue, todayOrders, todayDelivered, pendingOrders, totalCustomers] = await Promise.all([
      prisma.payment.aggregate({ where: { status: PaymentStatus.SUCCESS, createdAt: { gte: monthStart }, ...crf }, _sum: { amount: true } }),
      prisma.order.count({ where: { orderDate: { gte: todayStart, lte: todayEnd }, ...crf } }),
      prisma.order.count({ where: { orderDate: { gte: todayStart, lte: todayEnd }, status: OrderStatus.DELIVERED, ...crf } }),
      prisma.order.count({ where: { status: OrderStatus.PENDING, ...crf } }),
      prisma.customer.count({ where: cf }),
    ]);
    const cards = [
      { label: 'Monthly earning', value: money(number(monthlyRevenue._sum.amount)), tone: 'success' as const },
      { label: "Today's orders", value: todayOrders, tone: 'info' as const },
      { label: "Today's delivered", value: todayDelivered, tone: 'success' as const },
      { label: 'Pending orders', value: pendingOrders, tone: 'warning' as const },
      { label: 'Customers', value: totalCustomers, tone: 'info' as const },
    ];
    return {
      answer: answerText(language, `Monthly earning is ${cards[0].value}. Today ${todayDelivered}/${todayOrders} orders are delivered.`, `Monthly earning ${cards[0].value} hai. Aaj ${todayDelivered}/${todayOrders} orders delivered hain.`),
      language,
      scope: 'ADMIN',
      intent,
      provider: 'local',
      cards,
      table: { title: 'Performance snapshot', columns: ['metric', 'value'], rows: cards.map((c) => ({ metric: c.label, value: c.value })) },
    };
  }

  private async buildCustomerResponse(intent: CustomerIntent, language: string, customerId: string): Promise<AiChatResponse> {
    const monthStart = dayjs().startOf('month').toDate();
    const todayStart = dayjs().startOf('day').toDate();
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { name: true, allocatedCampers: true, ratePerCamper: true, status: true } });
    if (!customer) throw ApiError.notFound('Customer not found');

    if (intent === 'monthly_deliveries') {
      const deliveries = await prisma.delivery.findMany({
        where: { customerId, deliveryDate: { gte: monthStart } },
        orderBy: { deliveryDate: 'desc' },
        select: { deliveryDate: true, status: true, quantityDelivered: true, emptyCollected: true },
      });
      const delivered = deliveries.filter((d) => d.status === DeliveryStatus.DELIVERED);
      const campers = delivered.reduce((sum, d) => sum + d.quantityDelivered, 0);
      const rows = deliveries.slice(0, 12).map((d) => ({
        date: d.deliveryDate ? dayjs(d.deliveryDate).format('DD MMM') : '-',
        status: d.status,
        received: d.quantityDelivered,
        emptyCollected: d.emptyCollected,
      }));
      return {
        answer: answerText(language, `You received ${campers} campers this month across ${delivered.length} delivered visits.`, `Aapko is month ${delivered.length} delivered visits me ${campers} camper mile hain.`),
        language,
        scope: 'CUSTOMER',
        intent,
        provider: 'local',
        cards: [
          { label: 'Campers received', value: campers, tone: 'success' },
          { label: 'Delivered visits', value: delivered.length, tone: 'info' },
        ],
        table: { title: 'This month deliveries', columns: ['date', 'status', 'received', 'emptyCollected'], rows },
        chart: { title: 'Campers received', type: 'bar', xKey: 'date', yKey: 'received', data: rows },
      };
    }

    if (intent === 'billing_due') {
      const invoices = await prisma.invoice.findMany({
        where: { customerId },
        take: 6,
        orderBy: { periodEnd: 'desc' },
        select: { invoiceNumber: true, periodEnd: true, totalAmount: true, paidAmount: true, dueAmount: true, status: true },
      });
      const totalDue = invoices.reduce((sum, i) => sum + number(i.dueAmount), 0);
      const rows = invoices.map((i) => ({ invoice: i.invoiceNumber, month: dayjs(i.periodEnd).format('MMM YYYY'), total: number(i.totalAmount), paid: number(i.paidAmount), due: number(i.dueAmount), status: i.status }));
      return {
        answer: answerText(language, `Your current visible due amount is ${money(totalDue)}.`, `Aapka current visible due amount ${money(totalDue)} hai.`),
        language,
        scope: 'CUSTOMER',
        intent,
        provider: 'local',
        cards: [{ label: 'Due amount', value: money(totalDue), tone: totalDue > 0 ? 'warning' : 'success' }],
        table: { title: 'Billing', columns: ['invoice', 'month', 'total', 'paid', 'due', 'status'], rows },
      };
    }

    if (intent === 'payment_history') {
      const payments = await prisma.payment.findMany({ where: { customerId }, take: 8, orderBy: { createdAt: 'desc' }, select: { createdAt: true, amount: true, method: true, status: true } });
      const paid = payments.filter((p) => p.status === PaymentStatus.SUCCESS).reduce((sum, p) => sum + number(p.amount), 0);
      const rows = payments.map((p) => ({ date: dayjs(p.createdAt).format('DD MMM'), amount: number(p.amount), method: p.method, status: p.status }));
      return {
        answer: answerText(language, `Your recent successful payments total ${money(paid)}.`, `Aapke recent successful payments ka total ${money(paid)} hai.`),
        language,
        scope: 'CUSTOMER',
        intent,
        provider: 'local',
        table: { title: 'Recent payments', columns: ['date', 'amount', 'method', 'status'], rows },
      };
    }

    if (intent === 'active_delivery') {
      const delivery = await prisma.delivery.findFirst({
        where: { customerId, status: DeliveryStatus.PENDING, createdAt: { gte: todayStart } },
        orderBy: { createdAt: 'desc' },
        select: { status: true, quantityDelivered: true, driver: { select: { name: true, mobile: true, isOnDuty: true, lastSeenAt: true } } },
      });
      const rows = delivery ? [{ driver: delivery.driver?.name ?? 'Not assigned', mobile: delivery.driver?.mobile ?? '-', duty: delivery.driver?.isOnDuty ? 'ON' : 'OFF', status: delivery.status }] : [];
      return {
        answer: rows.length ? answerText(language, `Your active delivery is assigned to ${rows[0].driver}.`, `Aapki active delivery ${rows[0].driver} ko assigned hai.`) : answerText(language, 'No active delivery is visible right now.', 'Abhi koi active delivery visible nahi hai.'),
        language,
        scope: 'CUSTOMER',
        intent,
        provider: 'local',
        table: { title: 'Active delivery', columns: ['driver', 'mobile', 'duty', 'status'], rows },
      };
    }

    const [orders, invoices, deliveries] = await Promise.all([
      prisma.order.count({ where: { customerId } }),
      prisma.invoice.aggregate({ where: { customerId }, _sum: { dueAmount: true } }),
      prisma.delivery.aggregate({ where: { customerId, deliveryDate: { gte: monthStart }, status: DeliveryStatus.DELIVERED }, _sum: { quantityDelivered: true }, _count: true }),
    ]);
    const cards = [
      { label: 'Account status', value: customer.status, tone: 'info' as const },
      { label: 'Allocated campers', value: customer.allocatedCampers, tone: 'info' as const },
      { label: 'This month received', value: deliveries._sum.quantityDelivered ?? 0, tone: 'success' as const },
      { label: 'Due amount', value: money(number(invoices._sum.dueAmount)), tone: 'warning' as const },
      { label: 'Orders', value: orders, tone: 'info' as const },
    ];
    return {
      answer: answerText(language, `Hi ${customer.name}, you received ${cards[2].value} campers this month and your due is ${cards[3].value}.`, `Hi ${customer.name}, is month aapko ${cards[2].value} campers mile aur due ${cards[3].value} hai.`),
      language,
      scope: 'CUSTOMER',
      intent,
      provider: 'local',
      cards,
      table: { title: 'Account summary', columns: ['metric', 'value'], rows: cards.map((c) => ({ metric: c.label, value: c.value })) },
    };
  }

  private async customerGrowthRows(where: { distributorId?: string }) {
    const start = dayjs().subtract(5, 'month').startOf('month').toDate();
    const customers = await prisma.customer.findMany({ where: { ...where, createdAt: { gte: start } }, select: { createdAt: true } });
    const buckets: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) buckets[dayjs().subtract(i, 'month').format('MMM YYYY')] = 0;
    customers.forEach((c) => {
      const key = dayjs(c.createdAt).format('MMM YYYY');
      if (key in buckets) buckets[key] += 1;
    });
    return Object.entries(buckets).map(([month, customers]) => ({ month, customers }));
  }
}

export const aiService = new AiService();

