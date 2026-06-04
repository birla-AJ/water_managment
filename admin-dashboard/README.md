# WaterFlow ERP — Admin Dashboard

React + Vite + TypeScript + Redux Toolkit + React Query + Material UI + Recharts.

## Run
```bash
cp .env.example .env     # VITE_API_URL=http://localhost:4000/api/v1
npm install
npm run dev              # http://localhost:5173
npm run build            # production build → dist/
```

## Structure
```
src/
  api/         axios client (refresh interceptor) + typed endpoints
  app/         redux store + typed hooks
  features/    auth slice
  components/  Layout, StatCard, PageHeader, StatusChip
  pages/       Login, Dashboard, Customers, CustomerForm, CustomerDetails,
               Orders, Inventory, Billing, Payments, Notifications, Reports,
               Settings, Profile
  theme/       MUI theme
  types/       shared API types
```

## Features
- JWT auth with automatic refresh-token rotation (single-flight).
- Dashboard KPIs + Recharts (revenue area, orders stacked bar, growth line, inventory pie).
- Customers CRUD, weekly schedule editor, pause/resume.
- Orders with inline status updates; inventory movements + logs.
- Billing (generate / auto-bill / PDF download / notify), payments (refund), reports (Excel/CSV/PDF export).
- Mobile-responsive layout (permanent drawer on desktop, temporary on mobile).

Login with the seeded `admin@waterflow.com` / `Admin@123`.
