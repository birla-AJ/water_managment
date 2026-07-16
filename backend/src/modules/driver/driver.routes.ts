import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as ctrl from './driver.controller';
import {
  createDriverSchema,
  updateDriverSchema,
  assignVehicleSchema,
  assignCustomersSchema,
  notifyDriverSchema,
} from './driver.dto';

const router = Router();
const admin = [authenticate('admin')];

/**
 * @openapi
 * /drivers:
 *   get:
 *     tags: [Drivers]
 *     summary: List/search drivers (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Drivers]
 *     summary: Create a driver (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Created } }
 */
router.get('/', ...admin, ctrl.list);
router.post('/', ...admin, validate(createDriverSchema), ctrl.create);
router.get('/:id', ...admin, ctrl.getOne);
router.put('/:id', ...admin, validate(updateDriverSchema), ctrl.update);
router.delete('/:id', authenticate('admin'), authorize('SUPER_ADMIN', 'ADMIN'), ctrl.remove);
router.post('/:id/restore', authenticate('admin'), authorize('SUPER_ADMIN', 'ADMIN'), ctrl.restore);

// Assignment
router.post('/:id/assign-vehicle', ...admin, validate(assignVehicleSchema), ctrl.assignVehicle);
router.post('/:id/assign-customers', ...admin, validate(assignCustomersSchema), ctrl.assignCustomers);
router.delete('/:id/customers/:customerId', ...admin, ctrl.unassignCustomer);
router.post('/:id/notify', ...admin, validate(notifyDriverSchema), ctrl.notifyDriver);

export default router;
