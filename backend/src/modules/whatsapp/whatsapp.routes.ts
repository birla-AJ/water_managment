import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import * as ctrl from './whatsapp.controller';

const router = Router();
// Every admin manages their own WhatsApp link; superadmin manages the system number.
const admin = [authenticate('admin')];

/**
 * @openapi
 * /whatsapp/status:
 *   get:
 *     tags: [WhatsApp]
 *     summary: This admin's WhatsApp connection status
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 */
router.get('/status', ...admin, ctrl.status);
router.post('/connect', ...admin, ctrl.connect);
router.get('/qr/:accountId', ...admin, ctrl.qr);
router.post('/logout', ...admin, ctrl.logout);

export default router;
