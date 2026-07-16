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

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN';

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatarUrl?: string;
  phone?: string;
  mobile?: string | null;
  isActive?: boolean;
  lastLoginAt?: string | null;
  language?: 'en' | 'hi';
  createdAt?: string;
  _count?: { customers: number };
  // Distributor service definition
  latitude?: number | null;
  longitude?: number | null;
  serviceRadiusKm?: number | null;
  pincodes?: string[];
  serviceAreas?: string[];
  areaLinks?: { id: string; name: string }[];
}

export interface ServiceArea {
  id: string;
  name: string;
  city?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  _count?: { admins: number };
}

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
  isOnDuty?: boolean;
  dutyStartedAt?: string | null;
  lastSeenAt?: string | null;
  vehicle?: { id: string; number: string; type?: string; capacity?: number } | null;
  customers?: Array<{ id: string; name: string; mobile: string; area?: string; status: CustomerStatus; isPaused: boolean }>;
  _count?: { customers: number };
  createdAt?: string;
}

export interface DriverLocation {
  id: string;
  driverId: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  batteryLevel?: number | null;
  recordedAt: string;
}

export interface ServiceAreaPolygon {
  id: string;
  adminId: string;
  name: string;
  geoJson: { type: 'Polygon'; coordinates: number[][][] };
  color: string;
  isActive: boolean;
  admin?: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface AiTable {
  title: string;
  columns: string[];
  rows: Array<Record<string, string | number>>;
}

export interface AiChart {
  title: string;
  type: 'bar' | 'line' | 'pie';
  xKey: string;
  yKey: string;
  data: Array<Record<string, string | number>>;
}

export interface AiChatResponse {
  answer: string;
  language: string;
  scope: 'ADMIN' | 'CUSTOMER';
  intent: string;
  provider: 'openai' | 'local';
  remainingQuestions?: number;
  dailyLimit?: number;
  resetAt?: string;
  limitExceeded?: boolean;
  cards?: Array<{ label: string; value: string | number; tone?: 'success' | 'warning' | 'danger' | 'info' }>;
  table?: AiTable;
  chart?: AiChart;
}

export interface AiUsage {
  used: number;
  limit: number;
  remaining: number;
  remainingQuestions: number;
  dailyLimit: number;
  resetAt: string;
  limitExceeded: boolean;
}

export interface LiveTrackingDriver {
  id: string;
  name: string;
  mobile: string;
  zone?: string | null;
  isOnDuty: boolean;
  dutyStartedAt?: string | null;
  lastSeenAt?: string | null;
  vehicle?: { id: string; number: string; type?: string | null } | null;
  assignedCustomers: number;
  latestLocation?: DriverLocation | null;
  isLocationFresh: boolean;
  activeDeliveries: Array<{
    id: string;
    status: string;
    customer: { id: string; name: string; mobile: string; area?: string | null; latitude?: number | null; longitude?: number | null };
    order: { id: string; orderNumber: string; quantity: number; status: string };
  }>;
}

export interface LiveTrackingSnapshot {
  generatedAt: string;
  drivers: LiveTrackingDriver[];
  polygons: ServiceAreaPolygon[];
  customers: Array<{
    id: string;
    name: string;
    mobile: string;
    area?: string | null;
    address?: string | null;
    latitude: number | null;
    longitude: number | null;
    status: string;
    allocatedCampers: number;
    driver?: { id: string; name: string } | null;
  }>;
  hubs?: Array<{
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    latitude: number | null;
    longitude: number | null;
    serviceRadiusKm?: number | null;
    serviceAreas?: string[];
  }>;
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

export interface DashboardOverview {
  customers: { total: number; active: number; inactive: number };
  orders: { total: number; today: number; delivered: number; pending: number; cancelled: number };
  revenue: { total: number; monthly: number };
  payments: { pending: number; paid: number };
  // NOTE: the /dashboard/overview endpoint returns short field names
  // (distinct from the /inventory endpoint's `...Campers` shape above).
  inventory: { total: number; filled: number; empty: number; damaged: number; lost: number; returned: number; allocated: number };
}
