-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "pendingPlexUsername" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_pendingPlexUsername_key" ON "User"("pendingPlexUsername");
