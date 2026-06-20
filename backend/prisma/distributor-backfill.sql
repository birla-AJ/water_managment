-- Distributor feature — one-time data backfill.
-- Run AFTER `prisma migrate dev` has created the new columns.
--
-- Existing admin-created customers already have a managing admin in
-- "createdById"; treat that admin as their distributor so their data keeps
-- showing on that admin's (now scoped) dashboard. Self-signups (createdById
-- NULL) stay unassigned and will be prompted to choose a distributor on next
-- app open.

UPDATE customers
SET "distributorId" = "createdById"
WHERE "distributorId" IS NULL
  AND "createdById" IS NOT NULL;
