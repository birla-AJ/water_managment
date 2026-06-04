import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as ctrl from './vehicle.controller';
import { createVehicleSchema, updateVehicleSchema } from './vehicle.dto';

const router = Router();
const admin = [authenticate('admin')];

/**
 * @openapi
 * /vehicles:
 *   get:
 *     tags: [Vehicles]
 *     summary: List vehicles (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 */
router.get('/', ...admin, ctrl.list);
router.get('/available', ...admin, ctrl.available);
router.get('/:id', ...admin, ctrl.getOne);
router.post('/', ...admin, validate(createVehicleSchema), ctrl.create);
router.put('/:id', ...admin, validate(updateVehicleSchema), ctrl.update);
router.delete('/:id', authenticate('admin'), authorize('SUPER_ADMIN', 'ADMIN'), ctrl.remove);

export default router;
