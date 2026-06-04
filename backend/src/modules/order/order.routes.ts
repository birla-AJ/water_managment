import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as ctrl from './order.controller';
import { createOrderSchema, updateStatusSchema } from './order.dto';

const router = Router();
const admin = authenticate('admin');

/**
 * @openapi
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: List orders (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Orders]
 *     summary: Create an order for a customer (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Created } }
 */
router.get('/', admin, ctrl.list);
router.post('/', admin, validate(createOrderSchema), ctrl.create);
router.get('/:id', admin, ctrl.getOne);

/**
 * @openapi
 * /orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Update order status (PENDING/ACCEPTED/PROCESSING/DELIVERED/CANCELLED)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Updated } }
 */
router.patch('/:id/status', admin, validate(updateStatusSchema), ctrl.updateStatus);

export default router;
