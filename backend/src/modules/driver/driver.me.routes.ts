import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as ctrl from './driver.me.controller';
import { markDeliverySchema, updateFcmSchema } from './driver.dto';

const router = Router();
const driver = authenticate('driver');

/**
 * @openapi
 * /driver/me:
 *   get:
 *     tags: [Driver]
 *     summary: Current driver's profile, vehicle, zone and today's stats
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 */
router.get('/me', driver, ctrl.myProfile);
router.get('/customers', driver, ctrl.myCustomers);

/**
 * @openapi
 * /driver/deliveries:
 *   get:
 *     tags: [Driver]
 *     summary: Today's delivery worklist (assigned customers + skip flags)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: date, schema: { type: string }, description: "YYYY-MM-DD (defaults to today)" }
 *     responses: { 200: { description: OK } }
 */
router.get('/deliveries', driver, ctrl.myDeliveries);
router.post('/deliveries/mark', driver, validate(markDeliverySchema), ctrl.markDelivered);
router.patch('/fcm-token', driver, validate(updateFcmSchema), ctrl.updateFcm);

export default router;
