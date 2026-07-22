CREATE TYPE "ExpenseCategory" AS ENUM ('FUEL', 'VEHICLE_MAINTENANCE', 'SALARY', 'RENT', 'UTILITIES', 'SUPPLIES', 'DELIVERY', 'OTHER');

CREATE TABLE "expenses" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
  "amount" DECIMAL(12,2) NOT NULL,
  "expenseDate" DATE NOT NULL,
  "paymentMode" "PaymentMethod" NOT NULL DEFAULT 'CASH',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "expenses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "expenses_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "expenses_adminId_expenseDate_idx" ON "expenses"("adminId", "expenseDate");
CREATE INDEX "expenses_category_idx" ON "expenses"("category");
