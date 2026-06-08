import { api } from '../api/client';
import type { DashboardCharts, DashboardOverview } from './types';

// Business-overview dashboard endpoints. These are the same routes the admin
// web dashboard calls (GET /dashboard/overview, GET /dashboard/charts) and are
// admin-protected on the backend — the signed-in account must have admin role.
export const dashboardApi = {
  overview: (): Promise<DashboardOverview> =>
    api.get('/dashboard/overview').then((r) => r.data.data),
  charts: (): Promise<DashboardCharts> =>
    api.get('/dashboard/charts').then((r) => r.data.data),
};
