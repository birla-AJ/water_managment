CREATE TABLE IF NOT EXISTS "ai_chat_usages" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_chat_usages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_chat_usages_customerId_date_key" ON "ai_chat_usages"("customerId", "date");
CREATE INDEX IF NOT EXISTS "ai_chat_usages_date_idx" ON "ai_chat_usages"("date");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ai_chat_usages_customerId_fkey'
      AND table_name = 'ai_chat_usages'
  ) THEN
    ALTER TABLE "ai_chat_usages"
      ADD CONSTRAINT "ai_chat_usages_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
