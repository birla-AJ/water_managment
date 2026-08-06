import dayjs from 'dayjs';
import { CustomerStatus, DriverStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { ApiError } from '../../utils/apiError';
import { comparePassword } from '../../utils/password';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  JwtPayload,
  Principal,
} from '../../utils/jwt';
import { generateOtp } from '../../utils/generators';
import { sendOtpSms } from '../../config/sms';
import { waSendPriority, toWaNumber } from '../../config/whatsapp';
import { t } from '../../config/i18n';
import { getFirebaseAdmin } from '../../config/firebase';
import { logger } from '../../config/logger';
import { AdminLoginDto, RequestOtpDto, VerifyOtpDto, FirebaseLoginDto } from './auth.dto';

class AuthService {
  private async issueTokens(payload: JwtPayload, principal: Principal) {
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    const expiresAt = dayjs().add(30, 'day').toDate();

    const owner =
      principal === 'admin'
        ? { adminId: payload.sub }
        : principal === 'driver'
          ? { driverId: payload.sub }
          : { customerId: payload.sub };

    await prisma.refreshToken.create({
      data: { token: refreshToken, expiresAt, ...owner },
    });
    return { accessToken, refreshToken };
  }

  /**
   * If the given mobile belongs to a registered (active) driver, log them in as
   * a driver and return the login payload; otherwise return null so the caller
   * falls back to the customer flow. This is what makes one OTP screen route to
   * either the driver or the customer dashboard automatically.
   */
  /**
   * Reject login for a number whose customer or driver record was removed by an
   * admin (soft delete).
   */
  private async assertNotRemoved(mobile: string) {
    const [driver, customer] = await Promise.all([
      prisma.driver.findUnique({ where: { mobile }, select: { blockedAt: true } }),
      prisma.customer.findUnique({ where: { mobile }, select: { blockedAt: true } }),
    ]);
    if (driver?.blockedAt || customer?.blockedAt) {
      throw ApiError.forbidden('This account has been removed. Please contact support.');
    }
  }

  /**
   * Mobile access is now open: any 10-digit number can request/verify an OTP.
   * A number that already belongs to a driver or admin record must still be
   * ACTIVE to log in (an admin-deactivated account stays blocked). A number
   * with no record at all is a brand-new customer — it is let through here and
   * verifyOtp/firebaseLogin auto-creates a minimal customer for it, which then
   * completes registration (name, address, distributor) on the app's
   * "complete profile" screen.
   */
  private async assertMobileLoginAllowed(mobile: string) {
    await this.assertNotRemoved(mobile);

    const [customer, driver, admin] = await Promise.all([
      prisma.customer.findUnique({ where: { mobile }, select: { status: true } }),
      prisma.driver.findUnique({ where: { mobile }, select: { status: true } }),
      prisma.admin.findUnique({ where: { mobile }, select: { isActive: true } }),
    ]);

    if (customer && customer.status !== CustomerStatus.ACTIVE) {
      throw ApiError.forbidden('This account is inactive. Please contact your administrator.');
    }
    if (driver && driver.status !== DriverStatus.ACTIVE) {
      throw ApiError.forbidden('This account is inactive. Please contact your administrator.');
    }
    if (admin && !admin.isActive) {
      throw ApiError.forbidden('This account is inactive. Please contact your administrator.');
    }
    // No existing record at all → allow through as a fresh customer sign-up.
  }

  private async loginAsDriverIfRegistered(mobile: string, fcmToken?: string) {
    const driver = await prisma.driver.findUnique({ where: { mobile } });
    if (!driver || driver.status !== 'ACTIVE') return null;

    if (fcmToken && fcmToken !== driver.fcmToken) {
      await prisma.driver.update({ where: { id: driver.id }, data: { fcmToken } });
    }

    const tokens = await this.issueTokens({ sub: driver.id, principal: 'driver' }, 'driver');
    return {
      ...tokens,
      isNew: false,
      user: { id: driver.id, name: driver.name, mobile: driver.mobile, role: 'DRIVER' as const, language: driver.language },
    };
  }

  /**
   * If the given mobile belongs to an active admin, log them in as an admin and
   * return the login payload; otherwise null so the caller falls back to the
   * customer flow. Lets one OTP screen route admins to the admin dashboard too.
   */
  private async loginAsAdminIfRegistered(mobile: string) {
    const admin = await prisma.admin.findUnique({ where: { mobile } });
    if (!admin || !admin.isActive) return null;

    await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });

    const tokens = await this.issueTokens(
      { sub: admin.id, principal: 'admin', role: admin.role },
      'admin'
    );
    return {
      ...tokens,
      isNew: false,
      user: { id: admin.id, name: admin.name, email: admin.email, mobile: admin.mobile, role: admin.role, avatarUrl: admin.avatarUrl, language: admin.language },
    };
  }

  // ---------------- ADMIN ----------------
  async adminLogin(dto: AdminLoginDto) {
    const admin = await prisma.admin.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!admin || !admin.isActive) throw ApiError.unauthorized('Invalid credentials');

    const valid = await comparePassword(dto.password, admin.passwordHash);
    if (!valid) throw ApiError.unauthorized('Invalid credentials');

    await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });

    const tokens = await this.issueTokens(
      { sub: admin.id, principal: 'admin', role: admin.role },
      'admin'
    );
    return {
      ...tokens,
      user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role, avatarUrl: admin.avatarUrl, language: admin.language },
    };
  }

  // ---------------- CUSTOMER OTP ----------------
  async requestOtp(dto: RequestOtpDto) {
    // Test mode uses the fixed development code and returns it in the response.
    // When a real provider is configured it can be tested from development too.
    await this.assertMobileLoginAllowed(dto.mobile);

    const testMode = env.otp.testMode || (!env.isProd && env.sms.provider === 'console');
    const code = testMode ? env.otp.devCode : generateOtp();
    const expiresAt = dayjs().add(env.otp.expiresMinutes, 'minute').toDate();

    await prisma.otpCode.create({ data: { mobile: dto.mobile, code, expiresAt } });

    if (!testMode) await this.deliverOtp(dto.mobile, code);

    return {
      mobile: dto.mobile,
      expiresInMinutes: env.otp.expiresMinutes,
      ...(testMode ? { devOtp: code } : {}),
    };
  }

  /**
   * Deliver an OTP over the best available channel:
   *   1. The customer's own distributor (admin) WhatsApp number (instant/priority).
   *   2. The system fallback WhatsApp number (for new/unassigned customers or
   *      when the distributor's number is offline).
   *   3. SMS (existing provider) as a last-resort safety net so login never breaks.
   * WhatsApp is only attempted when enabled; otherwise it goes straight to SMS.
   */
  private async deliverOtp(mobile: string, code: string): Promise<void> {
    if (env.whatsapp.enabled) {
      const to = toWaNumber(mobile);
      const customer = await prisma.customer.findUnique({
        where: { mobile },
        select: { distributorId: true, language: true },
      });
      // OTP text in the customer's chosen language (defaults to English).
      const text = t(customer?.language, 'auth.otp', { code, mins: env.otp.expiresMinutes });

      // 1) owning admin's number
      if (customer?.distributorId) {
        const r = await waSendPriority({ to, text, tenantId: customer.distributorId });
        if (r.sent) return;
      }
      // 2) system fallback number
      const sys = await waSendPriority({ to, text, tenantId: env.whatsapp.systemTenantId });
      if (sys.sent) return;

      logger.warn(`[Auth/otp] WhatsApp delivery failed for ${mobile} — falling back to SMS`);
    }

    // 3) SMS fallback
    await sendOtpSms(mobile, code);
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const otp = await prisma.otpCode.findFirst({
      where: { mobile: dto.mobile, consumed: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw ApiError.badRequest('Please request an OTP first');
    if (otp.attempts >= 5) throw ApiError.badRequest('Too many attempts, request a new OTP');
    if (dayjs().isAfter(otp.expiresAt)) throw ApiError.badRequest('OTP expired');

    if (otp.code !== dto.otp) {
      await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw ApiError.badRequest('Incorrect OTP');
    }

    await prisma.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });

    await this.assertMobileLoginAllowed(dto.mobile);

    // Registered driver numbers log in as drivers (no customer record created).
    const asDriver = await this.loginAsDriverIfRegistered(dto.mobile, dto.fcmToken);
    if (asDriver) return asDriver;

    // Registered admin numbers log in as admins (no customer record created).
    const asAdmin = await this.loginAsAdminIfRegistered(dto.mobile);
    if (asAdmin) return asAdmin;

    let customer = await prisma.customer.findUnique({ where: { mobile: dto.mobile } });
    const isNewCustomer = !customer;
    if (!customer) {
      // Brand-new number with no admin/driver/customer record — self sign-up.
      // A placeholder name ("Customer 1234") is used until the customer fills
      // in the "complete profile" screen; the mobile app's isProfileComplete()
      // check recognises this exact pattern and keeps the user on that screen.
      // Location is best-effort: null in the DB if the splash-screen location
      // permission was declined.
      customer = await prisma.customer.create({
        data: {
          name: dto.name?.trim() || `Customer ${dto.mobile.slice(-4)}`,
          mobile: dto.mobile,
          status: CustomerStatus.ACTIVE,
          latitude: dto.latitude,
          longitude: dto.longitude,
          fcmToken: dto.fcmToken,
        },
      });
    } else if (dto.fcmToken) {
      customer = await prisma.customer.update({ where: { id: customer.id }, data: { fcmToken: dto.fcmToken } });
    }

    const tokens = await this.issueTokens({ sub: customer.id, principal: 'customer' }, 'customer');
    return {
      ...tokens,
      isNew: isNewCustomer,
      user: { id: customer.id, name: customer.name, mobile: customer.mobile, status: customer.status, role: 'CUSTOMER' as const, language: customer.language },
    };
  }

  // ---------------- FIREBASE PHONE AUTH ----------------
  /** Verify a Firebase ID token (phone auth), then find-or-create the customer and issue our JWTs. */
  async firebaseLogin(dto: FirebaseLoginDto) {
    logger.info(`[Auth/firebase-login] Request received tokenLength=${dto.firebaseToken?.length ?? 0} hasFcm=${Boolean(dto.fcmToken)}`);
    const adminSdk = getFirebaseAdmin();
    if (!adminSdk) {
      logger.error('[Auth/firebase-login] Firebase Admin SDK is not configured');
      throw ApiError.internal('Firebase is not configured on the server');
    }

    let decoded;
    try {
      decoded = await adminSdk.auth().verifyIdToken(dto.firebaseToken);
      logger.info(`[Auth/firebase-login] Firebase token verified uid=${decoded.uid} phone=${decoded.phone_number ?? 'missing'}`);
    } catch (err) {
      logger.warn(`[Auth/firebase-login] Firebase token verify failed: ${(err as Error).message}`);
      throw ApiError.unauthorized('Invalid or expired Firebase token');
    }

    if (!decoded.phone_number) {
      logger.warn('[Auth/firebase-login] Verified token has no phone_number');
      throw ApiError.badRequest('Firebase token has no phone number');
    }
    // Normalise +91XXXXXXXXXX (or any country code) down to the last 10 digits.
    const mobile = decoded.phone_number.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      logger.warn(`[Auth/firebase-login] Unsupported phone number phone=${decoded.phone_number} normalized=${mobile}`);
      throw ApiError.badRequest('Unsupported phone number');
    }

    await this.assertMobileLoginAllowed(mobile);

    // Registered driver numbers log in as drivers (no customer record created).
    const asDriver = await this.loginAsDriverIfRegistered(mobile, dto.fcmToken);
    if (asDriver) logger.info(`[Auth/firebase-login] Logged in as driver mobile=${mobile}`);
    if (asDriver) return asDriver;

    // Registered admin numbers log in as admins (no customer record created).
    const asAdmin = await this.loginAsAdminIfRegistered(mobile);
    if (asAdmin) logger.info(`[Auth/firebase-login] Logged in as admin mobile=${mobile}`);
    if (asAdmin) return asAdmin;

    let customer = await prisma.customer.findUnique({ where: { mobile } });
    const isNewCustomer = !customer;
    if (!customer) {
      // Same self sign-up path as the OTP flow: create a placeholder customer
      // for a number with no existing record, then let the app collect the
      // rest of the profile.
      customer = await prisma.customer.create({
        data: {
          name: `Customer ${mobile.slice(-4)}`,
          mobile,
          status: CustomerStatus.ACTIVE,
          fcmToken: dto.fcmToken,
        },
      });
      logger.info(`[Auth/firebase-login] Created new customer mobile=${mobile} customerId=${customer.id}`);
    } else if (dto.fcmToken) {
      customer = await prisma.customer.update({ where: { id: customer.id }, data: { fcmToken: dto.fcmToken } });
      logger.info(`[Auth/firebase-login] Updated customer FCM mobile=${mobile} customerId=${customer.id}`);
    } else {
      logger.info(`[Auth/firebase-login] Existing customer mobile=${mobile} customerId=${customer.id}`);
    }

    const tokens = await this.issueTokens({ sub: customer.id, principal: 'customer' }, 'customer');
    logger.info(`[Auth/firebase-login] Issued customer tokens mobile=${mobile}`);
    return {
      ...tokens,
      isNew: isNewCustomer,
      user: { id: customer.id, name: customer.name, mobile: customer.mobile, status: customer.status, role: 'CUSTOMER' as const, language: customer.language },
    };
  }

  // ---------------- REFRESH / LOGOUT ----------------
  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw ApiError.unauthorized('Invalid refresh token');
    }
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.revoked || dayjs().isAfter(stored.expiresAt)) {
      throw ApiError.unauthorized('Refresh token expired or revoked');
    }
    // rotate
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
    const tokens = await this.issueTokens(
      { sub: payload.sub, principal: payload.principal, role: payload.role },
      payload.principal
    );
    return tokens;
  }

  async logout(refreshToken: string) {
    await prisma.refreshToken.updateMany({ where: { token: refreshToken }, data: { revoked: true } });
    return { success: true };
  }

  async updateFcmToken(customerId: string, fcmToken: string) {
    await prisma.customer.update({ where: { id: customerId }, data: { fcmToken } });
    return { success: true };
  }

  /** Persist the logged-in user's preferred language (works for any principal). */
  async setLanguage(user: JwtPayload, language: 'en' | 'hi') {
    if (user.principal === 'admin') {
      await prisma.admin.update({ where: { id: user.sub }, data: { language } });
    } else if (user.principal === 'driver') {
      await prisma.driver.update({ where: { id: user.sub }, data: { language } });
    } else {
      await prisma.customer.update({ where: { id: user.sub }, data: { language } });
    }
    return { language };
  }

  async me(payload: JwtPayload) {
    if (payload.principal === 'admin') {
      const admin = await prisma.admin.findUnique({
        where: { id: payload.sub },
        select: { id: true, name: true, email: true, role: true, phone: true, mobile: true, avatarUrl: true, lastLoginAt: true, language: true },
      });
      if (!admin) throw ApiError.notFound('Admin not found');
      return { principal: 'admin', ...admin };
    }
    if (payload.principal === 'driver') {
      const driver = await prisma.driver.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          name: true,
          mobile: true,
          email: true,
          zone: true,
          status: true,
          language: true,
          vehicle: { select: { id: true, number: true, type: true, capacity: true } },
        },
      });
      if (!driver) throw ApiError.notFound('Driver not found');
      return { principal: 'driver', role: 'DRIVER', ...driver };
    }
    const customer = await prisma.customer.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, mobile: true, email: true, area: true, address: true, status: true, customerType: true, language: true },
    });
    if (!customer) throw ApiError.notFound('Customer not found');
    return { principal: 'customer', role: 'CUSTOMER', ...customer };
  }
}

export const authService = new AuthService();
