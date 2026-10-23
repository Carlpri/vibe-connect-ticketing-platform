ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "passwordResetTokenHash" TEXT,
  ADD COLUMN IF NOT EXISTS "passwordResetExpiresAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "passwordResetCooldownUntil" TIMESTAMPTZ;
