import dotenv from 'dotenv';

dotenv.config();

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT ?? '4000', 10),
  apiPrefix: process.env.API_PREFIX ?? '/api/v1',
  corsOrigins: (process.env.CORS_ORIGINS ?? '*')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  databaseUrl: required('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/waterflow?schema=public'),

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev_access_secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },

  otp: {
    devCode: process.env.OTP_DEV_CODE ?? '123456',
    expiresMinutes: parseInt(process.env.OTP_EXPIRES_MINUTES ?? '5', 10),
    // When true, OTP is the fixed devCode and returned in the response —
    // lets you keep NODE_ENV=production while still testing login without SMS.
    testMode: process.env.OTP_TEST_MODE === 'true',
  },

  sms: {
    // 'msg91' | 'fast2sms' | 'twilio' | 'console' (console = log only, no real SMS)
    provider: (process.env.SMS_PROVIDER ?? 'console').toLowerCase(),
    senderId: process.env.SMS_SENDER_ID ?? '',
    msg91: {
      authKey: process.env.MSG91_AUTH_KEY ?? '',
      templateId: process.env.MSG91_TEMPLATE_ID ?? '',
    },
    fast2sms: {
      apiKey: process.env.FAST2SMS_API_KEY ?? '',
      messageId: process.env.FAST2SMS_MESSAGE_ID ?? '',
    },
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
      authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
      from: process.env.TWILIO_FROM ?? '',
    },
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? '',
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  },

  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
  },

  ai: {
    provider: (process.env.AI_PROVIDER ?? 'openai').toLowerCase(),
    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    openaiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    customerDailyLimit: parseInt(process.env.AI_CUSTOMER_DAILY_LIMIT ?? '3', 10),
  },

  firebase: {
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? '',
    serviceAccountInline: process.env.FIREBASE_SERVICE_ACCOUNT ?? '',
  },

  uploads: {
    dir: process.env.UPLOAD_DIR ?? 'uploads',
    maxMb: parseInt(process.env.MAX_UPLOAD_MB ?? '5', 10),
  },

  inventory: {
    lowThreshold: parseInt(process.env.INVENTORY_LOW_THRESHOLD ?? '20', 10),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX ?? '300', 10),
  },
};
