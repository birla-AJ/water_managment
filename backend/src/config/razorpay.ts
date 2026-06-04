import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from './env';
import { logger } from './logger';

let client: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    logger.warn('⚠️  Razorpay keys not configured — payment creation will fail.');
  }
  if (!client) {
    client = new Razorpay({
      key_id: env.razorpay.keyId,
      key_secret: env.razorpay.keySecret,
    });
  }
  return client;
}

/** Verify the signature returned by Razorpay checkout. */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}

/** Verify a Razorpay webhook signature against the raw request body. */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!env.razorpay.webhookSecret) return false;
  const expected = crypto
    .createHmac('sha256', env.razorpay.webhookSecret)
    .update(rawBody)
    .digest('hex');
  return expected === signature;
}
