import { env } from './env';
import { logger } from './logger';

// ── WhatsApp gateway client ─────────────────────────────────────────────────
// Thin HTTP client for the standalone whatsapp-web.js gateway. Multi-tenant:
// every send is scoped to a `tenantId` (= the ERP admin's id) or a specific
// `accountId`, so a message goes out from the right admin's linked number.
//
// All functions are non-throwing where the caller shouldn't be broken by a
// gateway outage — they log and return a failure result instead. The feature
// flag `env.whatsapp.enabled` short-circuits everything when off.

export interface WaSendInput {
  to: string; // WhatsApp number, digits + country code, no '+', e.g. 919669380537
  text: string;
  tenantId?: string; // admin id (round-robins across that admin's numbers)
  accountId?: string; // or a specific linked number
}

export interface WaSendResult {
  sent: boolean;
  reason?: string;
}

/** Bare 10-digit Indian mobile → gateway WhatsApp number (adds country code). */
export function toWaNumber(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

function ready(): boolean {
  if (!env.whatsapp.enabled) return false;
  if (!env.whatsapp.gatewayUrl || !env.whatsapp.apiKey) {
    logger.warn('WhatsApp enabled but WHATSAPP_GATEWAY_URL / WHATSAPP_API_KEY not set');
    return false;
  }
  return true;
}

async function gw(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${env.whatsapp.gatewayUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.whatsapp.apiKey,
      ...(init.headers ?? {}),
    },
  });
}

/** Queue a message via the anti-ban queue (delayed). For bills / reminders. */
export async function waSend(input: WaSendInput): Promise<WaSendResult> {
  if (!ready()) return { sent: false, reason: 'disabled' };
  try {
    const res = await gw('/send', { method: 'POST', body: JSON.stringify(input) });
    if (!res.ok) {
      logger.warn(`WhatsApp /send HTTP ${res.status}: ${await res.text()}`);
      return { sent: false, reason: `http_${res.status}` };
    }
    // /send only queues; treat a 2xx as accepted.
    return { sent: true };
  } catch (err) {
    logger.warn(`WhatsApp /send failed: ${(err as Error).message}`);
    return { sent: false, reason: 'error' };
  }
}

/** Send NOW, bypassing the queue (instant). For login OTP. Resolves synchronously. */
export async function waSendPriority(input: WaSendInput): Promise<WaSendResult> {
  if (!ready()) return { sent: false, reason: 'disabled' };
  try {
    const res = await gw('/send-priority', { method: 'POST', body: JSON.stringify(input) });
    const body = (await res.json().catch(() => ({}))) as WaSendResult;
    if (!res.ok || !body.sent) {
      logger.warn(`WhatsApp /send-priority not sent (HTTP ${res.status}): ${body.reason ?? ''}`);
      return { sent: false, reason: body.reason ?? `http_${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    logger.warn(`WhatsApp /send-priority failed: ${(err as Error).message}`);
    return { sent: false, reason: 'error' };
  }
}

// ── Session / linking helpers (used by the admin-facing whatsapp module) ─────

export interface WaAccount {
  id: string;
  label?: string;
  tenantId?: string | null;
  status?: string;
  live?: string; // live connection status from the gateway
}

/** List an admin's linked numbers with live status. Throws on gateway error. */
export async function waSessions(tenantId: string): Promise<WaAccount[]> {
  const res = await gw(`/sessions?tenantId=${encodeURIComponent(tenantId)}`);
  if (!res.ok) throw new Error(`WhatsApp gateway /sessions HTTP ${res.status}`);
  const data = (await res.json()) as { accounts: WaAccount[] };
  return data.accounts ?? [];
}

/** Create a new number slot for an admin and start the linking (QR) flow. */
export async function waCreateSession(
  tenantId: string,
  label: string,
): Promise<{ accountId: string; linkUrl: string }> {
  const res = await gw('/sessions', {
    method: 'POST',
    body: JSON.stringify({ tenantId, label }),
  });
  if (!res.ok) throw new Error(`WhatsApp gateway create session HTTP ${res.status}`);
  return res.json() as Promise<{ accountId: string; linkUrl: string }>;
}

/** Poll an account's status + QR (PNG data URL) for the linking dialog. */
export async function waSessionQr(
  accountId: string,
): Promise<{ status: string; qr: string | null }> {
  const res = await gw(`/sessions/${encodeURIComponent(accountId)}/qr`);
  if (!res.ok) throw new Error(`WhatsApp gateway qr HTTP ${res.status}`);
  return res.json() as Promise<{ status: string; qr: string | null }>;
}

/** (Re)start an existing account (re-emit QR if it dropped). */
export async function waStartSession(accountId: string): Promise<void> {
  const res = await gw(`/sessions/${encodeURIComponent(accountId)}/start`, { method: 'POST' });
  if (!res.ok) throw new Error(`WhatsApp gateway start HTTP ${res.status}`);
}

/** Log the account out (unlink the number). */
export async function waLogout(accountId: string): Promise<void> {
  const res = await gw(`/sessions/${encodeURIComponent(accountId)}/logout`, { method: 'POST' });
  if (!res.ok) throw new Error(`WhatsApp gateway logout HTTP ${res.status}`);
}
