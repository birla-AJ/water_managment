# Deployment Guide — WaterFlow ERP

## 1. Prerequisites
- Node.js ≥ 18, npm
- PostgreSQL ≥ 14
- (optional) Docker & Docker Compose
- Razorpay account (keys), Firebase project (service account), and Google Maps API key for full functionality

## 2. Local development

### Backend
```bash
cd backend
cp .env.example .env          # set DATABASE_URL, JWT secrets, Razorpay, Firebase, Google Maps
npm install
npm run prisma:generate
npm run prisma:migrate        # creates tables
npx prisma db execute --file prisma/ai-chat-feature.sql --schema prisma/schema.prisma
npm run seed                  # seed admins, inventory, sample customers
npm run dev                   # http://localhost:4000  (Swagger: /api/docs)
```

### Admin dashboard
```bash
cd admin-dashboard
cp .env.example .env          # VITE_API_URL=http://localhost:4000/api/v1
npm install
npm run dev                   # http://localhost:5173
```

### Mobile app
```bash
cd mobile-app
npm install
# Android emulator → backend at http://10.0.2.2:4000 (already default in src/config.ts)
npm run android               # or: npm run ios  (after: cd ios && pod install)
```
> The `mobile-app` folder contains the JS/TS sources. Generate native projects with
> `npx react-native init WaterFlowCustomer --template react-native-template-typescript`
> and copy these `src/`, `App.tsx`, `index.js` files in, or add the native folders to this one.

## 3. Docker (full stack)

```bash
# from repo root
export JWT_ACCESS_SECRET=$(openssl rand -hex 32)
export JWT_REFRESH_SECRET=$(openssl rand -hex 32)
export GOOGLE_MAPS_API_KEY=your_google_maps_key
export OPENAI_API_KEY=your_openai_key_optional
docker compose up --build -d
```
- DB: localhost:5432
- API: http://localhost:4000  (migrations run automatically on container start)
- Admin: http://localhost:8080

Seed inside the container:
```bash
docker compose exec backend npx ts-node prisma/seed.ts || \
docker compose exec backend node dist/../prisma/seed.js
```

## 4. Production checklist
- [ ] Strong, unique `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
- [ ] `NODE_ENV=production` (enables real OTP generation; OTP no longer returned in responses)
- [ ] Real SMS gateway wired in `auth.service.requestOtp`
- [ ] `CORS_ORIGINS` set to your dashboard/app origins
- [ ] Razorpay live keys + webhook secret; configure webhook URL `/api/v1/payments/webhook`
- [ ] Google Maps key configured as `GOOGLE_MAPS_API_KEY` for road-based delivery ETA; restrict the key in Google Cloud
- [ ] Optional AI key configured as `OPENAI_API_KEY`; without it, AI chat uses local ERP summaries only
- [ ] AI customer usage table applied with `npx prisma db execute --file prisma/ai-chat-feature.sql --schema prisma/schema.prisma`
- [ ] Firebase service account mounted (`FIREBASE_SERVICE_ACCOUNT_PATH` or inline JSON)
- [ ] Managed Postgres with automated backups
- [ ] HTTPS termination (reverse proxy / load balancer)
- [ ] Object storage (S3/GCS) for `uploads/` if running multiple instances
- [ ] Run `npx prisma migrate deploy` on release (the backend Dockerfile does this on boot)

## 5. CI/CD
- `.github/workflows/ci.yml` — builds backend (with a Postgres service + migrations), admin dashboard, and typechecks the mobile app on every push/PR.
- `.github/workflows/deploy.yml` — builds & pushes backend/admin Docker images to GHCR on `main`; includes a commented SSH deploy template to adapt to your host (VPS, Render, Railway, ECS, …).

## 6. Hosting suggestions
| Component | Options |
|-----------|---------|
| Backend | Render, Railway, Fly.io, AWS ECS/Fargate, any Docker host |
| Database | Neon, Supabase, RDS, Railway Postgres |
| Admin dashboard | Vercel, Netlify, Cloudflare Pages, S3+CloudFront, or the bundled nginx image |
| Mobile app | Google Play / App Store (build via Gradle / Xcode) |
