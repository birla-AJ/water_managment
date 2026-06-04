import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as ctrl from './delivery.controller';
import { markDeliverySchema } from './delivery.dto';

export const deliveryRouter = Router();
const admin = authenticate('admin');

/**
 * @openapi
 * /deliveries:
 *   get:
 *     tags: [Deliveries]
 *     summary: List deliveries (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 */
deliveryRouter.get('/', admin, ctrl.list);
deliveryRouter.get('/:id', admin, ctrl.getOne);

/**
 * @openapi
 * /deliveries/mark:
 *   post:
 *     tags: [Deliveries]
 *     summary: Mark an order delivered / cancelled / pending
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Updated } }
 */
deliveryRouter.post('/mark', admin, validate(markDeliverySchema), ctrl.mark);

// Customer-facing
export const deliveryMeRouter = Router();
const customer = authenticate('customer');
deliveryMeRouter.get('/', customer, ctrl.myDeliveries);
deliveryMeRouter.get('/summary', customer, ctrl.mySummary);
