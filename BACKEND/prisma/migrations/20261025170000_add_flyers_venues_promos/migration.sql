-- Migration: 20261025170000_add_flyers_venues_promos
-- Adds EventFlyer gallery, venue location extensions, PromoCode & usage tracking, Order financial snapshots, and PlatformConfig.

-- 1. Extend events table
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "placeId" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "directions" TEXT;

-- 2. Extend orders table with financial snapshots
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "subtotalKes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discountKes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "serviceFeeKes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "promoCodeId" UUID;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "promoCodeSnapshot" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discountTypeSnapshot" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discountValueSnapshot" INTEGER;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "influencerSnapshot" TEXT;
CREATE INDEX IF NOT EXISTS "orders_promoCodeId_idx" ON "orders"("promoCodeId");

-- 3. Create event_flyers table
CREATE TABLE IF NOT EXISTS "event_flyers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "eventId" UUID NOT NULL,
  "url" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "event_flyers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "event_flyers_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "event_flyers_eventId_order_idx" ON "event_flyers"("eventId", "order");

-- 4. Create DiscountType enum
DO $$ BEGIN
  CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 5. Create promo_codes table
CREATE TABLE IF NOT EXISTS "promo_codes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "eventId" UUID,
  "createdByUserId" UUID NOT NULL,
  "influencerName" TEXT,
  "influencerEmail" TEXT,
  "discountType" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
  "discountValue" INTEGER NOT NULL,
  "startsAt" TIMESTAMPTZ,
  "expiresAt" TIMESTAMPTZ,
  "maxUses" INTEGER,
  "maxUsesPerCustomer" INTEGER DEFAULT 1,
  "currentUses" INTEGER NOT NULL DEFAULT 0,
  "minOrderKes" INTEGER DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "promo_codes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "promo_codes_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "promo_codes_code_eventId_key" ON "promo_codes"("code", "eventId");
CREATE INDEX IF NOT EXISTS "promo_codes_code_idx" ON "promo_codes"("code");
CREATE INDEX IF NOT EXISTS "promo_codes_eventId_isActive_idx" ON "promo_codes"("eventId", "isActive");
CREATE INDEX IF NOT EXISTS "promo_codes_createdByUserId_idx" ON "promo_codes"("createdByUserId");

-- 6. Add foreign keys for orders
DO $$ BEGIN
  ALTER TABLE "orders" ADD CONSTRAINT "orders_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "orders" ADD CONSTRAINT "orders_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 7. Create promo_code_usages table
CREATE TABLE IF NOT EXISTS "promo_code_usages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "promoCodeId" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "discountKes" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "promo_code_usages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "promo_code_usages_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "promo_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "promo_code_usages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "promo_code_usages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "promo_code_usages_promoCodeId_orderId_key" ON "promo_code_usages"("promoCodeId", "orderId");
CREATE INDEX IF NOT EXISTS "promo_code_usages_promoCodeId_idx" ON "promo_code_usages"("promoCodeId");
CREATE INDEX IF NOT EXISTS "promo_code_usages_userId_idx" ON "promo_code_usages"("userId");

-- 8. Create platform_config table
CREATE TABLE IF NOT EXISTS "platform_config" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "serviceFeePercent" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
  "serviceFeeFixedKes" INTEGER NOT NULL DEFAULT 50,
  "serviceFeePolicy" TEXT NOT NULL DEFAULT 'CUSTOMER_SURCHARGE',
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedByUserId" UUID,
  CONSTRAINT "platform_config_pkey" PRIMARY KEY ("id")
);

-- Seed initial default platform_config if not exists
INSERT INTO "platform_config" ("id", "serviceFeePercent", "serviceFeeFixedKes", "serviceFeePolicy", "updatedAt")
VALUES ('default', 5.0, 50, 'CUSTOMER_SURCHARGE', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
