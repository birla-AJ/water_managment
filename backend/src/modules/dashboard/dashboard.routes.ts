import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import * as ctrl from './dashboard.controller';

const router = Router();
const admin = authenticate('admin');

/**
 * @openapi
 * /dashboard/overview:
 *   get:
 *     tags: [Dashboard]
 *     summary: Aggregate KPI counters for the admin dashboard
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 */
router.get('/overview', admin, ctrl.overview);

/**
 * @openapi
 * /dashboard/charts:
 *   get:
 *     tags: [Dashboard]
 *     summary: Revenue / orders / customer-growth / inventory chart series
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 */
router.get('/charts', admin, ctrl.charts);

export default router;
