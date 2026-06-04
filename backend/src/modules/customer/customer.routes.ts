import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as ctrl from './customer.controller';
import {
  createCustomerSchema,
  updateCustomerSchema,
  updateScheduleSchema,
  pauseSchema,
  skipDatesSchema,
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

router.get('/:id/schedules', ...admin, ctrl.getSchedules);
router.put('/:id/schedules', ...admin, validate(updateScheduleSchema), ctrl.updateSchedules);
router.post('/:id/pause', ...admin, validate(pauseSchema), ctrl.pause);
router.post('/:id/resume', ...admin, ctrl.resume);
router.get('/:id/skip-dates', ...admin, ctrl.getSkipDates);
router.put('/:id/skip-dates', ...admin, validate(skipDatesSchema), ctrl.setSkipDates);

export default router;
