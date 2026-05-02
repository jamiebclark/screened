-- AlterTable
ALTER TABLE "List" ADD COLUMN     "discordWebhookUrl" TEXT;

-- CreateTable
CREATE TABLE "DiscordConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "discordUsername" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "dmEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscordConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscordConnection_userId_key" ON "DiscordConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscordConnection_discordUserId_key" ON "DiscordConnection"("discordUserId");

-- AddForeignKey
ALTER TABLE "DiscordConnection" ADD CONSTRAINT "DiscordConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
