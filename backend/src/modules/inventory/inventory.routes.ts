import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as ctrl from './inventory.controller';
import { adjustInventorySchema } from './inventory.dto';

const router = Router();
const admin = authenticate('admin');

/**
 * @openapi
 * /inventory:
 *   get:
 *     tags: [Inventory]
 *     summary: Get the current inventory snapshot
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 */
router.get('/', admin, ctrl.get);

/**
 * @openapi
 * /inventory/logs:
 *   get:
 *     tags: [Inventory]
 *     summary: List inventory movement logs
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 */
router.get('/logs', admin, ctrl.logs);

/**
 * @openapi
 * /inventory/adjust:
 *   post:
 *     tags: [Inventory]
 *     summary: Apply a stock movement (STOCK_IN, FILLED, DAMAGED, LOST, ...)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Updated } }
 */
router.post('/adjust', admin, validate(adjustInventorySchema), ctrl.adjust);

export default router;
