import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import * as ctrl from './settings.controller';

const router = Router();

/**
 * @openapi
 * /settings:
 *   get:
 *     tags: [Settings]
 *     summary: Get all application settings
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 */
router.get('/', authenticate('admin'), ctrl.getAll);
router.get('/:key', authenticate('admin'), ctrl.getOne);

/**
 * @openapi
 * /settings/{key}:
 *   put:
 *     tags: [Settings]
 *     summary: Create/update a setting (super admin only)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Saved } }
 */
router.put('/:key', authenticate('admin'), authorize('SUPER_ADMIN'), ctrl.upsert);

export default router;
