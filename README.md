# 💧 WaterFlow ERP

A production-ready **Water Distribution Management System** for water-can (camper) distribution businesses. It manages customers, delivery schedules, orders, inventory of campers, automatic billing, Razorpay payments, push notifications and reporting.

## Monorepo Structure

```
waterflow-erp/
├── backend/             # Node.js + Express + Prisma + PostgreSQL REST API
├── admin-dashboard/     # React + Vite + TypeScript + MUI admin panel
├── mobile-app/          # React Native CLI customer app
├── docs/                # API docs, architecture, deployment guide
├── docker-compose.yml   # Local full-stack orchestration
└── .github/workflows/   # CI/CD pipelines
```

## Tech Stack

| Layer            | Technology |
|------------------|------------|
| Backend          | Node.js, Express.js, TypeScript, Prisma ORM, PostgreSQL |
| Auth             | JWT (access + refresh), OTP for customers |
| Payments         | Razorpay |
| Notifications    | Firebase Cloud Messaging (FCM) |
| File uploads     | Multer |
| API docs         | Swagger / OpenAPI |
| Admin Dashboard  | React, Vite, TypeScript, Redux Toolkit, React Query, Material UI, Axios, Recharts |
| Mobile App       | React Native CLI, TypeScript, Redux Toolkit, React Navigation, Axios, FCM, Razorpay |
| Infra            | Docker, Docker Compose, GitHub Actions |

## Roles

1. **Super Admin** – full access, manages admins & settings.
2. **Admin** – day-to-day operations (customers, orders, inventory, billing).
3. **Customer** – mobile app user (orders, billing, payments).

## Quick Start

```bash
# 1. Backend
cd backend
cp .env.example .env          # fill values
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev                   # http://localhost:4000  (Swagger at /api/docs)

# 2. Admin Dashboard
cd ../admin-dashboard
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173

# 3. Mobile App
cd ../mobile-app
npm install
npx react-native run-android  # or run-ios
```

Or run the whole stack with Docker:

```bash
docker compose up --build
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## Default Seed Credentials

| Role        | Email                  | Password    |
|-------------|------------------------|-------------|
| Super Admin | superadmin@waterflow.com | Admin@123 |
| Admin       | admin@waterflow.com      | Admin@123 |

Customer login uses mobile number + OTP. In non-production the OTP is fixed to `123456` and also returned in the API response / logs for testing.

## License

MIT
