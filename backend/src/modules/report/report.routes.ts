import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import * as ctrl from './report.controller';

const router = Router();
const admin = authenticate('admin');

/**
 * @openapi
 * /reports/{type}:
 *   get:
 *     tags: [Reports]
 *     summary: Get report data (type = daily|weekly|monthly|yearly|revenue|customer|inventory|order|payment)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: type, required: true, schema: { type: string } }
 *     responses: { 200: { description: OK } }
 */
router.get('/:type', admin, ctrl.getReport);
router.get('/:type/summary', admin, ctrl.summary);

/**
 * @openapi
 * /reports/{type}/export:
 *   get:
 *     tags: [Reports]
 *     summary: Export a report as excel | csv | pdf
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: format, schema: { type: string, enum: [excel, csv, pdf] } }
 *     responses: { 200: { description: File stream } }
 */
router.get('/:type/export', admin, ctrl.exportReport);

export default router;
