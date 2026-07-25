import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as ctrl from './billing.controller';
import { generateInvoiceSchema, autoGenerateSchema } from './billing.dto';

export const billingRouter = Router();
const admin = authenticate('admin');

/**
 * @openapi
 * /billing/invoices:
 *   get:
 *     tags: [Billing]
 *     summary: List invoices (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 */
billingRouter.get('/invoices', admin, ctrl.list);
billingRouter.get('/invoices/:id', admin, ctrl.getOne);

/**
 * @openapi
 * /billing/invoices/generate:
 *   post:
 *     tags: [Billing]
 *     summary: Generate an invoice for a customer & period
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Generated } }
 * 
 */
billingRouter.post('/invoices/generate', admin, validate(generateInvoiceSchema), ctrl.generate);
billingRouter.post('/invoices/auto-generate', admin, validate(autoGenerateSchema), ctrl.autoGenerate);
billingRouter.get('/invoices/:id/pdf', admin, ctrl.downloadPdf);
billingRouter.post('/invoices/:id/notify', admin, ctrl.sendNotification);

// Customer-facing
export const billingMeRouter = Router();
const customer = authenticate('customer');
billingMeRouter.get('/invoices', customer, ctrl.myInvoices);
billingMeRouter.get('/due', customer, ctrl.myDue);
billingMeRouter.get('/invoices/:id', customer, ctrl.getOne);
