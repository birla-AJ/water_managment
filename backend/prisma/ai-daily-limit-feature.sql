CREATE TABLE IF NOT EXISTS "ai_daily_usages" (
  "id" TEXT NOT NULL,
  "principal" TEXT NOT NULL,
  "principalId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_daily_usages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_daily_usages_principal_principalId_date_key"
  ON "ai_daily_usages" ("principal", "principalId", "date");

CREATE INDEX IF NOT EXISTS "ai_daily_usages_principal_principalId_idx"
  ON "ai_daily_usages" ("principal", "principalId");

CREATE INDEX IF NOT EXISTS "ai_daily_usages_date_idx"
  ON "ai_daily_usages" ("date");
