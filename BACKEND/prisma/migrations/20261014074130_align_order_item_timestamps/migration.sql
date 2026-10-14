ALTER TABLE "order_items" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "order_items" RENAME COLUMN "updated_at" TO "updatedAt";

ALTER TABLE "order_items"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ USING "updatedAt" AT TIME ZONE 'UTC';
