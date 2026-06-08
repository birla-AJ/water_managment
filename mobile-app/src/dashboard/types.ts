// Shapes returned by the backend /dashboard endpoints. These mirror the admin
// dashboard's contract (admin-dashboard/src/types/index.ts -> DashboardOverview)
// so both clients consume the exact same API.

export interface DashboardOverview {
  customers: { total: number; active: number; inactive: number };
  orders: { total: number; today: number; delivered: number; pending: number; cancelled: number };
  revenue: { total: number; monthly: number };
  payments: { pending: number; paid: number };
  inventory: {
    total: number;
    filled: number;
    empty: number;
    damaged: number;
    lost: number;
    returned: number;
    allocated: number;
  };
}

export interface DashboardCharts {
  revenue: { month: string; revenue: number }[];
  orders: { date: string; delivered: number; pending: number; cancelled: number; total: number }[];
  customerGrowth: { month: string; count: number }[];
  inventory: { name: string; value: number }[];
}
