import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import * as ctrl from './notification.controller';

const router = Router();

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List notifications for the current admin
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.get('/', authenticate('admin'), ctrl.listAdminNotifications);

/**
 * @openapi
 * /notifications/me:
 *   get:
 *     tags: [Notifications]
 *     summary: List notifications for the current customer
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.get('/me', authenticate('customer'), ctrl.listMyNotifications);

/**
 * @openapi
 * /notifications/driver:
 *   get:
 *     tags: [Notifications]
 *     summary: List notifications for the current driver
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: OK }
 */
router.get('/driver', authenticate('driver'), ctrl.listDriverNotifications);

router.get('/unread-count', authenticate(), ctrl.unreadCount);
router.patch('/:id/read', authenticate(), ctrl.markRead);
router.patch('/read-all', authenticate(), ctrl.markAllRead);

export default router;
