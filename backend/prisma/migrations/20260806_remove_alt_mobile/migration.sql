-- Drop the "alternative mobile number" field from customers and drivers.
-- No longer collected anywhere in the product (admin forms, self-registration,
-- driver forms) — removing the column outright rather than leaving it unused.

ALTER TABLE "customers" DROP COLUMN IF EXISTS "altMobile";
ALTER TABLE "drivers" DROP COLUMN IF EXISTS "altMobile";
