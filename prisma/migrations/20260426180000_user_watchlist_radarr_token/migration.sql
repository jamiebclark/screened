-- AlterTable
ALTER TABLE "User" ADD COLUMN "watchlistRadarrToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_watchlistRadarrToken_key" ON "User"("watchlistRadarrToken");
