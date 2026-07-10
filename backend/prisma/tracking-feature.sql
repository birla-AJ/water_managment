-- WaterFlow ERP tracking/map feature database patch
-- Apply this to existing PostgreSQL databases before running the new backend.

ALTER TABLE "drivers"
  ADD COLUMN IF NOT EXISTS "isOnDuty" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "dutyStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "drivers_isOnDuty_idx" ON "drivers"("isOnDuty");

CREATE TABLE IF NOT EXISTS "driver_locations" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "accuracy" DOUBLE PRECISION,
  "speed" DOUBLE PRECISION,
  "heading" DOUBLE PRECISION,
  "batteryLevel" DOUBLE PRECISION,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "driver_locations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "driver_locations_driverId_recordedAt_idx"
  ON "driver_locations"("driverId", "recordedAt");

ALTER TABLE "driver_locations"
  DROP CONSTRAINT IF EXISTS "driver_locations_driverId_fkey",
  ADD CONSTRAINT "driver_locations_driverId_fkey"
    FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "driver_duty_sessions" (
  "id" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "driver_duty_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "driver_duty_sessions_driverId_startedAt_idx"
  ON "driver_duty_sessions"("driverId", "startedAt");
CREATE INDEX IF NOT EXISTS "driver_duty_sessions_endedAt_idx"
  ON "driver_duty_sessions"("endedAt");

ALTER TABLE "driver_duty_sessions"
  DROP CONSTRAINT IF EXISTS "driver_duty_sessions_driverId_fkey",
  ADD CONSTRAINT "driver_duty_sessions_driverId_fkey"
    FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "service_area_polygons" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "geoJson" JSONB NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#0E8C84',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_area_polygons_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "service_area_polygons_adminId_idx"
  ON "service_area_polygons"("adminId");
CREATE INDEX IF NOT EXISTS "service_area_polygons_isActive_idx"
  ON "service_area_polygons"("isActive");

ALTER TABLE "service_area_polygons"
  DROP CONSTRAINT IF EXISTS "service_area_polygons_adminId_fkey",
  ADD CONSTRAINT "service_area_polygons_adminId_fkey"
    FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
