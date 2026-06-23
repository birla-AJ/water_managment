import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as ctrl from './payment.controller';
import { createOrderSchema, verifySchema, manualPaymentSchema, refundSchema } from './payment.dto';

// Mounted at /payments
export const paymentRouter = Router();

/**
 * @openapi
 * /payments/webhook:
 *   post:
 *     tags: [Payments]
 *     summary: Razorpay webhook (signature-verified, no auth)
 *     responses: { 200: { description: OK } }
 */
paymentRouter.post('/webhook', ctrl.webhook);

// Admin
const admin = authenticate('admin');
paymentRouter.get('/', admin, ctrl.list);

/**
 * @openapi
 * /payments/export:
 *   get:
 *     tags: [Payments]
 *     summary: Export payments as a styled Excel workbook
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: status, schema: { type: string, enum: [PENDING, SUCCESS, FAILED, REFUNDED] } }
 *     responses: { 200: { description: File stream } }
 */
paymentRouter.get('/export', admin, ctrl.exportPayments);
paymentRouter.post('/manual', admin, validate(manualPaymentSchema), ctrl.recordManual);
paymentRouter.post('/:id/refund', admin, validate(refundSchema), ctrl.refund);

// Customer self-service
export const paymentMeRouter = Router();
const customer = authenticate('customer');

/**
 * @openapi
 * /me/payments/razorpay-order:
 *   post:
 *     tags: [Payments]
 *     summary: Create a Razorpay order to pay a bill (full or partial)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Created } }
 */
paymentMeRouter.post('/razorpay-order', customer, validate(createOrderSchema), ctrl.createRazorpayOrder);
paymentMeRouter.post('/verify', customer, validate(verifySchema), ctrl.verify);
paymentMeRouter.get('/', customer, ctrl.myPayments);
