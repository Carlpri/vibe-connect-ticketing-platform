-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountKes" INTEGER NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "merchantRequestId" TEXT,
    "checkoutRequestId" TEXT,
    "mpesaReceiptNumber" TEXT,
    "resultCode" INTEGER,
    "resultDesc" TEXT,
    "rawCallback" JSONB,
    "paidAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_checkoutRequestId_key" ON "payments"("checkoutRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_mpesaReceiptNumber_key" ON "payments"("mpesaReceiptNumber");

-- CreateIndex
CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT pay_amount_positive CHECK ("amountKes" > 0);

ALTER TABLE "payments" ADD CONSTRAINT pay_phone_format
  CHECK ("phoneNumber" ~ '^254[17][0-9]{8}$');

ALTER TABLE "payments" ADD CONSTRAINT pay_success_has_receipt
  CHECK (status <> 'SUCCESS' OR ("mpesaReceiptNumber" IS NOT NULL AND "paidAt" IS NOT NULL));

CREATE UNIQUE INDEX one_success_payment_per_order
  ON "payments" ("orderId") WHERE status = 'SUCCESS';

ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;