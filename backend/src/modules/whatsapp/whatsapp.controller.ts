import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/apiResponse';
import { ApiError } from '../../utils/apiError';
import { env } from '../../config/env';
import {
  waSessions,
  waCreateSession,
  waSessionQr,
  waStartSession,
  waLogout,
} from '../../config/whatsapp';

// The gateway tenant for the logged-in admin. A SUPER_ADMIN manages the shared
// "system" fallback number; a regular ADMIN manages their own number(s).
function tenantOf(req: Request): string {
  return req.user!.role === 'SUPER_ADMIN' ? env.whatsapp.systemTenantId : req.user!.sub;
}

function ensureEnabled() {
  if (!env.whatsapp.enabled) throw ApiError.badRequest('WhatsApp integration is disabled');
}

function isConnected(accounts: Array<{ live?: string; status?: string }>): boolean {
  return accounts.some((a) => a.live === 'connected' || a.status === 'connected');
}

/** GET /whatsapp/status — this admin's linked number(s) + connection state. */
export const status = asyncHandler(async (req: Request, res: Response) => {
  ensureEnabled();
  const accounts = await waSessions(tenantOf(req));
  ok(res, { connected: isConnected(accounts), accounts }, 'WhatsApp status');
});

/**
 * POST /whatsapp/connect — start/refresh linking and return the QR to scan.
 * Reuses an existing account for this admin, or creates one on first use.
 */
export const connect = asyncHandler(async (req: Request, res: Response) => {
  ensureEnabled();
  const tenantId = tenantOf(req);
  const accounts = await waSessions(tenantId);

  let accountId: string;
  if (accounts.length === 0) {
    const label = req.user!.role === 'SUPER_ADMIN' ? 'system' : `admin-${tenantId.slice(0, 8)}`;
    const created = await waCreateSession(tenantId, label);
    accountId = created.accountId;
  } else {
    accountId = accounts[0].id;
    // Kick the session so a fresh QR is emitted if it's disconnected.
    await waStartSession(accountId).catch(() => undefined);
  }

  const qr = await waSessionQr(accountId);
  ok(res, { accountId, status: qr.status, qr: qr.qr }, 'Scan the QR to link WhatsApp');
});

/** GET /whatsapp/qr/:accountId — poll status + QR while the link dialog is open. */
export const qr = asyncHandler(async (req: Request, res: Response) => {
  ensureEnabled();
  const tenantId = tenantOf(req);
  const accounts = await waSessions(tenantId);
  if (!accounts.some((a) => a.id === req.params.accountId)) {
    throw ApiError.notFound('WhatsApp account not found');
  }
  const s = await waSessionQr(req.params.accountId);
  ok(res, s, 'WhatsApp QR');
});

/** POST /whatsapp/logout — unlink this admin's number. */
export const logout = asyncHandler(async (req: Request, res: Response) => {
  ensureEnabled();
  const accounts = await waSessions(tenantOf(req));
  if (accounts.length === 0) throw ApiError.notFound('No linked WhatsApp number');
  await waLogout(accounts[0].id);
  ok(res, { ok: true }, 'WhatsApp disconnected');
});
