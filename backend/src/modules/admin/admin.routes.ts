import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as ctrl from './admin.controller';
import { createAdminSchema, updateAdminSchema } from './admin.dto';

const router = Router();
// Admin management is SUPER_ADMIN-only.
const superAdmin = [authenticate('admin'), authorize('SUPER_ADMIN')];

/**
 * @openapi
 * /admins:
 *   get:
 *     tags: [Admins]
 *     summary: List admins (super admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 *   post:
 *     tags: [Admins]
 *     summary: Create an admin (super admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Created } }
 */
router.get('/', ...superAdmin, ctrl.list);
router.post('/', ...superAdmin, validate(createAdminSchema), ctrl.create);
router.get('/:id', ...superAdmin, ctrl.getOne);
router.get('/:id/customers', ...superAdmin, ctrl.customers);
router.put('/:id', ...superAdmin, validate(updateAdminSchema), ctrl.update);
router.delete('/:id', ...superAdmin, ctrl.remove);

export default router;
