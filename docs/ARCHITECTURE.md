# Architecture — WaterFlow ERP

## Overview

WaterFlow ERP is a 3-tier system:

```
┌──────────────────┐      ┌──────────────────┐
│  Admin Dashboard │      │  Customer Mobile │
│  (React + Vite)  │      │  (React Native)  │
└────────┬─────────┘      └─────────┬────────┘
         │  HTTPS / JWT             │  HTTPS / JWT
         └────────────┬─────────────┘
                      ▼
            ┌────────────────────┐
            │   Express REST API │   (Node.js + TypeScript)
            │   /api/v1/*        │
            └─────────┬──────────┘
       ┌──────────────┼───────────────┬─────────────┐
       ▼              ▼               ▼             ▼
  PostgreSQL      Razorpay          FCM         File store
  (Prisma ORM)    (payments)     (push notif)   (invoices/uploads)
```

## Backend design

The backend follows a **modular, layered (clean) architecture**. Each feature is a self-contained module:

```
modules/<feature>/
  <feature>.routes.ts       # HTTP routing + Swagger docs
  <feature>.controller.ts   # request/response orchestration (thin)
  <feature>.service.ts      # business logic (SOLID, framework-agnostic)
  <feature>.repository.ts   # data access (Prisma) — Repository pattern
  <feature>.dto.ts          # Zod validation schemas + inferred types
```

**Layer responsibilities**

| Layer | Responsibility | Depends on |
|-------|----------------|-----------|
| Routes | Bind URLs to controllers, attach auth/validation middleware | Controller |
| Controller | Parse request, call service, format response | Service |
| Service | Business rules, transactions, cross-module calls | Repository, other services |
| Repository | Prisma queries only | Prisma |
| DTO | Input validation (Zod) | — |

Cross-cutting concerns live in `middlewares/` (auth, validation, rate-limit, errors, uploads), `config/` (env, prisma, logger, swagger, firebase, razorpay) and `utils/` (jwt, password, pagination, responses, errors).

## Auth

- **Admins** authenticate with email + password → bcrypt verify → JWT access (15m) + refresh (30d).
- **Customers, drivers, and admins** authenticate with mobile + OTP only after an administrator has created their account → JWT access + refresh.
- Refresh tokens are persisted (`refresh_tokens` table), rotated on use, and revocable.
- `authenticate(principal?)` guards routes; `authorize(...roles)` restricts admin role.

## Key business flows

1. **Scheduled order generation** — an in-process scheduler (`jobs/scheduler.ts`) calls
   `orderService.generateRegularOrdersForDate()` which, for each active, non-paused customer
   whose schedule enables today's weekday, idempotently creates a `REGULAR` order.
2. **Billing** — `billingService.generate()` aggregates delivered orders in a period, computes
   totals + tax, creates an invoice + items, renders a PDF (pdfkit) and notifies the customer.
3. **Payments** — customer creates a Razorpay order (`/me/payments/razorpay-order`), pays via the
   mobile SDK, then verifies the signature (`/verify`). A webhook provides server-to-server
   confirmation as a fallback. Successful payments call `billingService.applyPayment()` to update
   invoice paid/due/status.
4. **Inventory** — every movement (`STOCK_IN`, `FILLED`, `DAMAGED`, `LOST`, …) atomically updates the
   single `inventory` snapshot and writes an `inventory_logs` row; low stock triggers an admin alert.
5. **Notifications** — `notificationService.notify()` persists a row and (best-effort) pushes via FCM.

## Data model

13 tables — see [database.sql](database.sql) and `backend/prisma/schema.prisma`. Highlights:
- `Inventory` is a single-row snapshot (id = `default`) for O(1) dashboard reads, with `inventory_logs` as the audit trail.
- Monetary values use `Decimal(10,2)`.
- Indexes on status, dates, foreign keys and search columns for list/report performance.

## Scaling notes

- Replace the in-process scheduler with a dedicated worker (node-cron / BullMQ) or external cron hitting idempotent endpoints.
- Move uploaded invoices/files to object storage (S3/GCS) behind a CDN.
- Add Redis for rate-limit store and caching dashboard aggregates.
