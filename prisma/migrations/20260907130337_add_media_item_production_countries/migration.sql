-- AlterTable
ALTER TABLE "MediaItem" ADD COLUMN     "productionCountries" TEXT[] DEFAULT ARRAY[]::TEXT[];
