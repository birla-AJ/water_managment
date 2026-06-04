import { api } from './client';

export const authApi = {
  requestOtp: (mobile: string) => api.post('/auth/otp/request', { mobile }).then((r) => r.data.data),
  verifyOtp: (mobile: string, otp: string, fcmToken?: string) =>
    api.post('/auth/otp/verify', { mobile, otp, fcmToken }).then((r) => r.data.data),
  firebaseLogin: (firebaseToken: string, fcmToken?: string) =>
    api.post('/auth/firebase-login', { firebaseToken, fcmToken }).then((r) => r.data.data),
  me: () => api.get('/auth/me').then((r) => r.data.data),
  updateFcm: (fcmToken: string) => api.patch('/auth/fcm-token', { fcmToken }),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
};

export const meApi = {
  profile: () => api.get('/me/profile').then((r) => r.data.data),
  updateProfile: (body: Record<string, unknown>) => api.put('/me/profile', body).then((r) => r.data.data),
  schedules: () => api.get('/me/schedules').then((r) => r.data.data),
  pause: () => api.post('/me/pause', {}),
  resume: () => api.post('/me/resume', {}),
  skipDates: (): Promise<string[]> => api.get('/me/skip-dates').then((r) => r.data.data),
  setSkipDates: (dates: string[]): Promise<string[]> => api.put('/me/skip-dates', { dates }).then((r) => r.data.data),
};

export const orderApi = {
  list: (params?: Record<string, unknown>) => api.get('/me/orders', { params }).then((r) => r.data.data),
  create: (quantity: number, remarks?: string) => api.post('/me/orders', { quantity, remarks }).then((r) => r.data.data),
};

export const deliveryApi = {
  list: (params?: Record<string, unknown>) => api.get('/me/deliveries', { params }).then((r) => r.data.data),
  summary: (period: 'week' | 'month') => api.get('/me/deliveries/summary', { params: { period } }).then((r) => r.data.data),
};

export const billingApi = {
  invoices: () => api.get('/me/billing/invoices').then((r) => r.data.data),
  due: () => api.get('/me/billing/due').then((r) => r.data.data),
};

export const paymentApi = {
  list: () => api.get('/me/payments').then((r) => r.data.data),
  createOrder: (amount: number, invoiceId?: string) =>
    api.post('/me/payments/razorpay-order', { amount, invoiceId }).then((r) => r.data.data),
  verify: (body: Record<string, unknown>) => api.post('/me/payments/verify', body).then((r) => r.data.data),
};

export const notificationApi = {
  list: () => api.get('/notifications/me').then((r) => r.data.data),
  markAllRead: () => api.patch('/notifications/read-all', {}),
};
