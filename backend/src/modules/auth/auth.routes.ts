import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { authLimiter } from '../../middlewares/rateLimit.middleware';
import * as ctrl from './auth.controller';
import {
  adminLoginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  refreshSchema,
  updateFcmSchema,
  firebaseLoginSchema,
  setLanguageSchema,
} from './auth.dto';

const router = Router();

/**
 * @openapi
 * /auth/admin/login:
 *   post:
 *     tags: [Auth]
 *     summary: Admin email + password login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: admin@waterflow.com }
 *               password: { type: string, example: Admin@123 }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials }
 */
router.post('/admin/login', authLimiter, validate(adminLoginSchema), ctrl.adminLogin);

/**
 * @openapi
 * /auth/otp/request:
 *   post:
 *     tags: [Auth]
 *     summary: Request an OTP for customer login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mobile]
 *             properties:
 *               mobile: { type: string, example: "9812345670" }
 *     responses:
 *       200: { description: OTP sent }
 */
router.post('/otp/request', authLimiter, validate(requestOtpSchema), ctrl.requestOtp);

/**
 * @openapi
 * /auth/otp/verify:
 *   post:
 *     tags: [Auth]
 *     summary: Verify OTP and log the customer in (auto-registers new numbers)
 *     responses:
 *       200: { description: OTP verified }
 */
router.post('/otp/verify', authLimiter, validate(verifyOtpSchema), ctrl.verifyOtp);

/**
 * @openapi
 * /auth/firebase-login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with a Firebase phone-auth ID token (auto-registers new numbers)
 *     responses:
 *       200: { description: Login successful }
 */
router.post('/firebase-login', authLimiter, validate(firebaseLoginSchema), ctrl.firebaseLogin);

router.post('/refresh', validate(refreshSchema), ctrl.refresh);
router.post('/logout', validate(refreshSchema), ctrl.logout);
router.get('/me', authenticate(), ctrl.me);
router.patch('/fcm-token', authenticate('customer'), validate(updateFcmSchema), ctrl.updateFcm);
// Any logged-in principal (admin / driver / customer) can set their language.
router.patch('/language', authenticate(), validate(setLanguageSchema), ctrl.setLanguage);

export default router;
