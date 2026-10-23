CREATE TYPE "OrganizerApplicationStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "users"
ADD COLUMN "organizerApplicationStatus" "OrganizerApplicationStatus" NOT NULL DEFAULT 'NONE';

UPDATE "users"
SET "organizerApplicationStatus" = 'APPROVED'
WHERE "role" = 'ORGANIZER';
