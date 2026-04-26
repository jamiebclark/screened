-- CreateEnum
CREATE TYPE "ProfileContentVisibility" AS ENUM ('PUBLIC', 'FRIENDS');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'FRIEND_REQUEST';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "friendRequestId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "watchHistoryVisibility" "ProfileContentVisibility" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "watchlistVisibility" "ProfileContentVisibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE "FriendRequest" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FriendRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "userLowId" TEXT NOT NULL,
    "userHighId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FriendRequest_toUserId_idx" ON "FriendRequest"("toUserId");

-- CreateIndex
CREATE INDEX "FriendRequest_fromUserId_idx" ON "FriendRequest"("fromUserId");

-- CreateIndex
CREATE UNIQUE INDEX "FriendRequest_fromUserId_toUserId_key" ON "FriendRequest"("fromUserId", "toUserId");

-- CreateIndex
CREATE INDEX "Friendship_userHighId_idx" ON "Friendship"("userHighId");

-- CreateIndex
CREATE INDEX "Friendship_userLowId_idx" ON "Friendship"("userLowId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_userLowId_userHighId_key" ON "Friendship"("userLowId", "userHighId");

-- CreateIndex
CREATE INDEX "Notification_friendRequestId_idx" ON "Notification"("friendRequestId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_friendRequestId_fkey" FOREIGN KEY ("friendRequestId") REFERENCES "FriendRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userLowId_fkey" FOREIGN KEY ("userLowId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userHighId_fkey" FOREIGN KEY ("userHighId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
