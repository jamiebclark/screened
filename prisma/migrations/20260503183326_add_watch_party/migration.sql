-- CreateEnum
CREATE TYPE "WatchPartyStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WatchPartyInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'WATCH_PARTY_INVITE';
ALTER TYPE "NotificationType" ADD VALUE 'WATCH_PARTY_CONFIRM';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "watchPartyInviteId" TEXT;

-- CreateTable
CREATE TABLE "WatchParty" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "WatchPartyStatus" NOT NULL DEFAULT 'SCHEDULED',
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "pickerSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchPartyInvite" (
    "id" TEXT NOT NULL,
    "watchPartyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "WatchPartyInviteStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchPartyInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WatchParty_hostId_idx" ON "WatchParty"("hostId");

-- CreateIndex
CREATE INDEX "WatchParty_scheduledFor_idx" ON "WatchParty"("scheduledFor");

-- CreateIndex
CREATE INDEX "WatchPartyInvite_userId_idx" ON "WatchPartyInvite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchPartyInvite_watchPartyId_userId_key" ON "WatchPartyInvite"("watchPartyId", "userId");

-- CreateIndex
CREATE INDEX "Notification_watchPartyInviteId_idx" ON "Notification"("watchPartyInviteId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_watchPartyInviteId_fkey" FOREIGN KEY ("watchPartyInviteId") REFERENCES "WatchPartyInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchParty" ADD CONSTRAINT "WatchParty_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchParty" ADD CONSTRAINT "WatchParty_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchParty" ADD CONSTRAINT "WatchParty_pickerSessionId_fkey" FOREIGN KEY ("pickerSessionId") REFERENCES "PickerSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchPartyInvite" ADD CONSTRAINT "WatchPartyInvite_watchPartyId_fkey" FOREIGN KEY ("watchPartyId") REFERENCES "WatchParty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchPartyInvite" ADD CONSTRAINT "WatchPartyInvite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
