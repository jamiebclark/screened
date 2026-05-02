-- AlterEnum
ALTER TYPE "WatchEntrySource" ADD VALUE 'TAUTULLI';

-- CreateTable
CREATE TABLE "TautulliConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tautulliUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "tautulliUsername" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TautulliConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TautulliConnection_userId_key" ON "TautulliConnection"("userId");

-- AddForeignKey
ALTER TABLE "TautulliConnection" ADD CONSTRAINT "TautulliConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
