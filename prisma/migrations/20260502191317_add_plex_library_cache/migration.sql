-- AlterTable
ALTER TABLE "PlexConnection" ADD COLUMN     "libraryCache" JSONB,
ADD COLUMN     "libraryCachedAt" TIMESTAMP(3);
