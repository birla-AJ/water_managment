import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as ctrl from './customer.controller';
import {
  createCustomerSchema,
  updateCustomerSchema,
  updateScheduleSchema,
  pauseSchema,
  deliveryDatesSchema,
} from './customer.dto';

const router = Router();

/**
 * @openapi
 * /customers:
 *   get:
 *     tags: [Customers]
 *     summary: List/search customers (admin)
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [ACTIVE, INACTIVE] } }
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Customers]
 *     summary: Create a customer (admin)
 *     responses: { 201: { description: Created } }
 */
const admin = [authenticate('admin')];

router.get('/', ...admin, ctrl.list);
router.post('/', ...admin, validate(createCustomerSchema), ctrl.create);
router.get('/:id', ...admin, ctrl.getOne);
router.put('/:id', ...admin, validate(updateCustomerSchema), ctrl.update);
router.delete('/:id', authenticate('admin'), authorize('SUPER_ADMIN', 'ADMIN'), ctrl.remove);
router.post('/:id/restore', authenticate('admin'), authorize('SUPER_ADMIN', 'ADMIN'), ctrl.restore);

router.get('/:id/schedules', ...admin, ctrl.getSchedules);
router.put('/:id/schedules', ...admin, validate(updateScheduleSchema), ctrl.updateSchedules);
router.post('/:id/pause', ...admin, validate(pauseSchema), ctrl.pause);
router.post('/:id/resume', ...admin, ctrl.resume);
// Days the customer wants water on (opt-in; anything else = no delivery).
router.get('/:id/delivery-dates', ...admin, ctrl.getDeliveryDates);
router.put('/:id/delivery-dates', ...admin, validate(deliveryDatesSchema), ctrl.setDeliveryDates);

export default router;
