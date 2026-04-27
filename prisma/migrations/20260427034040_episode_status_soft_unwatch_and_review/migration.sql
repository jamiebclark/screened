-- AlterTable
ALTER TABLE "EpisodeStatus" ADD COLUMN     "isWatched" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "review" TEXT;
