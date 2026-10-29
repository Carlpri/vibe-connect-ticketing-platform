-- AlterTable: Add thematic, edition, bibleVerse, and dressCode fields to events
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "theme" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "bibleVerse" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "dressCode" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "edition" TEXT;
