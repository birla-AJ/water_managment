# WaterFlow ERP — Backend API

Node.js + Express + TypeScript + Prisma + PostgreSQL.

## Run
```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev          # http://localhost:4000 · Swagger: /api/docs
```

## Scripts
| Script | Purpose |
|--------|---------|
| `npm run dev` | Hot-reload dev server (ts-node-dev) |
| `npm run build` / `npm start` | Compile to `dist/` and run |
| `npm run prisma:migrate` | Create/apply dev migration |
| `npm run prisma:deploy` | Apply migrations (prod) |
| `npm run seed` | Seed admins, inventory, sample customers |
| `npm run prisma:studio` | Prisma Studio GUI |

## Structure
```
src/
  config/        env, prisma, logger, swagger, firebase, razorpay
  middlewares/   auth, error, rate-limit, validate, upload
  utils/         jwt, password, pagination, apiResponse, apiError, generators
  modules/
    auth/  customer/  order/  inventory/  delivery/
    billing/  payment/  notification/  dashboard/  report/  settings/
  jobs/          scheduler (regular-order generation)
  routes.ts      central API router
  app.ts         express app factory
  server.ts      bootstrap
prisma/          schema.prisma + seed.ts
```

Each module = `routes → controller → service → repository (+ dto)`, following clean
architecture, the repository pattern and SOLID principles. See `../docs/ARCHITECTURE.md`.

## Notable env vars
`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `RAZORPAY_*`,
`FIREBASE_SERVICE_ACCOUNT_PATH`, `OTP_DEV_CODE`, `INVENTORY_LOW_THRESHOLD`.

The app degrades gracefully: without Firebase or Razorpay configured it still runs —
push notifications are skipped and payment creation surfaces a clear error.
