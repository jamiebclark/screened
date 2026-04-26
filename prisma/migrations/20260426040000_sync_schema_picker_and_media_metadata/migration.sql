-- CreateEnum
CREATE TYPE "PreferenceType" AS ENUM ('ATTRACTOR', 'REPELLER');

-- AlterTable
ALTER TABLE "MediaItem" ADD COLUMN "cast" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL,
ADD COLUMN "director" TEXT,
ADD COLUMN "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[] NOT NULL,
ADD COLUMN "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL;

-- CreateTable
CREATE TABLE "WatchEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "userMediaStatusId" TEXT,
    "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "review" TEXT,
    "rating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PreferenceType" NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickerRoom" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickerRoom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_mediaItemId_type_key" ON "UserPreference"("userId", "mediaItemId", "type");

-- AddForeignKey
ALTER TABLE "WatchEntry" ADD CONSTRAINT "WatchEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchEntry" ADD CONSTRAINT "WatchEntry_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchEntry" ADD CONSTRAINT "WatchEntry_userMediaStatusId_fkey" FOREIGN KEY ("userMediaStatusId") REFERENCES "UserMediaStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickerRoom" ADD CONSTRAINT "PickerRoom_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Copy existing per-title review/rating/watch data into WatchEntry before dropping columns
INSERT INTO "WatchEntry" ("id", "userId", "mediaItemId", "userMediaStatusId", "watchedAt", "review", "rating", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  "userId",
  "mediaItemId",
  "id",
  COALESCE("watchedAt", "createdAt"),
  "review",
  "rating",
  "createdAt",
  "updatedAt"
FROM "UserMediaStatus";

-- AlterTable
ALTER TABLE "UserMediaStatus" DROP COLUMN "review",
DROP COLUMN "watchedAt";
