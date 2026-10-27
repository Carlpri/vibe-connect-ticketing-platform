-- CreateEnum
CREATE TYPE "CheckInOutcome" AS ENUM ('VALID', 'ALREADY_USED', 'EXPIRED', 'INVALID', 'PAYMENT_PENDING', 'CANCELLED', 'UNAUTHORIZED');

-- CreateTable
CREATE TABLE "check_in_logs" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "ticketId" UUID,
    "scannedById" UUID NOT NULL,
    "outcome" "CheckInOutcome" NOT NULL,
    "ticketCode" TEXT,
    "notes" TEXT,
    "scannedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_in_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "check_in_logs_eventId_scannedAt_idx" ON "check_in_logs"("eventId", "scannedAt");

-- CreateIndex
CREATE INDEX "check_in_logs_ticketId_idx" ON "check_in_logs"("ticketId");

-- CreateIndex
CREATE INDEX "check_in_logs_scannedById_idx" ON "check_in_logs"("scannedById");

-- AddForeignKey
ALTER TABLE "check_in_logs" ADD CONSTRAINT "check_in_logs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in_logs" ADD CONSTRAINT "check_in_logs_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in_logs" ADD CONSTRAINT "check_in_logs_scannedById_fkey" FOREIGN KEY ("scannedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
