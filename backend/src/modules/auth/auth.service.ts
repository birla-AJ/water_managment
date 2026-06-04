import dayjs from 'dayjs';
import { NotificationAudience, NotificationType } from '@prisma/client';
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
import { notificationService } from '../notification/notification.service';
import { getFirebaseAdmin } from '../../config/firebase';
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
      user: { id: driver.id, name: driver.name, mobile: driver.mobile, role: 'DRIVER' as const },
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
      user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role, avatarUrl: admin.avatarUrl },
    };
  }

  // ---------------- CUSTOMER OTP ----------------
  async requestOtp(dto: RequestOtpDto) {
    // Test mode (or non-prod): use the fixed dev code and return it in the
    // response so login works without a real SMS gateway. Otherwise generate a
    // random code and deliver it via the configured SMS provider.
    const testMode = !env.isProd || env.otp.testMode;
    const code = testMode ? env.otp.devCode : generateOtp();
    const expiresAt = dayjs().add(env.otp.expiresMinutes, 'minute').toDate();

    await prisma.otpCode.create({ data: { mobile: dto.mobile, code, expiresAt } });

    if (!testMode) await sendOtpSms(dto.mobile, code);

    return {
      mobile: dto.mobile,
      expiresInMinutes: env.otp.expiresMinutes,
      ...(testMode ? { devOtp: code } : {}),
    };
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

    // Registered driver numbers log in as drivers (no customer record created).
    const asDriver = await this.loginAsDriverIfRegistered(dto.mobile, dto.fcmToken);
    if (asDriver) return asDriver;

    let customer = await prisma.customer.findUnique({ where: { mobile: dto.mobile } });
    let isNew = false;
    if (!customer) {
      customer = await prisma.customer.create({
        data: { name: dto.name?.trim() || `Customer ${dto.mobile.slice(-4)}`, mobile: dto.mobile, fcmToken: dto.fcmToken },
      });
      isNew = true;
      await notificationService.notify({
        audience: NotificationAudience.ADMIN,
        type: NotificationType.NEW_CUSTOMER,
        title: 'New customer registered',
        body: `${customer.name} (${customer.mobile}) signed up.`,
        data: { customerId: customer.id },
      });
    } else if (dto.fcmToken) {
      customer = await prisma.customer.update({ where: { id: customer.id }, data: { fcmToken: dto.fcmToken } });
    }

    const tokens = await this.issueTokens({ sub: customer.id, principal: 'customer' }, 'customer');
    return { ...tokens, isNew, user: { id: customer.id, name: customer.name, mobile: customer.mobile, status: customer.status, role: 'CUSTOMER' as const } };
  }

  // ---------------- FIREBASE PHONE AUTH ----------------
  /** Verify a Firebase ID token (phone auth), then find-or-create the customer and issue our JWTs. */
  async firebaseLogin(dto: FirebaseLoginDto) {
    const adminSdk = getFirebaseAdmin();
    if (!adminSdk) throw ApiError.internal('Firebase is not configured on the server');

    let decoded;
    try {
      decoded = await adminSdk.auth().verifyIdToken(dto.firebaseToken);
    } catch {
      throw ApiError.unauthorized('Invalid or expired Firebase token');
    }

    if (!decoded.phone_number) throw ApiError.badRequest('Firebase token has no phone number');
    // Normalise +91XXXXXXXXXX (or any country code) down to the last 10 digits.
    const mobile = decoded.phone_number.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(mobile)) throw ApiError.badRequest('Unsupported phone number');

    // Registered driver numbers log in as drivers (no customer record created).
    const asDriver = await this.loginAsDriverIfRegistered(mobile, dto.fcmToken);
    if (asDriver) return asDriver;

    let customer = await prisma.customer.findUnique({ where: { mobile } });
    let isNew = false;
    if (!customer) {
      customer = await prisma.customer.create({
        data: { name: `Customer ${mobile.slice(-4)}`, mobile, fcmToken: dto.fcmToken },
      });
      isNew = true;
      await notificationService.notify({
        audience: NotificationAudience.ADMIN,
        type: NotificationType.NEW_CUSTOMER,
        title: 'New customer registered',
        body: `${customer.name} (${customer.mobile}) signed up.`,
        data: { customerId: customer.id },
      });
    } else if (dto.fcmToken) {
      customer = await prisma.customer.update({ where: { id: customer.id }, data: { fcmToken: dto.fcmToken } });
    }

    const tokens = await this.issueTokens({ sub: customer.id, principal: 'customer' }, 'customer');
    return { ...tokens, isNew, user: { id: customer.id, name: customer.name, mobile: customer.mobile, status: customer.status, role: 'CUSTOMER' as const } };
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

  async me(payload: JwtPayload) {
    if (payload.principal === 'admin') {
      const admin = await prisma.admin.findUnique({
        where: { id: payload.sub },
        select: { id: true, name: true, email: true, role: true, phone: true, avatarUrl: true, lastLoginAt: true },
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
          vehicle: { select: { id: true, number: true, type: true, capacity: true } },
        },
      });
      if (!driver) throw ApiError.notFound('Driver not found');
      return { principal: 'driver', role: 'DRIVER', ...driver };
    }
    const customer = await prisma.customer.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, mobile: true, email: true, area: true, address: true, status: true, customerType: true },
    });
    if (!customer) throw ApiError.notFound('Customer not found');
    return { principal: 'customer', role: 'CUSTOMER', ...customer };
  }
}

export const authService = new AuthService();
