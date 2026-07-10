import { api } from '../api/client';
import type {
  ApiResponse,
  Customer,
  CustomerSchedule,
  DashboardOverview,
  Driver,
  Inventory,
  Invoice,
  Order,
  Payment,
  Vehicle,
} from './types';

// Admin API surface — mirrors admin-dashboard/src/api/endpoints.ts but routed
// through the mobile axios client (auth header + refresh interceptor included).

export const adminDashboardApi = {
  overview: (): Promise<DashboardOverview> => api.get('/dashboard/overview').then((r) => r.data.data),
  charts: () => api.get('/dashboard/charts').then((r) => r.data.data),
};

export const adminCustomerApi = {
  list: (params: Record<string, unknown>): Promise<ApiResponse<Customer[]>> =>
    api.get('/customers', { params }).then((r) => r.data),
  get: (id: string): Promise<Customer> => api.get(`/customers/${id}`).then((r) => r.data.data),
  create: (body: Partial<Customer>): Promise<Customer> => api.post('/customers', body).then((r) => r.data.data),
  update: (id: string, body: Partial<Customer>): Promise<Customer> =>
    api.put(`/customers/${id}`, body).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/customers/${id}`),
  getSchedules: (id: string): Promise<CustomerSchedule[]> =>
    api.get(`/customers/${id}/schedules`).then((r) => r.data.data),
  updateSchedules: (id: string, schedules: Partial<CustomerSchedule>[]) =>
    api.put(`/customers/${id}/schedules`, { schedules }).then((r) => r.data.data),
  pause: (id: string) => api.post(`/customers/${id}/pause`, {}),
  resume: (id: string) => api.post(`/customers/${id}/resume`, {}),
  skipDates: (id: string): Promise<string[]> => api.get(`/customers/${id}/skip-dates`).then((r) => r.data.data),
  setSkipDates: (id: string, dates: string[]): Promise<string[]> =>
    api.put(`/customers/${id}/skip-dates`, { dates }).then((r) => r.data.data),
};

export const adminVehicleApi = {
  list: (params: Record<string, unknown>): Promise<ApiResponse<Vehicle[]>> =>
    api.get('/vehicles', { params }).then((r) => r.data),
  available: (): Promise<Vehicle[]> => api.get('/vehicles/available').then((r) => r.data.data),
  create: (body: Partial<Vehicle>): Promise<Vehicle> => api.post('/vehicles', body).then((r) => r.data.data),
  update: (id: string, body: Partial<Vehicle>): Promise<Vehicle> =>
    api.put(`/vehicles/${id}`, body).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/vehicles/${id}`),
};

export const adminDriverApi = {
  list: (params: Record<string, unknown>): Promise<ApiResponse<Driver[]>> =>
    api.get('/drivers', { params }).then((r) => r.data),
  get: (id: string): Promise<Driver> => api.get(`/drivers/${id}`).then((r) => r.data.data),
  create: (body: Partial<Driver>): Promise<Driver> => api.post('/drivers', body).then((r) => r.data.data),
  update: (id: string, body: Partial<Driver>): Promise<Driver> =>
    api.put(`/drivers/${id}`, body).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/drivers/${id}`),
  assignVehicle: (id: string, vehicleId: string | null) =>
    api.post(`/drivers/${id}/assign-vehicle`, { vehicleId }).then((r) => r.data.data),
  assignCustomers: (id: string, customerIds: string[]) =>
    api.post(`/drivers/${id}/assign-customers`, { customerIds }).then((r) => r.data.data),
  unassignCustomer: (id: string, customerId: string) => api.delete(`/drivers/${id}/customers/${customerId}`),
  notify: (id: string, title: string, body: string) =>
    api.post(`/drivers/${id}/notify`, { title, body }).then((r) => r.data.data),
};

export const adminOrderApi = {
  list: (params: Record<string, unknown>): Promise<ApiResponse<Order[]>> =>
    api.get('/orders', { params }).then((r) => r.data),
  create: (body: Record<string, unknown>): Promise<Order> => api.post('/orders', body).then((r) => r.data.data),
  updateStatus: (id: string, status: string, remarks?: string) =>
    api.patch(`/orders/${id}/status`, { status, remarks }).then((r) => r.data.data),
};

export const adminInventoryApi = {
  get: (): Promise<Inventory> => api.get('/inventory').then((r) => r.data.data),
  logs: (params: Record<string, unknown>) => api.get('/inventory/logs', { params }).then((r) => r.data),
  adjust: (action: string, quantity: number, remarks?: string) =>
    api.post('/inventory/adjust', { action, quantity, remarks }).then((r) => r.data.data),
};

export const adminBillingApi = {
  list: (params: Record<string, unknown>): Promise<ApiResponse<Invoice[]>> =>
    api.get('/billing/invoices', { params }).then((r) => r.data),
  generate: (body: Record<string, unknown>) => api.post('/billing/invoices/generate', body).then((r) => r.data.data),
  autoGenerate: (plan: string) => api.post('/billing/invoices/auto-generate', { plan }).then((r) => r.data.data),
  notify: (id: string) => api.post(`/billing/invoices/${id}/notify`, {}),
  pdf: (id: string): Promise<{ pdfUrl: string }> =>
    api.get(`/billing/invoices/${id}/pdf`).then((r) => r.data.data),
};

export const adminPaymentApi = {
  list: (params: Record<string, unknown>): Promise<ApiResponse<Payment[]>> =>
    api.get('/payments', { params }).then((r) => r.data),
  recordManual: (body: Record<string, unknown>) => api.post('/payments/manual', body).then((r) => r.data.data),
  refund: (id: string, amount?: number) => api.post(`/payments/${id}/refund`, { amount }).then((r) => r.data.data),
};

export const adminNotificationApi = {
  list: (params: Record<string, unknown>) => api.get('/notifications', { params }).then((r) => r.data),
  unreadCount: (): Promise<number> => api.get('/notifications/unread-count').then((r) => r.data.data.count),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`, {}),
  markAllRead: () => api.patch('/notifications/read-all', {}),
};

export const adminReportApi = {
  get: (type: string, params: Record<string, unknown>) => api.get(`/reports/${type}`, { params }).then((r) => r.data.data),
};

export const adminSettingsApi = {
  getAll: () => api.get('/settings').then((r) => r.data.data),
  update: (key: string, value: Record<string, unknown>) => api.put(`/settings/${key}`, value).then((r) => r.data.data),
};

export const adminAiApi = {
  suggestions: (): Promise<string[]> => api.get('/ai/suggestions').then((r) => r.data.data),
  chat: (message: string, intent?: string) => api.post('/ai/chat', { message, intent }).then((r) => r.data.data),
};
