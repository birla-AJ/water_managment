// Entity shapes for the admin section — ported from the web admin app
// (admin-dashboard/src/types/index.ts) so both clients share one contract.

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

export type CustomerType = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE';
export type Weekday =
  | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  altMobile?: string;
  email?: string;
  address?: string;
  area?: string;
  landmark?: string;
  customerType: CustomerType;
  status: CustomerStatus;
  securityDeposit: number;
  ratePerCamper: number;
  allocatedCampers: number;
  notes?: string;
  isPaused: boolean;
  schedules?: CustomerSchedule[];
  createdAt: string;
}

export interface CustomerSchedule {
  id: string;
  weekday: Weekday;
  enabled: boolean;
  quantity: number;
}

export type DriverStatus = 'ACTIVE' | 'INACTIVE';

export interface Vehicle {
  id: string;
  number: string;
  type?: string;
  capacity?: number;
  isActive: boolean;
  notes?: string;
  driver?: { id: string; name: string; mobile: string } | null;
  createdAt?: string;
}

export interface Driver {
  id: string;
  name: string;
  mobile: string;
  altMobile?: string;
  email?: string;
  licenseNumber?: string;
  address?: string;
  zone?: string;
  status: DriverStatus;
  vehicleId?: string | null;
  vehicle?: { id: string; number: string; type?: string; capacity?: number } | null;
  customers?: Array<{ id: string; name: string; mobile: string; area?: string; status: CustomerStatus; isPaused: boolean }>;
  _count?: { customers: number };
  createdAt?: string;
}

export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PROCESSING' | 'DELIVERED' | 'CANCELLED';

export interface Order {
  id: string;
  orderNumber: string;
  type: 'REGULAR' | 'EXTRA';
  status: OrderStatus;
  quantity: number;
  orderDate: string;
  remarks?: string;
  customer?: { id: string; name: string; mobile: string; area?: string };
}

export interface Inventory {
  totalCampers: number;
  filledCampers: number;
  emptyCampers: number;
  damagedCampers: number;
  lostCampers: number;
  returnedCampers: number;
  allocatedCampers: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  quantity: number;
  rate: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  customer?: { id: string; name: string; mobile: string };
  pdfUrl?: string;
}

export interface Payment {
  id: string;
  amount: number;
  method: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  createdAt: string;
  customer?: { id: string; name: string; mobile: string };
  invoice?: { invoiceNumber: string };
}

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardOverview {
  customers: { total: number; active: number; inactive: number };
  orders: { total: number; today: number; delivered: number; pending: number; cancelled: number };
  revenue: { total: number; monthly: number };
  payments: { pending: number; paid: number };
  inventory: { total: number; filled: number; empty: number; damaged: number; lost: number; returned: number; allocated: number };
}
