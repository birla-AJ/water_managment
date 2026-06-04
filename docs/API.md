# API Reference — WaterFlow ERP

Base URL: `http://localhost:4000/api/v1`
Interactive docs (Swagger UI): `http://localhost:4000/api/docs`

All responses follow:

```json
{ "success": true, "message": "...", "data": { }, "meta": { "page":1, "limit":20, "total":0, "totalPages":1 } }
```

Authenticated endpoints require `Authorization: Bearer <accessToken>`.

## Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/admin/login` | — | Admin email+password login |
| POST | `/auth/otp/request` | — | Send OTP to a mobile (dev OTP `123456`) |
| POST | `/auth/otp/verify` | — | Verify OTP, auto-register, return tokens |
| POST | `/auth/refresh` | — | Rotate refresh token |
| POST | `/auth/logout` | — | Revoke refresh token |
| GET | `/auth/me` | any | Current principal |
| PATCH | `/auth/fcm-token` | customer | Register FCM device token |

## Admin endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/overview` | KPI counters |
| GET | `/dashboard/charts` | Revenue/orders/growth/inventory series |
| GET/POST | `/customers` | List / create customers |
| GET/PUT/DELETE | `/customers/:id` | Read / update / delete |
| GET/PUT | `/customers/:id/schedules` | Read / update weekly schedule |
| POST | `/customers/:id/pause` · `/resume` | Pause / resume deliveries |
| GET/POST | `/orders` | List / create orders |
| PATCH | `/orders/:id/status` | Update order status |
| GET | `/inventory` · `/inventory/logs` | Snapshot / movement logs |
| POST | `/inventory/adjust` | Apply a stock movement |
| GET | `/billing/invoices` | List invoices |
| POST | `/billing/invoices/generate` | Generate invoice for a period |
| POST | `/billing/invoices/auto-generate` | Bulk-bill by plan |
| GET | `/billing/invoices/:id/pdf` | (Re)render PDF |
| POST | `/billing/invoices/:id/notify` | Send bill notification |
| GET | `/payments` | List payments |
| POST | `/payments/manual` | Record offline payment |
| POST | `/payments/:id/refund` | Refund |
| GET/POST | `/deliveries` · `/deliveries/mark` | List / mark delivery |
| GET | `/notifications` | Admin notifications |
| GET | `/reports/:type` | Report data |
| GET | `/reports/:type/export?format=excel\|csv\|pdf` | Export |
| GET/PUT | `/settings` · `/settings/:key` | Settings (PUT = super admin) |

`:type` ∈ `daily, weekly, monthly, yearly, revenue, customer, inventory, order, payment`.

## Customer (mobile) endpoints — prefix `/me`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PUT | `/me/profile` | Get / update profile |
| GET | `/me/schedules` | My delivery schedule |
| POST | `/me/pause` · `/me/resume` | Pause / resume |
| GET/POST | `/me/orders` | My orders / request extra |
| GET | `/me/deliveries` · `/me/deliveries/summary?period=week\|month` | Deliveries |
| GET | `/me/billing/invoices` · `/me/billing/due` | Invoices / due amount |
| POST | `/me/payments/razorpay-order` | Create Razorpay order |
| POST | `/me/payments/verify` | Verify signature & capture |
| GET | `/me/payments` | Payment history |
| GET | `/notifications/me` | My notifications |

## Example: admin login

```bash
curl -X POST http://localhost:4000/api/v1/auth/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@waterflow.com","password":"Admin@123"}'
```

## Example: customer OTP login

```bash
curl -X POST http://localhost:4000/api/v1/auth/otp/request -H 'Content-Type: application/json' -d '{"mobile":"9812345670"}'
curl -X POST http://localhost:4000/api/v1/auth/otp/verify  -H 'Content-Type: application/json' -d '{"mobile":"9812345670","otp":"123456"}'
```

## Webhook

`POST /payments/webhook` — Razorpay server-to-server events; signature verified with `RAZORPAY_WEBHOOK_SECRET` against the raw body. Configure this URL in the Razorpay dashboard.
