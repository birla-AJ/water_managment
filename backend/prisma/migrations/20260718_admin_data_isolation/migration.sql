-- Tenant ownership for admin-created drivers, vehicles and admin notifications.
-- Existing rows intentionally remain unassigned (admin_id NULL); they are
-- visible to super-admins only and are never exposed to a regular admin.
ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "adminId" TEXT;
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "adminId" TEXT;
ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "adminId" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "adminId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_adminId_key" ON "inventory"("adminId");
CREATE INDEX IF NOT EXISTS "drivers_adminId_idx" ON "drivers"("adminId");
CREATE INDEX IF NOT EXISTS "vehicles_adminId_idx" ON "vehicles"("adminId");
CREATE INDEX IF NOT EXISTS "notifications_adminId_idx" ON "notifications"("adminId");

ALTER TABLE "drivers" ADD CONSTRAINT "drivers_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
