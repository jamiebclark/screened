-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WatchEntrySource" ADD VALUE 'JELLYFIN';
ALTER TYPE "WatchEntrySource" ADD VALUE 'TRAKT';

-- CreateTable
CREATE TABLE "JellyfinConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serverUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "jellyfinUserId" TEXT NOT NULL,
    "jellyfinUsername" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JellyfinConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraktConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "traktUsername" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraktConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OverseerrConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serverUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OverseerrConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JellyfinConnection_userId_key" ON "JellyfinConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TraktConnection_userId_key" ON "TraktConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OverseerrConnection_userId_key" ON "OverseerrConnection"("userId");

-- AddForeignKey
ALTER TABLE "JellyfinConnection" ADD CONSTRAINT "JellyfinConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraktConnection" ADD CONSTRAINT "TraktConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OverseerrConnection" ADD CONSTRAINT "OverseerrConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
