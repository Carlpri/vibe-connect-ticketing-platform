-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalKes" INTEGER NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "paidAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "orders_userId_createdAt_idx" ON "orders"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "orders_eventId_status_idx" ON "orders"("eventId", "status");

-- CreateIndex
CREATE INDEX "orders_status_expiresAt_idx" ON "orders"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- An order can't have a negative total
ALTER TABLE "orders" ADD CONSTRAINT orders_total_not_negative CHECK ("totalKes" >= 0);

-- A PAID order must record when it was paid
ALTER TABLE "orders" ADD CONSTRAINT orders_paid_has_paidat
  CHECK (status <> 'PAID' OR "paidAt" IS NOT NULL);

-- Block Supabase's public REST API; Prisma is unaffected
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;