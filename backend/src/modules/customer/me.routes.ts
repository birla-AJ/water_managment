import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as ctrl from './customer.controller';
import { updateCustomerSchema, pauseSchema, skipDatesSchema } from './customer.dto';

const router = Router();
const customer = authenticate('customer');

/**
 * @openapi
 * /me/profile:
 *   get:
 *     tags: [Customers]
 *     summary: Get the logged-in customer's profile
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 */
router.get('/profile', customer, ctrl.myProfile);
router.put('/profile', customer, validate(updateCustomerSchema), ctrl.updateMyProfile);
router.get('/schedules', customer, ctrl.mySchedules);
router.post('/pause', customer, validate(pauseSchema), ctrl.pauseMine);
router.post('/resume', customer, ctrl.resumeMine);
router.get('/skip-dates', customer, ctrl.mySkipDates);
router.put('/skip-dates', customer, validate(skipDatesSchema), ctrl.setMySkipDates);

export default router;
