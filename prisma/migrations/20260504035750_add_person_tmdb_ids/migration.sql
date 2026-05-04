-- AlterTable
ALTER TABLE "MediaItem" ADD COLUMN     "castTmdbIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "creatorName" TEXT,
ADD COLUMN     "creatorTmdbId" INTEGER,
ADD COLUMN     "directorTmdbId" INTEGER,
ADD COLUMN     "directors" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "directorsTmdbIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
