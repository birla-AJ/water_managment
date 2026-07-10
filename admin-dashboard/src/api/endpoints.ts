import { api } from './client';
import type {
  Admin,
  AiChatResponse,
  ApiResponse,
  Customer,
  CustomerSchedule,
  DashboardOverview,
  Driver,
  Inventory,
  Invoice,
  LiveTrackingSnapshot,
  Order,
  Payment,
  ServiceArea,
  ServiceAreaPolygon,
  Vehicle,
} from '../types';

// ---- Auth ----
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/admin/login', { email, password }).then((r) => r.data.data),
  // Mobile-number + OTP login. The same OTP endpoints the apps use; an admin
  // number resolves to an ADMIN token on /auth/otp/verify.
  requestOtp: (mobile: string) => api.post('/auth/otp/request', { mobile }).then((r) => r.data.data),
  verifyOtp: (mobile: string, otp: string) =>
    api.post('/auth/otp/verify', { mobile, otp }).then((r) => r.data.data),
  me: () => api.get('/auth/me').then((r) => r.data.data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
};

// ---- Dashboard ----
export const dashboardApi = {
  overview: () => api.get<ApiResponse<DashboardOverview>>('/dashboard/overview').then((r) => r.data.data),
  charts: () => api.get('/dashboard/charts').then((r) => r.data.data),
};

// ---- Admins (super admin only) ----
export const adminApi = {
  list: (params: Record<string, unknown>) => api.get<ApiResponse<Admin[]>>('/admins', { params }).then((r) => r.data),
  get: (id: string) => api.get<ApiResponse<Admin>>(`/admins/${id}`).then((r) => r.data.data),
  create: (body: Record<string, unknown>) => api.post('/admins', body).then((r) => r.data.data),
  update: (id: string, body: Record<string, unknown>) => api.put(`/admins/${id}`, body).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/admins/${id}`),
  customers: (id: string) => api.get<ApiResponse<Customer[]>>(`/admins/${id}/customers`).then((r) => r.data.data),
};

// ---- Service Areas (master list; super admin manages, any admin reads) ----
export const serviceAreaApi = {
  list: () => api.get<ApiResponse<ServiceArea[]>>('/service-areas').then((r) => r.data.data),
  create: (body: Partial<ServiceArea>) => api.post('/service-areas', body).then((r) => r.data.data),
  update: (id: string, body: Partial<ServiceArea>) => api.put(`/service-areas/${id}`, body).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/service-areas/${id}`),
};

// ---- Customers ----
export const customerApi = {
  list: (params: Record<string, unknown>) => api.get<ApiResponse<Customer[]>>('/customers', { params }).then((r) => r.data),
  get: (id: string) => api.get<ApiResponse<Customer>>(`/customers/${id}`).then((r) => r.data.data),
  create: (body: Partial<Customer>) => api.post('/customers', body).then((r) => r.data.data),
  update: (id: string, body: Partial<Customer>) => api.put(`/customers/${id}`, body).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/customers/${id}`),
  getSchedules: (id: string) => api.get<ApiResponse<CustomerSchedule[]>>(`/customers/${id}/schedules`).then((r) => r.data.data),
  updateSchedules: (id: string, schedules: Partial<CustomerSchedule>[]) =>
    api.put(`/customers/${id}/schedules`, { schedules }).then((r) => r.data.data),
  pause: (id: string) => api.post(`/customers/${id}/pause`, {}),
  resume: (id: string) => api.post(`/customers/${id}/resume`, {}),
  skipDates: (id: string) => api.get<ApiResponse<string[]>>(`/customers/${id}/skip-dates`).then((r) => r.data.data),
  setSkipDates: (id: string, dates: string[]) =>
    api.put<ApiResponse<string[]>>(`/customers/${id}/skip-dates`, { dates }).then((r) => r.data.data),
};

// ---- Vehicles ----
export const vehicleApi = {
  list: (params: Record<string, unknown>) => api.get<ApiResponse<Vehicle[]>>('/vehicles', { params }).then((r) => r.data),
  available: () => api.get<ApiResponse<Vehicle[]>>('/vehicles/available').then((r) => r.data.data),
  get: (id: string) => api.get<ApiResponse<Vehicle>>(`/vehicles/${id}`).then((r) => r.data.data),
  create: (body: Partial<Vehicle>) => api.post('/vehicles', body).then((r) => r.data.data),
  update: (id: string, body: Partial<Vehicle>) => api.put(`/vehicles/${id}`, body).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/vehicles/${id}`),
};

// ---- Drivers ----
export const driverApi = {
  list: (params: Record<string, unknown>) => api.get<ApiResponse<Driver[]>>('/drivers', { params }).then((r) => r.data),
  get: (id: string) => api.get<ApiResponse<Driver>>(`/drivers/${id}`).then((r) => r.data.data),
  create: (body: Partial<Driver>) => api.post('/drivers', body).then((r) => r.data.data),
  update: (id: string, body: Partial<Driver>) => api.put(`/drivers/${id}`, body).then((r) => r.data.data),
  remove: (id: string) => api.delete(`/drivers/${id}`),
  assignVehicle: (id: string, vehicleId: string | null) =>
    api.post(`/drivers/${id}/assign-vehicle`, { vehicleId }).then((r) => r.data.data),
  assignCustomers: (id: string, customerIds: string[]) =>
    api.post(`/drivers/${id}/assign-customers`, { customerIds }).then((r) => r.data.data),
  unassignCustomer: (id: string, customerId: string) => api.delete(`/drivers/${id}/customers/${customerId}`),
  notify: (id: string, title: string, body: string) =>
    api.post(`/drivers/${id}/notify`, { title, body }).then((r) => r.data.data),
};

// ---- Orders ----
export const orderApi = {
  list: (params: Record<string, unknown>) => api.get<ApiResponse<Order[]>>('/orders', { params }).then((r) => r.data),
  get: (id: string) => api.get<ApiResponse<Order>>(`/orders/${id}`).then((r) => r.data.data),
  create: (body: Record<string, unknown>) => api.post('/orders', body).then((r) => r.data.data),
  updateStatus: (id: string, status: string, remarks?: string) =>
    api.patch(`/orders/${id}/status`, { status, remarks }).then((r) => r.data.data),
};

// ---- Inventory ----
export const inventoryApi = {
  get: () => api.get<ApiResponse<Inventory>>('/inventory').then((r) => r.data.data),
  logs: (params: Record<string, unknown>) => api.get('/inventory/logs', { params }).then((r) => r.data),
  adjust: (action: string, quantity: number, remarks?: string) =>
    api.post('/inventory/adjust', { action, quantity, remarks }).then((r) => r.data.data),
};

// ---- Billing ----
export const billingApi = {
  list: (params: Record<string, unknown>) => api.get<ApiResponse<Invoice[]>>('/billing/invoices', { params }).then((r) => r.data),
  get: (id: string) => api.get<ApiResponse<Invoice>>(`/billing/invoices/${id}`).then((r) => r.data.data),
  generate: (body: Record<string, unknown>) => api.post('/billing/invoices/generate', body).then((r) => r.data.data),
  autoGenerate: (plan: string) => api.post('/billing/invoices/auto-generate', { plan }).then((r) => r.data.data),
  notify: (id: string) => api.post(`/billing/invoices/${id}/notify`, {}),
  // Re-renders the PDF with the current backend template and returns its URL.
  pdf: (id: string) => api.get<ApiResponse<{ pdfUrl: string }>>(`/billing/invoices/${id}/pdf`).then((r) => r.data.data),
};

// ---- Payments ----
export const paymentApi = {
  list: (params: Record<string, unknown>) => api.get<ApiResponse<Payment[]>>('/payments', { params }).then((r) => r.data),
  recordManual: (body: Record<string, unknown>) => api.post('/payments/manual', body).then((r) => r.data.data),
  refund: (id: string, amount?: number) => api.post(`/payments/${id}/refund`, { amount }).then((r) => r.data.data),
};

// ---- Deliveries ----
export const deliveryApi = {
  list: (params: Record<string, unknown>) => api.get('/deliveries', { params }).then((r) => r.data),
  mark: (body: Record<string, unknown>) => api.post('/deliveries/mark', body).then((r) => r.data.data),
};

// ---- Live Tracking / Service Polygons ----
export const trackingApi = {
  live: () => api.get<ApiResponse<LiveTrackingSnapshot>>('/tracking/admin/live').then((r) => r.data.data),
  createPolygon: (body: {
    adminId?: string;
    name: string;
    color?: string;
    geoJson: { type: 'Polygon'; coordinates: number[][][] };
  }) => api.post<ApiResponse<ServiceAreaPolygon>>('/tracking/polygons', body).then((r) => r.data.data),
  updatePolygon: (id: string, body: Partial<ServiceAreaPolygon>) =>
    api.put<ApiResponse<ServiceAreaPolygon>>(`/tracking/polygons/${id}`, body).then((r) => r.data.data),
  removePolygon: (id: string) => api.delete(`/tracking/polygons/${id}`),
};

// ---- AI Chat ----
export const aiApi = {
  suggestions: () => api.get<ApiResponse<string[]>>('/ai/suggestions').then((r) => r.data.data),
  chat: (message: string, intent?: string) =>
    api.post<ApiResponse<AiChatResponse>>('/ai/chat', { message, intent }).then((r) => r.data.data),
};

// ---- Notifications ----
export const notificationApi = {
  list: (params: Record<string, unknown>) => api.get('/notifications', { params }).then((r) => r.data),
  unreadCount: () => api.get('/notifications/unread-count').then((r) => r.data.data.count as number),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`, {}),
  markAllRead: () => api.patch('/notifications/read-all', {}),
};

// ---- Reports ----
export const reportApi = {
  get: (type: string, params: Record<string, unknown>) => api.get(`/reports/${type}`, { params }).then((r) => r.data.data),
  exportUrl: (type: string, format: string) => {
    const base = import.meta.env.VITE_API_URL ?? 'http://13.235.27.138:4000/api/v1';
    return `${base}/reports/${type}/export?format=${format}`;
  },
};

// ---- Settings ----
export const settingsApi = {
  getAll: () => api.get('/settings').then((r) => r.data.data),
  update: (key: string, value: Record<string, unknown>) => api.put(`/settings/${key}`, value).then((r) => r.data.data),
};
