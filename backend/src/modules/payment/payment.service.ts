import {
  PaymentMethod,
  PaymentStatus,
  Prisma,
  NotificationAudience,
  NotificationType,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/apiError';
import { getRazorpay, verifyPaymentSignature } from '../../config/razorpay';
import { logger } from '../../config/logger';
import { notificationService } from '../notification/notification.service';
import { billingService } from '../billing/billing.service';

class PaymentService {
  /** Create a Razorpay order and a local PENDING payment record. */
  async createRazorpayOrder(customerId: string, amount: number, invoiceId?: string) {
    const rzp = getRazorpay();
    const amountPaise = Math.round(amount * 100);

    const order = await rzp.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      notes: { customerId, ...(invoiceId ? { invoiceId } : {}) },
    });

    const payment = await prisma.payment.create({
      data: {
        customerId,
        invoiceId,
        amount: new Prisma.Decimal(amount),
        method: PaymentMethod.RAZORPAY,
        status: PaymentStatus.PENDING,
        razorpayOrderId: order.id,
      },
    });

    return {
      paymentId: payment.id,
      razorpayOrderId: order.id,
      amount: amountPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  /** Verify a checkout signature and mark the payment successful. */
  async verifyAndCapture(dto: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
    const valid = verifyPaymentSignature(dto.razorpayOrderId, dto.razorpayPaymentId, dto.razorpaySignature);
    const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: dto.razorpayOrderId } });
    if (!payment) throw ApiError.notFound('Payment record not found');

    if (!valid) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED } });
      await this.notifyResult(payment.customerId, false);
      throw ApiError.badRequest('Payment signature verification failed');
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        razorpayPaymentId: dto.razorpayPaymentId,
        razorpaySignature: dto.razorpaySignature,
      },
    });

    if (payment.invoiceId) await billingService.applyPayment(payment.invoiceId, payment.amount);
    await this.notifyResult(payment.customerId, true, Number(payment.amount));
    return updated;
  }

  /** Admin records an offline (cash/UPI) payment. */
  async recordManual(dto: { customerId: string; invoiceId?: string; amount: number; method: PaymentMethod; notes?: string }) {
    const payment = await prisma.payment.create({
      data: {
        customerId: dto.customerId,
        invoiceId: dto.invoiceId,
        amount: new Prisma.Decimal(dto.amount),
        method: dto.method,
        status: PaymentStatus.SUCCESS,
        notes: dto.notes,
      },
    });
    if (dto.invoiceId) await billingService.applyPayment(dto.invoiceId, payment.amount);
    await this.notifyResult(dto.customerId, true, dto.amount);
    return payment;
  }

  async refund(paymentId: string, amount?: number, notes?: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw ApiError.notFound('Payment not found');
    if (payment.status !== PaymentStatus.SUCCESS) throw ApiError.badRequest('Only successful payments can be refunded');

    let refundId: string | undefined;
    if (payment.method === PaymentMethod.RAZORPAY && payment.razorpayPaymentId) {
      try {
        const rzp = getRazorpay();
        const refund = await rzp.payments.refund(payment.razorpayPaymentId, {
          amount: amount ? Math.round(amount * 100) : undefined,
        });
        refundId = refund.id;
      } catch (err) {
        logger.error(`Razorpay refund failed: ${(err as Error).message}`);
        throw ApiError.badRequest('Refund failed at gateway');
      }
    }

    return prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.REFUNDED, refundId, notes: notes ?? payment.notes },
    });
  }

  /** Handle Razorpay webhook events (payment.captured / payment.failed). */
  async handleWebhook(event: { event: string; payload: any }) {
    const entity = event.payload?.payment?.entity;
    if (!entity) return;
    const orderId = entity.order_id;
    const payment = await prisma.payment.findUnique({ where: { razorpayOrderId: orderId } });
    if (!payment) return;

    if (event.event === 'payment.captured' && payment.status !== PaymentStatus.SUCCESS) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.SUCCESS, razorpayPaymentId: entity.id },
      });
      if (payment.invoiceId) await billingService.applyPayment(payment.invoiceId, payment.amount);
      await this.notifyResult(payment.customerId, true, Number(payment.amount));
    } else if (event.event === 'payment.failed') {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED } });
      await this.notifyResult(payment.customerId, false);
    }
  }

  private async notifyResult(customerId: string, success: boolean, amount?: number) {
    await notificationService.notify({
      audience: NotificationAudience.CUSTOMER,
      type: success ? NotificationType.PAYMENT_SUCCESS : NotificationType.PAYMENT_FAILED,
      title: success ? 'Payment successful' : 'Payment failed',
      body: success ? `We received your payment of ₹${amount?.toFixed(2)}.` : 'Your payment could not be processed.',
      customerId,
    });
    if (success) {
      await notificationService.notify({
        audience: NotificationAudience.ADMIN,
        type: NotificationType.PAYMENT_RECEIVED,
        title: 'Payment received',
        body: `₹${amount?.toFixed(2)} received from a customer.`,
        data: { customerId },
      });
    }
  }

  async list(query: { skip: number; take: number; status?: PaymentStatus; customerId?: string }) {
    const where: Prisma.PaymentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.take,
        include: { customer: { select: { id: true, name: true, mobile: true } }, invoice: { select: { invoiceNumber: true } } },
      }),
      prisma.payment.count({ where }),
    ]);
    return { items, total };
  }

  async myPayments(customerId: string) {
    return prisma.payment.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      include: { invoice: { select: { invoiceNumber: true } } },
    });
  }
}

export const paymentService = new PaymentService();
