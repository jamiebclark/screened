-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'FRIEND_WATCHED_YOUR_WATCHLIST';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "watchEntryId" TEXT;

-- CreateIndex
CREATE INDEX "Notification_watchEntryId_idx" ON "Notification"("watchEntryId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_watchEntryId_fkey" FOREIGN KEY ("watchEntryId") REFERENCES "WatchEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
