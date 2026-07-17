import { env } from './env';
import { logger } from './logger';

// ── SMS gateway ─────────────────────────────────────────────────────────────
// Provider-agnostic OTP sender. Choose the provider via SMS_PROVIDER:
//   'apitxt' | 'msg91' | 'fast2sms' | 'twilio' | 'console'
// (default: console = log only)
// Each provider reads its own credentials from env (see src/config/env.ts).
//
// All send functions throw on failure; sendOtpSms() catches and logs so the
// OTP request endpoint stays robust (the code is already persisted in the DB).

export interface SmsResult {
  sent: boolean;
  provider: string;
}

async function postForm(url: string, body: Record<string, string>, headers: Record<string, string> = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
    body: new URLSearchParams(body).toString(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json().catch(() => ({}));
}

// APITxT OTP API. The application generates and stores the code locally; APITxT
// is used only to deliver it, so verification remains in our existing auth flow.
async function sendViaApiTxt(mobile: string, otp: string) {
  const { authKey, apiUrl } = env.sms.apitxt;
  if (!authKey) throw new Error('APITXT_AUTH_KEY not set');

  const result:any = await postForm(apiUrl, {
    authkey: authKey,
    mobile: `91${mobile}`,
    otp,
  });

  const status = String(result?.status ?? '').toLowerCase();
  if (status && status !== 'success' && status !== '200') {
    throw new Error(result?.message ?? 'APITxT rejected the OTP request');
  }
}

// MSG91 OTP API — India's most common transactional/OTP provider (DLT compliant).
// Requires a DLT-approved template whose variable is named `otp` (or `OTP`).
async function sendViaMsg91(mobile: string, otp: string) {
  const { authKey, templateId } = env.sms.msg91;
  if (!authKey || !templateId) throw new Error('MSG91_AUTH_KEY / MSG91_TEMPLATE_ID not set');
  const res = await fetch('https://control.msg91.com/api/v5/otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authkey: authKey },
    body: JSON.stringify({
      template_id: templateId,
      mobile: `91${mobile}`,
      otp,
      ...(env.sms.senderId ? { sender: env.sms.senderId } : {}),
    }),
  });
  if (!res.ok) throw new Error(`MSG91 HTTP ${res.status}: ${await res.text()}`);
}

// Fast2SMS — simple India provider. DLT route needs sender_id + message (template) id.
async function sendViaFast2Sms(mobile: string, otp: string) {
  const { apiKey, messageId } = env.sms.fast2sms;
  if (!apiKey) throw new Error('FAST2SMS_API_KEY not set');
  // OTP route: variables_values carries the code; for DLT use route=dlt with message id.
  const body: Record<string, string> = messageId
    ? { route: 'dlt', sender_id: env.sms.senderId, message: messageId, variables_values: otp, numbers: mobile, flash: '0' }
    : { route: 'otp', variables_values: otp, numbers: mobile };
  await postForm('https://www.fast2sms.com/dev/bulkV2', body, { authorization: apiKey });
}

// Twilio — global fallback (also needs Indian DLT registration to deliver to +91).
async function sendViaTwilio(mobile: string, otp: string) {
  const { accountSid, authToken, from } = env.sms.twilio;
  if (!accountSid || !authToken || !from) throw new Error('TWILIO_* env not set');
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  await postForm(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    { To: `+91${mobile}`, From: from, Body: `Your WaterFlow OTP is ${otp}. Valid for ${env.otp.expiresMinutes} minutes.` },
    { Authorization: `Basic ${auth}` },
  );
}

export async function sendOtpSms(mobile: string, otp: string): Promise<SmsResult> {
  const provider = env.sms.provider;
  try {
    switch (provider) {
      case 'apitxt':
        await sendViaApiTxt(mobile, otp);
        break;
      case 'msg91':
        await sendViaMsg91(mobile, otp);
        break;
      case 'fast2sms':
        await sendViaFast2Sms(mobile, otp);
        break;
      case 'twilio':
        await sendViaTwilio(mobile, otp);
        break;
      default:
        // No provider configured — log only (safe for dev / pre-DLT testing).
        logger.info(`📲 [SMS:console] OTP for ${mobile}: ${otp}`);
        return { sent: false, provider: 'console' };
    }
    logger.info(`📲 OTP SMS sent to ${mobile} via ${provider}`);
    return { sent: true, provider };
  } catch (err) {
    logger.error(`SMS send failed via ${provider}: ${(err as Error).message}`);
    return { sent: false, provider };
  }
}
