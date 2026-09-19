-- CreateEnum
CREATE TYPE "ListVisibility" AS ENUM ('PUBLIC', 'MEMBERS', 'PRIVATE');

-- AlterTable: add the tier column. Every existing list defaults to MEMBERS
-- (any signed-in user), which is exactly what isPublic = true meant before.
ALTER TABLE "List" ADD COLUMN "visibility" "ListVisibility" NOT NULL DEFAULT 'MEMBERS';

-- Backfill: lists that were private stay private. No list becomes PUBLIC
-- (internet-visible) without an explicit owner action after this migration.
UPDATE "List" SET "visibility" = 'PRIVATE' WHERE "isPublic" = false;

-- AlterTable: drop the old two-state flag.
ALTER TABLE "List" DROP COLUMN "isPublic";
