import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as ctrl from './order.controller';
import { createOrderSchema } from './order.dto';

const router = Router();
const customer = authenticate('customer');

/**
 * @openapi
 * /me/orders:
 *   get:
 *     tags: [Orders]
 *     summary: List the logged-in customer's orders
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Orders]
 *     summary: Request an extra camper order
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Placed } }
 */
router.get('/', customer, ctrl.listMine);
router.post('/', customer, validate(createOrderSchema), ctrl.createMine);

export default router;
