-- WaterFlow ERP — PostgreSQL schema (reference DDL)
-- Authoritative source is backend/prisma/schema.prisma; this mirrors it for
-- teams that prefer raw SQL. Run `prisma migrate` for the managed version.

-- ============================ ENUMS ============================
CREATE TYPE "AdminRole"            AS ENUM ('SUPER_ADMIN','ADMIN');
CREATE TYPE "CustomerType"         AS ENUM ('DAILY','WEEKLY','MONTHLY');
CREATE TYPE "CustomerStatus"       AS ENUM ('ACTIVE','INACTIVE');
CREATE TYPE "Weekday"              AS ENUM ('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY');
CREATE TYPE "OrderType"            AS ENUM ('REGULAR','EXTRA');
CREATE TYPE "OrderStatus"          AS ENUM ('PENDING','ACCEPTED','PROCESSING','DELIVERED','CANCELLED');
CREATE TYPE "DeliveryStatus"       AS ENUM ('PENDING','DELIVERED','CANCELLED');
CREATE TYPE "InventoryAction"      AS ENUM ('STOCK_IN','FILLED','EMPTIED','ALLOCATED','RETURNED','DAMAGED','LOST','ADJUSTMENT');
CREATE TYPE "InvoiceStatus"        AS ENUM ('PENDING','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED');
CREATE TYPE "PaymentStatus"        AS ENUM ('PENDING','SUCCESS','FAILED','REFUNDED');
CREATE TYPE "PaymentMethod"        AS ENUM ('RAZORPAY','CASH','UPI','CARD','ADJUSTMENT');
CREATE TYPE "NotificationAudience" AS ENUM ('ADMIN','CUSTOMER');
CREATE TYPE "NotificationType"     AS ENUM ('ORDER_ACCEPTED','ORDER_DELIVERED','BILL_GENERATED','PAYMENT_SUCCESS','PAYMENT_FAILED','PAYMENT_DUE_REMINDER','NEW_CUSTOMER','NEW_ORDER_REQUEST','PAYMENT_RECEIVED','INVENTORY_LOW','GENERAL');

-- ============================ TABLES ============================
CREATE TABLE admins (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  role          "AdminRole" NOT NULL DEFAULT 'ADMIN',
  phone         TEXT,
  "avatarUrl"   TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT TRUE,
  "lastLoginAt" TIMESTAMP,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_admins_role ON admins(role);

CREATE TABLE customers (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  mobile            TEXT UNIQUE NOT NULL,
  email             TEXT,
  address           TEXT,
  area              TEXT,
  landmark          TEXT,
  "customerType"    "CustomerType" NOT NULL DEFAULT 'DAILY',
  status            "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
  "securityDeposit" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "ratePerCamper"   NUMERIC(10,2) NOT NULL DEFAULT 0,
  "allocatedCampers" INTEGER NOT NULL DEFAULT 0,
  notes             TEXT,
  "fcmToken"        TEXT,
  "isPaused"        BOOLEAN NOT NULL DEFAULT FALSE,
  "pausedFrom"      TIMESTAMP,
  "pausedTo"        TIMESTAMP,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_area ON customers(area);
CREATE INDEX idx_customers_type ON customers("customerType");

CREATE TABLE customer_schedules (
  id          TEXT PRIMARY KEY,
  "customerId" TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  weekday     "Weekday" NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  quantity    INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE ("customerId", weekday)
);

CREATE TABLE orders (
  id            TEXT PRIMARY KEY,
  "orderNumber" TEXT UNIQUE NOT NULL,
  "customerId"  TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type          "OrderType" NOT NULL DEFAULT 'REGULAR',
  status        "OrderStatus" NOT NULL DEFAULT 'PENDING',
  quantity      INTEGER NOT NULL DEFAULT 1,
  "orderDate"   DATE NOT NULL,
  remarks       TEXT,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_customer ON orders("customerId");
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders("orderDate");

CREATE TABLE order_items (
  id        TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  name      TEXT NOT NULL DEFAULT 'Water Camper (20L)',
  quantity  INTEGER NOT NULL DEFAULT 1,
  rate      NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount    NUMERIC(10,2) NOT NULL DEFAULT 0
);
CREATE INDEX idx_order_items_order ON order_items("orderId");

CREATE TABLE deliveries (
  id                  TEXT PRIMARY KEY,
  "orderId"           TEXT UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  "customerId"        TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status              "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "deliveryDate"      DATE,
  "quantityDelivered" INTEGER NOT NULL DEFAULT 0,
  "emptyCollected"    INTEGER NOT NULL DEFAULT 0,
  remarks             TEXT,
  "createdAt"         TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_deliveries_customer ON deliveries("customerId");
CREATE INDEX idx_deliveries_status ON deliveries(status);

CREATE TABLE inventory (
  id                TEXT PRIMARY KEY DEFAULT 'default',
  "totalCampers"    INTEGER NOT NULL DEFAULT 0,
  "filledCampers"   INTEGER NOT NULL DEFAULT 0,
  "emptyCampers"    INTEGER NOT NULL DEFAULT 0,
  "damagedCampers"  INTEGER NOT NULL DEFAULT 0,
  "lostCampers"     INTEGER NOT NULL DEFAULT 0,
  "returnedCampers" INTEGER NOT NULL DEFAULT 0,
  "allocatedCampers" INTEGER NOT NULL DEFAULT 0,
  "updatedAt"       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE inventory_logs (
  id        TEXT PRIMARY KEY,
  action    "InventoryAction" NOT NULL,
  quantity  INTEGER NOT NULL,
  remarks   TEXT,
  "adminId" TEXT REFERENCES admins(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_inv_logs_action ON inventory_logs(action);
CREATE INDEX idx_inv_logs_date ON inventory_logs("createdAt");

CREATE TABLE invoices (
  id            TEXT PRIMARY KEY,
  "invoiceNumber" TEXT UNIQUE NOT NULL,
  "customerId"  TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  "periodStart" DATE NOT NULL,
  "periodEnd"   DATE NOT NULL,
  quantity      INTEGER NOT NULL DEFAULT 0,
  rate          NUMERIC(10,2) NOT NULL DEFAULT 0,
  "subTotal"    NUMERIC(10,2) NOT NULL DEFAULT 0,
  "taxAmount"   NUMERIC(10,2) NOT NULL DEFAULT 0,
  "totalAmount" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "paidAmount"  NUMERIC(10,2) NOT NULL DEFAULT 0,
  "dueAmount"   NUMERIC(10,2) NOT NULL DEFAULT 0,
  status        "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
  "dueDate"     DATE,
  "pdfUrl"      TEXT,
  notes         TEXT,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_customer ON invoices("customerId");
CREATE INDEX idx_invoices_status ON invoices(status);

CREATE TABLE invoice_items (
  id          TEXT PRIMARY KEY,
  "invoiceId" TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 1,
  rate        NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount      NUMERIC(10,2) NOT NULL DEFAULT 0
);
CREATE INDEX idx_invoice_items_invoice ON invoice_items("invoiceId");

CREATE TABLE payments (
  id                  TEXT PRIMARY KEY,
  "customerId"        TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  "invoiceId"         TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  amount              NUMERIC(10,2) NOT NULL,
  method              "PaymentMethod" NOT NULL DEFAULT 'RAZORPAY',
  status              "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "razorpayOrderId"   TEXT UNIQUE,
  "razorpayPaymentId" TEXT,
  "razorpaySignature" TEXT,
  "refundId"          TEXT,
  notes               TEXT,
  "createdAt"         TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_customer ON payments("customerId");
CREATE INDEX idx_payments_status ON payments(status);

CREATE TABLE notifications (
  id          TEXT PRIMARY KEY,
  audience    "NotificationAudience" NOT NULL,
  type        "NotificationType" NOT NULL DEFAULT 'GENERAL',
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB,
  "customerId" TEXT REFERENCES customers(id) ON DELETE CASCADE,
  "isRead"    BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_audience ON notifications(audience);
CREATE INDEX idx_notif_customer ON notifications("customerId");

CREATE TABLE refresh_tokens (
  id          TEXT PRIMARY KEY,
  token       TEXT UNIQUE NOT NULL,
  "adminId"   TEXT REFERENCES admins(id) ON DELETE CASCADE,
  "customerId" TEXT REFERENCES customers(id) ON DELETE CASCADE,
  "expiresAt" TIMESTAMP NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE otp_codes (
  id          TEXT PRIMARY KEY,
  mobile      TEXT NOT NULL,
  code        TEXT NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  consumed    BOOLEAN NOT NULL DEFAULT FALSE,
  attempts    INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_mobile ON otp_codes(mobile);

CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);
