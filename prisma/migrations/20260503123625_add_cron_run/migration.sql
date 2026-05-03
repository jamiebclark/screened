-- CreateEnum
CREATE TYPE "CronIntegration" AS ENUM ('PLEX', 'LETTERBOXD', 'JELLYFIN', 'TAUTULLI', 'TRAKT');

-- CreateTable
CREATE TABLE "CronRun" (
    "id" TEXT NOT NULL,
    "integration" "CronIntegration" NOT NULL,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER NOT NULL,
    "succeeded" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "result" JSONB NOT NULL,

    CONSTRAINT "CronRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CronRun_integration_ranAt_idx" ON "CronRun"("integration", "ranAt" DESC);
