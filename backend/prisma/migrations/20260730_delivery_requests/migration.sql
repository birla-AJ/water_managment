-- Deliveries are now opt-in: a customer marks the dates they DO want water.
-- The old "delivery_skips" table stored the inverse (dates they did NOT want
-- water), so its rows carry the opposite meaning and are not migrated.

DO $$ BEGIN
  CREATE TYPE "RequestSource" AS ENUM ('CUSTOMER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DELIVERY_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DELIVERY_CANCELLED';

CREATE TABLE IF NOT EXISTS "delivery_requests" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "source" "RequestSource" NOT NULL DEFAULT 'CUSTOMER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "delivery_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "delivery_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "delivery_requests_customerId_date_key" ON "delivery_requests"("customerId", "date");
CREATE INDEX IF NOT EXISTS "delivery_requests_date_idx" ON "delivery_requests"("date");

DROP TABLE IF EXISTS "delivery_skips";
