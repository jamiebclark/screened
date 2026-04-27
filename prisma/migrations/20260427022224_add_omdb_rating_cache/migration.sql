-- CreateTable
CREATE TABLE "OmdbRatingCache" (
    "imdbId" TEXT NOT NULL,
    "ratings" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OmdbRatingCache_pkey" PRIMARY KEY ("imdbId")
);
