# Sanskriti WhatsApp Gateway

A **reusable, multi-project** WhatsApp gateway built on **Baileys** (no Chrome — ~50MB per number). Any of your apps (school ERP, DxMart, dairy, pulsefit…) can link WhatsApp numbers and send messages over one shared HTTP API. A built-in **safe-sender** layer reduces ban risk.

> ⚠️ Baileys uses WhatsApp's unofficial Web protocol. Bulk/automated messaging can get a number **banned**. Use real (already-active) numbers, warm up slowly, message only opted-in recipients.

## Core idea (project-agnostic)
- **project** — which app is calling. Decided automatically by the API key (each app gets its own key). An app can only see/use **its own** numbers.
- **tenantId** — a sub-group inside that app: a school, a shop, a gym… (optional).
- **account** — one linked WhatsApp number, belongs to `{ project, tenantId }`.

So the same gateway serves many apps, and inside each app, many tenants — fully isolated.

## Run locally
```bash
cp .env.example .env        # set API_KEYS (project:key pairs)
npm install
npm run dev                 # http://localhost:4000
```

## Auth
Every request (except the public `/link/*` QR page) needs header:
```
x-api-key: <that project's key>
```
The key maps to a project via `API_KEYS="school-erp:key1,dxmart:key2"`.

## Linking a number
1. App calls `POST /sessions { tenantId?, label }` → `{ accountId, linkUrl }`.
2. Open `http://<gateway>/link/<accountId>` in a browser; staff scans the QR
   (Phone → WhatsApp → Settings → Linked Devices → Link a Device).
3. Status flips to `connected`; auth is saved (survives restarts).

## API
| Method | Path | Body | Purpose |
|---|---|---|---|
| POST | `/sessions` | `{ tenantId?, label }` | New number slot + start linking |
| GET  | `/sessions?tenantId=` | — | List this project's accounts + status |
| GET  | `/sessions/:id/qr` | — | Poll status + QR (data URL) |
| POST | `/sessions/:id/logout` | — | Unlink |
| DELETE | `/sessions/:id` | — | Unlink + remove |
| POST | `/send` | `{ to, text, accountId? , tenantId? }` | Queue one message |
| POST | `/send-bulk` | `{ accountId?/tenantId?, recipients:[{to,text}] }` | Queue many |
| GET  | `/queue` | — | Queue size |
| GET  | `/health` | — | Liveness (no auth) |

`to` = phone, digits with country code (e.g. `919876543210`).
Give **`accountId`** to send from a specific number, or **`tenantId`** to round-robin across that tenant's connected numbers.

## Safe-sender (anti-ban) — automatic
Tunable in `.env`: random delay, active-hours-only, per-number daily warm-up cap,
round-robin across a tenant's numbers, auto opt-out (recipient replies `STOP`/`band`/`unsubscribe`),
skip numbers not on WhatsApp. Opt-outs are scoped **per project**.

## Using it from any project
```js
// one tiny client, drop into any app
async function waSend({ to, text, tenantId, accountId }) {
  const res = await fetch(`${process.env.WA_GATEWAY_URL}/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.WA_GATEWAY_KEY },
    body: JSON.stringify({ to, text, tenantId, accountId }),
  });
  if (!res.ok) throw new Error(`gateway ${res.status}`);
  return res.json();
}
```
For the **school ERP**, set `tenantId = schoolId` and replace the whatsapp-web.js
internals of `services/whatsapp/service.js` with this call — keep the same public
method names so controllers don't change.

## Deploy
Any small VPS (x86 or ARM). Under pm2/systemd:
```bash
npm install --omit=dev
pm2 start src/index.js --name wa-gateway
```
RAM ≈ ~50MB per connected number → ~20-30 numbers fit in 2-4GB.

## Status: starter
Working foundation. Before production: load-test, persist the send queue
(currently in-memory), and consider Postgres for the store if many tenants.
