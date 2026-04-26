-- CreateEnum
CREATE TYPE "ListAccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LIST_ACCESS_REQUEST');

-- CreateTable
CREATE TABLE "ListAccessRequest" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" "ListAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "readAt" TIMESTAMP(3),
    "listAccessRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListAccessRequest_listId_status_idx" ON "ListAccessRequest"("listId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ListAccessRequest_listId_requesterId_key" ON "ListAccessRequest"("listId", "requesterId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_listAccessRequestId_idx" ON "Notification"("listAccessRequestId");

-- AddForeignKey
ALTER TABLE "ListAccessRequest" ADD CONSTRAINT "ListAccessRequest_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListAccessRequest" ADD CONSTRAINT "ListAccessRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListAccessRequest" ADD CONSTRAINT "ListAccessRequest_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_listAccessRequestId_fkey" FOREIGN KEY ("listAccessRequestId") REFERENCES "ListAccessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
