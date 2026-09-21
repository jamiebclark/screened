-- Remove the Trakt integration. Existing Trakt-imported watch entries are kept
-- but lose their provenance (remapped to UNKNOWN); Trakt cron-run logs are
-- dropped. Both remaps must happen before the enum values are removed.

-- Remap data that references the enum values being removed
DELETE FROM "CronRun" WHERE "integration" = 'TRAKT';
UPDATE "WatchEntry" SET "source" = 'UNKNOWN' WHERE "source" = 'TRAKT';

-- AlterEnum
BEGIN;
CREATE TYPE "CronIntegration_new" AS ENUM ('PLEX', 'LETTERBOXD', 'JELLYFIN', 'TAUTULLI');
ALTER TABLE "CronRun" ALTER COLUMN "integration" TYPE "CronIntegration_new" USING ("integration"::text::"CronIntegration_new");
ALTER TYPE "CronIntegration" RENAME TO "CronIntegration_old";
ALTER TYPE "CronIntegration_new" RENAME TO "CronIntegration";
DROP TYPE "public"."CronIntegration_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "WatchEntrySource_new" AS ENUM ('PLEX', 'TAUTULLI', 'LETTERBOXD', 'JELLYFIN', 'MANUAL', 'UNKNOWN');
ALTER TABLE "public"."WatchEntry" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "WatchEntry" ALTER COLUMN "source" TYPE "WatchEntrySource_new" USING ("source"::text::"WatchEntrySource_new");
ALTER TYPE "WatchEntrySource" RENAME TO "WatchEntrySource_old";
ALTER TYPE "WatchEntrySource_new" RENAME TO "WatchEntrySource";
DROP TYPE "public"."WatchEntrySource_old";
ALTER TABLE "WatchEntry" ALTER COLUMN "source" SET DEFAULT 'UNKNOWN';
COMMIT;

-- DropForeignKey
ALTER TABLE "TraktConnection" DROP CONSTRAINT "TraktConnection_userId_fkey";

-- DropTable
DROP TABLE "TraktConnection";
