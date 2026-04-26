-- CreateEnum
CREATE TYPE "WatchEntrySource" AS ENUM ('PLEX', 'LETTERBOXD', 'MANUAL', 'UNKNOWN');

-- AlterTable
ALTER TABLE "WatchEntry" ADD COLUMN "source" "WatchEntrySource" NOT NULL DEFAULT 'UNKNOWN';
