-- Prepare payments table for Paystack while preserving historical Daraja data

-- Make phoneNumber nullable for non-mobile-money or international payments
ALTER TABLE "payments" ALTER COLUMN "phoneNumber" DROP NOT NULL;

-- Add provider-neutral columns
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'PAYSTACK';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "reference" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'KES';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "channel" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "customerEmail" TEXT;

-- Drop Daraja-specific check constraints
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS pay_phone_format;
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS pay_success_has_receipt;

-- Add provider-neutral check constraint for successful payments
ALTER TABLE "payments" ADD CONSTRAINT pay_success_has_ref
  CHECK (status <> 'SUCCESS' OR ("mpesaReceiptNumber" IS NOT NULL OR "reference" IS NOT NULL));

-- Create unique index on reference
CREATE UNIQUE INDEX IF NOT EXISTS "payments_reference_key" ON "payments"("reference");
CREATE INDEX IF NOT EXISTS "payments_reference_idx" ON "payments"("reference");
